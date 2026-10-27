import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { resolveSupportAuthorization, recordPrivilegedAudit } from "@/lib/create/support-access";
import { createServiceClient } from "@/lib/opportunity/admin";
import { hasZeroActiveMembers } from "@/lib/kebu-id/business-claims";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ claimId: string }> };

const bodySchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().trim().min(3).max(1000).optional(),
});

async function requireClaimsAdmin() {
  const auth = await requireUser();
  if ("error" in auth) return { error: auth.error };
  const service = createServiceClient();
  if (!service) {
    return { error: NextResponse.json({ error: "Service database client unavailable." }, { status: 503 }) };
  }
  let authorization;
  try {
    authorization = await resolveSupportAuthorization(service, auth.user);
  } catch {
    return { error: NextResponse.json({ error: "Could not verify admin authorization." }, { status: 503 }) };
  }
  if (!authorization || !["admin", "support"].includes(authorization.role)) {
    return { error: NextResponse.json({ error: "Only Kebu platform admins can review business claims." }, { status: 403 }) };
  }
  return { service, userId: auth.user.id, role: authorization.role };
}

/**
 * Approve or reject a claim. Approving NEVER auto-transfers or adds
 * founder membership on a business that already has an active member --
 * only a genuinely orphaned business (zero active business_members rows,
 * see hasZeroActiveMembers) actually grants the claimant founder access.
 * Otherwise the claim is simply marked approved, and any real membership
 * change on a business that already has an owner is left to an admin
 * doing it deliberately through the business's own existing
 * founder/team-management tools -- never this endpoint, automatically.
 */
export async function POST(req: Request, { params }: Params) {
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireClaimsAdmin();
  if ("error" in auth) return auth.error;
  const { service, userId, role } = auth;
  const { claimId } = await params;

  if (!claimId || !/^[0-9a-f-]{36}$/i.test(claimId)) {
    return NextResponse.json({ error: "Invalid claim id." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "decision must be 'approved' or 'rejected'." }, { status: 400 });
  }
  const { decision, reason } = parsed.data;
  if (decision === "rejected" && !reason) {
    return NextResponse.json({ error: "A rejection needs a reason, for the claimant to see." }, { status: 400 });
  }

  const { data: claim, error: loadErr } = await service
    .from("business_claims")
    .select("id, business_id, claimant_user_id, status")
    .eq("id", claimId)
    .maybeSingle();

  if (loadErr) {
    return NextResponse.json({ error: "Could not load claim.", detail: loadErr.message }, { status: 500 });
  }
  if (!claim) {
    return NextResponse.json({ error: "Claim not found." }, { status: 404 });
  }
  if (claim.status !== "pending") {
    return NextResponse.json({ error: `This claim was already ${claim.status}.` }, { status: 409 });
  }

  let grantedMembership = false;
  if (decision === "approved") {
    const orphaned = await hasZeroActiveMembers(service, claim.business_id);
    if (orphaned) {
      const { error: memberErr } = await service.from("business_members").insert({
        business_id: claim.business_id,
        user_id: claim.claimant_user_id,
        role: "founder",
        status: "active",
      });
      if (memberErr) {
        return NextResponse.json(
          { error: "Could not grant membership.", detail: memberErr.message },
          { status: 500 },
        );
      }
      grantedMembership = true;
    }
    // Not orphaned: deliberately no membership change here -- see docstring.
  }

  const { error: updateErr } = await service
    .from("business_claims")
    .update({
      status: decision,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      review_reason: reason ?? null,
    })
    .eq("id", claimId)
    .eq("status", "pending");

  if (updateErr) {
    return NextResponse.json({ error: "Could not record decision.", detail: updateErr.message }, { status: 500 });
  }

  await service.from("business_audit_logs").insert({
    business_id: claim.business_id,
    actor_user_id: userId,
    action: decision === "approved" ? "business.claim_approved" : "business.claim_rejected",
    metadata: { claimId, claimantUserId: claim.claimant_user_id, grantedMembership, reason: reason ?? null },
  });

  await recordPrivilegedAudit(service, {
    actorUserId: userId,
    actorRole: role,
    action: decision === "approved" ? "business_claim.approved" : "business_claim.rejected",
    reason: reason ?? null,
    metadata: { claimId, businessId: claim.business_id, claimantUserId: claim.claimant_user_id, grantedMembership },
  });

  return NextResponse.json({ status: decision, grantedMembership });
}
