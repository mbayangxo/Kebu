/**
 * Developer payout disbursement — the outbound counterpart to checkout.
 *
 * Every payment adapter in this codebase (joko, wave, paystack, paypal —
 * see payments/registry.ts) only COLLECTS money: a customer pays into one
 * platform-level account (WAVE_API_KEY, JOKO_API_SECRET, etc.). None of
 * them, nor anything else in this codebase, ever sends money back OUT to a
 * seller or developer — confirmed by reading every payment-adjacent file
 * before writing this one, not assumed.
 *
 * This module is that missing outbound half, built the same way every other
 * adapter here is: env-gated, real HTTP calls, `configured()` reports false
 * (not a crash) when credentials are absent. What's genuinely different
 * from checkout: Wave's and Orange Money's disbursement/B2C APIs are not
 * self-serve — they need a negotiated merchant/partner contract with each
 * provider, so this cannot be "finished" from inside this sandbox. The
 * endpoint shape below (POST a disbursement, poll its externalId for
 * status) matches the publicly described pattern as of October 2026, but
 * is NOT verified against Wave's or Orange's own developer documentation —
 * confirm the exact path, auth and payload with their business/partner
 * team before this ever runs against real money. Until real credentials
 * exist, callers fall back to a durable manual-payout record (see
 * lib/create/developer-payouts.ts), which is the real, working path today.
 */

export type PayoutRequestInput = {
  /** Idempotency key — must be stable for retries of the same payout. */
  reference: string;
  amountXof: number;
  destinationPhone: string;
  destinationAccountName: string;
  reason: string;
};

export type PayoutResult =
  | { ok: true; providerReference: string; status: "processing" | "paid" }
  | { ok: false; error: string; configured: boolean };

export function wavePayoutConfigured(): boolean {
  return Boolean(process.env.WAVE_PAYOUT_API_KEY?.trim());
}

function wavePayoutBase(): string {
  return (process.env.WAVE_PAYOUT_API_BASE_URL ?? "https://api.wave.com").replace(/\/$/, "");
}

/** Wave Business B2C disbursement — requires a disbursement-enabled Wave merchant contract. */
export async function sendWavePayout(input: PayoutRequestInput): Promise<PayoutResult> {
  const key = process.env.WAVE_PAYOUT_API_KEY?.trim();
  if (!key) {
    return {
      ok: false,
      configured: false,
      error: "Wave payouts are not configured on this server. Set WAVE_PAYOUT_API_KEY once Wave approves disbursement access.",
    };
  }

  const res = await fetch(`${wavePayoutBase()}/v1/business/disbursements`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.reference.slice(0, 120),
    },
    body: JSON.stringify({
      external_id: input.reference,
      amount: String(Math.max(1, Math.round(input.amountXof))),
      currency: "XOF",
      receive_phone_number: input.destinationPhone,
      receive_name: input.destinationAccountName,
      reason: input.reason.slice(0, 200),
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    id?: string;
    external_id?: string;
    status?: string;
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      configured: true,
      error: data.error || data.message || `Wave payout failed (${res.status}).`,
    };
  }

  const providerReference = data.id || data.external_id;
  if (!providerReference) {
    return { ok: false, configured: true, error: "Wave did not return a disbursement id." };
  }

  return {
    ok: true,
    providerReference,
    status: data.status === "succeeded" || data.status === "paid" ? "paid" : "processing",
  };
}

export function orangeMoneyPayoutConfigured(): boolean {
  return Boolean(process.env.ORANGE_MONEY_PAYOUT_API_KEY?.trim());
}

function orangeMoneyPayoutBase(): string {
  return (process.env.ORANGE_MONEY_PAYOUT_API_BASE_URL ?? "https://api.orange.com/orange-money-webpay").replace(/\/$/, "");
}

/** Orange Money for Business B2C disbursement — requires a disbursement-enabled Orange merchant contract. */
export async function sendOrangeMoneyPayout(input: PayoutRequestInput): Promise<PayoutResult> {
  const key = process.env.ORANGE_MONEY_PAYOUT_API_KEY?.trim();
  if (!key) {
    return {
      ok: false,
      configured: false,
      error: "Orange Money payouts are not configured on this server. Set ORANGE_MONEY_PAYOUT_API_KEY once Orange approves disbursement access.",
    };
  }

  const res = await fetch(`${orangeMoneyPayoutBase()}/v1/transfers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.reference.slice(0, 120),
    },
    body: JSON.stringify({
      reference: input.reference,
      amount: Math.max(1, Math.round(input.amountXof)),
      currency: "XOF",
      receiver_msisdn: input.destinationPhone,
      receiver_name: input.destinationAccountName,
      description: input.reason.slice(0, 200),
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    transaction_id?: string;
    status?: string;
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      configured: true,
      error: data.error || data.message || `Orange Money payout failed (${res.status}).`,
    };
  }

  if (!data.transaction_id) {
    return { ok: false, configured: true, error: "Orange Money did not return a transaction id." };
  }

  return {
    ok: true,
    providerReference: data.transaction_id,
    status: data.status === "success" || data.status === "completed" ? "paid" : "processing",
  };
}

export function sendPayout(method: "wave" | "orange_money", input: PayoutRequestInput): Promise<PayoutResult> {
  return method === "wave" ? sendWavePayout(input) : sendOrangeMoneyPayout(input);
}

export function payoutProviderConfigured(method: "wave" | "orange_money"): boolean {
  return method === "wave" ? wavePayoutConfigured() : orangeMoneyPayoutConfigured();
}
