import { describe, expect, it } from "vitest";
import {
  railFromPaymentPreference,
  railFromProvider,
} from "@/lib/shop/payment-ledger";
import { defaultPaymentPreference } from "@/lib/create/site-commerce";

describe("payment ledger rails", () => {
  it("maps preferences and providers", () => {
    expect(railFromPaymentPreference("joko")).toBe("joko");
    expect(railFromPaymentPreference("mobile_money")).toBe("mobile_money");
    expect(railFromProvider("paystack")).toBe("paystack");
    expect(railFromProvider("wave")).toBe("wave");
  });
});

describe("defaultPaymentPreference", () => {
  it("defaults to joko when native rail is offered", () => {
    expect(
      defaultPaymentPreference({
        merchantWhatsApp: "",
        acceptWhatsApp: true,
        acceptCod: false,
        acceptMobileMoney: false,
        acceptCard: false,
        acceptPaypal: false,
        paymentInstructions: "",
        cardInstructions: "",
        paypalHandle: "",
        mobileMoneyLabel: "Mobile money",
        cardLabel: "Card",
        paypalLabel: "PayPal",
        preferJokoCheckout: true,
        wavePayLink: "",
        jokoPayLink: "",
        shareTagline: "",
      }),
    ).toBe("joko");
  });
});
