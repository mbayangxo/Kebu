import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/create/auth";
import { builderRateLimit } from "@/lib/api-guard";
import { createServiceClient } from "@/lib/opportunity/admin";
import { REACH_TOPUP_MAX_CAURIS } from "@/lib/reach/auction";
import { ensureReachWallet, getReachWalletBalance, topUpReachWallet } from "@/lib/reach/wallet";

export const dynamic = "force-dynamic";

const topUpSchema = z.object({
  amountCauris: z.number().min(1).max(REACH_TOPUP_MAX_CAURIS),
});

/** Owner Reach wallet balance (platform credits). */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const service = createServiceClient() ?? supabase;
  try {
    await ensureReachWallet(service, user.id);
  } catch {
    return NextResponse.json(
      { error: "Reach wallet missing. Apply migration 074." },
      { status: 503 },
    );
  }
  const balance = await getReachWalletBalance(service, user.id);

  const { data: ledger } = await service
    .from("reach_wallet_ledger")
    .select("id, amount_cauris, reason, campaign_id, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    balanceCauris: balance,
    ledger: ledger ?? [],
    honestNote:
      "These are platform Reach credits for board CPC. Card/Wave/Joko charging for ads is not live yet — balance never invents impressions.",
  });
}

/** Top up platform Reach credits (ledgered — not a card charge). */
export async function POST(req: Request) {
  const limited = builderRateLimit(req);
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Reach wallet not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = topUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Top up 1–${REACH_TOPUP_MAX_CAURIS} Cauris credits.` },
      { status: 400 },
    );
  }

  const result = await topUpReachWallet(service, user.id, parsed.data.amountCauris);
  if ("error" in result) {
    return NextResponse.json(
      {
        error: result.error.includes("ledger")
          ? "Could not top up. Apply migration 074."
          : result.error,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    balanceCauris: result.balance,
    note: "Credits added to ledger. Not charged to a payment method yet.",
  });
}
