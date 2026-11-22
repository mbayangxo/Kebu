import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { issueCheckoutApproval } from "@/lib/kebu-code/checkout-approval";

const mocks = vi.hoisted(() => ({ db: vi.fn(), live: vi.fn(), resolve: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/api-guard", () => ({ shopOrderRateLimit: () => null }));
vi.mock("@/lib/opportunity/admin", () => ({ createServiceClient: mocks.db }));
vi.mock("@/lib/create/public-site-loader", () => ({ loadPublicDeployment: mocks.live }));
vi.mock("@/lib/shop/cart-order", () => ({ resolveCartLines: mocks.resolve }));
vi.mock("@/app/code/shop-checkout/review", () => ({
  HostedCartReview: ({ lines }: { lines: { productName: string; quantity: number }[] }) => React.createElement("div", null, lines[0].productName + " / " + lines[0].quantity),
}));
import CheckoutReview from "@/app/code/shop-checkout/page";

const app = "11111111-1111-4111-8111-111111111111";
const store = "22222222-2222-4222-8222-222222222222";
const product = "33333333-3333-4333-8333-333333333333";
const key = "local-only-key-for-checkout-approval-testing";
beforeEach(() => { vi.resetAllMocks(); });
function setup({revision=2,published=true,stock=3}={}) {
  const records: Record<string, unknown> = {
    kebu_code_workspaces: { owner_id: "owner", revision, store_project_id: store },
    projects: { owner_id: "owner", id: store, project_type: "store", site_password_enabled: false },
    deployments: { subdomain: "test-store" },
    project_products: [{ id: product, track_stock: true, stock_qty: stock }],
  };
  mocks.db.mockReturnValue({ from: (table: string) => {
    const chain = {
      select: () => chain, eq: () => chain, order: () => chain, limit: () => chain,
      maybeSingle: async () => ({ data: records[table], error: null }),
      in: async () => ({ data: records[table], error: null }),
    };
    return chain;
  }});
  mocks.live.mockResolvedValue({ projectId: store, subdomain: "test-store", billingSuspended: false,
    seo: { commerce: { shopOpened: true } },
    definition: { title: "Test store", pages: [{ sections: published ? [{ type: "products", props: { items: [{ name: "Tea", productId: product }] } }] : [] }] },
  });
  mocks.resolve.mockResolvedValue({ ok: true, lines: [{ productId: product, productName: "Tea", quantity: 3, priceLabel: "100 FCFA" }] });
}
async function preview() {
  vi.stubGlobal("React", React);
  vi.stubEnv("KEBU_CODE_CHECKOUT_SIGNING_KEY", key);
  try {
    const approval=issueCheckoutApproval({app,store,revision:2},key);
    return renderToStaticMarkup(await CheckoutReview({ searchParams: Promise.resolve({
      approval, items: JSON.stringify([{productId:product,quantity:3}]),
    }) }));
  } finally { vi.unstubAllEnvs(); vi.unstubAllGlobals(); }
}
it("only opens review for currently approved, published and in-stock selections", async () => {
  setup(); expect(await preview()).toContain("Tea");
  setup({ stock: 2 }); expect(await preview()).toContain("An item is unavailable");
  setup({ published: false }); expect(await preview()).toContain("not available on the published store");
  setup({ revision: 3 }); expect(await preview()).toContain("no longer authorizes");
});
