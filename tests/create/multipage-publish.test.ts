import { describe, expect, it } from "vitest";
import {
  cutoutHrefToPageSlug,
  isExternalCutoutHref,
  normalizeCutoutHref,
  resolveCutoutHref,
} from "@/lib/create/cutout-links";
import { buildDefinitionFromProjectParts } from "@/lib/create/editor-definition";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";

describe("cutout-links", () => {
  it("resolves internal page slugs against site base", () => {
    expect(resolveCutoutHref("about", "/sites/maylecor")).toBe("/sites/maylecor/about");
    expect(resolveCutoutHref("/mays-world", "/sites/maylecor")).toBe("/sites/maylecor/mays-world");
  });

  it("keeps external URLs unchanged", () => {
    expect(resolveCutoutHref("https://open.spotify.com/artist/1", "/sites/maylecor")).toBe(
      "https://open.spotify.com/artist/1",
    );
    expect(isExternalCutoutHref("https://example.com")).toBe(true);
  });

  it("extracts page slug from href", () => {
    expect(cutoutHrefToPageSlug("press")).toBe("press");
    expect(cutoutHrefToPageSlug("/mayjor-good")).toBe("mayjor-good");
    expect(cutoutHrefToPageSlug("https://x.com")).toBeNull();
  });

  it("normalizes whitespace", () => {
    expect(normalizeCutoutHref("  /about  ")).toBe("/about");
  });
});

describe("multipage publish snapshot", () => {
  it("builds and validates a multi-page definition for go-live", () => {
    const pages = [
      { id: "p-home", slug: "home", title: "Home", sort_order: 0 },
      { id: "p-about", slug: "about", title: "About", sort_order: 1 },
      { id: "p-press", slug: "press", title: "Press", sort_order: 2 },
    ];
    const sections = [
      {
        id: "s-hero",
        page_id: "p-home",
        section_type: "legally-blonde-hero",
        sort_order: 0,
        props: {
          title: "MAY LECOR",
          subtitle: "Artist",
          backgroundLayer: "/templates/maylecor/may-cutout-full.jpg",
          titleLogo: "",
          cutoutLeft: "/templates/maylecor/may-cutout-full.jpg",
          cutoutRight: "/templates/maylecor/may-cutout-full.jpg",
          cutoutAccent: "/templates/maylecor/may-cutout-full.jpg",
          macbook: "/templates/legally-blonde/macbook.png",
          heroPhoto: "/templates/maylecor/may-cutout-full.jpg",
          layerLinks: { cutoutLeft: "about", cutoutRight: "press" },
        },
      },
      {
        id: "s-about",
        page_id: "p-about",
        section_type: "text",
        sort_order: 0,
        props: { heading: "About May", body: "Bio copy." },
      },
      {
        id: "s-press",
        page_id: "p-press",
        section_type: "text",
        sort_order: 0,
        props: { heading: "Press", body: "Press kit." },
      },
    ];

    const definition = buildDefinitionFromProjectParts(
      { title: "May Lecor", theme: undefined, seo: null },
      pages,
      sections,
    );

    expect(definition.pages).toHaveLength(3);
    expect(definition.pages.map((p) => p.slug)).toEqual(["home", "about", "press"]);
    expect(definition.pages[0]?.sections[0]?.props.layerLinks).toEqual({
      cutoutLeft: "about",
      cutoutRight: "press",
    });

    const validated = validateWebsiteDefinition(definition);
    expect(validated.ok).toBe(true);
  });
});
