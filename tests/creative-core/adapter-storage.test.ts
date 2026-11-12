/**
 * 3C S4 — the adapter over the KCD storage columns.
 *
 *   3B path (document_schema_version null) with the columns present: versions are read and written
 *   back; order_key / parent_id stay database-owned (order follows sort_order exactly as in S2).
 *   Opted in ('kcd-1'): structure from parent_id / order_key / node_version / type_version; pilot
 *   primitives stored as 'section' (root) and 'group' / 'text' / 'image' (nested); sort_order
 *   derived (dense page roots, 0 nested). Round trips are exact for rows apply_node_ops writes.
 */
import { describe, expect, it } from "vitest";
import { canonicalStringify, keyBetween, type NodeId } from "@/lib/creative-core";
import { AdapterError, documentToRows, rowsToDocument, type ProjectRows } from "@/lib/create/kcd-adapter";
import { kcdNodeType, storageSectionType } from "@/lib/create/kcd-adapter/sections";
import { uuidFor } from "./helpers";

const json = (v: unknown) => canonicalStringify(JSON.parse(canonicalStringify(v)));
const byId = (r: ProjectRows) => json({ ...r, pages: [...r.pages].sort((a, b) => (a.id < b.id ? -1 : 1)), sections: [...r.sections].sort((a, b) => (a.id < b.id ? -1 : 1)) });
const P = uuidFor(1, 0x54), PG = uuidFor(2, 0x54);
const id = (n: number) => uuidFor(100 + n, 0x54);

function kcdRows(): ProjectRows {
  return {
    project: { id: P, title: "Stored", theme: { primary: "#111" }, document_schema_version: "kcd-1" },
    pages: [{ id: PG, slug: "home", title: "Home", sort_order: 0, device_layouts: { mobile: { sectionOrder: [id(2), id(1)] } }, layout_version: 4, order_key: "V", kcd_unknown: { extension: { source: "page-test" } } }],
    sections: [
      { id: id(1), page_id: PG, section_type: "hero", sort_order: 0, props: { heading: "Legacy hero", deviceOverrides: { mobile: { heading: "Phone" } } }, parent_id: null, order_key: "F", node_version: 7, type_version: 1 },
      { id: id(2), page_id: PG, section_type: "section", sort_order: 1, props: { paddingY: "md", _locked: true }, parent_id: null, order_key: "V", node_version: 2, type_version: 1 },
      { id: id(3), page_id: PG, section_type: "group", sort_order: 0, props: { direction: "row" }, parent_id: id(2), order_key: "V", node_version: 1, type_version: 1 },
      { id: id(4), page_id: PG, section_type: "text", sort_order: 0, props: { text: "Native text", _a11y: { label: "Intro" } }, parent_id: id(3), order_key: "V", node_version: 3, type_version: 1 },
      { id: id(5), page_id: PG, section_type: "image", sort_order: 0, props: { src: "/a.jpg" }, parent_id: id(3), order_key: "W", node_version: 1, type_version: 1 },
      { id: id(6), page_id: PG, section_type: "text", sort_order: 2, props: { heading: "Legacy text section", body: "b" }, parent_id: null, order_key: "k", node_version: 1, type_version: 1 },
    ],
  };
}

describe("storage type mapping (same rule as SQL kcd_node_type)", () => {
  it("text / image are primitives only when nested; section / group are always primitives", () => {
    expect(kcdNodeType("text", null)).toBe("legacy-section:text");
    expect(kcdNodeType("text", id(1))).toBe("text");
    expect(kcdNodeType("image", id(1))).toBe("image");
    expect(kcdNodeType("section", null)).toBe("section");
    expect(kcdNodeType("group", id(1))).toBe("group");
    expect(kcdNodeType("hero", null)).toBe("legacy-section:hero");
    for (const t of ["text", "image", "section", "group", "legacy-section:text", "legacy-section:hero"]) {
      expect(storageSectionType(t)).toBe(t.replace("legacy-section:", ""));
    }
  });
});

