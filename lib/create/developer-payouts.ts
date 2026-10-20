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

  // Always use the destination on file — never trust a caller-supplied one, matching the RLS policy exactly.
  const { data, error } = await supabase
    .from("developer_payouts")
    .insert({
      developer_id: profile.id,
      amount_cents: Math.round(input.amountCents),
      currency: input.currency ?? "XOF",
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
