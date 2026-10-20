import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { listMyDeveloperPayouts, requestDeveloperPayout } from "@/lib/create/developer-payouts";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  amountCents: z.number().int().positive(),
  currency: z.enum(["XOF", "USD"]).optional(),
});

/** My payout request history. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const result = await listMyDeveloperPayouts(auth.supabase, auth.user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({
    items: result.items.map((p) => ({
      id: p.id,
      amountCents: p.amount_cents,
      currency: p.currency,
      method: p.method,
      status: p.status,
      requestedAt: p.requested_at,
      processedAt: p.processed_at,
      failureReason: p.failure_reason,
    })),
  });
}

/** Request a payout to my own recorded destination — never a caller-supplied one. */
export async function POST(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;
  const originBlocked = assertSameOriginMutation(req);
  if (originBlocked) return originBlocked;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a payout amount." }, { status: 400 });

  const result = await requestDeveloperPayout(auth.supabase, auth.user.id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ ok: true, payout: { id: result.payout.id, status: result.payout.status } }, { status: 201 });
}
