import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";
import { getDeveloperPayoutSettings, setDeveloperPayoutDestination, PAYOUT_METHODS } from "@/lib/create/developer-payouts";
import { payoutProviderConfigured } from "@/lib/payments/payout-adapter";

export const dynamic = "force-dynamic";

const putSchema = z.object({
  method: z.enum(PAYOUT_METHODS),
  phone: z.string().trim().min(8).max(20),
  accountName: z.string().trim().min(1).max(80),
});

/** My payout destination — shared across the aesthetics and Studio Creative Assets marketplaces. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const result = await getDeveloperPayoutSettings(auth.supabase, auth.user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({
    settings: result.settings,
    liveDisbursement: { wave: payoutProviderConfigured("wave"), orange_money: payoutProviderConfigured("orange_money") },
  });
}

export async function PUT(req: Request) {
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
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a payout method, phone number and account name." }, { status: 400 });

  const result = await setDeveloperPayoutDestination(auth.supabase, auth.user.id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ ok: true, settings: result.settings });
}
