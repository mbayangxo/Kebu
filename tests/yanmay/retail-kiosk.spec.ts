import { expect, test } from "playwright/test";

const tenant = process.env.KEBU_E2E_RETAIL_KIOSK_BUSINESS;
const token = process.env.KEBU_E2E_RETAIL_KIOSK_TOKEN;

test("enrolled kiosk prices a USD cart without collecting payment", async ({ page, context, baseURL }) => {
  test.skip(!tenant || !token || !baseURL, "Requires an enrolled QA kiosk and priced menu item.");
  test.setTimeout(180_000);
  const path = `/retail-order/${tenant}/kiosk`;
  const denied = await page.goto(path);
  expect(denied?.status()).toBe(404);
  await context.addCookies([{ name: `retail-device-${tenant}`, value: token!, url: baseURL!, httpOnly: true, sameSite: "Strict" }]);
  await page.goto(path);
  await expect(page.getByRole("heading", { name: "Self-service menu" })).toBeVisible();
  await page.getByRole("spinbutton", { name: "Quantity for QA Product, revision 1" }).fill("2");
  await page.getByRole("button", { name: "Review total" }).click();
  const total = page.getByRole("region", { name: "Checkout total" });
  await expect(total).toBeVisible({ timeout: 90_000 });
  await expect(total.getByText("$10.88", { exact: true })).toBeVisible();
  await expect(total.getByText(/Payment is unavailable/)).toBeVisible();
});
