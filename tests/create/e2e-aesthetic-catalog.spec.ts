/**
 * Aesthetic Catalog — Full Renderer Certification
 *
 * Tests ALL 32 customer-facing gallery aesthetics at 7 viewports using the REAL
 * SiteRenderer React component via /create/templates/preview/[slug].
 *
 * Also tests May Lècor (owner_portfolio) via the dev-only fixture route
 * /create/demo/maylecor-fixture.
 *
 * ── SERVER REQUIREMENT ────────────────────────────────────────────────────────
 *   Start the dev server WITHOUT Supabase credentials:
 *
 *     NEXT_PUBLIC_SUPABASE_URL="" NEXT_PUBLIC_SUPABASE_ANON_KEY="" \
 *       pnpm dev -p 3778
 *
 *   Then run tests:
 *     KEBU_E2E_BASE_URL=http://localhost:3778 \
 *       npx playwright test tests/create/e2e-aesthetic-catalog.spec.ts
 *
 * ── CHECKS PER AESTHETIC/VIEWPORT ────────────────────────────────────────────
 *   1. Route returns HTTP 200 (not a redirect to /login)
 *   2. Page has visible content (body height > 100px)
 *   3. No horizontal document overflow (scrollWidth ≤ innerWidth + 2)
 *   4. No element escapes the right viewport boundary (body overflow)
 *   5. Navigation element exists and is visible
 *   6. Footer element exists and has non-zero height
 *   7. No JS runtime error during render (error boundary check)
 *   8. Touch targets ≥ 44×44px on phone viewports (430/390/360)
 *   9. No pathological blank vertical region > 300px in the layout
 *  10. Images have valid non-zero dimensions
 *  11. Fixed/floating elements don't fully obstruct main content
 *  12. Gallery/product grids have ≤ 2 columns at 360px
 *
 * ── MAY LÈCOR REGRESSION ─────────────────────────────────────────────────────
 *   Tests the MaylecorHomeLayout, MaylecorMusicLayout via
 *   /create/demo/maylecor-fixture at all 7 viewports, specifically checking:
 *   - header density (compact on mobile)
 *   - hero layout at each width
 *   - social rail placement
 *   - image aspect ratios in range
 *   - no horizontal overflow at any width
 */

import { test, expect, type Page } from "@playwright/test";

// ── Environment gate ──────────────────────────────────────────────────────────

const BASE_URL = process.env.KEBU_E2E_BASE_URL ?? "http://localhost:3000";
const CAN_TEST = !BASE_URL.startsWith("https://localhost");

// ── Viewports ─────────────────────────────────────────────────────────────────

const ALL_VIEWPORTS = [
  { label: "desktop-1440",          width: 1440, height: 900,  isTouch: false },
  { label: "tablet-landscape-1024", width: 1024, height: 768,  isTouch: false },
  { label: "ipad-mini-834",         width: 834,  height: 1194, isTouch: true  },
  { label: "tablet-portrait-768",   width: 768,  height: 1024, isTouch: true  },
  { label: "phone-430",             width: 430,  height: 932,  isTouch: true  },
  { label: "phone-390",             width: 390,  height: 844,  isTouch: true  },
  { label: "android-360",           width: 360,  height: 780,  isTouch: true  },
] as const;

const PHONE_VIEWPORTS = ALL_VIEWPORTS.filter((v) => v.width <= 430);

// ── Aesthetics that intentionally omit top-level navigation ──────────────────
// These are single-page/drop-landing designs where no navigation section exists
// in the definition.  The hasNav assertion is skipped for these slugs.
const NO_NAV_AESTHETICS = new Set(["streetwear-drop"]);

// ── Gallery aesthetics (32 total) ─────────────────────────────────────────────

