import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/opportunity/admin";
import { assertAdminCookie, assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { JOKO_FULFILLMENT_STATUSES, transitionFulfillmentStatus } from "@/lib/shop/joko-fulfillment";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  status: z.enum(JOKO_FULFILLMENT_STATUSES),
  note: z.string().trim().max(500).optional(),
});

/**
 * Record a real-world step an ops person just completed by hand (picked the
 * order up, handed it to delivery, delivered it). This endpoint does not
 * perform or verify any physical action itself — it is the bookkeeping for
 * one that already happened.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await assertAdminCookie(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service client not configured." }, { status: 503 });
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  // No per-admin uuid exists on this shared team-login path (assertAdminCookie
  // verifies a signed session cookie, not an auth.users row) — updated_by
  // stays null here, same trust boundary as markDeveloperPayoutPaid's `null`.
  const result = await transitionFulfillmentStatus(admin, {
    id,
    status: parsed.data.status,
    updatedBy: null,
    note: parsed.data.note,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({ ok: true });
}
