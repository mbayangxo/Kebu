import { test, expect } from "playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { benchmarkSourceHash } from "../../scripts/check-3j-gate.mjs";
import { readKcdPublishedSnapshot } from "../../lib/create/kcd-published-snapshot";
import { maylecorAboutMayBlocks } from "../../lib/create/maylecor-about-bio";

// Explicit generated-output verification. Never replace a missing result with the manual specimen.
test.skip(process.env.KEBU_VERIFY_3J_GENERATED_UI !== "1", "Requires explicit real-provider output verification");
test.beforeAll(() => {
  const path = process.env.KEBU_3J_PROVIDER_RESULT;
  if (!path) throw Error("Set KEBU_3J_PROVIDER_RESULT to actual 3J provider result.json");
  const recorded = JSON.parse(readFileSync(path, "utf8"));
  expect(recorded.provenance).toBe("real-provider"); expect(recorded.sourceHash).toBe(benchmarkSourceHash());
  expect(recorded.result.inputTokens).toBeGreaterThan(0); expect(recorded.result.outputTokens).toBeGreaterThan(0);
  expect(recorded.outputHash).toBe(createHash("sha256").update(JSON.stringify(recorded.result.output)).digest("hex"));
  expect(readKcdPublishedSnapshot(recorded.snapshot.snapshot, recorded.snapshot.contentHash)).toBeTruthy();
  writeFileSync(process.env.KEBU_LOCAL_S7_SNAPSHOT_FILE!, JSON.stringify(recorded.snapshot));
  mkdirSync("evidence/3j/real-provider", { recursive: true });
});
for (const javaScriptEnabled of [false, true]) for (const width of [1440, 768, 390]) {
  test(`actual May Lècor generated output ${width}px JS ${javaScriptEnabled ? "on" : "off"}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled, viewport: { width, height: 1000 }, reducedMotion: "reduce", extraHTTPHeaders: { "x-kebu-is-public-site": "1" } });
    try {
      const page = await context.newPage(), errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.route("**/api/**", route => route.fulfill({ json: {} }));
      for (const slug of ["home", "about", "music", "photos", "contact"]) {
        await page.goto(`/s7-local-probe/${slug}`);
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await expect.poll(() => page.locator("img").evaluateAll(elements => elements.every(element => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0))).toBe(true);
        if (slug === "about") {
          const copy = (await page.locator("body").innerText()).replace(/\s+/g, " ");
          for (const block of maylecorAboutMayBlocks()) expect(copy).toContain(block.body.replace(/\s+/g, " "));
        }
        await page.screenshot({ path: `evidence/3j/real-provider/${slug}-${width}-${javaScriptEnabled ? "on" : "off"}.png`, fullPage: true });
      }
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  });
}
