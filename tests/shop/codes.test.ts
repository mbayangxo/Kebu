import { describe, expect, it } from "vitest";
import { formatShopOrderNumber, normalizeProductCode } from "@/lib/shop/codes";
import { shopOrderWhatsAppMessage } from "@/lib/shop/create-order";
import { projectProductSchema } from "@/lib/create/project-products";

describe("shop product codes + order numbers", () => {
  it("formats ORD-{project}-{seq}", () => {
    expect(formatShopOrderNumber("a1b2c3d4-1111-4111-8111-111111111111", 42)).toBe("ORD-A1B2-00042");
  });

  it("normalizes UPC/SKU", () => {
    expect(normalizeProductCode(" 6123 4567 ")).toBe("61234567");
    expect(normalizeProductCode("")).toBeNull();
  });

  it("accepts upc and sku on product schema", () => {
    const ok = projectProductSchema.safeParse({
      name: "Tee",
      upc: "612345678901",
      sku: "TEE-BLK-M",
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.upc).toBe("612345678901");
      expect(ok.data.sku).toBe("TEE-BLK-M");
    }
  });

  it("puts order number and UPC in WhatsApp message", () => {
    const msg = shopOrderWhatsAppMessage({
      orderId: "11111111-1111-4111-8111-111111111111",
      orderNumber: "ORD-A1B2-00007",
      productName: "Tee",
      productUpc: "612345678901",
      quantity: 2,
      priceLabel: "5,000 XOF",
      customerName: "Awa",
      customerNote: "",
      paymentPreference: "whatsapp",
    });
    expect(msg).toContain("ORD-A1B2-00007");
    expect(msg).toContain("UPC: 612345678901");
    expect(msg).toContain("2× Tee");
  });
});
