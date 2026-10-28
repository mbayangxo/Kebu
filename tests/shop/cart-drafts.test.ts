import { describe, expect, it, vi } from "vitest";
import {
  cartDraftItemCount,
  recoveryWhatsAppMessage,
  resolveCartDraftLineDetails,
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

  it("includes real resolved item names and prices in recovery copy — never generic 'items in your cart' alone", () => {
    const msg = recoveryWhatsAppMessage({
      shopName: "RECT",
      siteUrl: "https://kebu.africa/sites/rect",
      customerName: "Awa",
      items: [
        { name: "Dakar Tote Bag", priceLabel: "15,000 XOF", quantity: 2 },
        { name: "Thiès Scarf", priceLabel: "5,000 XOF", quantity: 1 },
      ],
    });
    expect(msg).toContain("2x Dakar Tote Bag (15,000 XOF)");
    expect(msg).toContain("1x Thiès Scarf (5,000 XOF)");
  });

  it("resolveCartDraftLineDetails joins real project_products rows, not placeholder text", async () => {
    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [
              { id: "p1", name: "Dakar Tote Bag", price_label: "15,000 XOF" },
              { id: "p2", name: "Thiès Scarf", price_label: "5,000 XOF" },
            ],
            error: null,
          }),
        }),
      }),
    });
    const supabase = { from: fromMock } as unknown as Parameters<typeof resolveCartDraftLineDetails>[0];

    const details = await resolveCartDraftLineDetails(supabase, "proj-1", [
      { productId: "p1", quantity: 2 },
      { productId: "p2", quantity: 1 },
    ]);

    expect(fromMock).toHaveBeenCalledWith("project_products");
    expect(details).toEqual([
      { name: "Dakar Tote Bag", priceLabel: "15,000 XOF", quantity: 2 },
      { name: "Thiès Scarf", priceLabel: "5,000 XOF", quantity: 1 },
    ]);
  });

  it("resolveCartDraftLineDetails is honest when a product was deleted/deactivated since the cart was abandoned", async () => {
    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });
    const supabase = { from: fromMock } as unknown as Parameters<typeof resolveCartDraftLineDetails>[0];

    const details = await resolveCartDraftLineDetails(supabase, "proj-1", [{ productId: "gone", quantity: 1 }]);
    expect(details).toEqual([{ name: "Item no longer available", priceLabel: null, quantity: 1 }]);
  });
});
