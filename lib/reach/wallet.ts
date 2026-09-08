import type { SupabaseClient } from "@supabase/supabase-js";
import { REACH_TOPUP_MAX_CAURIS, roundCauris } from "@/lib/reach/auction";

export async function getReachWalletBalance(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<number> {
  const { data } = await supabase
    .from("reach_wallets")
    .select("balance_cauris")
    .eq("owner_id", ownerId)
    .maybeSingle();
  return roundCauris(Number(data?.balance_cauris ?? 0));
}

/** Ensure wallet row exists; return balance. */
export async function ensureReachWallet(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<number> {
  const { data } = await supabase
    .from("reach_wallets")
    .select("balance_cauris")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (data) return roundCauris(Number(data.balance_cauris));
  const { error } = await supabase.from("reach_wallets").insert({ owner_id: ownerId, balance_cauris: 0 });
  if (error && !error.message.toLowerCase().includes("duplicate")) {
    /* race: another request inserted */
  }
  return getReachWalletBalance(supabase, ownerId);
}

/**
 * Top up platform Reach credits (not a card charge — honest ledger only).
 * Uses service-capable client for ledger insert when RLS blocks.
 */
export async function topUpReachWallet(
  supabase: SupabaseClient,
  ownerId: string,
  amount: number,
): Promise<{ balance: number } | { error: string }> {
  const amt = roundCauris(amount);
  if (amt < 1 || amt > REACH_TOPUP_MAX_CAURIS) {
    return { error: `Top up between 1 and ${REACH_TOPUP_MAX_CAURIS} Cauris credits.` };
  }

  await ensureReachWallet(supabase, ownerId);
  const current = await getReachWalletBalance(supabase, ownerId);
  const next = roundCauris(current + amt);
  if (next > 10_000_000) return { error: "Wallet balance too high." };

  const { error: upErr } = await supabase
    .from("reach_wallets")
    .update({ balance_cauris: next })
    .eq("owner_id", ownerId);
  if (upErr) return { error: "Could not update wallet." };

  const { error: ledErr } = await supabase.from("reach_wallet_ledger").insert({
    owner_id: ownerId,
    amount_cauris: amt,
    reason: "top_up_platform_credits",
    meta: { note: "Platform Reach credits — not charged to card/Wave yet" },
  });
  if (ledErr) {
    /* best-effort rollback */
    await supabase.from("reach_wallets").update({ balance_cauris: current }).eq("owner_id", ownerId);
    return { error: "Could not record ledger. Apply migration 074." };
  }

  return { balance: next };
}

/**
 * Charge CPC for a board click: wallet + campaign spent.
 * Service role recommended for atomicity across owners.
 */
export async function chargeBoardClickCpc(
  service: SupabaseClient,
  opts: {
    ownerId: string;
    campaignId: string;
    bidCpc: number;
    budgetCap: number;
    spent: number;
  },
): Promise<{ charged: number } | { error: string }> {
  const bid = roundCauris(opts.bidCpc);
  if (bid <= 0) return { error: "Invalid bid." };

  const remaining = roundCauris(opts.budgetCap - opts.spent);
  const charge = roundCauris(Math.min(bid, remaining));
  if (charge <= 0) return { error: "Campaign budget exhausted." };

  const balance = await getReachWalletBalance(service, opts.ownerId);
  if (balance < charge) return { error: "Insufficient Reach wallet balance." };

  const nextBal = roundCauris(balance - charge);
  const nextSpent = roundCauris(opts.spent + charge);

  const { error: wErr } = await service
    .from("reach_wallets")
    .update({ balance_cauris: nextBal })
    .eq("owner_id", opts.ownerId);
  if (wErr) return { error: "Wallet charge failed." };

  const { error: cErr } = await service
    .from("reach_campaigns")
    .update({ spent_cauris: nextSpent })
    .eq("id", opts.campaignId)
    .eq("owner_id", opts.ownerId);
  if (cErr) {
    await service.from("reach_wallets").update({ balance_cauris: balance }).eq("owner_id", opts.ownerId);
    return { error: "Campaign spend update failed." };
  }

  await service.from("reach_wallet_ledger").insert({
    owner_id: opts.ownerId,
    amount_cauris: -charge,
    reason: "board_click_cpc",
    campaign_id: opts.campaignId,
    meta: { bid_cpc: bid },
  });

  return { charged: charge };
}