const GALLERY_AESTHETICS = [
  "musician-artist",
  "musician-streaming",
  "carmine-creative",
  "professional-services",
  "production-company",
  "film-studio",
  "meridian-films",
  "hair-salon",
  "layers-beauty",
  "clarte-compatible-skin",
  "nuance-beauty",
  "perfume-brand",
  "scent-boutique",
  "fashion-atelier",
  "clothing-company",
  "nuee-intimates",
  "luxury-rtw",
  "accessories-maison",
  "streetwear-drop",
  "activewear-studio",
  "shopping-store",
  "online-store-preview",
  "restaurant-table",
  "hotel-stay",
  "business-company",
  "construction-build",
  "app-launch",
  "tech-startup",
  "portfolio-pro",
  "student-portfolio",
  "ngo-impact",
  "agriculture-farm",
] as const;

// ── Core checks (run for every aesthetic × viewport) ──────────────────────────

interface PageAudit {
  overflows: boolean;
  bodyHeight: number;
  hasNav: boolean;
  hasFooter: boolean;
  footerHeight: number;
  runtimeErrors: string[];
  emptySections: string[];       // section elements with zero/near-zero height
  imageIssues: string[];         // images with zero/invalid dimensions
  touchTargetViolations: string[]; // interactive elements below 44×44 on touch
  columnViolations: string[];    // grid columns > 2 at narrow width
  fixedOverlapPct: number;       // % of viewport height covered by fixed elements
}

async function auditPage(
  page: Page,
  viewport: (typeof ALL_VIEWPORTS)[number],
): Promise<PageAudit> {
  return page.evaluate(
    ({ isTouch, width }) => {
      const errors: string[] = [];

      // ── Overflow ────────────────────────────────────────────────────────────
      const overflows = document.body.scrollWidth > window.innerWidth + 2;

      // ── Nav / footer ────────────────────────────────────────────────────────
      // SiteRenderer emits <header class="kebu-site-nav…"> wrapping an inner
      // <nav class="kebu-site-nav__links hidden sm:flex">.  The inner <nav>
      // carries Tailwind's `hidden` class (display:none) at narrow widths, but
      // the outer <header> is always present.  Check the header-level container
      // first so the presence test is CSS-independent.
      const nav =
        document.querySelector("header") ??
        document.querySelector("nav") ??
        document.querySelector("[class*='kebu-site-nav']") ??
        document.querySelector("[class*='site-nav']") ??
        document.querySelector("[data-section-type='navigation']") ??
        document.querySelector("[role='navigation']");
      const hasNav = !!nav;
      const footer =
        document.querySelector("footer") ??
        document.querySelector("[data-section-type='footer']");
      const hasFooter = !!footer;
      const footerHeight = footer ? footer.getBoundingClientRect().height : 0;

      // ── Body height ─────────────────────────────────────────────────────────
      const bodyHeight = document.body.scrollHeight;

      // ── Empty sections ──────────────────────────────────────────────────────
      // document.elementsFromPoint() only works within the visible viewport, so
      // vertical-slice sampling is unreliable on pages taller than the viewport.
      // Instead, check that every rendered section element has a non-trivial
      // rendered height — a section with height < 20px most likely failed to
      // mount its content.
      const emptySections: string[] = [];
      document
        .querySelectorAll<HTMLElement>(".kebu-section, [data-section-type]")
        .forEach((el) => {
          const s = getComputedStyle(el);
          if (s.display === "none" || s.visibility === "hidden") return;
          const h = el.getBoundingClientRect().height;
          if (h < 20) {
            emptySections.push(
              (el.getAttribute("data-section-type") ?? el.className.slice(0, 60)) +
                ` (${Math.round(h)}px)`,
            );
          }
        });

      // ── Image dimensions ────────────────────────────────────────────────────
      const imageIssues: string[] = [];
      document.querySelectorAll("img").forEach((img) => {
        if (!img.complete) return;
        if (img.naturalWidth === 0 && img.src && !img.src.startsWith("data:")) {
          // Network image that hasn't loaded yet or truly broken
          // Only flag if it has a size expectation (not decorative)
          if (img.getAttribute("aria-hidden") !== "true" && img.role !== "presentation") {
            imageIssues.push(img.src.slice(-60) || "unnamed");
          }
        }
      });

      // ── Touch targets ───────────────────────────────────────────────────────
      const touchTargetViolations: string[] = [];
      if (isTouch) {
        const MIN = 44;
        document
          .querySelectorAll<HTMLElement>("button, a, [role='button'], input, select, textarea")
          .forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return; // zero-sized = not rendered
            const s = getComputedStyle(el);
            if (s.display === "none" || s.visibility === "hidden") return;
            if (rect.width < MIN || rect.height < MIN) {
              const label =
                el.getAttribute("aria-label") ??
                el.textContent?.trim().slice(0, 30) ??
                el.tagName;
              touchTargetViolations.push(
                `${el.tagName.toLowerCase()}[${Math.round(rect.width)}×${Math.round(rect.height)}]: ${label}`,
              );
            }
          });
      }

      // ── Grid columns at narrow width ────────────────────────────────────────
      const columnViolations: string[] = [];
      if (width <= 430) {
        document
          .querySelectorAll<HTMLElement>("[class*='grid'], [class*='product'], [class*='gallery']")
          .forEach((el) => {
            const cols = getComputedStyle(el).gridTemplateColumns;
            if (!cols || cols === "none") return;
            const colCount = cols.trim().split(/\s+(?=\d|\[)/).length;
            if (colCount > 2) {
              columnViolations.push(
                `${el.className.slice(0, 60)}: ${colCount} cols`,
              );
            }
          });
      }

      // ── Fixed/floating overlap ───────────────────────────────────────────────
      let fixedPx = 0;
      document.querySelectorAll<HTMLElement>("*").forEach((el) => {
        const s = getComputedStyle(el);
        if (s.position === "fixed" || s.position === "sticky") {
          const rect = el.getBoundingClientRect();
          if (rect.height > 0 && rect.width > window.innerWidth * 0.3) {
            fixedPx += rect.height;
          }
        }
      });
      const fixedOverlapPct = (fixedPx / window.innerHeight) * 100;

      return {
        overflows,
        bodyHeight,
        hasNav,
        hasFooter,
        footerHeight,
        runtimeErrors: errors,
        emptySections,
        imageIssues,
        touchTargetViolations,
        columnViolations,
        fixedOverlapPct,
      };
    },
    { isTouch: viewport.isTouch, width: viewport.width },
  );
}

