import { expect as baseExpect, test } from "playwright/test";

const expect = baseExpect.configure({ timeout: 35_000 });

const businessId = process.env.KEBU_E2E_RETAIL_BUSINESS;
const otherBusinessId = process.env.KEBU_E2E_RETAIL_OTHER_BUSINESS;
const owner = process.env.KEBU_E2E_RETAIL_OWNER;
const employee = process.env.KEBU_E2E_RETAIL_EMPLOYEE;
const password = process.env.KEBU_E2E_RETAIL_PASSWORD;

test.skip(!businessId || !otherBusinessId || !owner || !employee || !password,
  "Configure dedicated QA retail tenants and users.");

test("manager can register and reopen a store while an employee cannot access the registry", async ({ browser, page }) => {
  test.setTimeout(240_000);
  const path = `/business/${businessId}/retail`;
  const signIn = async (target: typeof page, email: string) => {
    await target.goto(`/login?next=${path}`);
    await target.waitForLoadState("networkidle");
    await target.locator('input[type="email"]').fill(email);
    await target.locator('input[type="password"]').fill(password!);
    await target.getByRole("button", { name: "Sign in", exact: true }).click();
    await target.waitForURL((url) => !url.pathname.startsWith("/login"));
  };

  await page.goto(path);
  await expect(page).toHaveURL(/\/login/);
  await signIn(page, owner!);
  await expect(page.getByRole("heading", { name: "Retail locations", level: 2 })).toBeVisible();

  const code = `QA-${crypto.randomUUID().slice(0, 8)}`;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Store name").fill(code);
  await page.getByLabel("Store code").fill(code);
  await page.getByLabel("Address").fill("Synthetic QA address");
  await page.getByLabel("Time zone").fill("America/New_York");
  await page.getByRole("button", { name: "Add store" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Store added." })).toBeVisible();
  await page.goto(path);
  const row = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: code }) });
  await expect(row).toContainText("· Active");
  await row.getByRole("button", { name: `Deactivate ${code}` }).click();
  await expect(row).toContainText("· Inactive");
  await row.getByRole("button", { name: `Reactivate ${code}` }).click();
  await expect(row).toContainText("· Active");

  await page.goto(`/business/${otherBusinessId}/retail`);
  await expect(page.getByRole("heading", { name: "Retail locations", level: 2 })).toHaveCount(0);

  const context = await browser.newContext();
  try {
    const employeePage = await context.newPage();
    await signIn(employeePage, employee!);
    await employeePage.goto(path);
    await expect(employeePage.getByRole("heading", { name: "Retail locations", level: 2 })).toHaveCount(0);
  } finally {
    await context.close();
  }
});
