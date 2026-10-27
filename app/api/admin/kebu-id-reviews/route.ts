import { NextResponse } from "next/server";
import { assertAdminCookie } from "@/lib/admin/assert-admin-cookie";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Admin queue for the two review gates Kebu ID verification levels 3-4
 * depend on (lib/kebu-id/verification-level.ts): AfriID eligibility review
 * and Kebu ID document review. Nothing in this codebase exposed either
 * queue to an admin before this slice.
 */
export async function GET(req: Request) {
  if (!(await assertAdminCookie(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: pendingAfriIds } = await admin
    .from("afrique_ids")
    .select("user_id, public_afrique_id, country_code, identity_type, eligibility_status, created_at")
    .in("eligibility_status", ["pending", "manual_review"])
    .order("created_at", { ascending: true })
    .limit(100);

  const { data: documentsUploaded } = await admin
    .from("registration_progress")
    .select("business_id")
    .eq("step_key", "documents_uploaded")
    .eq("is_complete", true);

  const uploadedBusinessIds = (documentsUploaded ?? []).map((r) => r.business_id);
  let pendingDocumentReviews: Array<{ id: string; public_kebu_id: string; legal_name: string; verification_level: number }> = [];
  if (uploadedBusinessIds.length > 0) {
    const { data } = await admin
      .from("businesses")
      .select("id, public_kebu_id, legal_name, verification_level, verification_documents_reviewed_at")
      .in("id", uploadedBusinessIds)
      .is("verification_documents_reviewed_at", null)
      .gte("verification_level", 3);
    pendingDocumentReviews = data ?? [];
  }

  return NextResponse.json({
    pendingAfriIds: pendingAfriIds ?? [],
    pendingDocumentReviews,
  });
}
