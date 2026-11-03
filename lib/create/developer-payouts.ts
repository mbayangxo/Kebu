import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPayout, payoutProviderConfigured } from "@/lib/payments/payout-adapter";

export const PAYOUT_METHODS = ["wave", "orange_money"] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export type DeveloperPayoutSettings = {
  payoutMethod: PayoutMethod | null;
  payoutPhone: string | null;
  payoutAccountName: string | null;
  complete: boolean;
};

export type DeveloperPayoutRow = {
  id: string;
  developer_id: string;
  amount_cents: number;
  currency: string;
  method: PayoutMethod;
  destination_phone: string;
  destination_account_name: string;
  status: "requested" | "processing" | "paid" | "failed";
  provider_reference: string | null;
  failure_reason: string | null;
  requested_at: string;
  processed_at: string | null;
  note: string | null;
};

function tableMissing(message: string | undefined): boolean {
  return Boolean(message?.includes("does not exist") || message?.includes("schema cache"));
}

/** The documented split (see 20261020030000_studio_creative_assets_marketplace.sql's comment): seller keeps 80%, Kebu keeps 20%. */
const SELLER_SHARE = 0.8;

export type DeveloperEarningsSummary = {
  /** What buyers actually paid for this developer's listings (USD cents), from completed sales only. */
  grossSalesUsdCents: number;
  /** grossSalesUsdCents * 80% — the seller's real entitlement. */
  sellerShareUsdCents: number;
  /** Already requested, processing, or paid out — reserved against the share above. */
  claimedUsdCents: number;
  /** sellerShareUsdCents - claimedUsdCents, floored at 0 — what's left to request. */
  availableUsdCents: number;
};

/** Converts a whole-XOF amount to USD cents using the same rate Wave checkout quotes with (lib/payments/wave-adapter.ts). Returns null when unconfigured, rather than guessing a rate. */
function xofToUsdCents(xof: number): number | null {
  const raw = process.env.WAVE_XOF_PER_USD?.trim();
  const rate = raw ? Number(raw) : NaN;
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return Math.round((xof / rate) * 100);
}

/**
 * Real seller-earnings balance, computed from completed sales — not a number a
 * developer types in. Sums what buyers actually paid (aesthetic_library +
 * creative_asset_library rows with status='owned', tied to this developer's
 * own listings), applies the 80% seller share, then subtracts every payout
 * already requested/processing/paid so the same dollar can't be claimed twice.
 */
