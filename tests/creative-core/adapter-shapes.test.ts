/**
 * S2 — legacy adapter behavior on specific shapes: deterministic ids, each odd stored shape,
 * edits written from the model (shadows never resurrect stale content), site chrome projection
 * and write-back, and explicit refusals instead of silent loss.
 */
import { describe, expect, it } from "vitest";
import {
  applyTransaction,
  canonicalStringify,
  composeRoots,
  expectFor,
  isNodeId,
  type KcdDocument,
  type NodeId,
  type Op,
  type PageId,
} from "@/lib/creative-core";
import {
  AdapterError,
  builderRegistry,
  chromeSuppressedIds,
  documentToRows,
  documentToWebsiteV1,
  legacyOfNode,
  canonicalSiteChrome,
  composeKcdPage,
  isChromeProjection,
  pageRenderRoots,
  mintSectionId,
  rowsToDocument,
  uuidV5,
  websiteV1ToDocument,
  type ProjectRows,
} from "@/lib/create/kcd-adapter";
import { sha1 } from "@/lib/create/kcd-adapter/ids";
import { sectionPropsForSave } from "@/lib/create/section-props-boundary";
import { CHROME_FOOTER_ID, CHROME_HEADER_ID, defaultSiteChrome } from "@/lib/create/site-chrome";
import { applyOptions, uuidFor } from "./helpers";

const json = (v: unknown) => canonicalStringify(JSON.parse(canonicalStringify(v)));
const hex = (bytes: number[]) => bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
const utf8 = (s: string) => [...new TextEncoder().encode(s)];

const PROJECT = uuidFor(1, 0xa11);
const HOME = uuidFor(2, 0xa11);
const ABOUT = uuidFor(3, 0xa11);
const S1 = uuidFor(10, 0xa11);
const S2 = uuidFor(11, 0xa11);
const NAV = uuidFor(12, 0xa11);

function rowsWith(heroProps: Record<string, unknown>, extra: Partial<ProjectRows> = {}): ProjectRows {
  return {
    project: { id: PROJECT, title: "Shapes", theme: { primary: "#111111" }, seo: null, site_chrome: null },
    pages: [{ id: HOME, slug: "home", title: "Home", sort_order: 0, device_layouts: null }],
    sections: [
      { id: S1, page_id: HOME, section_type: "hero", sort_order: 0, props: { heading: "Hello", ...heroProps } },
      { id: S2, page_id: HOME, section_type: "text", sort_order: 1, props: { heading: "About", body: "Body" } },
    ],
    ...extra,
  };
}

let tx = 0;
function apply(doc: KcdDocument, ops: Op[]) {
  const result = applyTransaction(doc, { txId: uuidFor(++tx, 0x7e5), origin: "user", label: "edit", ops, expect: expectFor(doc, ops) }, builderRegistry, applyOptions);
  if (!result.ok) throw new Error(result.error.message);
  return result;
}

function refuses(fn: () => unknown, code: AdapterError["code"]) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(AdapterError);
    expect((e as AdapterError).code).toBe(code);
    return;
  }
  throw new Error(`expected AdapterError ${code}`);
}

