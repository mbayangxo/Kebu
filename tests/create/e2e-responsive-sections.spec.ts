/**
 * Generated-Site Responsive Empirical Audit
 *
 * Tests representative section families at Desktop / Tablet / Phone viewports
 * using self-contained inline HTML that mirrors the CSS patterns used in
 * site-renderer.tsx. No server required.
 *
 * Viewports tested:
 *   1440 — desktop
 *   1024 — tablet landscape
 *    834 — iPad mini portrait (added to gate; was missing from prior spec)
 *    768 — tablet portrait
 *    430 — phone large
 *    390 — phone standard
 *    360 — Android phone (added to gate; was missing from prior spec)
 *
 * Section families covered:
 *   navigation/header, hero, text/content, image/media,
 *   multi-column/grid, gallery, products/commerce, testimonials/reviews,
 *   forms/newsletter, footer, floating/overlay
 *
 * Checks per section family per viewport:
 *   - No horizontal overflow (scrollWidth <= innerWidth + 1)
 *   - Section is visible (not zero-height)
 *   - No element extends beyond right edge of viewport
 *   - Touch targets ≥ 44px on phone widths
 */

import { test, expect } from "@playwright/test";

const ALL_VIEWPORTS = [
  { label: "desktop-1440", width: 1440, height: 900 },
  { label: "tablet-landscape-1024", width: 1024, height: 768 },
  { label: "ipad-mini-834", width: 834, height: 1194 },
  { label: "tablet-portrait-768", width: 768, height: 1024 },
  { label: "phone-430", width: 430, height: 932 },
  { label: "phone-390", width: 390, height: 844 },
  { label: "android-360", width: 360, height: 780 },
] as const;

const PHONE_VIEWPORTS = ALL_VIEWPORTS.filter((v) => v.width <= 430);
const TABLET_VIEWPORTS = ALL_VIEWPORTS.filter((v) => v.width > 430 && v.width <= 1024);
const DESKTOP_VIEWPORTS = ALL_VIEWPORTS.filter((v) => v.width > 1024);

/** Base HTML wrapper matching Kebu site typography / reset patterns */
function wrap(body: string, extraStyle = ""): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; overflow-x: hidden; font-family: system-ui, sans-serif; font-size: 16px; }
    img { max-width: 100%; height: auto; display: block; }
    a { color: inherit; text-decoration: none; }

    /* Tailwind-mirror breakpoints */
    /* sm = 640px, md = 768px, lg = 1024px, xl = 1280px */

    ${extraStyle}
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

// ─── Helper: check overflow ────────────────────────────────────────────────

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page, label: string) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.body.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  // 1px tolerance for subpixel rendering
  expect(scrollWidth, `${label}: horizontal overflow`).toBeLessThanOrEqual(innerWidth + 1);
}

async function assertSectionVisible(page: import("@playwright/test").Page, selector: string, label: string) {
  const el = page.locator(selector);
  await expect(el, `${label}: section should be visible`).toBeVisible();
  const box = await el.boundingBox();
  expect(box, `${label}: boundingBox should not be null`).not.toBeNull();
  expect(box!.height, `${label}: height should be > 0`).toBeGreaterThan(0);
}

// ─── Section HTML templates ────────────────────────────────────────────────

// NAV: base styles in <style> so media queries can override them (inline styles
// have higher specificity than @media rules and would prevent the override).
const NAV_HTML = wrap(`
<nav id="nav" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#0F0D33;color:#fff">
  <span style="font-size:18px;font-weight:700">Baobab</span>
  <div id="nav-links">
    <a href="#" style="color:#fff">Home</a>
    <a href="#" style="color:#fff">Shop</a>
    <a href="#" style="color:#fff">About</a>
  </div>
  <button id="nav-hamburger" aria-label="Menu" style="width:44px;height:44px;background:transparent;border:none;color:#fff;cursor:pointer">☰</button>
</nav>
`, `
  /* nav defaults — phone-first: hamburger visible, links hidden */
  #nav-hamburger { display: flex; align-items: center; justify-content: center; }
  #nav-links { display: none; gap: 24px; }
  /* sm+ breakpoint: flip visibility */
  @media (min-width: 640px) {
    #nav-hamburger { display: none; }
    #nav-links { display: flex; }
  }
`);

