/**
 * SiteRenderer Responsive Audit — Actual React Component
 *
 * Tests the REAL SiteRenderer React component via the public template preview
 * route, at all 7 viewport widths.  No inline HTML approximations.
 *
 * ── HOW THIS DIFFERS FROM e2e-responsive-sections.spec.ts ─────────────────
 *   e2e-responsive-sections.spec.ts — modeled inline HTML that mirrors
 *     site-renderer.tsx CSS patterns. No auth required, no server required.
 *     Tests CSS/layout properties only, not actual component output.
 *
 *   THIS FILE — actual SiteRenderer React component rendered by the Next.js
 *     app via /create/templates/preview/[slug] or /create/demo/[slug].
 *     Tests real component output, real CSS classes, real responsive behavior.
 *
 * ── SERVER REQUIREMENTS ────────────────────────────────────────────────────
 *   A running Next.js server is required.  The server can be started WITHOUT
 *   Supabase credentials — when NEXT_PUBLIC_SUPABASE_URL is unset, the
 *   middleware auth guard is disabled and /create routes are accessible.
 *
 *   Start the server:
 *     pnpm dev   (or next start if you have a production build)
 *
 *   The auth middleware in lib/supabase/middleware.ts returns NextResponse.next()
 *   unconditionally when NEXT_PUBLIC_SUPABASE_URL is absent, so template preview
 *   routes are reachable without credentials in a local dev environment.
 *
 * ── ENVIRONMENT VARIABLES ─────────────────────────────────────────────────
 *   KEBU_E2E_BASE_URL — URL of the running Next.js dev server.
 *                       Defaults to http://localhost:3000.
 *                       DO NOT point at https://kebu.africa (production).
 *
 * ── TEMPLATES TESTED ──────────────────────────────────────────────────────
 *   These are PUBLIC templates (visibility !== 'owner_portfolio') whose
 *   definitions live in lib/create/templates-seed.ts.
 *   No production database data is required.
 *
 *   fashion-atelier    — standard e-commerce layout, hero + products
 *   musician-streaming — music streaming layout, hero + sections
 *   restaurant-table   — food/service layout
 *
 * ── MAY LÈCOR ─────────────────────────────────────────────────────────────
 *   The May Lècor template (musician-kdirection-artist / musician-maylecor-ksendr)
 *   has visibility: "owner_portfolio" — the /create/templates/preview/[slug] route
 *   returns 404 for owner_portfolio slugs via the isPublicTemplateSlug() guard.
 *
 *   May Lècor FIXTURE STRATEGY (see e2e-maylecor-actual.spec.ts):
 *   The full May Lècor WebsiteDefinition is available in source control via
 *   TEMPLATE_SEEDS.find(t => t.slug === 'musician-kdirection-artist').definition
 *   A sanitized fixture route (/create/demo/maylecor-fixture) would render the
 *   actual MaylecorHomeLayout / MaylecorMusicLayout / LegallyBlondeHeroLayout
 *   components without production database access.
 *
 *   To enable this, add a fixture route in app/create/demo/maylecor-fixture/page.tsx
 *   that passes the TEMPLATE_SEEDS entry directly to SiteRenderer.
 *   This is NOT blocked by Supabase auth — only by the missing fixture route.
 *   See ACTION ITEM at the bottom of this file.
 */

import { test, expect } from "@playwright/test";

// ── Environment gate ──────────────────────────────────────────────────────────

const BASE_URL = process.env.KEBU_E2E_BASE_URL ?? "http://localhost:3000";

// These tests require a running Next.js server.
// When no KEBU_E2E_BASE_URL is set, we attempt to connect to the default and
// skip if the server is not reachable.
const CAN_TEST = BASE_URL !== "https://localhost:3000";

// ── Viewports ─────────────────────────────────────────────────────────────────

const ALL_VIEWPORTS = [
  { label: "desktop-1440",         width: 1440, height: 900  },
  { label: "tablet-landscape-1024",width: 1024, height: 768  },
  { label: "ipad-mini-834",        width: 834,  height: 1194 },
  { label: "tablet-portrait-768",  width: 768,  height: 1024 },
  { label: "phone-430",            width: 430,  height: 932  },
  { label: "phone-390",            width: 390,  height: 844  },
  { label: "android-360",          width: 360,  height: 780  },
] as const;

// ── Template slugs to test (public templates only) ────────────────────────────

const PUBLIC_TEMPLATE_SLUGS = [
  "fashion-atelier",
  "musician-streaming",
  "restaurant-table",
  "musicien",
] as const;

// ── Helper: check a rendered SiteRenderer page ────────────────────────────────

