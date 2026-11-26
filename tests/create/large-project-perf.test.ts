/**
 * Large-Project Performance Gate
 *
 * Deterministic fixture: 20 pages × 15 sections = 300 sections (real schema limit is 20 pages × 40).
 * Covers: buildDefinitionFromProjectParts, buildEditorPreviewDefinition, JSON serialization,
 * section filter/sort (the O(n) loop inside buildDefinitionFromProjectParts), and
 * validateWebsiteDefinition on a large definition.
 *
 * Performance budgets (median of 7 samples, 3 warm-ups):
 *   - buildDefinitionFromProjectParts: < 10 ms
 *   - buildEditorPreviewDefinition: < 10 ms
 *   - JSON.stringify full definition: < 8 ms
 *   - JSON.parse full definition: < 8 ms
 *   - validateWebsiteDefinition: < 200 ms
 *   - Section filter by page_id (linear scan, 300 sections): < 1 ms
 *
 * Measurements use median-of-7-samples to eliminate GC pauses and OS scheduling
 * outliers that make single-sample budgets flaky on loaded CI runners.
 * Budgets are intentionally loose — they catch O(n²) regressions (10-100×
 * slowdowns) while passing on any reasonably-loaded machine.
 */

import { describe, expect, it } from "vitest";
import { buildDefinitionFromProjectParts, buildEditorPreviewDefinition } from "@/lib/create/editor-definition";
import { validateWebsiteDefinition } from "@/lib/create/website-schema";

// ─── Fixture generators ────────────────────────────────────────────────────────

const PAGE_COUNT = 20;
const SECTIONS_PER_PAGE = 15;
const TOTAL_SECTIONS = PAGE_COUNT * SECTIONS_PER_PAGE; // 300

type ApiPage = { id: string; slug: string; title: string; sort_order: number };
type ApiSection = {
  id: string;
  page_id: string;
  section_type: string;
  sort_order: number;
  props: Record<string, unknown>;
};

const SECTION_CYCLE = [
  "hero",
  "text",
  "image",
  "features",
  "testimonials",
  "gallery",
  "products",
  "newsletter",
  "faq",
  "stats",
  "contact",
  "reviews",
  "split",
  "marquee",
  "footer",
] as const;

function makePages(): ApiPage[] {
  return Array.from({ length: PAGE_COUNT }, (_, i) => ({
    id: `page-${i}`,
    slug: i === 0 ? "home" : `page-${i}`,
    title: i === 0 ? "Home" : `Page ${i}`,
    sort_order: i,
  }));
}

function makeSections(pages: ApiPage[]): ApiSection[] {
  const out: ApiSection[] = [];
  for (const page of pages) {
    for (let j = 0; j < SECTIONS_PER_PAGE; j++) {
      const sectionType = SECTION_CYCLE[j % SECTION_CYCLE.length];
      out.push({
        id: `sec-${page.id}-${j}`,
        page_id: page.id,
        section_type: sectionType,
        sort_order: j,
        props: {
          heading: `Section ${j} on ${page.title}`,
          subheading: `A description for section ${j}`,
          buttonLabel: "Shop Now",
          buttonHref: "#",
          imageUrl: `https://cdn.example.com/img/page${page.sort_order}-sec${j}.jpg`,
          altText: `Image for section ${j}`,
          // Representative metadata blob — simulates real content
          items: Array.from({ length: 4 }, (_, k) => ({
            id: `item-${k}`,
            label: `Item ${k}`,
            description: `Description for item ${k} on section ${j}`,
            imageUrl: `https://cdn.example.com/img/item${k}.jpg`,
          })),
        },
      });
    }
  }
  return out;
}

const LARGE_PROJECT = {
  title: "Baobab Collective — Large Fixture",
  theme: {
    primary: "#0F0D33",
    accent: "#00C851",
    background: "#FAFAF8",
    text: "#0F0D33",
    fontDisplay: "Fraunces",
    fontBody: "system-ui",
    spacing: "comfortable" as const,
  },
};

const pages = makePages();
const sections = makeSections(pages);

/**
 * Run `fn` with warm-ups, collect `samples` timings, return the median.
 * Median-of-7 eliminates GC pauses and OS-scheduling outliers that make
 * single-sample budgets flaky on loaded CI runners.
 */