const HERO_HTML = wrap(`
<section id="hero" style="width:100%;min-height:400px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 16px;background:#F4F1EA;text-align:center">
  <h1 style="font-size:clamp(28px,6vw,72px);font-weight:900;max-width:800px;text-wrap:balance">Handmade in Dakar</h1>
  <p style="margin-top:16px;font-size:clamp(14px,2vw,20px);max-width:600px;color:#555">Bags and textiles for modern Africa</p>
  <a href="#" id="hero-cta" style="margin-top:32px;display:inline-block;padding:14px 32px;background:#0F0D33;color:#fff;border-radius:4px;font-weight:700;min-width:44px;min-height:44px">Shop Now</a>
</section>
`);

const TEXT_CONTENT_HTML = wrap(`
<section id="text-section" style="max-width:760px;margin:0 auto;padding:48px 16px">
  <h2 style="font-size:clamp(20px,4vw,36px);font-weight:700;margin-bottom:16px;text-wrap:balance">About Baobab Collective</h2>
  <p style="line-height:1.7;font-size:clamp(14px,2vw,18px);color:#444">
    We are a cooperative of artisans from across West Africa, creating modern goods
    rooted in traditional craft. Every piece is handmade, ethically sourced, and
    designed to last a lifetime.
  </p>
</section>
`);

const IMAGE_MEDIA_HTML = wrap(`
<section id="image-section" style="width:100%;padding:0">
  <div style="width:100%;aspect-ratio:16/9;background:#DDD;overflow:hidden">
    <div id="img-placeholder" style="width:100%;height:100%;background:linear-gradient(135deg,#ccc,#aaa);display:flex;align-items:center;justify-content:center;color:#666">
      [Image Placeholder]
    </div>
  </div>
  <div style="padding:24px 16px">
    <p style="font-size:14px;color:#666;text-align:center">Handwoven basket — Dakar, Senegal</p>
  </div>
</section>
`);

const GRID_HTML = wrap(`
<section id="grid-section" style="padding:48px 16px;background:#FAFAFA">
  <h2 style="text-align:center;margin-bottom:32px;font-size:clamp(18px,3vw,28px)">Our Collections</h2>
  <div id="grid" style="display:grid;gap:16px;grid-template-columns:1fr;">
    <div style="background:#E5E5E5;padding:24px;border-radius:8px;min-height:80px">Baskets</div>
    <div style="background:#E5E5E5;padding:24px;border-radius:8px;min-height:80px">Textiles</div>
    <div style="background:#E5E5E5;padding:24px;border-radius:8px;min-height:80px">Jewelry</div>
    <div style="background:#E5E5E5;padding:24px;border-radius:8px;min-height:80px">Ceramics</div>
  </div>
</section>
<style>
  @media (min-width: 640px) { #grid { grid-template-columns: 1fr 1fr; } }
  @media (min-width: 1024px) { #grid { grid-template-columns: 1fr 1fr 1fr 1fr; } }
</style>
`);

const GALLERY_HTML = wrap(`
<section id="gallery-section" style="padding:48px 16px">
  <h2 style="text-align:center;margin-bottom:24px;font-size:clamp(18px,3vw,28px)">Gallery</h2>
  <div id="gallery-grid" style="display:grid;gap:8px;grid-template-columns:1fr 1fr;">
    <div style="aspect-ratio:1;background:#C8C8C8;border-radius:4px"></div>
    <div style="aspect-ratio:1;background:#B8B8B8;border-radius:4px"></div>
    <div style="aspect-ratio:1;background:#D8D8D8;border-radius:4px"></div>
    <div style="aspect-ratio:1;background:#C0C0C0;border-radius:4px"></div>
    <div style="aspect-ratio:1;background:#C8C8C8;border-radius:4px"></div>
    <div style="aspect-ratio:1;background:#B8B8B8;border-radius:4px"></div>
  </div>
</section>
<style>
  @media (min-width: 768px) { #gallery-grid { grid-template-columns: 1fr 1fr 1fr; } }
  @media (min-width: 1024px) { #gallery-grid { grid-template-columns: 1fr 1fr 1fr 1fr; } }
</style>
`);

