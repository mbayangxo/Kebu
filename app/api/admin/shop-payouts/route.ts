import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { assertAdminCookie } from "@/lib/admin/assert-admin-cookie";
import { listPendingShopPayouts } from "@/lib/shop/seller-payouts";

export const dynamic = "force-dynamic";

/** Pending/processing Shop seller payouts across every project — Kebu Record ops only. */
export async function GET(req: Request) {
  if (!(await assertAdminCookie(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Service client not configured." }, { status: 503 });
  }

  const result = await listPendingShopPayouts(supabase);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({
    items: result.items.map((p) => ({
      id: p.id,
      projectId: p.project_id,
      projectTitle: p.projectTitle,
      amountXof: p.amount_xof,
      method: p.method,
      destinationPhone: p.destination_phone,
      destinationAccountName: p.destination_account_name,
      status: p.status,
      requestedAt: p.requested_at,
    })),
  });
}
