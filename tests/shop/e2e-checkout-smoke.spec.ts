import { test, expect } from "@playwright/test";

/**
 * Browser/API smoke against the exact Vercel deployment that emitted deployment_status.
 * The fixture is an intentionally published non-production shop subdomain.
 */
const shopSubdomain = process.env.KEBU_E2E_SHOP_SUBDOMAIN;

test.describe("published shop preview", () => {
  test.skip(!shopSubdomain, "Set KEBU_E2E_SHOP_SUBDOMAIN to a safe published test shop");

  test("published shop renders without server or browser failures", async ({ page }) => {
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    const response = await page.goto(`/sites/${shopSubdomain}`, { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Service unavailable");
    await expect(page.locator("body")).not.toContainText("Application error");
    expect((await page.title()).trim().length).toBeGreaterThan(0);
    expect(browserErrors).toEqual([]);
  });

  test("public order endpoint fails closed on malformed input without creating an order", async ({ request }) => {
    const response = await request.post(`/api/public/sites/${shopSubdomain}/orders`, {
      data: { productId: "not-a-uuid", quantity: -1 },
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid order.");
  });

  test("unknown product cannot cross the live shop boundary", async ({ request }) => {
    const response = await request.post(`/api/public/sites/${shopSubdomain}/orders`, {
      data: {
        productId: "00000000-0000-4000-8000-000000000001",
        quantity: 1,
        customerName: "Kebu E2E",
        customerPhone: "+221700000000",
        paymentPreference: "whatsapp",
      },
      headers: { "Content-Type": "application/json" },
    });
    expect([400, 404]).toContain(response.status());
    expect(response.status()).toBeLessThan(500);
  });
});