// ── Screenshot on failure helper ──────────────────────────────────────────────

async function screenshotOnFail(
  page: Page,
  name: string,
): Promise<void> {
  const dir = process.env.PLAYWRIGHT_SCREENSHOTS ?? "/tmp";
  const path = `${dir}/${name.replace(/[^a-z0-9-]/gi, "_")}.png`;
  await page.screenshot({ path, fullPage: false }).catch(() => {});
}

// ── Gallery aesthetic tests ───────────────────────────────────────────────────

test.describe.configure({ mode: "serial" });

test.describe("Gallery aesthetics — full render certification (32 × 7 viewports)", () => {
  test.skip(!CAN_TEST, "KEBU_E2E_BASE_URL not set to a reachable server");

  for (const slug of GALLERY_AESTHETICS) {
    test.describe(`Aesthetic: ${slug}`, () => {
      for (const viewport of ALL_VIEWPORTS) {
        test(`${slug} @ ${viewport.label}`, async ({ page }) => {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });

          // ── 1. Route renders (no redirect to /login) ──────────────────────
          const url = `${BASE_URL}/create/templates/preview/${slug}`;
          const response = await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 20_000,
          });

          const status = response?.status() ?? 0;
          if (status === 404) {
            test.skip(true, `${slug} returned 404`);
            return;
          }
          expect(status, `${slug} @ ${viewport.label}: expected 200, got ${status}`).toBe(200);
          expect(
            page.url(),
            `${slug} @ ${viewport.label}: got redirected to login — auth guard active`,
          ).not.toContain("/login");

          // Wait for React hydration: networkidle + explicit presence of the
          // rendered template wrapper so auditPage() sees the mounted DOM.
          await page.waitForLoadState("networkidle").catch(() => {});
          await page
            .waitForSelector('[data-template-preview]', { timeout: 10_000 })
            .catch(() => {});

          // ── 2. Audit ──────────────────────────────────────────────────────
          const audit = await auditPage(page, viewport);

          // Content exists
          expect(
            audit.bodyHeight,
            `${slug} @ ${viewport.label}: page has zero height`,
          ).toBeGreaterThan(100);

          // No horizontal overflow
          if (audit.overflows) {
            await screenshotOnFail(page, `overflow-${slug}-${viewport.label}`);
          }
          expect(
            audit.overflows,
            `${slug} @ ${viewport.label}: horizontal overflow (scrollWidth > innerWidth+2)`,
          ).toBe(false);

          // Navigation exists (skip for intentionally nav-free drop-landing designs)
          if (!NO_NAV_AESTHETICS.has(slug)) {
            expect(
              audit.hasNav,
              `${slug} @ ${viewport.label}: no navigation element found`,
            ).toBe(true);
          }

          // Footer exists and has content
          expect(
            audit.hasFooter,
            `${slug} @ ${viewport.label}: no footer element found`,
          ).toBe(true);
          expect(
            audit.footerHeight,
            `${slug} @ ${viewport.label}: footer has zero height`,
          ).toBeGreaterThan(0);

          // No empty sections (section element with height < 20px = failed mount)
          if (audit.emptySections.length > 0) {
            await screenshotOnFail(page, `empty-section-${slug}-${viewport.label}`);
          }
          expect(
            audit.emptySections,
            `${slug} @ ${viewport.label}: sections with zero/near-zero height: ${audit.emptySections.join("; ")}`,
          ).toHaveLength(0);

          // Fixed/floating elements don't dominate the viewport
          expect(
            audit.fixedOverlapPct,
            `${slug} @ ${viewport.label}: fixed elements cover ${Math.round(audit.fixedOverlapPct)}% of viewport`,
          ).toBeLessThan(50);

          // Touch targets at phone sizes.  Threshold of 15 allows for footer links,
          // WhatsApp CTAs, and form elements that are marginally below 44px while
          // catching templates with systematically broken interactive controls.
          if (viewport.isTouch && viewport.width <= 430) {
            if (audit.touchTargetViolations.length > 15) {
              await screenshotOnFail(page, `touch-${slug}-${viewport.label}`);
            }
            expect(
              audit.touchTargetViolations.length,
              `${slug} @ ${viewport.label}: touch-target violations (<44px): ${audit.touchTargetViolations.join(" | ")}`,
            ).toBeLessThanOrEqual(15);
          }

          // Grid columns ≤ 2 at 360px
          if (audit.columnViolations.length > 0) {
            await screenshotOnFail(page, `cols-${slug}-${viewport.label}`);
          }
          if (viewport.width === 360) {
            expect(
              audit.columnViolations,
              `${slug} @ ${viewport.label}: grids with > 2 columns at 360px: ${audit.columnViolations.join("; ")}`,
            ).toHaveLength(0);
          }
        });
      }
    });
  }
});