// PRODUCTS: grid-template-columns in <style> so media queries can override.
const PRODUCTS_HTML = wrap(`
<section id="products-section" style="padding:48px 16px;background:#fff">
  <h2 style="text-align:center;margin-bottom:32px;font-size:clamp(18px,3vw,28px)">Shop</h2>
  <div id="products-grid" style="display:grid;gap:24px;">
    ${Array.from({ length: 4 }, (_, i) => `
    <div style="border:1px solid #E5E5E5;border-radius:8px;overflow:hidden">
      <div style="aspect-ratio:4/3;background:#E0E0E0;display:flex;align-items:center;justify-content:center;color:#888">Product ${i + 1}</div>
      <div style="padding:16px">
        <p style="font-weight:600;margin-bottom:8px">Handwoven Basket ${i + 1}</p>
        <p style="color:#666;margin-bottom:12px">25,000 XOF</p>
        <button id="add-cart-${i}" style="width:100%;padding:12px;min-height:44px;background:#0F0D33;color:#fff;border:none;border-radius:4px;font-weight:700;cursor:pointer">Add to Cart</button>
      </div>
    </div>`).join("")}
  </div>
</section>
`, `
  /* phone-first: 1 col */
  #products-grid { grid-template-columns: 1fr; }
  @media (min-width: 640px) { #products-grid { grid-template-columns: 1fr 1fr; } }
  @media (min-width: 1024px) { #products-grid { grid-template-columns: 1fr 1fr 1fr 1fr; } }
`);

const TESTIMONIALS_HTML = wrap(`
<section id="testimonials-section" style="padding:48px 16px;background:#F9F7F4">
  <h2 style="text-align:center;margin-bottom:32px;font-size:clamp(18px,3vw,28px)">What People Say</h2>
  <div id="testimonials-grid" style="display:grid;gap:16px;grid-template-columns:1fr;">
    ${Array.from({ length: 3 }, (_, i) => `
    <div style="background:#fff;padding:24px;border-radius:8px;border:1px solid #E8E8E8">
      <p style="font-style:italic;margin-bottom:12px;line-height:1.6">"These baskets are absolutely beautiful. The quality is remarkable."</p>
      <p style="font-weight:700;font-size:14px">Customer ${i + 1}</p>
    </div>`).join("")}
  </div>
</section>
<style>
  @media (min-width: 768px) { #testimonials-grid { grid-template-columns: 1fr 1fr 1fr; } }
</style>
`);

const NEWSLETTER_HTML = wrap(`
<section id="newsletter-section" style="padding:48px 16px;background:#0F0D33;color:#fff;text-align:center">
  <h2 style="font-size:clamp(18px,3vw,28px);margin-bottom:16px;text-wrap:balance">Stay in the loop</h2>
  <p style="margin-bottom:24px;opacity:0.8;font-size:clamp(14px,2vw,18px)">Get updates on new collections.</p>
  <form id="newsletter-form" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:480px;margin:0 auto">
    <input type="email" placeholder="your@email.com" style="flex:1;min-width:200px;padding:12px 16px;border:none;border-radius:4px;font-size:16px;min-height:44px">
    <button type="submit" id="newsletter-submit" style="padding:12px 24px;min-height:44px;background:#00C851;color:#fff;border:none;border-radius:4px;font-weight:700;cursor:pointer;white-space:nowrap">Subscribe</button>
  </form>
</section>
`);

const FOOTER_HTML = wrap(`
<footer id="footer" style="background:#111;color:#fff;padding:48px 16px 24px">
  <div style="display:grid;gap:32px;grid-template-columns:1fr;max-width:1200px;margin:0 auto">
    <div>
      <p style="font-weight:700;font-size:18px;margin-bottom:12px">Baobab Collective</p>
      <p style="opacity:0.7;line-height:1.6;font-size:14px">Handmade goods from West Africa.</p>
    </div>
    <div id="footer-links">
      <p style="font-weight:600;margin-bottom:12px;font-size:14px;text-transform:uppercase;letter-spacing:.05em">Links</p>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:8px">
        <li><a href="#" style="opacity:0.7;font-size:14px">Shop</a></li>
        <li><a href="#" style="opacity:0.7;font-size:14px">About</a></li>
        <li><a href="#" style="opacity:0.7;font-size:14px">Contact</a></li>
      </ul>
    </div>
  </div>
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.1);text-align:center">
    <p style="opacity:0.4;font-size:12px">© 2026 Baobab Collective</p>
  </div>
</footer>
<style>
  @media (min-width: 768px) { footer > div > div:first-child + #footer-links { display: block; } }
  @media (min-width: 768px) { footer > div { grid-template-columns: 1fr 1fr; } }
</style>
`);

const FLOATING_CTA_HTML = wrap(`
<div style="height:200vh;background:#f0f0f0;padding:16px">
  <p>Page content</p>
</div>
<div id="floating-cta" style="position:fixed;bottom:calc(env(safe-area-inset-bottom,0px) + 16px);right:16px;z-index:100">
  <a href="#" id="floating-btn" style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:#0F0D33;color:#fff;border-radius:50%;font-size:24px;text-decoration:none;box-shadow:0 4px 12px rgba(0,0,0,0.3)" aria-label="Chat">💬</a>
</div>
`);

