/**
 * Theme fonts are self-hosted (next/font) and referenced through CSS variables. Nothing on the
 * site-rendering path may load a third-party stylesheet: the CSP (style-src 'self') blocks it,
 * which both logs a console error and silently drops the theme typography.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import { buildEditorPreviewDefinition } from "@/lib/create/editor-definition";
import { THEME_FONT_VARIABLES, TEXT_FONT_OPTIONS, cssFontStack, isSelfHostedThemeFont } from "@/lib/create/site-theme-fonts";

const ROOT = join(__dirname, "../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("site-theme-fonts", () => {
  it("resolves self-hosted theme fonts through their CSS variable, with a no-download fallback", () => {
    expect(cssFontStack("Playfair Display")).toBe('var(--kebu-font-playfair-display, "Playfair Display"), system-ui, sans-serif');
    expect(cssFontStack("IBM Plex Sans")).toBe('var(--kebu-font-ibm-plex-sans, "IBM Plex Sans"), system-ui, sans-serif');
  });

  it("keeps system and unknown font names as plain stacks", () => {
    expect(cssFontStack("system-ui")).toBe("system-ui, -apple-system, Segoe UI, sans-serif");
    expect(cssFontStack("Georgia")).toBe('"Georgia", system-ui, sans-serif');
  });

  it("marks Steelfish and every theme-variable family as self-hosted", () => {
    expect(isSelfHostedThemeFont("Steelfish")).toBe(true);
    expect(cssFontStack("Steelfish")).toContain("Steelfish");
    for (const name of Object.keys(THEME_FONT_VARIABLES)) expect(isSelfHostedThemeFont(name), name).toBe(true);
    expect(isSelfHostedThemeFont("Georgia")).toBe(false);
  });

  it("every web font offered to text boxes / the Aesthetic Editor text list is self-hosted", () => {
    const systemFonts = new Set(["Georgia", "system-ui", "Arial", "Helvetica Neue"]);
    for (const name of TEXT_FONT_OPTIONS) if (!systemFonts.has(name)) expect(isSelfHostedThemeFont(name), name).toBe(true);
  });

  it("THEME_FONT_VARIABLES matches the variables declared in theme-font-faces.ts", () => {
    const declared = [...read("app/components/create/theme-font-faces.ts").matchAll(/variable: "(--kebu-font-[a-z-]+)"/g)].map((m) => m[1]).sort();
    expect(declared).toEqual(Object.values(THEME_FONT_VARIABLES).sort());
  });

  it("no site-rendering source references a runtime Google Fonts stylesheet", () => {
    for (const file of [
      "lib/create/site-theme-fonts.ts",
      "app/components/create/site-renderer.tsx",
      "app/components/create/legally-blonde-layout.tsx",
      "app/components/create/legally-blonde-tilda.css",
      "app/components/create/kdirection-layout.tsx",
      "app/components/create/builder-color-panel.tsx",
      "app/layout.tsx",
    ]) {
      expect(read(file), file).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
    }
  });
});

describe("SiteRenderer applies self-hosted theme fonts", () => {
  const def = buildEditorPreviewDefinition(
    { title: "Fonts", theme: { primary: "#0F0D33", accent: "#00C851", background: "#FAFAF8", text: "#0F0D33", fontDisplay: "Fraunces", fontBody: "Inter", spacing: "comfortable", headingScale: "md", bodySize: "md", letterSpacing: "normal" } },
    [{ id: "p", slug: "home", title: "Home", sort_order: 0 }],
    [{ id: "h", page_id: "p", section_type: "hero", sort_order: 0, props: { heading: "FONT-HEADING", subheading: "s" } }],
    null,
  );

  it("defines the theme font variables on the site root and uses them — no external stylesheet", () => {
    const html = renderToStaticMarkup(createElement(SiteRenderer, { definition: def, mode: "live", pageSlug: "home" }));
    expect(html).not.toMatch(/fonts\.googleapis\.com|<link[^>]+stylesheet/);
    expect(html).toContain("test-font-var--kebu-font-fraunces");
    expect(html).toContain("test-font-var--kebu-font-inter");
    expect(html).toContain("var(--kebu-font-fraunces");
  });

  it("Ultra data mode keeps system fonts — the variables are not applied, nothing to download", () => {
    const html = renderToStaticMarkup(createElement(SiteRenderer, { definition: def, mode: "live", pageSlug: "home", dataMode: "ultra" }));
    expect(html).not.toContain("test-font-var--kebu-font-");
    expect(html).not.toMatch(/fonts\.googleapis\.com/);
  });
});
