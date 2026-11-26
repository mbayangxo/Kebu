/**
 * Runs the DOM-level validators in lib/create/responsive-qa.ts (touch-target
 * size, body font size) against REAL rendered pages at a real mobile
 * viewport — not synthetic fixture data. Those validators existed with zero
 * callers anywhere: every other consumer of this file only unit-tests the
 * section-data validators (validateSectionResponsiveData) against
 * hand-written props, so a real touch-target or font-size regression on a
 * live page would never have been caught by this codebase's own tooling.
 *
 * Uses public, unauthenticated pages (no DB/auth fixture needed) so this can
 * run against a plain `next dev` — see scripts/verify-responsive-qa-local-ui.mjs.
 */
import { test, expect } from "playwright/test";
import { validateTouchTargets, validateBodyFontSize, summariseQa } from "@/lib/create/responsive-qa";

const MOBILE_VIEWPORT = { width: 390, height: 844 };

const PAGES = ["/opportunities", "/starts"];

for (const path of PAGES) {
  test(`${path} passes real touch-target and font-size QA at 390px`, async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    // No horizontal overflow at the documented mobile breakpoint.
    const overflowing = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflowing).toBe(false);

    const targets = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll("button, a[href], input, select, textarea"));
      return nodes
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            selector: el.tagName.toLowerCase() + (el.textContent ? `:"${el.textContent.trim().slice(0, 24)}"` : ""),
          };
        });
    });

    const bodyFontSizePx = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));

    const violations = [
      ...validateTouchTargets(targets),
      ...validateBodyFontSize(bodyFontSizePx),
    ];
    const summary = summariseQa(violations);

    if (!summary.ok) {
      console.log(`${path} QA violations:`, JSON.stringify(summary.violations, null, 2));
    }
    expect(summary.errors).toBe(0);
  });
}
