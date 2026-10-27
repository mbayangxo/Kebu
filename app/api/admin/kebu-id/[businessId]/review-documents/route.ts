import { NextResponse } from "next/server";
import { assertAdminCookie, assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { createAdminClient } from "@/lib/supabase/admin";
import { recomputeBusinessVerificationLevel } from "@/lib/kebu-id/verification-level";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ businessId: string }> };

/**
 * Admin-only Kebu ID document review — the last gate for verification
 * level 4 (lib/kebu-id/verification-level.ts). Marks the business's
 * uploaded registration documents reviewed; never settable by the founder.
 */
export async function PATCH(req: Request, { params }: Params) {
  if (!(await assertAdminCookie(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const csrf = assertSameOriginMutation(req);
  if (csrf) return csrf;

  const { businessId } = await params;
  if (!businessId || !/^[0-9a-f-]{36}$/i.test(businessId)) {
    return NextResponse.json({ error: "Invalid business id." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: business } = await admin
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .maybeSingle();
  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const { error } = await admin
    .from("businesses")
    .update({ verification_documents_reviewed_at: new Date().toISOString() })
    .eq("id", businessId);

  if (error) {
    return NextResponse.json({ error: "Could not save review." }, { status: 500 });
  }

  const level = await recomputeBusinessVerificationLevel(admin, businessId);
  return NextResponse.json({ ok: true, verificationLevel: level });
}
