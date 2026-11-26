/**
 * S2 gate — the legacy adapter is lossless and faithful on the whole corpus (adapter-fixtures.ts):
 *
 *   rows → kcd → rows            byte-identical (canonical JSON) to the stored rows
 *   website-v1 → kcd → website-v1 byte-identical to the definition
 *   normalization idempotent     kcd → rows → kcd (and → v1 → kcd) reproduces the document
 *   deterministic                converting twice gives the identical serialized document
 *   valid                        every document parses (structure, ids, schemas) and preflights
 *   3B parity                    kcd → website-v1 == buildDefinitionFromProjectParts (editor/preview
 *                                input); page composition per device == 3B editor composition
 *                                (chrome pinned, stripped sections, layouts, visibility)
 *   extensions/overrides         lifted into node fields with their stored values
 */
import { describe, expect, it } from "vitest";
import {
  DEVICES,
  canonicalStringify,
  parseDocument,
  preflight,
  serializeDocument,
  type KcdDocument,
  type RendererManifest,
} from "@/lib/creative-core";
import {
  builderRegistry,
  composeKcdPage,
  documentToRows,
  documentToWebsiteV1,
  legacyOfNode,
  rowsToDocument,
  websiteV1ToDocument,
  type ProjectRows,
} from "@/lib/create/kcd-adapter";
import { composeSectionsForDevice } from "@/lib/create/device-composition";
import { buildDefinitionFromProjectParts, buildEditorPreviewDefinition } from "@/lib/create/editor-definition";
import { parseSiteChrome } from "@/lib/create/site-chrome";
import { definitionCorpus, gate2Rows, mutateRows, rowsCorpus, rowsFromDefinition, TEMPLATES } from "./adapter-fixtures";
import { rng } from "./helpers";

const json = (v: unknown) => canonicalStringify(JSON.parse(canonicalStringify(v)));
/** Rows are a set (the database has no row order): compare pages and sections by id. */
const rowsJson = (r: ProjectRows) => {
  const byId = <T extends { id: string }>(list: T[]) => [...list].sort((a, b) => (a.id < b.id ? -1 : 1));
  return json({ ...r, pages: byId(r.pages), sections: byId(r.sections) });
};
const ROWS = rowsCorpus();
const DEFS = definitionCorpus();

const allCapabilities: RendererManifest = { renderer: "web-dom", version: 1, supports: () => true, supportsNodeType: () => true };

describe("corpus coverage", { timeout: 30_000 }, () => {
  it("covers every template seed (128), in stored and definition form, plus Gate 2", () => {
    expect(TEMPLATES).toHaveLength(128);
    expect(ROWS.length).toBe(128 * 3 + 3);
    expect(DEFS.length).toBe(128 * 2);
    const types = new Set(ROWS.flatMap(({ rows }) => rows.sections.map((s) => s.section_type)));
    expect(types.size, [...types].join(",")).toBeGreaterThanOrEqual(35);
    for (const owner of ["musician-maylecor-ksendr", "agency-kdirection", "agency-dklns", "production-ndaoan-house", "entertainment-rect", "foundation-mayjor-good"]) {
      expect(TEMPLATES.some((t) => t.slug === owner), owner).toBe(true);
    }
  });

  it("includes the T1 legacy Hero and O6 editorial-hero shapes as stored", () => {
    const raw = ROWS.filter((c) => c.name.endsWith("(raw)")).flatMap(({ rows }) => rows.sections);
    const t1 = raw.filter((s) => s.section_type === "hero" && ["primaryCta", "secondaryCta", "backgroundImageUrl", "overlay", "textAlign"].some((k) => k in (s.props as object)));
    const o6 = raw.filter((s) => s.section_type === "editorial-hero" && "backgroundImageUrl" in (s.props as object));
    expect(t1.length).toBeGreaterThanOrEqual(39);
    expect(o6.length).toBeGreaterThanOrEqual(37);
  });
});

describe("rows → kcd → rows", { timeout: 30_000 }, () => {
  it.each(ROWS.map((c) => [c.name, c.rows] as const))("%s", (_name, rows) => {
    const { document } = rowsToDocument(rows);
    expect(rowsJson(documentToRows(document))).toBe(rowsJson(rows));

    // Deterministic, valid, idempotent.
    expect(serializeDocument(rowsToDocument(rows).document)).toBe(serializeDocument(document));
    expect(parseDocument(serializeDocument(document)).ok).toBe(true);
    expect(serializeDocument(rowsToDocument(documentToRows(document)).document)).toBe(serializeDocument(document));
    expect(preflight(document, builderRegistry, allCapabilities)).toEqual([]);
  });
});

describe("website-v1 → kcd → website-v1", { timeout: 30_000 }, () => {
  it.each(DEFS.map((c) => [c.name, c] as const))("%s", (_name, { id, definition }) => {
    const { document } = websiteV1ToDocument(definition, { id });
    expect(json(documentToWebsiteV1(document))).toBe(json(definition));

    expect(serializeDocument(websiteV1ToDocument(definition, { id }).document)).toBe(serializeDocument(document));
    expect(parseDocument(serializeDocument(document)).ok).toBe(true);
    expect(serializeDocument(websiteV1ToDocument(documentToWebsiteV1(document), { id }).document)).toBe(serializeDocument(document));
    expect(preflight(document, builderRegistry, allCapabilities)).toEqual([]);
  });
});

