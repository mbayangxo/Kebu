/**
 * The Builder canvas must resolve the project theme exactly as publishing does.
 * projects.theme is NOT NULL DEFAULT '{}', so a theme-less project reached the canvas as an empty
 * theme (no primary colour → transparent hero with white text) while publishing applied the
 * schema defaults (dark hero).
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SiteRenderer } from "@/app/components/create/site-renderer";
import { buildDefinitionFromProjectParts, resolveEditorTheme } from "@/lib/create/editor-definition";
import { BuilderColorPanel } from "@/app/components/create/builder-color-panel";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";

const PAGES = [{ id: "p", slug: "home", title: "Home", sort_order: 0 }];
const SECTIONS = [{ id: "h", page_id: "p", section_type: "hero", sort_order: 0, props: { heading: "PARITY-HERO", subheading: "s" } }];
const build = (theme: unknown) =>
  buildDefinitionFromProjectParts({ title: "Parity", theme: theme as never }, PAGES, SECTIONS);

describe("Builder theme matches the published theme", () => {
  for (const [label, stored] of [
    ["database default '{}'", {}],
    ["NULL", null],
    ["partial theme", { primary: "#123456", fontBody: "Inter" }],
    ["full theme", { primary: "#0A0A0A", accent: "#FF5500", background: "#FFFFFF", text: "#0A0A0A", fontDisplay: "Syne", fontBody: "Inter", spacing: "airy" }],
  ] as const) {
    it(`${label}: canvas theme equals the validated (published) theme`, () => {
      const def = build(stored);
      const published = validateWebsiteDefinition(def);
      expect(published.ok).toBe(true);
      if (published.ok) expect(def.theme).toEqual(published.data.theme);
    });
  }

  it("a theme-less project's hero gets the default primary background in the canvas", () => {
    const html = renderToStaticMarkup(createElement(SiteRenderer, { definition: build({}), mode: "preview", pageSlug: "home", editor: { editDevice: "desktop" } }));
    expect(html).toContain("PARITY-HERO");
    expect(html).toMatch(/background:\s*#0F0D33/i);
  });

  it("keeps stored values of a theme that fails validation, filling the rest with defaults", () => {
    const def = build({ primary: "#111111", spacing: "not-a-spacing" });
    expect(def.theme.primary).toBe("#111111");
    expect(def.theme.fontDisplay).toBe("Fraunces");
  });

  it("the Aesthetic Editor gets a complete theme for a theme-less project (its Colors panel read theme.accent of '{}' and crashed the Builder)", () => {
    const theme = resolveEditorTheme({});
    for (const token of ["primary", "accent", "background", "text"] as const) {
      expect(theme[token], token).toMatch(/^#[0-9a-f]{6}/i);
    }
    const html = renderToStaticMarkup(createElement(BuilderColorPanel, { theme, onThemeChange: () => {} }));
    expect(html).toContain(theme.accent);
  });
});
