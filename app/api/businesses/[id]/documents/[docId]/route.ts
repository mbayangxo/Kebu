import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { recalculateAndStoreReadiness } from "@/lib/kebu-id/create-registration";
import {
  BUSINESS_DOCUMENTS_BUCKET,
  syncDocumentsUploadedStep,
} from "@/lib/kebu-id/business-documents";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: businessId, docId } = await params;

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

  if (!membership || !["founder", "administrator"].includes(membership.role)) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const { data: doc } = await supabase
    .from("business_documents")
    .select("id, storage_path")
    .eq("id", docId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  await supabase.storage.from(BUSINESS_DOCUMENTS_BUCKET).remove([doc.storage_path]);

  const { error } = await supabase
    .from("business_documents")
    .delete()
    .eq("id", docId)
    .eq("business_id", businessId);

  if (error) {
    return NextResponse.json({ error: "Could not delete document.", detail: error.message }, { status: 500 });
  }

  await supabase.from("business_audit_logs").insert({
    business_id: businessId,
    actor_user_id: user.id,
    action: "business.document_deleted",
    metadata: { documentId: docId },
  });

  const sync = await syncDocumentsUploadedStep(supabase, businessId);
  await recalculateAndStoreReadiness({ supabase, businessId });

  logCreate("business.document_deleted", { userId: user.id, businessId, docId });

  return NextResponse.json({
    ok: true,
    documentsStepComplete: sync.complete,
    uploadedTypes: sync.uploadedTypes,
  });
}