export async function getDeveloperEarningsSummary(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: true; summary: DeveloperEarningsSummary } | { ok: false; status: number; error: string }> {
  const empty: DeveloperEarningsSummary = { grossSalesUsdCents: 0, sellerShareUsdCents: 0, claimedUsdCents: 0, availableUsdCents: 0 };

  const { data: profile, error: profileErr } = await supabase
    .from("developer_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileErr) return { ok: false, status: 500, error: profileErr.message };
  if (!profile) return { ok: true, summary: empty };

  let grossSalesUsdCents = 0;

  const { data: templates, error: templatesErr } = await supabase
    .from("marketplace_templates")
    .select("id")
    .eq("developer_id", profile.id);
  if (templatesErr) return { ok: false, status: 500, error: templatesErr.message };
  const templateIds = (templates ?? []).map((t) => (t as { id: string }).id);
  if (templateIds.length > 0) {
    const { data: sales, error: salesErr } = await supabase
      .from("aesthetic_library")
      .select("amount_usd_cents")
      .eq("status", "owned")
      .in("marketplace_id", templateIds);
    if (salesErr) return { ok: false, status: 500, error: salesErr.message };
    for (const row of sales ?? []) grossSalesUsdCents += (row as { amount_usd_cents: number | null }).amount_usd_cents ?? 0;
  }

  const { data: assets, error: assetsErr } = await supabase
    .from("marketplace_creative_assets")
    .select("id")
    .eq("developer_id", profile.id);
  if (assetsErr) return { ok: false, status: 500, error: assetsErr.message };
  const assetIds = (assets ?? []).map((a) => (a as { id: string }).id);
  if (assetIds.length > 0) {
    const { data: sales, error: salesErr } = await supabase
      .from("creative_asset_library")
      .select("amount_cents")
      .eq("status", "owned")
      .in("asset_id", assetIds);
    if (salesErr) return { ok: false, status: 500, error: salesErr.message };
    for (const row of sales ?? []) grossSalesUsdCents += (row as { amount_cents: number | null }).amount_cents ?? 0;
  }

  const sellerShareUsdCents = Math.round(grossSalesUsdCents * SELLER_SHARE);

  const { data: claimedRows, error: claimedErr } = await supabase
    .from("developer_payouts")
    .select("amount_cents, currency")
    .eq("developer_id", profile.id)
    .in("status", ["requested", "processing", "paid"]);
  if (claimedErr) return { ok: false, status: 500, error: claimedErr.message };
  let claimedUsdCents = 0;
  for (const row of claimedRows ?? []) {
    const r = row as { amount_cents: number; currency: string };
    claimedUsdCents += r.currency === "USD" ? r.amount_cents : xofToUsdCents(r.amount_cents) ?? 0;
  }

  const availableUsdCents = Math.max(0, sellerShareUsdCents - claimedUsdCents);
  return { ok: true, summary: { grossSalesUsdCents, sellerShareUsdCents, claimedUsdCents, availableUsdCents } };
}

export async function getDeveloperPayoutSettings(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: true; settings: DeveloperPayoutSettings | null } | { ok: false; status: number; error: string }> {
  const { data, error } = await supabase
    .from("developer_profiles")
    .select("payout_method, payout_phone, payout_account_name")
    .eq("user_id", userId)
    .maybeSingle();
  if (error && tableMissing(error.message)) {
    return { ok: false, status: 503, error: "Developer profile table missing — apply the payout settings migration." };
  }
  if (error) return { ok: false, status: 500, error: error.message };
  if (!data) return { ok: true, settings: null };

  const settings: DeveloperPayoutSettings = {
    payoutMethod: (data.payout_method as PayoutMethod | null) ?? null,
    payoutPhone: data.payout_phone ?? null,
    payoutAccountName: data.payout_account_name ?? null,
    complete: Boolean(data.payout_method && data.payout_phone && data.payout_account_name),
  };
  return { ok: true, settings };
}

export async function setDeveloperPayoutDestination(
  supabase: SupabaseClient,
  userId: string,
  input: { method: PayoutMethod; phone: string; accountName: string },
): Promise<{ ok: true; settings: DeveloperPayoutSettings } | { ok: false; status: number; error: string }> {
  const phone = input.phone.trim();
  const accountName = input.accountName.trim();
  if (phone.length < 8 || phone.length > 20) {
    return { ok: false, status: 400, error: "Enter a valid phone number for payouts." };
  }
  if (!accountName) {
    return { ok: false, status: 400, error: "Enter the name on the payout account." };
  }

  const { data: profile, error: profileErr } = await supabase
    .from("developer_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileErr) return { ok: false, status: 500, error: profileErr.message };
  if (!profile) {
    return { ok: false, status: 404, error: "Create a developer account before setting up payouts." };
  }

  const { data, error } = await supabase
    .from("developer_profiles")
    .update({ payout_method: input.method, payout_phone: phone, payout_account_name: accountName })
    .eq("id", profile.id)
    .select("payout_method, payout_phone, payout_account_name")
    .single();
  if (error || !data) return { ok: false, status: 500, error: error?.message ?? "Could not save payout settings." };

  return {
    ok: true,
    settings: {
      payoutMethod: data.payout_method as PayoutMethod,
      payoutPhone: data.payout_phone,
      payoutAccountName: data.payout_account_name,
      complete: true,
    },
  };
}

export async function requestDeveloperPayout(
  supabase: SupabaseClient,
  userId: string,
  input: { amountCents: number; currency?: "XOF" | "USD" },
): Promise<{ ok: true; payout: DeveloperPayoutRow } | { ok: false; status: number; error: string }> {
  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) {
    return { ok: false, status: 400, error: "Enter a payout amount greater than zero." };
  }

  const { data: profile, error: profileErr } = await supabase
    .from("developer_profiles")
    .select("id, payout_method, payout_phone, payout_account_name")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileErr) return { ok: false, status: 500, error: profileErr.message };
  if (!profile) return { ok: false, status: 404, error: "Create a developer account first." };
  if (!profile.payout_method || !profile.payout_phone || !profile.payout_account_name) {
    return { ok: false, status: 400, error: "Set up your payout destination before requesting a payout." };
  }

  const currency = input.currency ?? "USD";
  const requestedUsdCents = currency === "USD" ? Math.round(input.amountCents) : xofToUsdCents(input.amountCents);
  if (requestedUsdCents == null) {
    return { ok: false, status: 400, error: "XOF payout conversion is unavailable right now. Request in USD." };
  }
  const earnings = await getDeveloperEarningsSummary(supabase, userId);
  if (!earnings.ok) return earnings;
  if (requestedUsdCents > earnings.summary.availableUsdCents) {
    const availableDisplay = (earnings.summary.availableUsdCents / 100).toFixed(2);
    return {
      ok: false,
      status: 400,
      error: `You can request at most $${availableDisplay} — that's your real balance from completed sales minus payouts already requested or paid.`,
    };
  }

  // Always use the destination on file — never trust a caller-supplied one, matching the RLS policy exactly.
  const { data, error } = await supabase
    .from("developer_payouts")
    .insert({
      developer_id: profile.id,
      amount_cents: Math.round(input.amountCents),
      currency,
      method: profile.payout_method,
      destination_phone: profile.payout_phone,
      destination_account_name: profile.payout_account_name,
    })
    .select("*")
    .single();
  if (error && tableMissing(error.message)) {
    return { ok: false, status: 503, error: "Payout tables missing — apply the payout settings migration." };
  }
  if (error || !data) return { ok: false, status: 500, error: error?.message ?? "Could not request a payout." };

  return { ok: true, payout: data as DeveloperPayoutRow };
}