describe("deterministic identities", () => {
  it("SHA-1 matches the FIPS 180 test vectors (single and multi-block)", () => {
    expect(hex(sha1([]))).toBe("da39a3ee5e6b4b0d3255bfef95601890afd80709");
    expect(hex(sha1(utf8("abc")))).toBe("a9993e364706816aba3e25717850c26c9cd0d89d");
    expect(hex(sha1(utf8("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")))).toBe("84983e441c3bd26ebaae4aa1f95129e5e54670f1");
  });

  it("UUID v5 matches RFC 4122 (DNS namespace, www.example.com)", () => {
    expect(uuidV5("www.example.com", "6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe("2ed6657d-e927-568b-95e1-2665a8aea6a2");
  });

  it("minted ids are stable, valid, and scoped to their document", () => {
    expect(mintSectionId("doc-a", "hero-1")).toBe(mintSectionId("doc-a", "hero-1"));
    expect(mintSectionId("doc-a", "hero-1")).not.toBe(mintSectionId("doc-b", "hero-1"));
    expect(mintSectionId("doc-a", "hero-1")).not.toBe(mintSectionId("doc-a", "hero-2"));
    expect(isNodeId(mintSectionId("doc-a", "hero-1"))).toBe(true);
  });

  it("website-v1: UUID section ids are kept, others minted and remembered, missing ids stay missing", () => {
    const def = {
      schemaVersion: "website-v1",
      title: "Ids",
      theme: {},
      pages: [{ slug: "home", title: "Home", sections: [
        { id: S1, type: "hero", props: { heading: "A" } },
        { id: "hero-2", type: "hero", props: { heading: "B" } },
        { type: "text", props: { body: "C" } },
      ] }],
    };
    const { document } = websiteV1ToDocument(def, { id: "t" });
    const nodes = composeRoots(document, document.pages[0].id, "desktop");
    expect(nodes[0].id).toBe(S1);
    expect(nodes[1].id).toBe(mintSectionId("t", "hero-2"));
    expect(legacyOfNode(nodes[1]).id).toBe("hero-2");
    expect(legacyOfNode(nodes[2]).anonymous).toBe(true);
    expect(json(documentToWebsiteV1(document))).toBe(json(def));
  });
});

describe("stored shapes", () => {
  const cases: { name: string; props: Record<string, unknown>; shadow: boolean; issues: string[]; check?: (doc: KcdDocument) => void }[] = [
    { name: "canonical props", props: { deviceOverrides: { mobile: { align: "left" }, _state: { mode: "custom", baseHash: "abc" } }, _motion: { specs: [] } }, shadow: false, issues: [],
      check: (d) => expect(d.nodes[S1 as NodeId]).toMatchObject({ overrides: { mobile: { align: "left" } }, responsiveState: { mode: "custom", baseHash: "abc" }, motion: { specs: [] } }) },
    { name: "deviceOverrides: {}", props: { deviceOverrides: {} }, shadow: true, issues: [] },
    { name: "deviceOverrides: null (Reset to Auto)", props: { deviceOverrides: null }, shadow: true, issues: [] },
    { name: "_motion: null", props: { _motion: null }, shadow: true, issues: [], check: (d) => expect(d.nodes[S1 as NodeId].motion).toBeUndefined() },
    { name: "a11y 3B accepts after normalizing (padded label, unknown key)", props: { _a11y: { landmark: "main", label: "  Main  ", legacyKey: 1 } }, shadow: true, issues: [],
      check: (d) => expect(d.nodes[S1 as NodeId].a11y).toEqual({ landmark: "main", label: "Main" }) },
    { name: "invalid a11y (region without label)", props: { _a11y: { landmark: "region" } }, shadow: true, issues: ["_a11y"] },
    { name: "invalid visibility (hidden everywhere)", props: { _visibility: { hideOn: ["desktop", "tablet", "mobile"] } }, shadow: true, issues: ["_visibility"] },
    { name: "non-object device bucket", props: { deviceOverrides: { tablet: "bad", mobile: { align: "left" } } }, shadow: true, issues: ["deviceOverrides.tablet"],
      check: (d) => expect(d.nodes[S1 as NodeId].overrides).toEqual({ mobile: { align: "left" } }) },
    { name: "storage key inside a device bucket", props: { deviceOverrides: { mobile: { _motion: 1, align: "left" } } }, shadow: true, issues: ["deviceOverrides.mobile._motion"] },
    { name: "unknown device slot", props: { deviceOverrides: { watch: { align: "left" } } }, shadow: true, issues: ["deviceOverrides.watch"] },
  ];

  it.each(cases.map((c) => [c.name, c] as const))("%s", (_name, c) => {
    const rows = rowsWith(c.props);
    const { document, issues } = rowsToDocument(rows);
    expect(json(documentToRows(document))).toBe(json(rows));
    expect("source" in legacyOfNode(document.nodes[S1 as NodeId])).toBe(c.shadow);
    expect(issues.filter((i) => i.nodeId === S1).map((i) => i.field).sort()).toEqual([...c.issues].sort());
    c.check?.(document);
  });

  it("does not mutate its input", () => {
    const rows = rowsWith({ deviceOverrides: {}, _a11y: { landmark: "main", label: " x " } });
    const before = json(rows);
    const { document } = rowsToDocument(rows);
    documentToRows(document);
    expect(json(rows)).toBe(before);
  });

  it("non-dense and tied sort orders keep 3B order and are written back as stored", () => {
    const rows = rowsWith({});
    rows.sections.reverse(); // input order S2, S1 — the opposite of id order
    rows.sections[0].sort_order = 7;
    rows.sections[1].sort_order = 7; // tie: input order wins, as in 3B's stable sort
    const { document } = rowsToDocument(rows);
    expect(composeRoots(document, HOME as PageId, "desktop").map((n) => n.id)).toEqual([S2, S1]);
    expect(json(documentToRows(document))).toBe(json(rows));
  });

  it("a theme with non-scalar entries keeps them; tokens carry the scalars", () => {
    const rows = rowsWith({});
    rows.project.theme = { primary: "#111", fonts: { display: "X" } };
    const { document } = rowsToDocument(rows);
    expect(document.tokens).toEqual({ primary: "#111" });
    expect(json(documentToRows(document))).toBe(json(rows));
  });
});

describe("edits are written from the model", () => {
  it("an edited node is written canonically; values that never took effect are dropped as 3B's save boundary drops them", () => {
    const rows = rowsWith({ deviceOverrides: {}, _a11y: { landmark: "region" } });
    const { document } = rowsToDocument(rows);
    const edited = apply(document, [{ op: "setProp", id: S1 as NodeId, path: "heading", value: "Edited" }]);
    const hero = documentToRows(edited.document).sections.find((s) => s.id === S1)!;
    expect(hero.props).toEqual({ heading: "Edited" });
    // 3B saving the same edit: invalid _a11y dropped, empty deviceOverrides kept only as {} (schema-valid, no content).
    const threeB = sectionPropsForSave("hero", { ...(rows.sections[0].props as object), heading: "Edited" });
    expect(threeB.ok && (threeB.props as Record<string, unknown>)._a11y).toBeFalsy();

    // Undo restores the stored original exactly (the preserved source matches again).
    const undone = apply(edited.document, edited.inverse);
    expect(json(documentToRows(undone.document))).toBe(json(rows));
  });

  it("override edits, reorders and device compositions are written in the 3B shape", () => {
    const rows = rowsWith({});
    rows.sections[0].sort_order = 10;
    rows.sections[1].sort_order = 20;
    const { document } = rowsToDocument(rows);
    const d1 = apply(document, [{ op: "setOverride", id: S1 as NodeId, device: "mobile", key: "align", value: "left" }]).document;
    const s2Key = d1.nodes[S2 as NodeId].orderKey;
    const d2 = apply(d1, [{ op: "moveNode", id: S1 as NodeId, parentId: null, orderKey: s2Key + "V" }]).document;
    const d3 = apply(d2, [{ op: "setDeviceComposition", pageId: HOME as PageId, device: "mobile", composition: { hidden: [S2 as NodeId] } }]).document;
    const out = documentToRows(d3);
    const hero = out.sections.find((s) => s.id === S1)!;
    expect((hero.props as Record<string, unknown>).deviceOverrides).toEqual({ mobile: { align: "left" } });
    expect(out.sections.map((s) => [s.id, s.sort_order])).toEqual([[S2, 0], [S1, 1]]); // order changed → dense
    expect(out.pages[0].device_layouts).toEqual({ mobile: { hiddenSections: [S2] } });
  });

  it("device layouts: 3B-tolerant reading, stored form kept while unchanged", () => {
    const layouts = { mobile: { sectionOrder: [S2, "stale", S2, "", 5, S1], hiddenSections: [S1] }, tablet: "bad" };
    const rows = rowsWith({}, { pages: [{ id: HOME, slug: "home", title: "Home", sort_order: 0, device_layouts: layouts }] });
    const { document } = rowsToDocument(rows);
    expect(document.pages[0].deviceLayout).toEqual({ mobile: { order: [S2, "stale"], hidden: [S1] } });
    expect(composeRoots(document, HOME as PageId, "mobile").map((n) => n.id)).toEqual([S2]);
    expect(json(documentToRows(document))).toBe(json(rows));
  });
});

describe("site chrome: one source, render-time page projection", () => {
  function chromeRows(): ProjectRows {
    const rows = rowsWith({});
    rows.pages.push({ id: ABOUT, slug: "about", title: "About", sort_order: 1, device_layouts: { mobile: { hiddenSections: [CHROME_HEADER_ID] } } });
    rows.sections.push({ id: NAV, page_id: HOME, section_type: "navigation", sort_order: 2, props: { brand: "Stored nav" } });
    rows.project.site_chrome = defaultSiteChrome("Shapes");
    return rows;
  }
  const ids = (doc: KcdDocument, page: string, device: "desktop" | "tablet" | "mobile" = "desktop") =>
    composeKcdPage(doc, page as PageId, device).map((n) => n.id);

  it("projects header/footer onto every page (empty pages too), pinned, replacing stored navigation", () => {
    const rows = chromeRows();
    const { document, issues } = rowsToDocument(rows);
    expect(issues).toEqual([]);
    expect(ids(document, HOME)).toEqual([CHROME_HEADER_ID, S1, S2, CHROME_FOOTER_ID]);
    expect(ids(document, ABOUT)).toEqual([CHROME_HEADER_ID, CHROME_FOOTER_ID]);
    expect(ids(document, ABOUT, "mobile"), "the page layout hides the header by its synthetic id").toEqual([CHROME_FOOTER_ID]);
    expect([...chromeSuppressedIds(document)]).toEqual([NAV]);
    expect(json(documentToRows(document))).toBe(json(rows));
  });

  it("the projection is not stored: the document holds the source once and no copies", () => {
    const { document } = rowsToDocument(chromeRows());
    expect(Object.keys(document.nodes).sort()).toEqual([S1, S2, NAV].sort());
    expect(document.meta.siteChrome).toEqual(defaultSiteChrome("Shapes"));
    const header = pageRenderRoots(document, HOME as PageId)[0];
    expect(isChromeProjection(header)).toBe(true);
    expect(header.props.brand).toBe("Shapes");
  });

  it("the projection is not an operation target — it cannot become a second authority", () => {
    const { document } = rowsToDocument(chromeRows());
    const result = applyTransaction(
      document,
      { txId: uuidFor(900, 0x7e5), origin: "user", label: "x", ops: [{ op: "setProp", id: CHROME_HEADER_ID as NodeId, path: "brand", value: "Nope" }], expect: {} },
      builderRegistry,
      applyOptions,
    );
    expect(result.ok).toBe(false);
  });

  it("one change to the source changes every page, and is what gets stored", () => {
    const { document } = rowsToDocument(chromeRows());
    const chrome = structuredClone(defaultSiteChrome("Shapes"));
    chrome.header!.props.brand = "New brand";
    const edited: KcdDocument = { ...document, meta: { ...document.meta, siteChrome: chrome } };
    for (const page of [HOME, ABOUT]) expect(pageRenderRoots(edited, page as PageId)[0].props.brand).toBe("New brand");
    expect((documentToRows(edited).project.site_chrome as typeof chrome).header!.props.brand).toBe("New brand");
  });

  it.each([
    ["stored {} (column default)", {}],
    ["disabled", { ...defaultSiteChrome("Shapes"), enabled: false }],
    ["enabled without parts", { enabled: true }],
    ["unparseable", "garbage"],
    ["absent", undefined],
  ])("missing chrome (%s): nothing projected, stored navigation renders", (_name, stored) => {
    const rows = chromeRows();
    if (stored === undefined) delete rows.project.site_chrome;
    else rows.project.site_chrome = stored;
    const { document } = rowsToDocument(rows);
    expect(ids(document, HOME)).toEqual([S1, S2, NAV]);
    expect(ids(document, ABOUT)).toEqual([]);
    expect(json(documentToRows(document))).toBe(json(rows));
  });

  it("conflict — enabled chrome on a site whose flagship embeds navigation — is reported, not guessed", () => {
    const rows = chromeRows();
    rows.sections.push({ id: uuidFor(20, 0xa11), page_id: HOME, section_type: "kdirection-page", sort_order: 3, props: { title: "K" } });
    const { document, issues } = rowsToDocument(rows);
    expect(issues.map((i) => i.field)).toEqual(["site_chrome"]);
    expect(canonicalSiteChrome(document)).toEqual({ chrome: null, conflict: true });
    // Canonical rule = the editor's: no universal chrome; stored navigation renders.
    expect(ids(document, HOME)).toEqual([S1, S2, NAV, uuidFor(20, 0xa11)]);
    expect(json(documentToRows(document))).toBe(json(rows));
  });
});

describe("refusals (never silent loss)", () => {
  it("primitive or nested nodes cannot be written to 3B shapes", () => {
    const { document } = rowsToDocument(rowsWith({}));
    const section = uuidFor(99, 0xa11) as NodeId;
    const withPrimitive = apply(document, [{ op: "insertNode", node: { id: section, type: "section", typeVersion: 1, props: {}, overrides: {} }, parentId: null, pageId: HOME as PageId, orderKey: "z" }]).document;
    refuses(() => documentToRows(withPrimitive), "unsupported-node");
    refuses(() => documentToWebsiteV1(withPrimitive), "unsupported-node");
  });

  it("invalid rows", () => {
    const bad = (mutate: (r: ProjectRows) => void) => {
      const rows = rowsWith({});
      mutate(rows);
      return () => rowsToDocument(rows);
    };
    refuses(bad((r) => (r.sections[0].id = "hero-1")), "invalid-id");
    refuses(bad((r) => (r.sections[1].id = S1)), "duplicate-id");
    refuses(bad((r) => (r.sections[0].page_id = ABOUT)), "orphan-section");
    refuses(bad((r) => (r.sections[0].props = JSON.parse('{"__proto__": {"x": 1}}'))), "forbidden-key");
    refuses(bad((r) => (r.sections[0].props = { heading: () => 1 })), "invalid-input");
    refuses(bad((r) => (r.sections[0].section_type = "Hero Section")), "invalid-input");
    const ids = Array.from({ length: 41 }, (_, i) => uuidFor(200 + i, 0xa11));
    refuses(bad((r) => {
      r.sections = ids.map((id, i) => ({ id, page_id: HOME, section_type: "text", sort_order: i, props: { body: "x" } }));
      r.pages[0].device_layouts = { mobile: { hiddenSections: ids } };
    }), "unrepresentable-layout");
  });

  it("invalid definitions", () => {
    const def = (pages: unknown[]) => ({ schemaVersion: "website-v1", title: "X", theme: {}, pages });
    refuses(() => websiteV1ToDocument({ ...def([]), schemaVersion: "kcd-1" }, { id: "x" }), "invalid-input");
    refuses(() => websiteV1ToDocument(def([{ slug: "a", title: "A", sections: [] }, { slug: "a", title: "B", sections: [] }]), { id: "x" }), "duplicate-id");
    refuses(() => websiteV1ToDocument(def([{ slug: "a", title: "A", sections: [{ id: "s", type: "text", props: {} }, { id: "s", type: "text", props: {} }] }]), { id: "x" }), "duplicate-id");
    refuses(() => websiteV1ToDocument(def([{ slug: "a", title: "A", sections: [{ type: "text" }] }]), { id: "x" }), "invalid-input");
  });
});
