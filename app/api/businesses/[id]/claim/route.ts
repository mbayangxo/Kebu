import { NextResponse } from "next/server";
import { requireUser, logCreate } from "@/lib/create/auth";
import { createServiceClient } from "@/lib/opportunity/admin";
import {
  ALLOWED_CLAIM_PROOF_MIMES,
  BUSINESS_CLAIM_DOCUMENTS_BUCKET,
  MAX_CLAIM_PROOF_BYTES,
  isActiveMember,
  sanitizeClaimFileName,
} from "@/lib/kebu-id/business-claims";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * This codebase has no public business-directory page yet (that's a
 * separate, out-of-scope feature) -- a signed-in claimant still needs to
 * see *which* business they're about to claim, but businesses' own RLS
 * correctly refuses to let a non-member read a business row with their own
 * session. The service role is used here only for this narrow, safe read
 * (name/public id/country/category -- nothing sensitive), never to bypass
 * membership or claim-approval logic below.
 */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: businessId } = await params;

  if (!businessId || !/^[0-9a-f-]{36}$/i.test(businessId)) {
    return NextResponse.json({ error: "Invalid business id." }, { status: 400 });
  }

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Service database client unavailable." }, { status: 503 });
  }

  const { data: business } = await service
    .from("businesses")
    .select("id, legal_name, trading_name, public_kebu_id, country_code, category")
    .eq("id", businessId)
    .maybeSingle();
  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const { data: claims, error } = await supabase
    .from("business_claims")
    .select("id, status, note, review_reason, created_at, reviewed_at")
    .eq("business_id", businessId)
    .eq("claimant_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Could not load claim status.", detail: error.message },
      { status: 500 },
    );
  }

  const alreadyMember = await isActiveMember(supabase, businessId, user.id);

  return NextResponse.json({ business, claims: claims ?? [], alreadyMember });
}

/** Submit a claim: a note plus one proof document. */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: businessId } = await params;

  if (!businessId || !/^[0-9a-f-]{36}$/i.test(businessId)) {
    return NextResponse.json({ error: "Invalid business id." }, { status: 400 });
  }

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Service database client unavailable." }, { status: 503 });
  }

  const { data: business } = await service
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .maybeSingle();
  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  if (await isActiveMember(supabase, businessId, user.id)) {
    return NextResponse.json(
      { error: "You already have access to this business — no claim needed." },
      { status: 409 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form upload." }, { status: 400 });
  }

  const file = formData.get("file");
  const note = String(formData.get("note") ?? "").trim();

  if (note.length < 10 || note.length > 2000) {
    return NextResponse.json(
      { error: "Explain why you're the rightful owner/representative (10–2000 characters)." },
      { status: 400 },
    );
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Attach a proof document." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_CLAIM_PROOF_BYTES) {
    return NextResponse.json({ error: "File must be between 1 byte and 10 MB." }, { status: 400 });
  }
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_CLAIM_PROOF_MIMES.has(mime)) {
    return NextResponse.json({ error: "Use PDF, JPEG, PNG, or WebP." }, { status: 400 });
  }

  const safeName = sanitizeClaimFileName(file.name);
  const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await supabase.storage
    .from(BUSINESS_CLAIM_DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, { contentType: mime, upsert: false });
  if (uploadErr) {
    return NextResponse.json({ error: "Upload failed.", detail: uploadErr.message }, { status: 500 });
  }

  const { data: claim, error: insertErr } = await supabase
    .from("business_claims")
    .insert({
      business_id: businessId,
      claimant_user_id: user.id,
      note,
      proof_storage_path: storagePath,
      proof_file_name: safeName,
      proof_mime_type: mime,
    })
    .select("id, status, created_at")
    .single();

  if (insertErr || !claim) {
    await supabase.storage.from(BUSINESS_CLAIM_DOCUMENTS_BUCKET).remove([storagePath]);
    const duplicate = insertErr?.code === "23505";
    return NextResponse.json(
      {
        error: duplicate
          ? "You already have a pending claim on this business — wait for review before submitting another."
          : "Could not save claim.",
        detail: insertErr?.message,
      },
      { status: duplicate ? 409 : 500 },
    );
  }

  logCreate("business.claim_submitted", { userId: user.id, businessId, claimId: claim.id });

  return NextResponse.json({ claim }, { status: 201 });
}
