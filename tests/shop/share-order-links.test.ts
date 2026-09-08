import { describe, expect, it } from "vitest";
import { shareChannelHrefs, productShareUrl, buildOrderShareText } from "@/lib/shop/share-order-links";

describe("Senegal share-to-order links", () => {
  it("builds product deep links with from channel", () => {
    expect(productShareUrl("https://shop.example/sites/awa", "p1")).toContain("product=p1");
    expect(productShareUrl("https://shop.example/sites/awa", "p1")).toContain("from=share");
    expect(productShareUrl("https://shop.example/sites/awa/shop", "p1", "qr")).toContain("from=qr");
    expect(productShareUrl("https://shop.example/sites/awa/shop", "p1")).toContain("/shop?");
  });

  it("builds WhatsApp + social share hrefs with Wave/JOKO when set", () => {
    const channels = shareChannelHrefs(
      {
        storeUrl: "https://app.kebu.africa/sites/awa",
        productName: "Boubou",
        priceLabel: "25 000 XOF",
        productId: "abc",
        businessName: "Chez Awa",
      },
      {
        merchantWhatsApp: "+221771234567",
        acceptWhatsApp: true,
        acceptCod: false,
        acceptMobileMoney: true,
        acceptCard: false,
        acceptPaypal: false,
        paymentInstructions: "",
        cardInstructions: "",
        paypalHandle: "",
        mobileMoneyLabel: "Wave",
        cardLabel: "Card",
        paypalLabel: "PayPal",
        preferJokoCheckout: false,
        wavePayLink: "https://pay.wave.com/demo",
        jokoPayLink: "https://joko.example/pay",
        shareTagline: "New drop · Dakar",
      },
    );
    expect(channels.whatsapp).toContain("wa.me/221771234567");
    expect(channels.wave).toBe("https://pay.wave.com/demo");
    expect(channels.joko).toBe("https://joko.example/pay");
    expect(channels.facebook).toContain("facebook.com/sharer");
    expect(channels.copyText).toContain("Boubou");
    expect(channels.qrUrl).toContain("product=abc");
    expect(channels.qrUrl).toContain("from=qr");
    expect(channels.facebook).toContain("from%3Dsocial");
  });

  it("share text mentions pay paths Senegal uses", () => {
    const text = buildOrderShareText({
      storeUrl: "https://x/sites/y",
      productName: "Savon",
      priceLabel: "2 000 XOF",
    });
    expect(text.toLowerCase()).toContain("whatsapp");
    expect(text.toLowerCase()).toContain("wave");
  });
});