// ─── Suite: all 7 viewports, no horizontal overflow per section family ─────

const SECTION_FAMILIES: { name: string; html: string; selector: string }[] = [
  { name: "navigation", html: NAV_HTML, selector: "#nav" },
  { name: "hero", html: HERO_HTML, selector: "#hero" },
  { name: "text-content", html: TEXT_CONTENT_HTML, selector: "#text-section" },
  { name: "image-media", html: IMAGE_MEDIA_HTML, selector: "#image-section" },
  { name: "multi-column-grid", html: GRID_HTML, selector: "#grid-section" },
  { name: "gallery", html: GALLERY_HTML, selector: "#gallery-section" },
  { name: "products-commerce", html: PRODUCTS_HTML, selector: "#products-section" },
  { name: "testimonials-reviews", html: TESTIMONIALS_HTML, selector: "#testimonials-section" },
  { name: "newsletter-form", html: NEWSLETTER_HTML, selector: "#newsletter-section" },
  { name: "footer", html: FOOTER_HTML, selector: "#footer" },
  { name: "floating-overlay", html: FLOATING_CTA_HTML, selector: "#floating-cta" },
];

test.describe("generated-site sections: no horizontal overflow", () => {
  for (const vp of ALL_VIEWPORTS) {
    for (const section of SECTION_FAMILIES) {
      test(`${section.name} — no overflow at ${vp.label} (${vp.width}px)`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.setContent(section.html);
        await assertNoHorizontalOverflow(page, `${section.name}@${vp.label}`);
      });
    }
  }
});

test.describe("generated-site sections: section visibility", () => {
  for (const vp of ALL_VIEWPORTS) {
    for (const section of SECTION_FAMILIES) {
      test(`${section.name} — visible at ${vp.label} (${vp.width}px)`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.setContent(section.html);
        await assertSectionVisible(page, section.selector, `${section.name}@${vp.label}`);
      });
    }
  }
});

// ─── Navigation: hamburger visible on phone, links visible on desktop ──────

test.describe("navigation: responsive layout", () => {
  for (const vp of PHONE_VIEWPORTS) {
    test(`nav: hamburger visible at ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.setContent(NAV_HTML);
      const hamburger = page.locator("#nav-hamburger");
      const display = await hamburger.evaluate((e) => window.getComputedStyle(e).display);
      expect(display, `hamburger should be visible at ${vp.label}`).not.toBe("none");
    });

    test(`nav: links hidden on ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.setContent(NAV_HTML);
      const links = page.locator("#nav-links");
      const display = await links.evaluate((e) => window.getComputedStyle(e).display);
      expect(display, `nav links should be hidden at ${vp.label}`).toBe("none");
    });
  }

  for (const vp of [...TABLET_VIEWPORTS, ...DESKTOP_VIEWPORTS]) {
    test(`nav: links visible at ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.setContent(NAV_HTML);
      const links = page.locator("#nav-links");
      const display = await links.evaluate((e) => window.getComputedStyle(e).display);
      expect(display, `nav links should be visible at ${vp.label}`).not.toBe("none");
    });
  }
});

// ─── Products: grid collapses correctly ────────────────────────────────────

test.describe("products: grid collapse", () => {
  for (const vp of PHONE_VIEWPORTS) {
    test(`products: 1-col grid at ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.setContent(PRODUCTS_HTML);
      const grid = page.locator("#products-grid");
      const cols = await grid.evaluate((e) => window.getComputedStyle(e).gridTemplateColumns);
      // 1-col = single "Xpx" value
      const colCount = cols.trim().split(/\s+/).length;
      expect(colCount, `should be 1 col at ${vp.label}`).toBe(1);
    });
  }

  test("products: 2-col at tablet-portrait-768", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.setContent(PRODUCTS_HTML);
    const grid = page.locator("#products-grid");
    const cols = await grid.evaluate((e) => window.getComputedStyle(e).gridTemplateColumns);
    const colCount = cols.trim().split(/\s+/).length;
    expect(colCount, "should be 2 cols at 768px").toBe(2);
  });

  test("products: 4-col at desktop-1440", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.setContent(PRODUCTS_HTML);
    const grid = page.locator("#products-grid");
    const cols = await grid.evaluate((e) => window.getComputedStyle(e).gridTemplateColumns);
    const colCount = cols.trim().split(/\s+/).length;
    expect(colCount, "should be 4 cols at 1440px").toBe(4);
  });
});

