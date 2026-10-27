import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdminCookie, assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { createAdminClient } from "@/lib/supabase/admin";
import { recomputeBusinessVerificationLevel } from "@/lib/kebu-id/verification-level";

export const dynamic = "force-dynamic";

const reviewSchema = z.object({ decision: z.enum(["verified", "rejected"]) });

type Params = { params: Promise<{ userId: string }> };

/**
 * Admin-only AfriID verification review — "reviewed by the Kebu team, not
 * automated" (per the existing verification-form copy). No route in this
 * codebase could previously move eligibility_status to 'verified' at all;
 * this is that missing path, and it's what makes Kebu ID verification
 * level 3 (see lib/kebu-id/verification-level.ts) reachable through the
 * app rather than only by direct database access.
 */
export async function PATCH(req: Request, { params }: Params) {
  if (!(await assertAdminCookie(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const csrf = assertSameOriginMutation(req);
  if (csrf) return csrf;

  const { userId } = await params;
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "decision must be 'verified' or 'rejected'." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: aid } = await admin
    .from("afrique_ids")
    .select("eligibility_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (!aid) {
    return NextResponse.json({ error: "No AfriID found for this user." }, { status: 404 });
  }
  if (!["pending", "manual_review"].includes(aid.eligibility_status)) {
    return NextResponse.json(
      { error: `Cannot review from status '${aid.eligibility_status}' — must be pending or manual_review.` },
      { status: 409 },
    );
  }

  const { error } = await admin
    .from("afrique_ids")
    .update({
      eligibility_status: parsed.data.decision,
      verified_at: parsed.data.decision === "verified" ? new Date().toISOString() : null,
    })
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: "Could not save review." }, { status: 500 });
  }

  // Recompute every business this person founded — their trust level may
  // now be eligible to advance to level 3.
  const { data: businesses } = await admin.from("businesses").select("id").eq("created_by", userId);
  const levels: Record<string, number | null> = {};
  for (const b of businesses ?? []) {
    levels[b.id] = await recomputeBusinessVerificationLevel(admin, b.id);
  }

  return NextResponse.json({ ok: true, decision: parsed.data.decision, recomputedBusinessLevels: levels });
}
