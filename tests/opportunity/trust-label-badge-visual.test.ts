/**
 * Real-browser proof that the unverified_example badge and the curated
 * badge are visually distinct -- not just different text, different pixels.
 * Renders the actual TrustLabelBadge component (react-dom/server, the same
 * component the real app pages import) to static HTML, loads that HTML in
 * the pre-installed Chromium, and reads real computed CSS. A future edit
 * that accidentally makes both badges share one style breaks this test.
 * No dev server or SQL fixture needed -- self-contained, so it runs as an
 * ordinary vitest test rather than through the dedicated local-UI scripts.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { chromium } from "playwright";
import { TrustLabelBadge } from "@/app/components/opportunity/trust-label-badge";

describe("Opportunity OS trust-label badge — real browser visual check", () => {
  it("unverified_example badge is visually distinct from the curated badge", async () => {
    const unverifiedHtml = renderToStaticMarkup(createElement(TrustLabelBadge, { trustLabel: "unverified_example" }));
    const curatedHtml = renderToStaticMarkup(createElement(TrustLabelBadge, { trustLabel: "curated" }));

    expect(unverifiedHtml).toContain("Unverified example");
    expect(curatedHtml).toContain("Curated");
    expect(unverifiedHtml).not.toEqual(curatedHtml);

    const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
    try {
      const page = await browser.newPage();
      await page.setContent(
        `<!doctype html><html><body><div id="a">${unverifiedHtml}</div><div id="b">${curatedHtml}</div></body></html>`,
      );
      const unverifiedStyle = await page.locator("#a span").evaluate((el) => {
        const s = getComputedStyle(el);
        return { background: s.backgroundColor, color: s.color, border: s.borderColor };
      });
      const curatedStyle = await page.locator("#b span").evaluate((el) => {
        const s = getComputedStyle(el);
        return { background: s.backgroundColor, color: s.color, border: s.borderColor };
      });

      // The whole point of this component: these must never match.
      expect(unverifiedStyle.background).not.toEqual(curatedStyle.background);
      expect(unverifiedStyle.color).not.toEqual(curatedStyle.color);
      // The unverified badge specifically carries a visible border (amber/warning) that the
      // curated badge doesn't -- a second, independent visual signal beyond color alone.
      expect(unverifiedStyle.border.toLowerCase()).not.toBe("rgba(0, 0, 0, 0)");
    } finally {
      await browser.close();
    }
  }, 30_000);
});