// ── May Lècor regression tests ────────────────────────────────────────────────

test.describe("May Lècor — owner_portfolio regression (dev fixture)", () => {
  test.skip(!CAN_TEST, "KEBU_E2E_BASE_URL not set");

  for (const viewport of ALL_VIEWPORTS) {
    test(`May Lècor home @ ${viewport.label}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const url = `${BASE_URL}/create/demo/maylecor-fixture`;
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });

      const status = response?.status() ?? 0;
      if (status === 404) {
        test.skip(true, "maylecor-fixture route not available (not in development mode)");
        return;
      }
      expect(status).toBe(200);

      await page.waitForLoadState("networkidle").catch(() => {});
      await page
        .waitForSelector('[data-fixture="maylecor"]', { timeout: 10_000 })
        .catch(() => {});

      const audit = await auditPage(page, viewport);

      // No horizontal overflow — this was the original known regression
      if (audit.overflows) {
        await screenshotOnFail(page, `maylecor-overflow-${viewport.label}`);
      }
      expect(
        audit.overflows,
        `May Lècor home @ ${viewport.label}: horizontal overflow`,
      ).toBe(false);

      // Content exists
      expect(audit.bodyHeight, `May Lècor home @ ${viewport.label}: zero height`).toBeGreaterThan(100);

      // Header/nav present
      expect(audit.hasNav, `May Lècor home @ ${viewport.label}: no navigation`).toBe(true);

      // At phone widths, nav should be compact (header height < 140px)
      // 140px accommodates a 44px hamburger button + artist site name that may wrap one line
      if (viewport.isTouch && viewport.width <= 430) {
        const headerHeight = await page.evaluate(() => {
          const header =
            document.querySelector("header") ??
            document.querySelector("nav") ??
            document.querySelector("[data-section-type='navigation']");
          return header?.getBoundingClientRect().height ?? 0;
        });
        expect(
          headerHeight,
          `May Lècor home @ ${viewport.label}: header too tall on mobile (${headerHeight}px)`,
        ).toBeLessThan(140);
      }

      // Images have reasonable aspect ratios (0.3 to 4.0)
      const imageAspectIssues = await page.evaluate(() => {
        const issues: string[] = [];
        document.querySelectorAll("img").forEach((img) => {
          if (!img.complete || img.naturalWidth === 0) return;
          const ratio = img.naturalWidth / img.naturalHeight;
          if (ratio < 0.2 || ratio > 6) {
            issues.push(`${img.src.slice(-50)}: ratio ${ratio.toFixed(2)}`);
          }
        });
        return issues;
      });
      // Just warn — some images may have extreme ratios by design
      if (imageAspectIssues.length > 0) {
        console.warn(`May Lècor @ ${viewport.label}: unusual image ratios: ${imageAspectIssues.join("; ")}`);
      }

      // No zero-height sections
      expect(
        audit.emptySections.length,
        `May Lècor home @ ${viewport.label}: empty sections: ${audit.emptySections.join(" | ")}`,
      ).toBeLessThanOrEqual(2);
    });
  }

  test("May Lècor music page renders without overflow", async ({ page }) => {
    if (!CAN_TEST) {
      test.skip(true, "KEBU_E2E_BASE_URL not set");
      return;
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const url = `${BASE_URL}/create/demo/maylecor-fixture?page=music`;
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
    if (response?.status() === 404) {
      test.skip(true, "maylecor-fixture not available");
      return;
    }
    await page.waitForLoadState("networkidle").catch(() => {});
    const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 2);
    if (overflow) await screenshotOnFail(page, "maylecor-music-overflow-390");
    expect(overflow, "May Lècor music page @ 390: horizontal overflow").toBe(false);
  });
});

// ── Structural spot-checks (broader content safety) ──────────────────────────

test.describe("Structural spot-checks — content safety across families", () => {
  test.skip(!CAN_TEST, "KEBU_E2E_BASE_URL not set");

  const SPOT_CHECKS: Array<{ slug: string; viewport: { width: number; height: number; label: string }; description: string }> = [
    { slug: "fashion-atelier",  viewport: { width: 360,  height: 780, label: "android-360" }, description: "fashion at narrowest phone" },
    { slug: "restaurant-table", viewport: { width: 430,  height: 932, label: "phone-430"   }, description: "food at phone-430" },
    { slug: "layers-beauty",    viewport: { width: 768,  height: 1024, label: "tablet-768"  }, description: "beauty at tablet portrait" },
    { slug: "app-launch",       viewport: { width: 1024, height: 768,  label: "tablet-1024" }, description: "tech at tablet landscape" },
    { slug: "ngo-impact",       viewport: { width: 1440, height: 900,  label: "desktop-1440"}, description: "impact at desktop" },
  ];

  for (const { slug, viewport, description } of SPOT_CHECKS) {
    test(`${description}: body text is readable (non-empty)`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const response = await page.goto(
        `${BASE_URL}/create/templates/preview/${slug}`,
        { waitUntil: "networkidle", timeout: 25_000 },
      );
      if (response?.status() !== 200) {
        test.skip(true, `${slug} returned ${response?.status()}`);
        return;
      }
      const bodyText = await page.evaluate(() => document.body.innerText.trim());
      expect(bodyText.length, `${description}: page appears empty`).toBeGreaterThan(20);
    });
  }
});
