import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { createServiceClient } from "@/lib/opportunity/admin";
import { assertShopProjectAccess } from "@/lib/shop/shop-project-access";
import {
  listShopPayoutRequests,
  requestShopPayout,
  SHOP_PAYOUT_METHODS,
} from "@/lib/shop/seller-payouts";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const postSchema = z.object({
  amountXof: z.number().int().positive().max(2_000_000_000),
  method: z.enum(SHOP_PAYOUT_METHODS),
  destinationPhone: z.string().trim().min(8).max(24),
  destinationAccountName: z.string().trim().min(1).max(120),
});

/** This Shop's payout-request history (requested → processing → paid/failed/cancelled). */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id: projectId } = await params;

  const access = await assertShopProjectAccess(auth.supabase, {
    userId: auth.user.id,
    email: auth.user.email,
    projectId,
    action: "shop-payouts",
  });
  if (!access) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  // shop_payout_requests SELECT is RLS-scoped to the project owner, so the user client
  // (owner path) works directly; the team-access path already gets a service client.
  const result = await listShopPayoutRequests(access.db, projectId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({
    items: result.items.map((r) => ({
      id: r.id,
      amountXof: r.amount_xof,
      method: r.method,
      status: r.status,
      requestedAt: r.requested_at,
      processedAt: r.processed_at,
      failureReason: r.failure_reason,
    })),
  });
}

/** Request a payout of this Shop's available Kebu balance. Amount is re-checked atomically server-side. */
export async function POST(req: Request, { params }: Params) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { id: projectId } = await params;

  const access = await assertShopProjectAccess(auth.supabase, {
    userId: auth.user.id,
    email: auth.user.email,
    projectId,
    action: "shop-payouts",
  });
  if (!access) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid payout amount and destination." }, { status: 400 });
  }

  // request_shop_payout is service-role-only (trusts p_project_id/p_requested_by with no
  // internal ownership check) — access was already verified above via assertShopProjectAccess.
  const serviceDb = createServiceClient();
  if (!serviceDb) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const result = await requestShopPayout(serviceDb, {
    projectId,
    requestedBy: auth.user.id,
    amountXof: parsed.data.amountXof,
    method: parsed.data.method,
    destinationPhone: parsed.data.destinationPhone,
    destinationAccountName: parsed.data.destinationAccountName,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json(
    { ok: true, request: { id: result.request.id, status: result.request.status, amountXof: result.request.amount_xof } },
    { status: 201 },
  );
}
