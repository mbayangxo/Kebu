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
    expect(css).toContain("/templates/legally-blonde/background.png");
    // The root element also carries an inline `background: theme.background` style
    // (site-renderer.tsx), which always wins the cascade over a plain class rule —
    // !important is load-bearing here, not optional polish. Catches a silent
    // regression where someone "cleans up" the !important and the fix goes dark
    // again without any test failing elsewhere.
    expect(css).toMatch(/background-image:\s*url\([^)]*legally-blonde\/background\.png[^)]*\)\s*!important/);
  });

  it("carries a torn-paper divider between consecutive sections", () => {
    const css = maylecor?.definition.theme.customCss ?? "";
    expect(css).toContain(".kebu-section + .kebu-section");
    expect(css).toMatch(/clip-path:\s*polygon\(/);
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
