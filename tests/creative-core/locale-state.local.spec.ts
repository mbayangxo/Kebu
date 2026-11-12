import { test, expect } from "playwright/test";

test.skip(process.env.KEBU_LOCAL_OPERATION_UI !== "1", "Isolated actual locale provider only");

test("loading saved language keeps the mounted editor and switching language preserves its draft", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem("alkebulan_lang", "fr"));
  await page.goto("/locale-local-probe");
  await expect(page.getByLabel("Current language")).toHaveText("fr");
  const instance = await page.getByTestId("locale-state").getAttribute("data-instance");
  expect(await page.evaluate(() => document.documentElement.dataset.firstLocaleInstance)).toBe(instance);
  await page.getByLabel("Listing draft").fill("Community translator — draft to preserve");
  await page.getByRole("button", { name: "Use Wolof", exact: true }).click();
  await expect(page.getByLabel("Current language")).toHaveText("wo");
  await expect(page.getByLabel("Listing draft")).toHaveValue("Community translator — draft to preserve");
  await expect(page.getByTestId("locale-state")).toHaveAttribute("data-instance", instance!);
  await page.getByRole("button", { name: "Use English", exact: true }).click();
  await expect(page.getByLabel("Current language")).toHaveText("en");
  await expect(page.getByLabel("Listing draft")).toHaveValue("Community translator — draft to preserve");
  expect(await page.evaluate(() => localStorage.getItem("alkebulan_lang"))).toBe("en");
  expect(errors).toEqual([]);
});