function elapsed(fn: () => void, { warmups = 3, samples = 7 } = {}): number {
  for (let i = 0; i < warmups; i++) fn();
  const times: number[] = [];
  for (let i = 0; i < samples; i++) {
    const t0 = performance.now();
    fn();
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  return times[Math.floor(times.length / 2)]; // median
}

// ─── Correctness ────────────────────────────────────────────────────────────

describe("large-project fixture correctness", () => {
  it("fixture has expected page and section counts", () => {
    expect(pages).toHaveLength(PAGE_COUNT);
    expect(sections).toHaveLength(TOTAL_SECTIONS);
  });

  it("buildDefinitionFromProjectParts produces correct page/section structure", () => {
    const def = buildDefinitionFromProjectParts(LARGE_PROJECT, pages, sections);
    expect(def.pages).toHaveLength(PAGE_COUNT);
    let totalSections = 0;
    for (const page of def.pages) {
      expect(page.sections.length).toBe(SECTIONS_PER_PAGE);
      totalSections += page.sections.length;
    }
    expect(totalSections).toBe(TOTAL_SECTIONS);
  });

  it("sections on each page are sorted by sort_order", () => {
    const def = buildDefinitionFromProjectParts(LARGE_PROJECT, pages, sections);
    for (const page of def.pages) {
      for (let i = 1; i < page.sections.length; i++) {
        // IDs encode their order: sec-page-N-J
        const prevJ = parseInt(page.sections[i - 1].id?.split("-").at(-1) ?? "0", 10);
        const curJ = parseInt(page.sections[i].id?.split("-").at(-1) ?? "0", 10);
        expect(prevJ).toBeLessThan(curJ);
      }
    }
  });

  it("buildEditorPreviewDefinition matches buildDefinitionFromProjectParts when no chrome", () => {
    const def1 = buildDefinitionFromProjectParts(LARGE_PROJECT, pages, sections);
    const def2 = buildEditorPreviewDefinition(LARGE_PROJECT, pages, sections, null);
    expect(def2.pages.length).toBe(def1.pages.length);
    expect(def2.pages[0].sections.length).toBe(def1.pages[0].sections.length);
  });
});

// ─── Performance ────────────────────────────────────────────────────────────

describe("large-project performance budgets", () => {
  it(`buildDefinitionFromProjectParts (${TOTAL_SECTIONS} sections) < 10 ms`, () => {
    const ms = elapsed(() => buildDefinitionFromProjectParts(LARGE_PROJECT, pages, sections));
    console.info(`buildDefinitionFromProjectParts: ${ms.toFixed(2)} ms`);
    expect(ms).toBeLessThan(10);
  });

  it(`buildEditorPreviewDefinition (${TOTAL_SECTIONS} sections, no chrome) < 10 ms`, () => {
    const ms = elapsed(() => buildEditorPreviewDefinition(LARGE_PROJECT, pages, sections, null));
    console.info(`buildEditorPreviewDefinition: ${ms.toFixed(2)} ms`);
    expect(ms).toBeLessThan(10);
  });

  it("JSON.stringify of full definition < 8 ms", () => {
    const def = buildDefinitionFromProjectParts(LARGE_PROJECT, pages, sections);
    // Budget is 8 ms (median of 7 samples) — well above any non-pathological run
    // on modern hardware; catches accidental O(n²) serialization.
    const ms = elapsed(() => JSON.stringify(def));
    console.info(`JSON.stringify (${TOTAL_SECTIONS} sections): ${ms.toFixed(2)} ms`);
    expect(ms).toBeLessThan(8);
  });

  it("JSON.parse of serialized definition < 8 ms", () => {
    const def = buildDefinitionFromProjectParts(LARGE_PROJECT, pages, sections);
    const json = JSON.stringify(def);
    // Budget is 8 ms (median of 7 samples).
    const ms = elapsed(() => JSON.parse(json));
    console.info(`JSON.parse (${TOTAL_SECTIONS} sections): ${ms.toFixed(2)} ms`);
    expect(ms).toBeLessThan(8);
  });

  it(`section filter by page_id (linear scan over ${TOTAL_SECTIONS} sections) < 1 ms`, () => {
    const targetPageId = pages[10].id;
    const ms = elapsed(() => sections.filter((s) => s.page_id === targetPageId));
    console.info(`section filter (${TOTAL_SECTIONS}→${SECTIONS_PER_PAGE}): ${ms.toFixed(2)} ms`);
    expect(ms).toBeLessThan(1);
  });

  it("10 consecutive buildDefinitionFromProjectParts calls (simulates undo/redo burst) < 50 ms", () => {
    const ms = elapsed(() => {
      for (let i = 0; i < 10; i++) {
        buildDefinitionFromProjectParts(LARGE_PROJECT, pages, sections);
      }
    });
    console.info(`10× buildDefinitionFromProjectParts: ${ms.toFixed(2)} ms`);
    expect(ms).toBeLessThan(50);
  });
});

// ─── Payload size ────────────────────────────────────────────────────────────

describe("large-project payload sizes", () => {
  it("serialized 300-section definition is under 500 KB", () => {
    const def = buildDefinitionFromProjectParts(LARGE_PROJECT, pages, sections);
    const bytes = new TextEncoder().encode(JSON.stringify(def)).length;
    console.info(`Serialized definition size: ${(bytes / 1024).toFixed(1)} KB`);
    // 500 KB is generous; real projects with text-only props are typically < 100 KB.
    // This catches accidental attachment of blob URLs or base64 images to the definition.
    expect(bytes).toBeLessThan(500 * 1024);
  });
});

// ─── validateWebsiteDefinition on a valid large definition ────────────────────

describe("schema validation performance", () => {
  it("validateWebsiteDefinition on 20-page/15-section-per-page definition < 200 ms", () => {
    // Zod parse is the expensive part — must not be O(n²) in section count.
    // Build a valid definition (sections with valid hero props).
    const validPages = Array.from({ length: 20 }, (_, i) => ({
      slug: i === 0 ? "home" : `page-${i}`,
      title: i === 0 ? "Home" : `Page ${i}`,
      sections: Array.from({ length: 15 }, (_, j) => ({
        id: `s-${i}-${j}`,
        type: "text" as const,
        props: { content: `Content for section ${j} on page ${i}` },
      })),
    }));
    const raw = {
      schemaVersion: "website-v1" as const,
      title: "Large Fixture",
      theme: LARGE_PROJECT.theme,
      pages: validPages,
    };

    validateWebsiteDefinition(raw); // warm up
    const ms = elapsed(() => validateWebsiteDefinition(raw));
    console.info(`validateWebsiteDefinition (300 sections): ${ms.toFixed(2)} ms`);
    expect(ms).toBeLessThan(200);
  });
});
