import { test, expect } from "playwright/test";

/**
 * Real /kebu-search UI -> Next API routes -> postgrest-shim -> real migrated
 * Postgres (tests/search/db/local-pg.ts + db/postgrest-shim.mjs). Driven only
 * via scripts/verify-search-local-ui.mjs, which seeds fixture data across all
 * 8 modes and runs this against a `next build && next start` server -- not
 * `next dev`: in this sandbox, next dev's Turbopack HMR websocket handshake
 * fails over the loopback proxy and silently blocks client hydration (no
 * console/page error surfaces it), so every onClick/onChange in the app
 * never fires under `next dev` here specifically. A production build has no
 * HMR socket and hydrates normally, which is what this spec actually proves
 * against. Never discovered by the normal `playwright test` run (testIgnore
 * in playwright.config.ts) or run against a hosted preview.
 */

test.describe("Kebu Search discovery journey", () => {
  test("business: recent, query match, query no-match, honest empty copy", async ({ page }) => {
    await page.goto("/kebu-search");
    await expect(page.locator("h2").first()).toHaveText("Recently active on Kebu");
    await expect(page.locator("a[href^='/kebu-search/business/']")).toHaveCount(1);

    const input = page.getByPlaceholder(/Search businesses/);
    await input.fill("chocolate");
    await expect(page.locator("h2").first()).toContainText(/1 result for/);
    await expect(page.locator("h2").first()).toContainText("chocolate");
    await expect(page.locator("a[href^='/kebu-search/business/']")).toHaveCount(1);

    await input.fill("zzznotrealzzz");
    await expect(page.getByText("No indexed businesses match")).toBeVisible();
    await expect(page.locator("a[href^='/kebu-search/business/']")).toHaveCount(0);
  });

  test("business: country filter narrows results honestly (no fake fallback result)", async ({ page }) => {
    await page.goto("/kebu-search");
    await page.getByLabel("Filter businesses by country").selectOption("GH");
    await expect(page.getByText("No active businesses are indexed yet in Ghana.")).toBeVisible();
    await expect(page.locator("a[href^='/kebu-search/business/']")).toHaveCount(0);
  });

  test("products: query match links to the real product detail route", async ({ page }) => {
    await page.goto("/kebu-search");
    await page.getByRole("button", { name: "Products", exact: true }).click();
    await page.getByPlaceholder(/Search products/).fill("chocolate");
    const link = page.locator("a[href^='/kebu-search/product/']").first();
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute("href", /\/kebu-search\/product\/shop_product\//);
  });

  test("opportunities: signed-out shows the real sign-in gate, never a fake result", async ({ page }) => {
    await page.goto("/kebu-search");
    await page.getByRole("button", { name: "Opportunities", exact: true }).click();
    await expect(page.getByText("Sign in to search Opportunities.")).toBeVisible();
    await expect(page.locator("a[href*='/opportunity/']")).toHaveCount(0);
  });

  test("people, research, trade, africa, culture: each mode returns its own real seeded result", async ({ page }) => {
    await page.goto("/kebu-search");

    await page.getByRole("button", { name: "People & Talent", exact: true }).click();
    await page.getByPlaceholder(/Search developers/).fill("amina");
    await expect(page.locator("a[href^='/kebu-search/person/']")).toHaveCount(1);

    await page.getByRole("button", { name: "Research", exact: true }).click();
    await page.getByPlaceholder(/Search market intelligence/).fill("senegal");
    await expect(page.locator("a[href^='/kebu-search/country/']")).toHaveCount(1);

    await page.getByRole("button", { name: "Trade", exact: true }).click();
    await expect(page.locator("h2").first()).toHaveText("Country trade context");
    await expect(page.locator("a[href^='/kebu-search/country/']")).toHaveCount(1);

    await page.getByRole("button", { name: "Africa", exact: true }).click();
    await expect(page.locator("h2").first()).toHaveText("Published Kebu sites & stores");
    await expect(page.locator("a[href^='https://']")).toHaveCount(1);

    await page.getByRole("button", { name: "Culture", exact: true }).click();
    await expect(page.getByText("not RECT video or creator content", { exact: false })).toBeVisible();
    await expect(page.locator("a[href^='/kebu-search/country/']")).toHaveCount(1);
  });

  test("business detail page renders the real business, not a placeholder", async ({ page }) => {
    await page.goto("/kebu-search");
    await page.getByPlaceholder(/Search businesses/).fill("chocolate");
    await page.locator("a[href^='/kebu-search/business/']").first().click();
    await expect(page.locator("h1")).toHaveText("Baobab Chocolate Manufacturing");
  });

  test("backend outage: honest error banner, zero fake results", async ({ page, request }) => {
    const shimUrl = process.env.KEBU_SEARCH_SHIM_URL;
    if (!shimUrl) throw new Error("KEBU_SEARCH_SHIM_URL must be set by the verify script");
    await request.post(`${shimUrl}/__qa/break`, { data: { on: true } });
    try {
      await page.goto("/kebu-search");
      await page.getByPlaceholder(/Search businesses/).fill("chocolate");
      await expect(page.getByText("Search could not load.")).toBeVisible();
      await expect(page.locator("a[href^='/kebu-search/business/']")).toHaveCount(0);
    } finally {
      await request.post(`${shimUrl}/__qa/break`, { data: { on: false } });
    }
  });
});
