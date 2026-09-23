/**
 * Payment adapters — how merchants connect banks / PayPal / JOKO / Wave / Orange Money.
 *
 * Law: never mark an order paid until a verified webhook (or honest manual confirm).
 * UI preferences in site-commerce ≠ live capture.
 *
 * Layers:
 * 1. Preference + instructions — WhatsApp, COD, MM / card / PayPal fallbacks.
 * 2. Live adapters (env-gated): joko · paypal · paystack(card) · wave · orange_money.
 *    Paid only after verified webhook (or PayPal server capture). Browser never sets paid.
 * 3. Merchant connect (per-shop OAuth / encrypted keys) = later slice.
 *
 * Path: place_order / cart → awaiting_payment → adapter URL → webhook/capture → paid.
 */

export type PaymentProviderId =
  | "manual_instructions"
  | "joko"
  | "paypal"
  | "wave"
  | "orange_money"
  | "card"
  | "cod"
  | "whatsapp";

export type PaymentAdapterCheckoutInput = {
  reference: string;
  amountMinor: number;
  currency: string;
  description: string;
  customerPhone?: string;
  customerEmail?: string;
  returnUrl: string;
  cancelUrl: string;
  webhookUrl: string;
  metadata?: Record<string, string>;
};

export type PaymentAdapterCheckoutResult =
  | { ok: true; checkoutUrl: string; providerPaymentId: string }
  | { ok: false; error: string; configured: boolean };

export type PaymentAdapterRefundInput = {
  providerPaymentId: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
  reason?: string;
};

export type PaymentAdapterRefundResult =
  | { ok: true; providerRefundId: string }
  | { ok: false; error: string; retryable: boolean };

export type PaymentAdapterStatusResult =
  | { ok: true; status: "pending" | "paid" | "failed" | "refunded" | "unknown" }
  | { ok: false; error: string };

/** Shared shape every PSP must implement when we wire live capture. */
export type PaymentAdapter = {
  id: PaymentProviderId;
  /** True when env / merchant connect is ready for live charges. */
  isConfigured: () => boolean;
  createCheckout: (input: PaymentAdapterCheckoutInput) => Promise<PaymentAdapterCheckoutResult>;
  /** Optional: adapters that support server-side refunds implement this. */
  refund?: (input: PaymentAdapterRefundInput) => Promise<PaymentAdapterRefundResult>;
  /** Optional: adapters that support payment status polling implement this. */
  getPaymentStatus?: (providerPaymentId: string) => Promise<PaymentAdapterStatusResult>;
};
