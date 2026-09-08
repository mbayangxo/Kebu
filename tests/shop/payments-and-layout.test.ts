import { describe, expect, it } from "vitest";
import {
  commercePaymentLabels,
  commercePaymentOptions,
  mergeSiteCommerce,
  siteCommerceSchema,
} from "@/lib/create/site-commerce";
import { websiteDefinitionSchema } from "@/lib/create/website-schema";

describe("site commerce payments", () => {
  it("merges payment toggles without wiping WhatsApp", () => {
    const next = mergeSiteCommerce(
      { acceptCod: true, acceptMobileMoney: true, acceptCard: true, acceptPaypal: true },
      { merchantWhatsApp: "+221770000000", acceptWhatsApp: true },
    );
    expect(next.merchantWhatsApp).toBe("+221770000000");
    expect(next.acceptCod).toBe(true);
    expect(next.acceptMobileMoney).toBe(true);
    expect(next.acceptCard).toBe(true);
    expect(next.acceptPaypal).toBe(true);
    expect(next.acceptWhatsApp).toBe(true);
  });

  it("lists honest payment labels including card and PayPal", () => {
    const labels = commercePaymentLabels(
      siteCommerceSchema.parse({
        acceptWhatsApp: true,
        acceptCod: true,
        acceptMobileMoney: true,
        acceptCard: true,
        acceptPaypal: true,
        mobileMoneyLabel: "Wave",
        cardLabel: "Visa / Mastercard",
        paypalLabel: "PayPal",
        preferJokoCheckout: true,
      }),
    );
    expect(labels).toContain("WhatsApp");
    expect(labels).toContain("Pay on delivery");
    expect(labels).toContain("Wave");
    expect(labels).toContain("Visa / Mastercard");
    expect(labels).toContain("PayPal");
    expect(labels).toContain("Joko · Cauris");
  });

  it("puts Joko first and marks it recommended when enabled", () => {
    const opts = commercePaymentOptions(
      siteCommerceSchema.parse({
        acceptWhatsApp: true,
        preferJokoCheckout: true,
        acceptMobileMoney: true,
      }),
    );
    expect(opts[0]?.id).toBe("joko");
    expect(opts[0]?.label).toBe("Joko (Cauris)");
    expect(opts[0]?.recommended).toBe(true);
    expect(opts[0]?.hint).toMatch(/Cauris/);
    expect(opts.map((o) => o.id)).toEqual(["joko", "whatsapp", "mobile_money"]);
  });

  it("shows Pay X Cauris when amount is known", () => {
    const opts = commercePaymentOptions(
      siteCommerceSchema.parse({ preferJokoCheckout: true, acceptWhatsApp: true }),
      { amountXof: 6000 },
    );
    expect(opts[0]?.hint).toMatch(/^Pay 10 Cauris/);
  });

  it("exposes card and PayPal on the public order picker", () => {
    const opts = commercePaymentOptions(
      siteCommerceSchema.parse({
        acceptWhatsApp: false,
        acceptCard: true,
        acceptPaypal: true,
        cardInstructions: "I will send a card link.",
        paypalHandle: "paypal.me/kebu",
      }),
    );
    expect(opts.map((o) => o.id)).toEqual(["card", "paypal"]);
    expect(opts.find((o) => o.id === "paypal")?.hint).toContain("paypal.me");
  });
});

describe("products section layout", () => {
  it("accepts grid layout and columns on products sections", () => {
    const parsed = websiteDefinitionSchema.safeParse({
      schemaVersion: "website-v1",
      title: "Shop test",
      theme: {
        primary: "#000000",
        accent: "#E9006B",
        background: "#ffffff",
        text: "#111111",
        fontDisplay: "system-ui",
        fontBody: "system-ui",
        spacing: "comfortable",
      },
      pages: [
        {
          slug: "shop",
          title: "Shop",
          sections: [
            {
              id: "p1",
              type: "products",
              props: {
                heading: "Merch",
                layout: "grid-dense",
                columns: 4,
                items: [{ name: "Tee", description: "", priceLabel: "5k", imageUrl: "" }],
              },
            },
          ],
        },
      ],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const props = parsed.data.pages[0]!.sections[0]!.props as {
        layout?: string;
        columns?: number;
      };
      expect(props.layout).toBe("grid-dense");
      expect(props.columns).toBe(4);
    }
  });
});
