import { describe, expect, it, vi } from "vitest";
import { markKebuPurchasePaid } from "@/lib/payments/mark-purchase-paid";

vi.mock("@/lib/shop/adapter-checkout", () => ({
  markShopOrderPaidByProviderRef: vi.fn().mockResolvedValue({ ok: true, orderId: "order-1", projectId: "project-1" }),
}));
vi.mock("@/lib/studio/creative-assets-marketplace", () => ({
  markCreativeAssetPurchasePaid: vi.fn().mockResolvedValue({ ok: true, libraryId: "lib-1", assetId: "asset-1" }),
}));
vi.mock("@/lib/create/aesthetics-marketplace", () => ({
  markAestheticPurchasePaid: vi.fn().mockResolvedValue({ ok: true, libraryId: "lib-2", marketplaceId: "mkt-1" }),
}));

function chain(data: unknown) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  builder.select = vi.fn(self);
  builder.eq = vi.fn(self);
  builder.maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  return builder;
}

describe("markKebuPurchasePaid — dispatches a confirmed payment to the right purchase type by reference", () => {
  it("marks a creative asset purchase paid when the reference matches creative_asset_library", async () => {
    const from = vi.fn((table: string) => {
      if (table === "creative_asset_library") return chain({ id: "lib-1" });
      throw new Error("should not query " + table);
    });
    const result = await markKebuPurchasePaid({ from } as never, { reference: "kebu-ca-x" });
    expect(result).toEqual({ ok: true, kind: "creative_asset_purchase", libraryId: "lib-1", assetId: "asset-1" });
  });

  it("falls through to aesthetic_library when no creative asset purchase matches", async () => {
    const from = vi.fn((table: string) => {
      if (table === "creative_asset_library") return chain(null);
      if (table === "aesthetic_library") return chain({ id: "lib-2" });
      throw new Error("should not query " + table);
    });
    const result = await markKebuPurchasePaid({ from } as never, { reference: "kebu-mp-x" });
    expect(result).toEqual({ ok: true, kind: "aesthetic_purchase", libraryId: "lib-2", marketplaceId: "mkt-1" });
  });

  it("falls through to the unchanged Shop order path when neither marketplace matches", async () => {
    const from = vi.fn((table: string) => {
      if (table === "creative_asset_library") return chain(null);
      if (table === "aesthetic_library") return chain(null);
      throw new Error("should not query " + table);
    });
    const result = await markKebuPurchasePaid({ from } as never, { reference: "shop_wave_x" });
    expect(result).toEqual({ ok: true, kind: "shop_order", orderId: "order-1", projectId: "project-1" });
  });
});
