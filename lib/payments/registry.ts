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
