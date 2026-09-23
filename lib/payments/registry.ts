import type { PaymentAdapter, PaymentProviderId } from "./adapters";
import { paypalAdapter, paypalConfigured } from "./paypal-adapter";
import { paystackAdapter, paystackConfigured } from "./paystack-adapter";
import {
  orangeMoneyAdapter,
  orangeMoneyConfigured,
  waveAdapter,
  waveConfigured,
} from "./wave-adapter";
import { jokoCheckoutAvailable } from "@/lib/create/site-commerce";

export {
  paypalAdapter,
  paypalConfigured,
  paystackAdapter,
  paystackConfigured,
  waveAdapter,
  waveConfigured,
  orangeMoneyAdapter,
  orangeMoneyConfigured,
};

/** Resolve adapter by provider name (used for refunds/status polling). */
export function getPaymentAdapter(provider: string | null | undefined): import("./adapters").PaymentAdapter | null {
  switch ((provider ?? "").toLowerCase()) {
    case "paystack":
    case "card":
      return paystackAdapter;
    case "paypal":
      return paypalAdapter;
    case "wave":
      return waveAdapter;
    case "orange_money":
    case "orange":
      return orangeMoneyAdapter;
    default:
      return null;
  }
}

/** Resolve live capture adapter for a shop payment preference. */
export function getShopPaymentAdapter(
  preference: string | null | undefined,
): PaymentAdapter | null {
  switch (preference) {
    case "paypal":
      return paypalAdapter;
    case "card":
      return paystackAdapter;
    case "mobile_money":
      // Prefer Wave when configured; Orange when only Orange is set
      if (waveConfigured()) return waveAdapter;
      if (orangeMoneyConfigured()) return orangeMoneyAdapter;
      return null;
    case "joko":
      return null; // JOKO uses existing lib/shop/joko-order path
    default:
      return null;
  }
}

export function shopPaymentAdapterStatus(): Record<
  string,
  { id: PaymentProviderId | "joko"; configured: boolean; label: string }
> {
  return {
    joko: { id: "joko", configured: jokoCheckoutAvailable(), label: "JOKO (Cauris)" },
    paypal: { id: "paypal", configured: paypalConfigured(), label: "PayPal" },
    card: { id: "card", configured: paystackConfigured(), label: "Card (Paystack)" },
    wave: { id: "wave", configured: waveConfigured(), label: "Wave" },
    orange_money: {
      id: "orange_money",
      configured: orangeMoneyConfigured(),
      label: "Orange Money",
    },
  };
}

/**
 * Provider capability matrix — honest per-provider support table.
 *
 * checkout:       Redirect-based PSP checkout session supported.
 * webhook_paid:   Provider sends a verifiable webhook on payment success.
 * server_refund:  Server-side API refund (adapter.refund) is implemented and callable.
 * status_poll:    Server-side payment status lookup (adapter.getPaymentStatus) is available.
 * amount_verify:  Provider sends an authoritative charge amount in the webhook payload
 *                 (not just metadata Kebu supplied at checkout time).
 * cauris_lineage: Amounts use Cauris (Joko internal settlement unit); full conversion
 *                 lineage is stored on the order for refund/reconciliation.
 * manual_only:    No server-side automation; operator resolves via WhatsApp/dashboard.
 */
export type ProviderCapability =
  | "checkout"
  | "webhook_paid"
  | "server_refund"
  | "status_poll"
  | "amount_verify"
  | "cauris_lineage"
  | "manual_only";

export const PROVIDER_CAPABILITY_MATRIX: Record<
  string,
  { label: string; supported: ProviderCapability[]; unsupported: ProviderCapability[] }
> = {
  paystack: {
    label: "Paystack (card)",
    supported: ["checkout", "webhook_paid", "server_refund", "amount_verify"],
    unsupported: ["status_poll", "cauris_lineage"],
  },
  paypal: {
    label: "PayPal",
    supported: ["checkout", "webhook_paid"],
    // PayPal refund API exists but adapter.refund is not yet implemented.
    // PayPal IPN/webhook does carry authoritative amount (data.amount) but
    // we are not using it yet; amount_verify is excluded until wired.
    unsupported: ["server_refund", "status_poll", "amount_verify", "cauris_lineage"],
  },
  wave: {
    label: "Wave",
    supported: ["checkout", "webhook_paid"],
    // Wave webhook payload does include checkout amount but the handler does not
    // extract it for verification yet.
    unsupported: ["server_refund", "status_poll", "amount_verify", "cauris_lineage"],
  },
  orange_money: {
    label: "Orange Money",
    supported: ["checkout", "webhook_paid"],
    unsupported: ["server_refund", "status_poll", "amount_verify", "cauris_lineage"],
  },
  joko: {
    label: "JOKO (Cauris)",
    supported: ["checkout", "webhook_paid", "cauris_lineage"],
    // Joko refund API is not yet implemented; amount_verify: joko webhook carries
    // amount but the handler does not validate it against data.amount yet.
    unsupported: ["server_refund", "status_poll", "amount_verify"],
  },
  manual_instructions: {
    label: "Manual / WhatsApp",
    supported: ["manual_only"],
    unsupported: ["checkout", "webhook_paid", "server_refund", "status_poll", "amount_verify", "cauris_lineage"],
  },
};
