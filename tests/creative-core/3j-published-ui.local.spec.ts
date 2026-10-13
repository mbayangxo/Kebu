import { test, expect } from "playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { apply } from "./fixtures/3j-maylecor";
import { maylecorAboutMayBlocks } from "../../lib/create/maylecor-about-bio";
import { createKcdPublishedSnapshot } from "../../lib/create/kcd-published-snapshot";

test.skip(process.env.KEBU_LOCAL_OPERATION_UI !== "1", "Manual native reference; not real-provider quality.");
test.beforeAll(() => {
  writeFileSync(process.env.KEBU_LOCAL_S7_SNAPSHOT_FILE!, JSON.stringify(createKcdPublishedSnapshot(apply().result.prediction.document)));
  mkdirSync("evidence/3j", { recursive: true });
});
for (const javaScriptEnabled of [false, true]) for (const width of [1440, 768, 390]) {
  test(`May Lècor five pages ${width}px JavaScript ${javaScriptEnabled ? "on" : "off"}`, async ({ browser, baseURL }) => {
    // Mirrors the public-site request header that production middleware sets.
    const context = await browser.newContext({ baseURL, javaScriptEnabled, extraHTTPHeaders: { "x-kebu-is-public-site": "1" }, viewport: { width, height: 900 }, reducedMotion: "reduce" });
    try {
      const page = await context.newPage(), errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.route("**/api/**", route => route.fulfill({ json: {} }));
      await page.goto("/s7-local-probe/home");
      await expect(page.getByRole("heading", { name: "May Lècor", exact: true })).toHaveCSS("font-size", `${width === 1440 ? 64 : width === 768 ? 44 : 32}px`);
      for (const slug of ["home", "about", "music", "photos", "contact"]) {
        if (slug !== "home") await page.getByRole("link", { name: slug, exact: true }).click();
        await expect(page.getByRole("heading", { name: slug === "home" ? "May Lècor" : slug, exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (slug === "about") for (const block of maylecorAboutMayBlocks()) await expect(page.getByText(block.body, { exact: true })).toBeVisible();
        if (["home", "photos"].includes(slug)) {
          await expect(page.locator("img")).toHaveCount(slug === "home" ? 4 : 5);
          await expect.poll(() => page.locator("img").evaluateAll(elements => elements.every(element => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0))).toBe(true);
        }
        await page.screenshot({ path: `evidence/3j/${slug}-${width}-${javaScriptEnabled ? "on" : "off"}.png`, fullPage: true });
      }
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  });
}
