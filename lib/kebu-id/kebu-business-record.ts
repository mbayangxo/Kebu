import type { SupabaseClient } from "@supabase/supabase-js";
import { BUSINESS_DOCUMENTS_BUCKET, sanitizeFileName } from "@/lib/kebu-id/business-documents";
import { SAFE_REGISTRATION_FIELDS } from "@/lib/kebu-id/registration-schema";

export const KEBU_RECORD_VERSION = "kebu-business-record-2026.1";

export type KebuRecordSnapshot = {
  recordVersion: string;
  generatedAt: string;
  publicKebuId: string;
  business: {
    legalName: string;
    tradingName: string | null;
    countryCode: string;
    region: string | null;
    category: string;
    legalStructure: string | null;
    registrationStatus: string;
    verificationLevel: number;
  };
  contact: {
    businessEmail: string | null;
    businessPhone: string | null;
    website: string | null;
  };
  founder: {
    name: string | null;
    email: string | null;
    ownershipPercent: number | null;
  };
  trust: {
    label: "Kebu-generated";
    note: "This record is issued by Kebu for your business identity. It is not a government registration certificate.",
  };
};

export function buildKebuRecordHtml(snapshot: KebuRecordSnapshot): string {
  const b = snapshot.business;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Kebu Business Record — ${snapshot.publicKebuId}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 1rem; color: #0a0a0a; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .id { font-size: 1.25rem; font-weight: 700; color: #ff5500; letter-spacing: 0.04em; }
    .badge { display: inline-block; background: #fff8f2; border: 1px solid #ff5500; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; margin: 1rem 0; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem; }
    td { padding: 0.5rem 0; border-bottom: 1px solid #e8e4dc; vertical-align: top; }
    td:first-child { width: 38%; color: #6b5b45; font-weight: 600; }
    footer { margin-top: 2rem; font-size: 0.75rem; color: #8a8578; line-height: 1.5; }
  </style>
</head>
<body>
  <p class="badge">Kebu-generated · ${snapshot.trust.label}</p>
  <h1>Official Kebu Business Record</h1>
  <p class="id">${snapshot.publicKebuId}</p>
  <p>Your permanent Kebu business identifier — similar to an EIN in the United States, but for your business inside Kebu and African trade readiness.</p>
  <table>
    <tr><td>Legal name</td><td>${escapeHtml(b.legalName)}</td></tr>
    <tr><td>Trading name</td><td>${escapeHtml(b.tradingName ?? "—")}</td></tr>
    <tr><td>Country</td><td>${escapeHtml(b.countryCode)}${b.region ? ` · ${escapeHtml(b.region)}` : ""}</td></tr>
    <tr><td>Category</td><td>${escapeHtml(b.category)}</td></tr>
    <tr><td>Legal structure</td><td>${escapeHtml(b.legalStructure?.replace(/_/g, " ") ?? "—")}</td></tr>
    <tr><td>Registration status</td><td>${escapeHtml(b.registrationStatus.replace(/_/g, " "))}</td></tr>
    <tr><td>Business email</td><td>${escapeHtml(snapshot.contact.businessEmail ?? "—")}</td></tr>
    <tr><td>Business phone</td><td>${escapeHtml(snapshot.contact.businessPhone ?? "—")}</td></tr>
    <tr><td>Website</td><td>${escapeHtml(snapshot.contact.website ?? "—")}</td></tr>
    <tr><td>Primary founder</td><td>${escapeHtml(snapshot.founder.name ?? "—")}</td></tr>
    <tr><td>Founder email</td><td>${escapeHtml(snapshot.founder.email ?? "—")}</td></tr>
    <tr><td>Ownership</td><td>${snapshot.founder.ownershipPercent != null ? `${snapshot.founder.ownershipPercent}%` : "—"}</td></tr>
    <tr><td>Record version</td><td>${escapeHtml(snapshot.recordVersion)}</td></tr>
    <tr><td>Generated at</td><td>${escapeHtml(snapshot.generatedAt)}</td></tr>
  </table>
  <footer>
    ${escapeHtml(snapshot.trust.note)}
    <br />Kebu · kebu.africa · Record ID ${escapeHtml(snapshot.publicKebuId)}
  </footer>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function generateKebuBusinessRecord(opts: {
  supabase: SupabaseClient;
  businessId: string;
  userId: string;
}): Promise<
  | { ok: true; recordId: string; downloadUrl: string | null; snapshot: KebuRecordSnapshot }
  | { ok: false; error: string }
> {
  const { supabase, businessId, userId } = opts;

  const { data: business, error: bErr } = await supabase
    .from("businesses")
    .select(SAFE_REGISTRATION_FIELDS)
    .eq("id", businessId)
    .maybeSingle();

  if (bErr || !business) {
    return { ok: false, error: bErr?.message ?? "Business not found." };
  }

  const { data: founder } = await supabase
    .from("business_owners")
    .select("full_name, email, ownership_percent")
    .eq("business_id", businessId)
    .eq("is_primary_founder", true)
    .limit(1)
    .maybeSingle();

  const generatedAt = new Date().toISOString();
  const snapshot: KebuRecordSnapshot = {
    recordVersion: KEBU_RECORD_VERSION,
    generatedAt,
    publicKebuId: business.public_kebu_id,
    business: {
      legalName: business.legal_name,
      tradingName: business.trading_name,
      countryCode: business.country_code,
      region: business.region,
      category: business.category,
      legalStructure: business.legal_structure,
      registrationStatus: business.registration_status,
      verificationLevel: business.verification_level,
    },
    contact: {
      businessEmail: business.business_email,
      businessPhone: business.business_phone,
      website: business.website,
    },
    founder: {
      name: founder?.full_name ?? null,
      email: founder?.email ?? null,
      ownershipPercent: founder ? Number(founder.ownership_percent) : null,
    },
    trust: {
      label: "Kebu-generated",
      note: "This record is issued by Kebu for your business identity. It is not a government registration certificate.",
    },
  };

  const html = buildKebuRecordHtml(snapshot);
  const recordId = crypto.randomUUID();
  const fileName = sanitizeFileName(`kebu-record-${business.public_kebu_id}.html`);
  const storagePath = `${businessId}/kebu-records/${recordId}-${fileName}`;
  const buffer = Buffer.from(html, "utf-8");

  const { error: uploadErr } = await supabase.storage
    .from(BUSINESS_DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, { contentType: "text/html", upsert: true });

  if (uploadErr) {
    return { ok: false, error: uploadErr.message };
  }

  const { error: recordErr } = await supabase.from("business_kebu_records").upsert(
    {
      id: recordId,
      business_id: businessId,
      record_version: KEBU_RECORD_VERSION,
      public_kebu_id: business.public_kebu_id,
      snapshot,
      storage_path: storagePath,
      generated_at: generatedAt,
      generated_by: userId,
    },
    { onConflict: "business_id" },
  );

  if (recordErr) {
    await supabase.storage.from(BUSINESS_DOCUMENTS_BUCKET).remove([storagePath]);
    return { ok: false, error: recordErr.message };
  }

  // Mirror in business_documents for unified document list
  await supabase.from("business_documents").delete().eq("business_id", businessId).eq("document_type", "kebu_official_record");

  const docId = crypto.randomUUID();
  await supabase.from("business_documents").insert({
    id: docId,
    business_id: businessId,
    document_type: "kebu_official_record",
    file_name: fileName,
    storage_path: storagePath,
    mime_type: "text/html",
    size_bytes: buffer.length,
    uploaded_by: userId,
  });

  await supabase.from("business_audit_logs").insert({
    business_id: businessId,
    actor_user_id: userId,
    action: "business.kebu_record_generated",
    metadata: { publicKebuId: business.public_kebu_id, recordVersion: KEBU_RECORD_VERSION },
  });

  const { data: signed } = await supabase.storage
    .from(BUSINESS_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 3600);

  return { ok: true, recordId, downloadUrl: signed?.signedUrl ?? null, snapshot };
}

export async function hasKebuOfficialRecord(
  supabase: SupabaseClient,
  businessId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("business_kebu_records")
    .select("id")
    .eq("business_id", businessId)
    .maybeSingle();
  return Boolean(data?.id);
}
