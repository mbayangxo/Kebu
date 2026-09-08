import { describe, expect, it } from "vitest";
import {
  cartDraftItemCount,
  recoveryWhatsAppMessage,
} from "@/lib/shop/cart-drafts";

describe("abandoned cart drafts", () => {
  it("counts cart draft items", () => {
    expect(cartDraftItemCount([])).toBe(0);
    expect(
      cartDraftItemCount([
        { productId: "a", quantity: 2 },
        { productId: "b", quantity: 1 },
      ]),
    ).toBe(3);
  });

  it("builds recovery copy without claiming paid", () => {
    const msg = recoveryWhatsAppMessage({
      shopName: "RECT",
      siteUrl: "https://kebu.africa/sites/rect",
      discountCode: "COMEBACK10",
      customerName: "Awa",
    });
    expect(msg).toContain("Awa");
    expect(msg).toContain("COMEBACK10");
    expect(msg).toContain("/sites/rect");
    expect(msg.toLowerCase()).not.toContain("paid");
  });
});
