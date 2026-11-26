import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { assertAdminCookie, assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { processDeveloperPayout } from "@/lib/create/developer-payouts";

export const dynamic = "force-dynamic";

/**
 * Attempt real disbursement for a pending payout. Succeeds only once Wave or
 * Orange Money payout credentials are actually configured (see
 * lib/payments/payout-adapter.ts) — otherwise returns 503 telling the admin
 * to send the money manually and use mark-paid instead. Never fakes success.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await assertAdminCookie(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Service client not configured." }, { status: 503 });
  }

  const { id } = await params;
  const result = await processDeveloperPayout(supabase, id, null);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ ok: true, status: result.status, viaRealDisbursement: result.viaRealDisbursement });
}
