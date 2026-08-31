import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { recalculateAndStoreReadiness } from "@/lib/kebu-id/create-registration";
import {
  ALLOWED_DOCUMENT_MIMES,
  BUSINESS_DOCUMENTS_BUCKET,
  MAX_DOCUMENT_BYTES,
  REQUIRED_REGISTRATION_DOCUMENT_TYPES,
  sanitizeFileName,
  syncDocumentsUploadedStep,
  type RegistrationDocumentType,
} from "@/lib/kebu-id/business-documents";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const documentTypeSchema = z.enum([
  "founder_id",
  "business_plan",
  "address_proof",
  "registration_form",
  "other",
]);

async function assertFounderAccess(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  userId: string,
  businessId: string,
) {
  const { data: membership } = await supabase
    .from("business_members")
    .select("role, status")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership || !["founder", "administrator"].includes(membership.role)) {
    return null;
  }
  return membership;
}

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: businessId } = await params;

  if (!businessId || !/^[0-9a-f-]{36}$/i.test(businessId)) {
    return NextResponse.json({ error: "Invalid business id." }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const { data: documents, error } = await supabase
    .from("business_documents")
    .select("id, document_type, file_name, mime_type, size_bytes, created_at, storage_path")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("does not exist")
          ? "Apply migration 017 for business documents."
          : "Could not load documents.",
        detail: error.message,
      },
      { status: 500 },
    );
  }

  const withUrls = await Promise.all(
    (documents ?? []).map(async (doc) => {
      const { data: signed } = await supabase.storage
        .from(BUSINESS_DOCUMENTS_BUCKET)
        .createSignedUrl(doc.storage_path, 3600);
      return {
        ...doc,
        downloadUrl: signed?.signedUrl ?? null,
      };
    }),
  );

  const sync = await syncDocumentsUploadedStep(supabase, businessId);
  await recalculateAndStoreReadiness({ supabase, businessId });

  return NextResponse.json({
    documents: withUrls,
    required: REQUIRED_REGISTRATION_DOCUMENT_TYPES,
    documentsStepComplete: sync.complete,
    uploadedTypes: sync.uploadedTypes,
  });
}

export async function POST(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: businessId } = await params;

  if (!businessId || !/^[0-9a-f-]{36}$/i.test(businessId)) {
    return NextResponse.json({ error: "Invalid business id." }, { status: 400 });
  }

  const membership = await assertFounderAccess(supabase, user.id, businessId);
  if (!membership) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form upload." }, { status: 400 });
  }

  const file = formData.get("file");
  const documentTypeRaw = formData.get("documentType");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  const parsedType = documentTypeSchema.safeParse(documentTypeRaw);
  if (!parsedType.success) {
    return NextResponse.json({ error: "Invalid document type." }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_DOCUMENT_BYTES) {
    return NextResponse.json({ error: "File must be between 1 byte and 10 MB." }, { status: 400 });
  }

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_DOCUMENT_MIMES.has(mime)) {
    return NextResponse.json({ error: "Use PDF, JPEG, PNG, or WebP." }, { status: 400 });
  }

  const docId = crypto.randomUUID();
  const safeName = sanitizeFileName(file.name);
  const storagePath = `${businessId}/${docId}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await supabase.storage
    .from(BUSINESS_DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, { contentType: mime, upsert: false });

  if (uploadErr) {
    return NextResponse.json(
      { error: "Upload failed.", detail: uploadErr.message },
      { status: 500 },
    );
  }

  const { data: row, error: insertErr } = await supabase
    .from("business_documents")
    .insert({
      id: docId,
      business_id: businessId,
      document_type: parsedType.data as RegistrationDocumentType,
      file_name: safeName,
      storage_path: storagePath,
      mime_type: mime,
      size_bytes: file.size,
      uploaded_by: user.id,
    })
    .select("id, document_type, file_name, mime_type, size_bytes, created_at, storage_path")
    .single();

  if (insertErr || !row) {
    await supabase.storage.from(BUSINESS_DOCUMENTS_BUCKET).remove([storagePath]);
    return NextResponse.json(
      { error: "Could not save document record.", detail: insertErr?.message },
      { status: 500 },
    );
  }

  await supabase.from("business_audit_logs").insert({
    business_id: businessId,
    actor_user_id: user.id,
    action: "business.document_uploaded",
    metadata: { documentType: parsedType.data, fileName: safeName },
  });

  const sync = await syncDocumentsUploadedStep(supabase, businessId);
  await recalculateAndStoreReadiness({ supabase, businessId });

  logCreate("business.document_uploaded", {
    userId: user.id,
    businessId,
    documentType: parsedType.data,
  });

  const { data: signed } = await supabase.storage
    .from(BUSINESS_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 3600);

  return NextResponse.json({
    document: { ...row, downloadUrl: signed?.signedUrl ?? null },
    documentsStepComplete: sync.complete,
    uploadedTypes: sync.uploadedTypes,
  });
}
