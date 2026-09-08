import { describe, expect, it } from "vitest";
import {
  CHROME_FOOTER_ID,
  CHROME_HEADER_ID,
  applySiteChromeToDefinition,
  composePageSectionsWithChrome,
  defaultSiteChrome,
  extractSiteChromeFromSections,
  isChromeSectionId,
  parseSiteChrome,
  patchSiteChromePart,
  projectUsesEmbeddedNav,
  stripChromeSections,
} from "@/lib/create/site-chrome";
import { buildEditorPreviewDefinition } from "@/lib/create/editor-definition";

describe("site chrome W13", () => {
  it("parses empty chrome as disabled", () => {
    expect(parseSiteChrome(null)).toEqual({ enabled: false });
    expect(parseSiteChrome({})).toEqual({ enabled: false });
  });

  it("extracts header/footer from home sections", () => {
    const chrome = extractSiteChromeFromSections(
      [
        { section_type: "navigation", props: { brand: "Acme", links: [{ label: "Home", href: "/" }] } },
        { section_type: "hero", props: { heading: "Hi" } },
        { section_type: "footer", props: { text: "© Acme" } },
      ],
      "Acme",
    );
    expect(chrome.enabled).toBe(true);
    expect(chrome.header?.props.brand).toBe("Acme");
    expect(chrome.footer?.props.text).toBe("© Acme");
  });

  it("composes synthetic chrome section ids on every page", () => {
    const chrome = defaultSiteChrome("Shop");
    const composed = composePageSectionsWithChrome(
      [{ id: "a", type: "hero", props: { heading: "Hi" } }],
      chrome,
    );
    expect(composed[0].id).toBe(CHROME_HEADER_ID);
    expect(composed[1].type).toBe("hero");
    expect(composed[2].id).toBe(CHROME_FOOTER_ID);
    expect(isChromeSectionId(CHROME_HEADER_ID)).toBe(true);
  });

  it("skips chrome for flagship embedded nav layouts", () => {
    expect(projectUsesEmbeddedNav(["maylecor-home", "hero"])).toBe(true);
    expect(projectUsesEmbeddedNav(["hero", "text"])).toBe(false);
  });

  it("strips duplicate nav/footer from body before compose", () => {
    const sections = [
      { id: "1", page_id: "p1", section_type: "navigation", sort_order: 0, props: {} },
      { id: "2", page_id: "p1", section_type: "hero", sort_order: 1, props: {} },
      { id: "3", page_id: "p1", section_type: "footer", sort_order: 2, props: {} },
    ];
    expect(stripChromeSections(sections)).toHaveLength(1);
    const def = buildEditorPreviewDefinition(
      { title: "T" },
      [{ id: "p1", slug: "home", title: "Home", sort_order: 0 }],
      sections,
      defaultSiteChrome("T"),
    );
    const pageSections = def.pages[0]?.sections ?? [];
    expect(pageSections.filter((s) => s.type === "hero")).toHaveLength(1);
    expect(pageSections.some((s) => s.id === CHROME_HEADER_ID)).toBe(true);
    expect(pageSections.some((s) => s.id === CHROME_FOOTER_ID)).toBe(true);
  });

  it("patches header/footer props immutably", () => {
    const base = defaultSiteChrome("X");
    const next = patchSiteChromePart(base, "footer", { text: "New footer" });
    expect(next.footer?.props.text).toBe("New footer");
    expect(base.footer?.props.text).not.toBe("New footer");
  });

  it("applySiteChromeToDefinition adds chrome to all pages", () => {
    const def = applySiteChromeToDefinition(
      {
        schemaVersion: "website-v1",
        title: "T",
        pages: [
          { slug: "home", title: "Home", sections: [{ type: "hero", props: { heading: "A" } }] },
          { slug: "about", title: "About", sections: [{ type: "text", props: { heading: "B", body: "" } }] },
        ],
      },
      defaultSiteChrome("T"),
    );
    for (const page of def.pages) {
      expect(page.sections[0]?.id).toBe(CHROME_HEADER_ID);
      expect(page.sections.at(-1)?.id).toBe(CHROME_FOOTER_ID);
    }
  });
});
