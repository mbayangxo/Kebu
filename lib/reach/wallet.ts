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
 * Charge CPC for a board click: wallet + campaign spent, atomically.
 * Delegates to public.charge_board_click_cpc() (migration
 * 20261027020000_reach_board_click_cpc_atomic.sql) rather than reading
 * balance/spent here and writing them back — this endpoint is public and
 * unauthenticated, so two concurrent board_click events for the same
 * campaign are a real, easily-triggered case, and a read-then-write here
 * would race exactly like the old version did (see that migration's header
 * for the failure mode). The SQL function re-reads and locks the real rows
 * at charge time instead of trusting values read earlier in the request.
 */
export async function chargeBoardClickCpc(
  service: SupabaseClient,
  opts: {
    ownerId: string;
    campaignId: string;
    bidCpc: number;
  },
): Promise<{ charged: number } | { error: string }> {
  const bid = roundCauris(opts.bidCpc);
  if (bid <= 0) return { error: "Invalid bid." };

  const { data, error } = await service.rpc("charge_board_click_cpc", {
    p_owner_id: opts.ownerId,
    p_campaign_id: opts.campaignId,
    p_bid_cpc: bid,
  });

  if (error) {
    const msg = error.message || "";
    if (msg.includes("budget_exhausted")) return { error: "Campaign budget exhausted." };
    if (msg.includes("insufficient_balance")) return { error: "Insufficient Reach wallet balance." };
    if (msg.includes("campaign_not_found")) return { error: "Campaign not found." };
    if (msg.includes("invalid_bid")) return { error: "Invalid bid." };
    return { error: "Could not charge board click." };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const charged = roundCauris(Number(row?.charged ?? 0));
  if (charged <= 0) return { error: "Campaign budget exhausted." };
  return { charged };
}
