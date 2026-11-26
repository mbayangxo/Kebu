/** Real wizard UI; provider/API fixtures are explicit, never hosted AI/DB evidence. */
import { test, expect } from "playwright/test";
test.skip(process.env.KEBU_LOCAL_OPERATION_UI !== "1", "Isolated local wizard harness only.");
for (const width of [1440, 390]) {
  test(`generation failure preserves the brief and chosen artist pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    let submitted: Record<string, unknown> | undefined;
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/businesses") return route.fulfill({ json: { businesses: [] } });
      if (path === "/api/templates") return route.fulfill({ json: { templates: [] } });
      if (path === "/api/projects/create-website") {
        submitted = route.request().postDataJSON();
        return route.fulfill({ status: 503, json: { error: "Yande website generation is unavailable. Your brief is kept here. Try again later, or choose an aesthetic or a blank site.", code: "AI_UNAVAILABLE" } });
      }
      return route.fulfill({ json: {} });
    });
    const loaded = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/businesses");
    await page.goto("/create/new?mode=ai");
    await loaded;
    await page.getByRole("textbox", { name: "Site name", exact: true }).fill("May Lècor");
    await expect(page.getByRole("textbox", { name: "Site name", exact: true })).toHaveValue("May Lècor");
    await page.getByRole("textbox", { name: /Site address/ }).fill("may-lecor-qa");
    await page.getByRole("combobox", { name: "Category", exact: true }).selectOption("music");
    await expect(page.getByRole("textbox", { name: "Pages", exact: true })).toHaveValue("home, music, videos, about, contact");
    const brief = "Create an editorial artist site for May Lècor. Use only her authorized photos. Do not invent music releases or contact information.";
    await page.getByRole("textbox", { name: "Describe your site for Yande" }).fill(brief);
    await page.getByRole("textbox", { name: "Pages", exact: true }).fill("home, music, videos, press, about, contact");
    await page.getByRole("button", { name: "Generate my site", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Yande website generation is unavailable" })).toBeVisible();
    expect(submitted?.desiredPages).toEqual(["home", "music", "videos", "press", "about", "contact"]);
    await expect(page).toHaveURL(/\/create\/new/);
    await expect(page.getByRole("textbox", { name: "Describe your site for Yande" })).toHaveValue(brief);
    await expect(page.getByRole("textbox", { name: "Site name", exact: true })).toHaveValue("May Lècor");
    await expect(page.getByRole("textbox", { name: "Pages", exact: true })).toHaveValue("home, music, videos, press, about, contact");
    await expect(page.getByRole("button", { name: "Generate my site", exact: true })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: test.info().outputPath(`generation-failure-${width}.png`), fullPage: true });
  });
}