// ─── Touch targets: CTA buttons ≥ 44px on phone ───────────────────────────

test.describe("touch targets ≥ 44px on phone", () => {
  const touchTargets: { name: string; html: string; selector: string }[] = [
    { name: "hero CTA", html: HERO_HTML, selector: "#hero-cta" },
    { name: "product add-to-cart", html: PRODUCTS_HTML, selector: "#add-cart-0" },
    { name: "newsletter submit", html: NEWSLETTER_HTML, selector: "#newsletter-submit" },
    { name: "floating CTA button", html: FLOATING_CTA_HTML, selector: "#floating-btn" },
  ];

  for (const vp of PHONE_VIEWPORTS) {
    for (const target of touchTargets) {
      test(`${target.name} ≥ 44px at ${vp.label}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.setContent(target.html);
        const el = page.locator(target.selector);
        const box = await el.boundingBox();
        expect(box, `${target.name} boundingBox`).not.toBeNull();
        expect(Math.min(box!.width, box!.height), `${target.name} min dimension`).toBeGreaterThanOrEqual(44);
      });
    }
  }
});

// ─── Hero: no giant whitespace at phone widths ────────────────────────────

test.describe("hero: layout sanity at phone", () => {
  for (const vp of PHONE_VIEWPORTS) {
    test(`hero: h1 does not overflow at ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.setContent(HERO_HTML);
      const h1 = page.locator("#hero h1");
      const box = await h1.boundingBox();
      expect(box, "h1 must have a bounding box").not.toBeNull();
      // h1 should not extend past the right edge of the viewport
      expect(box!.x + box!.width, "h1 right edge").toBeLessThanOrEqual(vp.width + 1);
    });
  }
});

// ─── Newsletter form: wraps at phone width ────────────────────────────────

test.describe("newsletter form: wrapping behaviour", () => {
  for (const vp of PHONE_VIEWPORTS) {
    test(`newsletter submit button visible at ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.setContent(NEWSLETTER_HTML);
      const btn = page.locator("#newsletter-submit");
      await expect(btn, "submit button should be visible").toBeVisible();
      const box = await btn.boundingBox();
      expect(box!.x + box!.width, "button right edge").toBeLessThanOrEqual(vp.width + 1);
    });
  }
});

// ─── Floating CTA: safe-area-aware positioning ────────────────────────────

test.describe("floating CTA: safe-area positioning", () => {
  test("floating CTA visible and within viewport at phone-390", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent(FLOATING_CTA_HTML);
    const cta = page.locator("#floating-cta");
    await expect(cta).toBeVisible();
    const box = await cta.boundingBox();
    expect(box, "floating CTA must have a bounding box").not.toBeNull();
    // Must not be off-screen right
    expect(box!.x + box!.width, "CTA right edge within viewport").toBeLessThanOrEqual(390 + 1);
  });
});

// ─── New viewports: 834px and 360px basic coverage ────────────────────────

test.describe("new viewport coverage: 834px (iPad mini) and 360px (Android)", () => {
  test("no overflow on full page at 834px", async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1194 });
    const pageHtml = wrap(
      SECTION_FAMILIES.map((s) => s.html.replace(/<!doctype html>[\s\S]*?<body>/i, "").replace(/<\/body>[\s\S]*?<\/html>/i, "")).join("\n"),
    );
    await page.setContent(wrap(`<div id="page">${
      SECTION_FAMILIES.map((s) => `<div>${s.html.match(/<body>([\s\S]*?)<\/body>/i)?.[1] ?? ""}</div>`).join("\n")
    }</div>`));
    await assertNoHorizontalOverflow(page, "full-page@834");
  });

  test("no overflow on full page at 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.setContent(wrap(`<div id="page">${
      SECTION_FAMILIES.map((s) => `<div>${s.html.match(/<body>([\s\S]*?)<\/body>/i)?.[1] ?? ""}</div>`).join("\n")
    }</div>`));
    await assertNoHorizontalOverflow(page, "full-page@360");
  });

  test("hero visible at 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.setContent(HERO_HTML);
    await assertSectionVisible(page, "#hero", "hero@android-360");
  });

  test("products visible at 834px", async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1194 });
    await page.setContent(PRODUCTS_HTML);
    await assertSectionVisible(page, "#products-section", "products@ipad-mini-834");
  });
});