describe("opted-in project (kcd-1)", () => {
  it("reads structure, types, versions and fields from the storage columns", () => {
    const { document, issues } = rowsToDocument(kcdRows());
    expect(issues).toEqual([]);
    expect(document.meta.documentSchemaVersion).toBe("kcd-1");
    const n = (k: number) => document.nodes[id(k) as NodeId];
    expect([n(1).type, n(2).type, n(3).type, n(4).type, n(5).type, n(6).type]).toEqual([
      "legacy-section:hero", "section", "group", "text", "image", "legacy-section:text",
    ]);
    expect([n(1).version, n(4).version, n(4).parentId, n(4).orderKey]).toEqual([7, 3, id(3), "V"]);
    expect(n(2).locked).toBe(true);
    expect(n(4).a11y).toEqual({ label: "Intro" });
    expect(n(1).overrides).toEqual({ mobile: { heading: "Phone" } });
    expect(document.pages[0].layoutVersion).toBe(4);
  });

  it("round-trips exactly", () => {
    const rows = kcdRows();
    expect(byId(documentToRows(rowsToDocument(rows).document))).toBe(byId(rows));
  });

  it("derives sort_order (dense page roots, 0 nested) and reports stored values that disagree", () => {
    const rows = kcdRows();
    rows.sections[5].sort_order = 9;
    const { document, issues } = rowsToDocument(rows);
    expect(issues).toEqual([{ nodeId: id(6), field: "sort_order", message: expect.any(String) }]);
    expect(documentToRows(document).sections.find((s) => s.id === id(6))!.sort_order).toBe(2);
  });

  it("needs the storage columns and valid keys", () => {
    const rows = kcdRows();
    rows.sections[0].order_key = "0";
    expect(() => rowsToDocument(rows)).toThrow(AdapterError);
    const bare = kcdRows();
    bare.sections = bare.sections.map(({ id: i, page_id, section_type, sort_order, props }) => ({ id: i, page_id, section_type, sort_order, props }));
    bare.pages = bare.pages.map(({ layout_version: _l, ...p }) => (void _l, p));
    expect(() => rowsToDocument(bare)).toThrow(/storage columns/);
  });

  it("keeps a new key order when the document changes (the adapter never re-sorts by sort_order)", () => {
    const { document } = rowsToDocument(kcdRows());
    const moved = { ...document, nodes: { ...document.nodes, [id(1)]: { ...document.nodes[id(1) as NodeId], orderKey: keyBetween("k", null) } } };
    const out = documentToRows(moved);
    const roots = out.sections.filter((s) => s.parent_id === null).sort((a, b) => a.sort_order - b.sort_order).map((s) => s.id);
    expect(roots).toEqual([id(2), id(6), id(1)]);
  });
});

describe("3B path with the storage columns present", () => {
  function legacyRows(): ProjectRows {
    return {
      project: { id: P, title: "Legacy", theme: {}, document_schema_version: null },
      pages: [{ id: PG, slug: "home", title: "Home", sort_order: 0, device_layouts: null, layout_version: 2 }],
      sections: [
        { id: id(1), page_id: PG, section_type: "hero", sort_order: 1, props: { heading: "B" }, parent_id: null, order_key: "V", node_version: 5, type_version: 1 },
        { id: id(2), page_id: PG, section_type: "faq", sort_order: 0, props: { heading: "A" }, parent_id: null, order_key: "W", node_version: 1, type_version: 1 },
      ],
    };
  }

  it("orders by sort_order (order_key is database-owned and may be stale) and carries versions", () => {
    const { document } = rowsToDocument(legacyRows());
    const roots = Object.values(document.nodes).sort((a, b) => (a.orderKey < b.orderKey ? -1 : 1)).map((n) => n.id);
    expect(roots).toEqual([id(2), id(1)]);
    expect(document.nodes[id(1) as NodeId].version).toBe(5);
    expect(document.pages[0].layoutVersion).toBe(2);
  });

  it("writes back versions; never order_key or parent_id", () => {
    const rows = legacyRows();
    const out = documentToRows(rowsToDocument(rows).document);
    const strip = (r: ProjectRows) => ({ ...r, sections: r.sections.map(({ order_key: _o, parent_id: _p, ...s }) => (void _o, void _p, s)) });
    expect(byId(out)).toBe(byId(strip(rows)));
    expect(out.sections.every((s) => !("order_key" in s) && !("parent_id" in s))).toBe(true);
  });

  it("refuses nested rows (they only exist in opted-in projects)", () => {
    const rows = legacyRows();
    rows.sections[0].parent_id = id(2);
    expect(() => rowsToDocument(rows)).toThrow(/not on the KCD storage path/);
  });
});
