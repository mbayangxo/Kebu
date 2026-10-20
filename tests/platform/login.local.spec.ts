import { test, expect } from "playwright/test";

test("login remains readable and confirmation failure permits retry", async ({ page }) => {
  let resendAttempts = 0;
  await page.route("**/auth/v1/**", route => {
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, GET, OPTIONS" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (route.request().url().includes("/token")) return route.fulfill({ status: 400, headers, contentType: "application/json", body: JSON.stringify({ code: "email_not_confirmed", msg: "Email not confirmed" }) });
    resendAttempts++;
    return route.fulfill({ status: resendAttempts === 1 ? 400 : 200, headers, contentType: "application/json", body: resendAttempts === 1 ? JSON.stringify({ msg: "Confirmation service unavailable" }) : "{}" });
  });
  await page.goto("/login");
  // Static HTML is interactive before React attaches its controlled-input handlers.
  // Wait for those handlers so the test exercises the actual sign-in form.
  await page.waitForFunction(() => {
    const input = document.querySelector("#login-email") as (HTMLInputElement & Record<string, unknown>) | null;
    return input && Object.keys(input).some(key => key.startsWith("__reactProps") &&
      typeof (input[key] as { onChange?: unknown })?.onChange === "function");
  });
  const brand = page.getByRole("link", { name: "Kebu", exact: true });
  await expect(brand.locator("span")).toHaveCSS("color", "rgb(10, 10, 10)");
  await page.getByLabel("Email", { exact: true }).fill("qa@example.test");
  await page.getByLabel("Password", { exact: true }).fill("test-password-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: /Confirm|confirmation/ })).toContainText("Confirm your email first");
  await page.getByRole("button", { name: "Resend confirmation email", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: /Confirm|confirmation/ })).toContainText("Confirmation service unavailable");
  await expect(page.getByRole("button", { name: "Resend confirmation email", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Resend confirmation email", exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirmation email sent — check your inbox" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
