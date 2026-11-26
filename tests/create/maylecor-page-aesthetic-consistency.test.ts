import { describe, expect, it } from "vitest";
import { TEMPLATE_SEEDS } from "@/lib/create/templates-seed";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";

/**
 * Regression for a real, found-and-fixed gap: non-hero May Lecor pages (About, Music,
 * Press…) rendered with the generic flat `theme.background` every Kebu site gets,
 * while only the hero section carried the Russian-reference's scratched-paper texture
 * and torn-paper section dividers — "a styled hero bolted onto plain pages." Fixed via
 * `theme.customCss`, the schema's own sanctioned per-site CSS extension point, so the
 * shared generic section renderers (text/gallery/features) stay untouched for every
 * other Kebu site.
 */
describe("May Lecor — page aesthetic consistency (customCss)", () => {
  const maylecor = TEMPLATE_SEEDS.find((t) => t.slug === "musician-maylecor-ksendr");

  it("the template exists and carries real customCss", () => {
    expect(maylecor).toBeTruthy();
    const css = maylecor?.definition.theme.customCss ?? "";
    expect(css.length).toBeGreaterThan(100);
  });

  it("carries the site-wide paper-texture background, overriding the root inline background style", () => {
    const css = maylecor?.definition.theme.customCss ?? "";
    expect(css).toContain(".kebu-site");
    // Must never reference /templates/legally-blonde/ on May's real, live site — that path is
    // reserved for the access-gated owner_portfolio demo template, and isElleStockCutout()
    // only scans structured image props, never raw CSS strings like this one, so a literal
    // path reference here would slip past that guard entirely. The texture itself is generic
    // (plain pink scratched paper, no movie imagery) but now lives under /templates/maylecor/.
    expect(css).not.toContain("/templates/legally-blonde/");
    expect(css).toContain("/templates/maylecor/paper-texture-bg.png");
    // The root element also carries an inline `background: theme.background` style
    // (site-renderer.tsx), which always wins the cascade over a plain class rule —
    // !important is load-bearing here, not optional polish. Catches a silent
    // regression where someone "cleans up" the !important and the fix goes dark
    // again without any test failing elsewhere.
    expect(css).toMatch(/background-image:\s*url\([^)]*maylecor\/paper-texture-bg\.png[^)]*\)\s*!important/);
  });

  it("carries a torn-paper divider between consecutive sections", () => {
    const css = maylecor?.definition.theme.customCss ?? "";
    // Plain element selector, not `.kebu-section + .kebu-section`: the video/audio
    // section renderers are real `<section>` elements but never carry the
    // `kebu-section` class, so a class-scoped sibling selector silently skipped them.
    expect(css).toContain(".kebu-site section + section");
    expect(css).toMatch(/clip-path:\s*polygon\(/);
  });

  it("carries a pink-duotone, torn-paper treatment for embedded video/audio clips", () => {
    const css = maylecor?.definition.theme.customCss ?? "";
    // Targets the real img/video/iframe leaf elements directly (not a specific
    // wrapper depth), so it survives VideoEmbed's layout changes and activates
    // automatically once real video content replaces the current empty placeholders.
    expect(css).toContain(".kebu-heavy-media img");
    expect(css).toContain(".kebu-heavy-media video");
    expect(css).toContain(".kebu-heavy-media iframe");
    expect(css).toMatch(/filter:\s*grayscale\(1\)\s*sepia\(1\)\s*hue-rotate\(290deg\)/);
  });

  it("the full definition, customCss included, is schema-valid (length limits, etc.)", () => {
    expect(maylecor).toBeTruthy();
    const result = validateWebsiteDefinition(maylecor!.definition);
    expect(result.ok).toBe(true);
  });

  it("customCss stays within the schema's 10 KB limit", () => {
    const css = maylecor?.definition.theme.customCss ?? "";
    expect(css.length).toBeLessThanOrEqual(10000);
  });
});