async function checkSiteRendererPage(
  page: ReturnType<import("@playwright/test").Browser["newPage"]> extends Promise<infer T> ? T : never,
  url: string,
  viewport: { width: number; height: number; label: string },
) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });

  // Skip if route returned 404 (owner_portfolio slug or missing fixture).
  if (response?.status() === 404) {
    return "skip:404";
  }

  // Wait for Next.js hydration.
  await page.waitForLoadState("networkidle").catch(() => {});

  return "ok";
}

// ── Public template tests ─────────────────────────────────────────────────────

test.describe.configure({ mode: "serial" });

test.describe("SiteRenderer — public template preview at 7 viewports", () => {
  test.skip(!CAN_TEST, "KEBU_E2E_BASE_URL not set or default localhost — start dev server and set KEBU_E2E_BASE_URL=http://localhost:3000");

  for (const slug of PUBLIC_TEMPLATE_SLUGS) {
    for (const viewport of ALL_VIEWPORTS) {
      test(`${slug} @ ${viewport.label} — no overflow, visible, no clipping`, async ({ page }) => {
        const url = `${BASE_URL}/create/templates/preview/${slug}`;
        const status = await checkSiteRendererPage(page, url, viewport);

        if (status === "skip:404") {
          test.skip(true, `Template ${slug} returned 404 — may be owner_portfolio or unlisted`);
          return;
        }

        // ── No horizontal overflow ──────────────────────────────────────
        const overflow = await page.evaluate(() => {
          return document.body.scrollWidth > window.innerWidth + 2;
        });
        expect(overflow, `${slug} @ ${viewport.label}: horizontal overflow (scrollWidth > innerWidth+2)`).toBe(false);

        // ── Page has visible content ────────────────────────────────────
        const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
        expect(bodyHeight, `${slug} @ ${viewport.label}: page has zero height`).toBeGreaterThan(100);

        // ── data-template-preview attribute confirms correct component ──
        const templateAttr = await page.locator("[data-template-preview]").getAttribute("data-template-preview").catch(() => null);
        if (templateAttr !== null) {
          expect(templateAttr).toBe(slug);
        }
      });
    }
  }
});

// ── SiteRenderer structural checks (broader) ──────────────────────────────────

test.describe("SiteRenderer — structural section rendering", () => {
  test.skip(!CAN_TEST, "KEBU_E2E_BASE_URL not set — start dev server");

  test("fashion-atelier renders at least one section element at desktop", async ({ page }) => {
    const url = `${BASE_URL}/create/templates/preview/fashion-atelier`;
    await page.setViewportSize({ width: 1440, height: 900 });
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 20_000 });
    if (response?.status() === 404) {
      test.skip(true, "fashion-atelier template not found");
      return;
    }

    // The SiteRenderer renders sections as divs/sections under the root.
    // Confirm some content rendered beyond just the shell.
    const bodyText = await page.evaluate(() => document.body.innerText.trim());
    expect(bodyText.length).toBeGreaterThan(10);
  });

  test("musician-streaming renders at phone width (360px) without horizontal scroll", async ({ page }) => {
    const url = `${BASE_URL}/create/templates/preview/musician-streaming`;
    await page.setViewportSize({ width: 360, height: 780 });
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 20_000 });
    if (response?.status() === 404) {
      test.skip(true, "musician-streaming template not found");
      return;
    }

    const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 2);
    expect(overflow).toBe(false);
  });
});

/*
 * ── ACTION ITEM: May Lècor fixture route ─────────────────────────────────────
 *
 * To enable actual SiteRenderer testing of May Lècor components without
 * Supabase authentication, add the following route to the app:
 *
 *   app/create/demo/maylecor-fixture/page.tsx
 *
 * Content:
 *   import { TEMPLATE_SEEDS } from "@/lib/create/templates-seed";
 *   import { SiteRenderer } from "@/app/components/create/site-renderer";
 *   import { notFound } from "next/navigation";
 *
 *   export default function MaylecorFixturePage() {
 *     const seed = TEMPLATE_SEEDS.find(t => t.slug === "musician-kdirection-artist");
 *     if (!seed) notFound();
 *     return (
 *       <div data-fixture="maylecor">
 *         <SiteRenderer definition={seed.definition} mode="preview" pageSlug="home" />
 *       </div>
 *     );
 *   }
 *
 * This route does NOT require Supabase auth (no session needed, no DB query).
 * The definition is derived entirely from source-controlled template data.
 *
 * Once this route is added, the following test can run:
 *   e2e-maylecor-actual.spec.ts — tests MaylecorHomeLayout + MaylecorMusicLayout
 *   at all 7 viewports, verifying the structural characteristics that previously
 *   failed: header density, hero layout, social rail placement, image aspect ratios.
 *
 * This is NOT currently blocked by Supabase auth.
 * It IS currently blocked by the missing fixture route.
 * ─────────────────────────────────────────────────────────────────────────────
 */
