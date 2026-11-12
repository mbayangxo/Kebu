import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/opportunity/admin";
import { assertAdminCookie, assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

/**
 * Record a real refund an admin already issued through the provider by hand —
 * same bookkeeping-only shape as every other money-movement action in this
 * codebase (payouts, fulfillment status). No provider refund API is called
 * here; none exists for any rail in this codebase. Full-order refunds only.
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
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine — reason is optional */
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { data, error } = await admin.rpc("record_shop_refund", {
    p_order_id: id,
    p_reason: parsed.data.reason ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.ok) {
    return NextResponse.json({ error: row?.error ?? "Could not record refund." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, refundedXof: Number(row.refunded_xof ?? 0) });
}
