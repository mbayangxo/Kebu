import { test, expect } from "@playwright/test";

/**
 * C3 — Checkout smoke (WhatsApp path — no PSP keys required).
 * Requires KEBU_E2E_BASE_URL and a published shop subdomain in KEBU_E2E_SHOP_SUBDOMAIN.
 */
const shopSubdomain = process.env.KEBU_E2E_SHOP_SUBDOMAIN;

test.describe("shop checkout smoke", () => {
  test.skip(!shopSubdomain, "Set KEBU_E2E_SHOP_SUBDOMAIN to a live shop subdomain");

  test("public shop loads products page", async ({ page }) => {
    await page.goto(`/sites/${shopSubdomain}`);
    await expect(page.locator("body")).toBeVisible();
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