describe("3B parity", { timeout: 30_000 }, () => {
  const cases = ROWS.filter(({ rows }) => rows.pages.length > 0);

  it.each(cases.map((c) => [c.name, c.rows] as const))("definition == buildDefinitionFromProjectParts: %s", (_name, rows) => {
    const { document } = rowsToDocument(rows);
    const bridged = documentToWebsiteV1(document) as { pages: unknown };
    const theirs = buildDefinitionFromProjectParts(
      rows.project as Parameters<typeof buildDefinitionFromProjectParts>[0],
      rows.pages as Parameters<typeof buildDefinitionFromProjectParts>[1],
      rows.sections as Parameters<typeof buildDefinitionFromProjectParts>[2],
    );
    expect(json(bridged.pages)).toBe(json(theirs.pages));
  });

  /** Canonical composition per device, in 3B section ids (website-v1 nodes → their legacy ids). */
  function kcdComposition(doc: KcdDocument, pageIndex: number, device: (typeof DEVICES)[number]): string[] {
    return composeKcdPage(doc, doc.pages[pageIndex].id, device).map((n) => legacyOfNode(n).id ?? n.id);
  }

  function threeBComposition(rows: ProjectRows, pageIndex: number, device: (typeof DEVICES)[number]): string[] {
    const def = buildEditorPreviewDefinition(
      rows.project as Parameters<typeof buildEditorPreviewDefinition>[0],
      rows.pages as Parameters<typeof buildEditorPreviewDefinition>[1],
      rows.sections as Parameters<typeof buildEditorPreviewDefinition>[2],
      parseSiteChrome(rows.project.site_chrome),
    );
    const page = def.pages[pageIndex];
    return composeSectionsForDevice(page.sections, page.deviceLayouts, device).map((s) => s.id!);
  }

  it.each(cases.map((c) => [c.name, c.rows] as const))("composition == 3B editor on every device: %s", (_name, rows) => {
    const { document } = rowsToDocument(rows);
    document.pages.forEach((_, i) => {
      for (const device of DEVICES) expect(kcdComposition(document, i, device), `page ${i} ${device}`).toEqual(threeBComposition(rows, i, device));
    });
  });
});

describe("extensions and overrides are lifted with their stored values", { timeout: 30_000 }, () => {
  it("every valid reserved key becomes the node field it stores", () => {
    let checked = 0;
    for (const { rows } of ROWS) {
      const { document } = rowsToDocument(rows);
      for (const s of rows.sections) {
        const props = s.props as Record<string, unknown>;
        const node = document.nodes[s.id as keyof typeof document.nodes];
        const bucket = props.deviceOverrides as Record<string, unknown> | undefined;
        if (bucket && typeof bucket === "object" && !Array.isArray(bucket)) {
          for (const device of ["tablet", "mobile"] as const) {
            const stored = bucket[device];
            if (stored && typeof stored === "object" && !Array.isArray(stored)) {
              const clean = Object.fromEntries(Object.entries(stored).filter(([k]) => !k.startsWith("_") && k !== "deviceOverrides"));
              expect(node.overrides[device]).toEqual(clean);
              checked++;
            }
          }
        }
        if (props._motion != null) expect(node.motion).toEqual(props._motion);
        if (props._interaction != null) expect(node.interaction).toEqual(props._interaction);
        if (props._dataBinding != null) expect(node.dataBinding).toEqual(props._dataBinding);
        for (const k of Object.keys(node.props)) expect(node.props[k]).toEqual(props[k]);
      }
    }
    expect(checked).toBeGreaterThan(50);
  });

  it("stored values that do not take effect through the model are reported, never silently dropped", () => {
    const rows = mutateRows(rowsFromDefinition(TEMPLATES[0].definition, 0x7001, "raw"), rng(7), true);
    const { document, issues } = rowsToDocument(rows);
    for (const s of rows.sections) {
      const vis = (s.props as Record<string, unknown>)._visibility as { hideOn?: string[]; showOn?: string[] } | undefined;
      const invalid = vis && (vis.hideOn?.length === 3 || (vis.showOn && vis.hideOn));
      if (invalid) expect(issues.some((i) => i.nodeId === s.id && i.field === "_visibility"), s.id).toBe(true);
    }
    expect(rowsJson(documentToRows(document))).toBe(rowsJson(rows));
  });

  it("Gate 2 seed: four ordered sections with their exact props", () => {
    const rows = gate2Rows(0x7100);
    const { document, issues } = rowsToDocument(rows);
    expect(issues).toEqual([]);
    expect(composeKcdPage(document, document.pages[0].id, "desktop").map((n) => n.id)).toEqual(rows.sections.map((s) => s.id));
    for (const s of rows.sections) expect(document.nodes[s.id as keyof typeof document.nodes].props).toEqual(s.props);
  });
});
