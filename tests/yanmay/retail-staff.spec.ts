import { expect, test } from "playwright/test";

const id = process.env.KEBU_E2E_RETAIL_BUSINESS;
const owner = process.env.KEBU_E2E_RETAIL_OWNER;
const employee = process.env.KEBU_E2E_RETAIL_EMPLOYEE;
const password = process.env.KEBU_E2E_RETAIL_PASSWORD;

test("store admin grants staff access and enrolls and revokes a device", async ({ page }) => {
  test.skip(!id || !owner || !employee || !password, "Requires QA accounts and an active store.");
  test.setTimeout(480_000);
  const path = `/business/${id}/retail/staff`;
  await page.goto(path);
  await expect(page).toHaveURL(/\/login/);
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="email"]').fill(owner!);
  await page.locator('input[type="password"]').fill(password!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Staff and devices" })).toBeVisible({ timeout: 90_000 });

  await page.getByLabel("Staff member").selectOption({ label: employee! });
  await page.getByRole("button", { name: "Grant access" }).click();
  await expect(page.getByRole("status")).toHaveText("Store access granted.", { timeout: 90_000 });
  await page.reload();
  const assignment = page.getByRole("listitem").filter({ hasText: employee! });
  await expect(assignment).toBeVisible();
  await assignment.getByRole("button", { name: "Remove access" }).click();
  await expect(page.getByRole("status")).toHaveText("Store access removed.", { timeout: 90_000 });
  await expect(assignment).toHaveCount(0);

  const label = `QA tablet ${crypto.randomUUID().slice(0, 8)}`;
  await page.getByLabel("Device name").fill(label);
  await page.getByRole("button", { name: "Enroll this browser" }).click();
  await expect(page.getByRole("status")).toHaveText("This browser is enrolled.", { timeout: 90_000 });
  await page.reload();
  const device = page.getByRole("listitem").filter({ hasText: label });
  await device.getByRole("button", { name: "Revoke device" }).click();
  await expect(device).toContainText("Revoked", { timeout: 90_000 });
  await expect(page.getByRole("button", { name: "Enroll this browser" })).toBeVisible();
});
