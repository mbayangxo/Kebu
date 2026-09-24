/**
 * May Lècor Renderer Regression — Item 5
 *
 * Gate status: PARTIAL
 *   - Tests run against an inline HTML fixture that mirrors maylecor-layout.tsx's
 *     structural properties — NOT the real React component rendering.
 *   - These tests verify CSS layout contracts (positioning, overflow, sizing)
 *     but cannot catch React hydration bugs, Tailwind class regressions, or
 *     data-driven rendering differences from real project fixtures.
 *
 * For COMPLETE coverage, a live server with a seeded May Lècor project
 * (KEBU_E2E_BASE_URL + KEBU_E2E_BUILDER_COOKIE + KEBU_E2E_PROJECT_ID) is required.
 *
 * Tests the structural contracts of the May Lècor home layout at each device
 * width. The layout is defined in app/components/create/maylecor-layout.tsx
 * and uses Tailwind responsive classes.
 *
 * Since rendering the actual Next.js React component requires a full server
 * and auth, these tests use an inline HTML fixture that mirrors the key
 * structural properties of the rendered output:
 *   - The outer container is full-width, full-height, bg-black
 *   - Navigation / logo area is at the top without collision
 *   - Hero collage area takes up ≥ 280px vertical space on all devices
 *   - Artist name heading is visible and not squeezed (≥ 1 line readable width)
 *   - Social rail is positioned absolutely and stays within viewport bounds
 *   - Primary content (name, CTA) is visible
 *   - No horizontal overflow at any viewport
 *
 * MISSING for full live regression:
 *   - Real image URLs (backgroundImage, portraitMain, collageTop, etc.)
 *   - Actual Tailwind CSS (CDN is blocked in this environment, so CSS is
 *     hand-inlined below for the structural properties being tested)
 *   - React hydration + CSS animation behavior
 */

import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { label: "desktop-1440", width: 1440, height: 900 },
  { label: "tablet-1024", width: 1024, height: 768 },
  { label: "tablet-768", width: 768, height: 1024 },
  { label: "phone-430", width: 430, height: 932 },
  { label: "phone-390", width: 390, height: 844 },
] as const;

/**
 * Minimal HTML fixture mirroring maylecor-layout.tsx structural hierarchy.
 * Uses inline CSS that mirrors the Tailwind classes used in the real component.
 *
 * Real images replaced with colored placeholders.
 * Social rail uses absolute positioning as in the live component.
 */
function makeMaylecorHtml(): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>May Lècor Home — Regression Fixture</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #000; color: #fff; font-family: sans-serif; }

    /* Root section: min-h-screen bg-black text-white relative */
    #section-root {
      position: relative;
      min-height: 100vh;
      background: #000;
      color: #fff;
      width: 100%;
    }

    /* Social rail: position absolute, configurable left/top via CSS custom props */
    #social-rail {
      position: absolute;
      top: 20%;
      left: 2%;
      z-index: 30;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .social-icon {
      width: 28px;
      height: 28px;
      background: rgba(255,255,255,0.15);
      border-radius: 50%;
    }

    /* Background blur layer: absolute inset-0 */
    #bg-blur {
      position: absolute;
      inset: 0;
      background: #111;
      opacity: 0.4;
      z-index: 0;
    }

    /* Content container: relative mx-auto max-w-6xl px-4 pb-16 pt-8 */
    #content {
      position: relative;
      max-width: 1152px;
      margin: 0 auto;
      padding: 32px 16px 64px;
      z-index: 10;
    }
    @media (min-width: 640px) {
      #content { padding: 48px 32px 64px; }
    }

    /* Hero image collage area: min-h-[280px] at xs, sm:[420px], md:[520px] */
    #hero-collage {
      position: relative;
      min-height: 280px;
      max-width: 896px;
      margin: 0 auto 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    @media (min-width: 640px) { #hero-collage { min-height: 420px; } }
    @media (min-width: 768px) { #hero-collage { min-height: 520px; } }

    /* Portrait main image placeholder */
    #portrait-main {
      width: 58%;
      aspect-ratio: 3/4;
      background: #333;
      margin: 0 auto;
      position: relative;
      z-index: 20;
    }

    /* Collage top: absolute -top-4 right-0 z-10 w-[52%] */
    #collage-top {
      position: absolute;
      top: -16px;
      right: 0;
      width: 52%;
      aspect-ratio: 4/3;
      background: #444;
      z-index: 10;
    }

    /* Collage middle: absolute bottom-0 left-0 z-10 w-[55%] */
    #collage-middle {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 55%;
      aspect-ratio: 4/3;
      background: #555;
      z-index: 10;
    }

    /* Artist name section: text-center mb-10 */
    #artist-name-section {
      text-align: center;
      margin-bottom: 40px;
    }

    /* Logo banner image */
    #logo-banner {
      max-width: 320px;
      width: 80%;
      height: 60px;
      background: #222;
      margin: 0 auto 8px;
    }
    @media (min-width: 640px) { #logo-banner { max-width: 400px; } }
    @media (min-width: 768px) { #logo-banner { max-width: 480px; } }

    /* Artist name heading */
    #artist-name {
      font-size: 2rem;
      font-weight: 700;
      color: #fff;
      margin: 0;
      padding: 8px 0;
      word-break: break-word;
    }
    @media (min-width: 640px) { #artist-name { font-size: 2.5rem; } }

    /* CTA button */
    #cta-btn {
      display: inline-block;
      margin-top: 16px;
      padding: 12px 32px;
      background: #fff;
      color: #000;
      font-weight: 600;
      border-radius: 4px;
      text-decoration: none;
      font-size: 0.875rem;
    }

    /* Bottom collage row */
    #bottom-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 32px;
    }
    .bottom-photo {
      aspect-ratio: 4/3;
      background: #2a2a2a;
    }
  </style>
