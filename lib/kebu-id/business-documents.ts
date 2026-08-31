import type { SupabaseClient } from "@supabase/supabase-js";

export const BUSINESS_DOCUMENTS_BUCKET = "business-documents";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const ALLOWED_DOCUMENT_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const REQUIRED_REGISTRATION_DOCUMENT_TYPES = [
  { type: "founder_id", label: "Founder ID (CNI, passport, or national ID)" },
  { type: "business_plan", label: "Business plan or summary (PDF)" },
] as const;

export type RegistrationDocumentType =
  | (typeof REQUIRED_REGISTRATION_DOCUMENT_TYPES)[number]["type"]
  | "address_proof"
  | "registration_form"
  | "other";

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "document";
}

export function documentsComplete(uploadedTypes: string[]): boolean {
  return REQUIRED_REGISTRATION_DOCUMENT_TYPES.every((req) => uploadedTypes.includes(req.type));
}

export async function syncDocumentsUploadedStep(
  supabase: SupabaseClient,
  businessId: string,
): Promise<{ complete: boolean; uploadedTypes: string[] }> {
  const { data: docs } = await supabase
    .from("business_documents")
    .select("document_type")
    .eq("business_id", businessId);

  const uploadedTypes = [...new Set((docs ?? []).map((d) => d.document_type))];
  const complete = documentsComplete(uploadedTypes);
  const now = complete ? new Date().toISOString() : null;

  await supabase
    .from("registration_progress")
    .update({
      is_complete: complete,
      completed_at: now,
      updated_at: new Date().toISOString(),
    })
    .eq("business_id", businessId)
    .eq("step_key", "documents_uploaded");

  return { complete, uploadedTypes };
}
