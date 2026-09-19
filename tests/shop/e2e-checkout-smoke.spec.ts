import { test, expect } from "@playwright/test";

/**
 * Browser smoke against the exact Vercel deployment that emitted deployment_status.
 * The fixture is an intentionally published non-production shop subdomain.
 */
const shopSubdomain = process.env.KEBU_E2E_SHOP_SUBDOMAIN;

test.describe("published shop preview", () => {
  test.skip(!shopSubdomain, "Set KEBU_E2E_SHOP_SUBDOMAIN to a safe published test shop");

  test("published shop renders without server or browser failures", async ({ page }) => {
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));

    const response = await page.goto(`/sites/${shopSubdomain}`, {
      waitUntil: "domcontentloaded",
    });

    expect(response, "navigation should return a response").not.toBeNull();
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Service unavailable");
    await expect(page.locator("body")).not.toContainText("Application error");
    expect((await page.title()).trim().length).toBeGreaterThan(0);
    expect(browserErrors).toEqual([]);
  });
});