export async function listMyDeveloperPayouts(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: true; items: DeveloperPayoutRow[] } | { ok: false; status: number; error: string }> {
  const { data: profile, error: profileErr } = await supabase
    .from("developer_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileErr) return { ok: false, status: 500, error: profileErr.message };
  if (!profile) return { ok: true, items: [] };

  const { data, error } = await supabase
    .from("developer_payouts")
    .select("*")
    .eq("developer_id", profile.id)
    .order("requested_at", { ascending: false });
  if (error) return { ok: false, status: 500, error: error.message };
  return { ok: true, items: (data ?? []) as DeveloperPayoutRow[] };
}

// --- Admin (service-role client; caller must already have verified admin access) ---

export async function listPendingDeveloperPayouts(
  supabase: SupabaseClient,
): Promise<{ ok: true; items: (DeveloperPayoutRow & { developerName: string })[] } | { ok: false; status: number; error: string }> {
  const { data, error } = await supabase
    .from("developer_payouts")
    .select("*, developer_profiles(display_name)")
    .in("status", ["requested", "processing"])
    .order("requested_at", { ascending: true });
  if (error) return { ok: false, status: 500, error: error.message };

  const items = (data ?? []).map((row) => {
    const r = row as DeveloperPayoutRow & { developer_profiles?: { display_name?: string } | { display_name?: string }[] | null };
    const dp = r.developer_profiles;
    const name = Array.isArray(dp) ? dp[0]?.display_name : dp?.display_name;
    return { ...r, developerName: name ?? "Unknown developer" };
  });
  return { ok: true, items };
}

/** Attempt real disbursement if configured; otherwise this stays a durable "requested" record for manual processing. */
export async function processDeveloperPayout(
  supabase: SupabaseClient,
  payoutId: string,
  adminUserId: string | null,
): Promise<{ ok: true; status: "paid" | "processing"; viaRealDisbursement: boolean } | { ok: false; status: number; error: string }> {
  const { data: payout, error: readErr } = await supabase
    .from("developer_payouts")
    .select("*")
    .eq("id", payoutId)
    .maybeSingle();
  if (readErr) return { ok: false, status: 500, error: readErr.message };
  if (!payout) return { ok: false, status: 404, error: "Payout not found." };
  if (payout.status === "paid") return { ok: true, status: "paid", viaRealDisbursement: false };

  if (!payoutProviderConfigured(payout.method as PayoutMethod)) {
    return {
      ok: false,
      status: 503,
      error: `${payout.method === "wave" ? "Wave" : "Orange Money"} payout API is not configured. Send this payout manually, then use markDeveloperPayoutPaid.`,
    };
  }

  const result = await sendPayout(payout.method as PayoutMethod, {
    reference: payout.id,
    amountXof: payout.amount_cents,
    destinationPhone: payout.destination_phone,
    destinationAccountName: payout.destination_account_name,
    reason: `Kebu Creative Assets Marketplace payout`,
  });

  if (!result.ok) {
    await supabase
      .from("developer_payouts")
      .update({ status: "failed", failure_reason: result.error, processed_at: new Date().toISOString(), processed_by: adminUserId })
      .eq("id", payoutId);
    return { ok: false, status: 502, error: result.error };
  }

  await supabase
    .from("developer_payouts")
    .update({
      status: result.status,
      provider_reference: result.providerReference,
      processed_at: new Date().toISOString(),
      processed_by: adminUserId,
    })
    .eq("id", payoutId);

  return { ok: true, status: result.status, viaRealDisbursement: true };
}

/** Honest manual path: an admin actually sent the money (Wave/Orange Money/bank) outside the app and records it here. */
export async function markDeveloperPayoutPaid(
  supabase: SupabaseClient,
  payoutId: string,
  adminUserId: string | null,
  note?: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { error } = await supabase
    .from("developer_payouts")
    .update({ status: "paid", processed_at: new Date().toISOString(), processed_by: adminUserId, note: note?.trim().slice(0, 500) || null })
    .eq("id", payoutId);
  if (error) return { ok: false, status: 500, error: error.message };
  return { ok: true };
}
