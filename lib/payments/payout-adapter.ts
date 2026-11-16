/**
 * Outbound payout capability boundary. Automated disbursement is NOT accepted.
 * Provider credentials alone must never activate guessed transfer requests.
 * Collection/checkout adapters are separate and are unchanged by this hold.
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

/**
 * Release hold: keys are not evidence that the outbound contract is implemented.
 * The previous HTTP paths/payloads were unverified, and dispatch lacks atomic
 * balance reservation and uncertain-result reconciliation. Do not add a secret
 * or an environment flag to bypass this hold. Implement and accept the complete
 * payout slice described in docs/product/KEBU-JOKKO-PAYOUTS.md first.
 */
export function wavePayoutConfigured(): boolean {
  return false;
}
export function orangeMoneyPayoutConfigured(): boolean {
  return false;
}

const PAYOUT_RELEASE_HOLD =
  "Automated payouts are disabled pending verified provider contracts, atomic reservations and reconciliation. An authorized operator can record a separately verified manual transfer.";

export async function sendWavePayout(
  input: PayoutRequestInput,
): Promise<PayoutResult> {
  void input;
  return { ok: false, configured: false, error: PAYOUT_RELEASE_HOLD };
}
export async function sendOrangeMoneyPayout(
  input: PayoutRequestInput,
): Promise<PayoutResult> {
  void input;
  return { ok: false, configured: false, error: PAYOUT_RELEASE_HOLD };
}

export function sendPayout(
  method: "wave" | "orange_money",
  input: PayoutRequestInput,
): Promise<PayoutResult> {
  return method === "wave"
    ? sendWavePayout(input)
    : sendOrangeMoneyPayout(input);
}

export function payoutProviderConfigured(
  method: "wave" | "orange_money",
): boolean {
  return method === "wave"
    ? wavePayoutConfigured()
    : orangeMoneyPayoutConfigured();
}