</head>
<body>
  <section id="section-root">
    <div id="bg-blur"></div>

    <div id="social-rail" aria-label="Social links">
      <div class="social-icon"></div>
      <div class="social-icon"></div>
      <div class="social-icon"></div>
    </div>

    <div id="content">
      <div id="hero-collage">
        <div id="collage-top" aria-hidden="true"></div>
        <div id="portrait-main" role="img" aria-label="Artist portrait placeholder"></div>
        <div id="collage-middle" aria-hidden="true"></div>
      </div>

      <div id="artist-name-section">
        <div id="logo-banner" role="img" aria-label="Artist logo banner"></div>
        <h1 id="artist-name">MAY LÈCOR</h1>
        <a id="cta-btn" href="#">Listen Now</a>
      </div>

      <div id="bottom-row">
        <div class="bottom-photo" role="img" aria-label="Bottom left photo"></div>
        <div class="bottom-photo" role="img" aria-label="Bottom right photo"></div>
      </div>
    </div>
  </section>
</body>
</html>`;
}

test.describe("May Lècor home — structural regression", () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.label}: no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.setContent(makeMaylecorHtml());
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const windowWidth = await page.evaluate(() => window.innerWidth);
      expect(scrollWidth).toBeLessThanOrEqual(windowWidth + 1);
    });

    test(`${vp.label}: hero collage has minimum height (no deformation)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.setContent(makeMaylecorHtml());
      const heroBox = await page.locator("#hero-collage").boundingBox();
      expect(heroBox).not.toBeNull();
      // Phone: ≥280px, tablet: ≥420px, desktop: ≥520px
      const minH = vp.width < 640 ? 280 : vp.width < 768 ? 420 : 520;
      expect(heroBox!.height).toBeGreaterThanOrEqual(minH);
    });

    test(`${vp.label}: artist name is visible and not squeezed`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.setContent(makeMaylecorHtml());
      const nameEl = page.locator("#artist-name");
      await expect(nameEl).toBeVisible();
      const box = await nameEl.boundingBox();
      expect(box).not.toBeNull();
      // Name should be at least 200px wide (readable) on all devices
      expect(box!.width).toBeGreaterThan(200);
      // Height: at least one line (≥28px)
      expect(box!.height).toBeGreaterThanOrEqual(28);
    });

    test(`${vp.label}: CTA button is visible and touchable`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.setContent(makeMaylecorHtml());
      const btn = page.locator("#cta-btn");
      await expect(btn).toBeVisible();
      const box = await btn.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(36);
    });

    test(`${vp.label}: social rail is within viewport bounds (not stranded)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.setContent(makeMaylecorHtml());
      const railBox = await page.locator("#social-rail").boundingBox();
      expect(railBox).not.toBeNull();
      // Rail should be within horizontal viewport bounds
      expect(railBox!.x).toBeGreaterThanOrEqual(0);
      expect(railBox!.x + railBox!.width).toBeLessThanOrEqual(vp.width);
    });

    test(`${vp.label}: nav/logo area not colliding with content (vertical order correct)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.setContent(makeMaylecorHtml());
      const contentBox = await page.locator("#content").boundingBox();
      const heroBox = await page.locator("#hero-collage").boundingBox();
      const nameSection = await page.locator("#artist-name-section").boundingBox();
      expect(contentBox).not.toBeNull();
      expect(heroBox).not.toBeNull();
      expect(nameSection).not.toBeNull();
      // Content must start near the top (within padding)
      expect(contentBox!.y).toBeGreaterThanOrEqual(0);
      // Hero collage must be ABOVE the artist name section (correct reading order)
      expect(heroBox!.y).toBeLessThan(nameSection!.y);
      // Artist name must be ABOVE the CTA (natural DOM order)
      const ctaBox = await page.locator("#cta-btn").boundingBox();
      expect(nameSection!.y).toBeLessThan(ctaBox!.y);
    });
  }
});

test.describe("May Lècor — bottom row (no giant whitespace)", () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.label}: bottom photos are visible, no giant whitespace gap`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.setContent(makeMaylecorHtml());
      const bottomRow = await page.locator("#bottom-row").boundingBox();
      expect(bottomRow).not.toBeNull();
      // Photos must have some height (aspect-ratio: 4/3 — width drives height)
      expect(bottomRow!.height).toBeGreaterThan(50);
      // No abnormal vertical gap before bottom row — should be within page, not thousands of pixels down
      expect(bottomRow!.y).toBeLessThan(vp.height * 4);
    });
  }
});
