import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegallyBlondeHeroLayout } from "@/app/components/create/legally-blonde-layout";
import { defaultMaylecorKsendrProps } from "@/lib/create/maylecor-ksendr-defaults";
import { defaultCutoutCollageProps } from "@/lib/create/legally-blonde-defaults";
import { BUILDER_SECTION_CATALOG } from "@/lib/create/builder-section-catalog";

describe("saved collage visitor rendering", () => {
  it("uses saved positions, dimensions, stacking and May portraits without reference text", () => {
    const html = renderToStaticMarkup(createElement(LegallyBlondeHeroLayout, { props: {
      ...defaultMaylecorKsendrProps(), title: "MAY LÈCOR", titleAsText: true,
      layerPositions: { cutoutAccent: { leftPct: 17, topPct: 29 } },
      layerScales: { cutoutAccent: 0.5 }, layerWidthScale: { cutoutAccent: 0.8 },
      layerZIndex: { cutoutAccent: 23 }, layerLinks: { cutoutAccent: "/music" },
    }, siteBase: "/sites/maylecor" }));
    expect(html).toMatch(/data-kebu-layer="cutoutAccent"[^>]*left:17%;top:29%;width:16%/);
    expect(html).toContain("z-index:23");
    expect(html).toContain('href="/sites/maylecor/music"');
    expect(html).toContain("/templates/maylecor/");
    expect(html).not.toMatch(/[А-Яа-я]|Drag to move|Resize hero section height|Change background/);
  });

  it("honors removed and hidden photos rather than restoring stock imagery", () => {
    const html = renderToStaticMarkup(createElement(LegallyBlondeHeroLayout, { props: {
      ...defaultMaylecorKsendrProps(), cutoutRight: "", hiddenLayers: ["cutoutAccent"],
    } }));
    expect(html).not.toContain('data-kebu-layer="cutoutRight"');
    expect(html).not.toContain('data-kebu-layer="cutoutAccent"');
  });

  it("offers a public collage section without private May or Russian photos", () => {
    expect(BUILDER_SECTION_CATALOG.find(item => item.type === "legally-blonde-hero")?.label).toBe("Cutout collage");
    const html = renderToStaticMarkup(createElement(LegallyBlondeHeroLayout, { props: defaultCutoutCollageProps() }));
    expect(html).toContain("Your name");
    expect(html).not.toMatch(/src="[^\"]*(?:maylecor|legally-blonde)|[А-Яа-я]/);
  });

  it("never emits an unsafe legacy cutout link", () => {
    const html = renderToStaticMarkup(createElement(LegallyBlondeHeroLayout, { props: {
      ...defaultMaylecorKsendrProps(), layerLinks: { cutoutAccent: "javascript:alert(1)" },
    } }));
    expect(html).not.toContain('href="javascript:');
  });
});
