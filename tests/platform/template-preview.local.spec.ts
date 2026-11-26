import { test, expect } from "playwright/test";

test("anonymous visitors can view public templates while owner portfolios and editors stay private", async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("/create/templates/preview/musician-artist");
    expect(response?.status()).toBe(200);
    await expect(page.locator('[data-template-preview="musician-artist"]')).toBeVisible();
    expect(new URL(page.url()).pathname).not.toBe("/login");
  }
  expect((await page.goto("/create/templates/preview/musician-maylecor-ksendr"))?.status()).toBe(404);
  await page.goto("/create/private-project");
  await expect(page.getByRole("heading", { name: "Welcome back", exact: true })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/login");
});
