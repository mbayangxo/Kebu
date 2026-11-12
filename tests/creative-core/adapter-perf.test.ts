/**
 * S2 gate — adapter performance BASELINES at 100 / 500 / 2,000 sections (3C freeze §15).
 * Sites of 40-section pages (the 3B page maximum) built from template sections, with chrome,
 * overrides, extensions and device layouts. A clearly quadratic curve is a blocker; budgets are
 * set later from these numbers. KCD_PERF_REPORT=1 prints the table.
 */
import { describe, expect, it } from "vitest";
import { documentToRows, documentToWebsiteV1, rowsToDocument, websiteV1ToDocument, type ProjectRows } from "@/lib/create/kcd-adapter";
import { defaultSiteChrome } from "@/lib/create/site-chrome";
import { TEMPLATES } from "./adapter-fixtures";
import { measure, uuidFor } from "./helpers";

const SIZES = [100, 500, 2000] as const;
const SAMPLE = TEMPLATES.flatMap((t) => t.definition.pages.flatMap((p) => p.sections)).filter((s) => !["maylecor-home", "legally-blonde-hero", "kdirection-home", "kdirection-page"].includes(s.type));

function rowsOf(n: number): ProjectRows {
  const pages: ProjectRows["pages"] = [];
  const sections: ProjectRows["sections"] = [];
  for (let i = 0; i < n; i++) {
    if (i % 40 === 0) pages.push({ id: uuidFor(pages.length + 1, 0xd00 + n), slug: `page-${pages.length}`, title: `Page ${pages.length}`, sort_order: pages.length, device_layouts: null });
    const page = pages[pages.length - 1];
    const s = SAMPLE[i % SAMPLE.length];
    const id = uuidFor(10_000 + i, 0xd00 + n);
    const props: Record<string, unknown> = { ...s.props };
    if (i % 3 === 0) props.deviceOverrides = { mobile: { align: "left" }, _state: { mode: "custom", baseHash: "abc" } };
    if (i % 5 === 0) props._motion = { specs: [] };
    if (i % 7 === 0) props.deviceOverrides = {}; // shadowed shape
    sections.push({ id, page_id: page.id, section_type: s.type, sort_order: i % 40, props });
  }
  for (const page of pages) {
    const ids = sections.filter((s) => s.page_id === page.id).map((s) => s.id);
    page.device_layouts = { mobile: { sectionOrder: [...ids].reverse().slice(0, 20), hiddenSections: ids.slice(-2) } };
  }
  return { project: { id: uuidFor(1, 0xd00 + n), title: "Perf", theme: { primary: "#111" }, seo: null, site_chrome: defaultSiteChrome("Perf") }, pages, sections };
}

describe("legacy adapter performance baselines", () => {
  const rows = Object.fromEntries(SIZES.map((n) => [n, rowsOf(n)])) as Record<number, ProjectRows>;
  const docs = Object.fromEntries(SIZES.map((n) => [n, rowsToDocument(rows[n]).document])) as Record<number, ReturnType<typeof rowsToDocument>["document"]>;
  const defs = Object.fromEntries(SIZES.map((n) => [n, documentToWebsiteV1(docs[n])])) as Record<number, Record<string, unknown>>;

  const MEASURES: Record<string, (n: number) => () => void> = {
    "rows → document (incl. self-check)": (n) => () => void rowsToDocument(rows[n]),
    "document → rows": (n) => () => void documentToRows(docs[n]),
    "website-v1 → document": (n) => () => void websiteV1ToDocument(defs[n], { id: "perf" }),
    "document → website-v1": (n) => () => void documentToWebsiteV1(docs[n]),
  };

  it.each(Object.keys(MEASURES))("%s grows sub-quadratically", (name) => {
    const r: Record<number, number> = {};
    for (const n of SIZES) r[n] = measure(MEASURES[name](n));
    const exponent = Math.log(r[2000] / r[100]) / Math.log(20);
    if (process.env.KCD_PERF_REPORT) {
      process.stdout.write(`[kcd-perf] ${name.padEnd(36)} ${SIZES.map((n) => `${n}: ${r[n].toFixed(0).padStart(8)} µs`).join("  ")}  exponent ${exponent.toFixed(2)}` + "\n");
    }
    expect(exponent, `${name}: ${JSON.stringify(r)}`).toBeLessThan(1.6);
  }, 60_000); // ~8 conversions of 2,000 sections per size, under full-suite load
});
