/**
 * S1 gate — document serialization round trip, unknown-field preservation, malformed and
 * stale-document rejection, structural invariants.
 */
import { describe, expect, it } from "vitest";
import {
  canonicalStringify,
  checkStructure,
  documentToJson,
  parseDocument,
  serializeDocument,
  type KcdDocument,
  type NodeId,
} from "@/lib/creative-core";
import { PAGE_A, PAGE_B, emptyDocument, idSource, node } from "./helpers";

/** Loosely typed JSON view of a serialized document, for mutation in tests. */
type JsonNode = Record<string, unknown> & { props?: Record<string, unknown>; overrides: Record<string, unknown> };
interface Json {
  [key: string]: unknown;
  tokens: Record<string, unknown>;
  pages: (Record<string, unknown> & { deviceLayout: Record<string, unknown> })[];
  nodes: Record<string, JsonNode>;
}

const id = idSource(0xd0c);
const HERO = id();
const SECTION = id();
const GROUP = id();
const TEXT = id();
const IMAGE = id();

function richDocument(): KcdDocument {
  const doc = emptyDocument([PAGE_A, PAGE_B]);
  doc.pages[0].deviceLayout = { mobile: { order: [SECTION, HERO], hidden: [] }, tablet: { hidden: [HERO] } };
  doc.pages[0].layoutVersion = 4;
  doc.nodes = {
    [HERO]: node({
      id: HERO,
      type: "legacy-section:hero",
      pageId: PAGE_A,
      orderKey: "V",
      props: { heading: "Hello", align: "center", items: [1, null, { a: "b" }] },
      overrides: { mobile: { heading: "Hi", align: "left" } },
      responsiveState: { mode: "custom", baseHash: "a1b2c3" },
      visibility: { hideOn: ["tablet"] },
      a11y: { landmark: "region", label: "Intro" },
      motion: { preset: "fade-up" },
      interaction: { trigger: "hover" },
      dataBinding: { source: "products" },
      version: 7,
    }),
    [SECTION]: node({ id: SECTION, type: "section", pageId: PAGE_A, orderKey: "k", props: { paddingY: "lg" } }),
    [GROUP]: node({ id: GROUP, type: "group", pageId: PAGE_A, parentId: SECTION, orderKey: "V", props: { direction: "row" }, locked: true }),
    [TEXT]: node({ id: TEXT, type: "text", pageId: PAGE_A, parentId: GROUP, orderKey: "F", props: { text: "Bonjour — ça va ? 🌍" }, overrides: { tablet: { text: "Salut" } } }),
    [IMAGE]: node({ id: IMAGE, type: "image", pageId: PAGE_A, parentId: GROUP, orderKey: "V", props: { src: "/a.jpg" }, a11y: { alt: "Market stall" } }),
  };
  return doc;
}

describe("serialization", () => {
  it("round-trips losslessly and canonically", () => {
    const doc = richDocument();
    const text = serializeDocument(doc);
    const parsed = parseDocument(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.document).toEqual(doc);
    expect(serializeDocument(parsed.document)).toBe(text);
  });

  it("is independent of key insertion order", () => {
    const a = { b: 1, a: { d: [1, { z: 1, y: 2 }], c: null } };
    const b = { a: { c: null, d: [1, { y: 2, z: 1 }] }, b: 1 };
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
    expect(canonicalStringify(a)).toBe('{"a":{"c":null,"d":[1,{"y":2,"z":1}]},"b":1}');
  });

  it("drops undefined members but keeps null", () => {
    expect(canonicalStringify({ a: undefined, b: null, c: [undefined] })).toBe('{"b":null,"c":[null]}');
  });

  it("rejects non-JSON values", () => {
    expect(() => canonicalStringify({ a: NaN })).toThrow(/Non-finite/);
    expect(() => canonicalStringify({ a: () => 1 })).toThrow(/not JSON/);
    expect(() => canonicalStringify({ a: new Date() })).toThrow(/Non-plain/);
    expect(() => canonicalStringify({ a: BigInt(1) })).toThrow(/not JSON/);
  });

  it("does not share mutable structure with the input", () => {
    const doc = richDocument();
    const parsed = parseDocument(doc);
    if (!parsed.ok) throw new Error("parse failed");
    (parsed.document.nodes[HERO].props.items as unknown[]).push("x");
    expect(doc.nodes[HERO].props.items).toHaveLength(3);
  });
});

describe("unknown-field preservation", () => {
  it("keeps unknown document, page and node fields verbatim through a round trip", () => {
    const json = documentToJson(richDocument()) as unknown as Json;
    json.futureDocField = { v: 2 };
    json.unknown = "a field literally named unknown";
    json.pages[0].futurePageField = [1, 2];
    json.nodes[TEXT].futureNodeField = { runs: [{ bold: true }] };

    const parsed = parseDocument(JSON.stringify(json));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.document.unknown).toEqual({ futureDocField: { v: 2 }, unknown: "a field literally named unknown" });
    expect(parsed.document.pages[0].unknown).toEqual({ futurePageField: [1, 2] });
    expect(parsed.document.nodes[TEXT].unknown).toEqual({ futureNodeField: { runs: [{ bold: true }] } });
    expect(JSON.parse(serializeDocument(parsed.document))).toEqual(JSON.parse(canonicalStringify(json)));
  });

  it("refuses to serialize a preserved field that collides with a model field", () => {
    const doc = richDocument();
    doc.nodes[TEXT].unknown = { props: {} };
    expect(() => serializeDocument(doc)).toThrow(/collides/);
  });
});

describe("stale and malformed documents", () => {
  const good = () => documentToJson(richDocument()) as unknown as Json;
  const reject = (mutate: (j: Json) => void, pattern: RegExp) => {
    const json = good();
    mutate(json);
    const parsed = parseDocument(json);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.issues.map((i) => `${i.path} ${i.message}`).join("\n")).toMatch(pattern);
  };

  it("rejects other schema versions with a clear message", () => {
    reject((j) => (j.schemaVersion = "kcd-2"), /Unsupported document schema "kcd-2"/);
    reject((j) => (j.schemaVersion = "website-v1"), /legacy adapter/);
    reject((j) => delete j.schemaVersion, /schema none/);
  });

  it("rejects non-JSON input", () => {
    const parsed = parseDocument("{nope");
    expect(parsed.ok).toBe(false);
  });

  it.each([
    ["node id mismatching its key", (j: Json) => (j.nodes[TEXT].id = IMAGE), /does not match/],
    ["non-UUID node id", (j: Json) => { j.nodes["x"] = { ...j.nodes[TEXT], id: "x" }; }, /UUID/],
    ["invalid type id", (j: Json) => (j.nodes[TEXT].type = "Text!"), /type id/],
    ["zero version", (j: Json) => (j.nodes[TEXT].version = 0), /version/],
    ["fractional typeVersion", (j: Json) => (j.nodes[TEXT].typeVersion = 1.5), /typeVersion/],
    ["invalid order key", (j: Json) => (j.nodes[TEXT].orderKey = "V0"), /order key/],
    ["reserved key inside props", (j: Json) => (j.nodes[TEXT].props!.deviceOverrides = {}), /Reserved/],
    ["prototype key inside props", (j: Json) => (j.nodes[TEXT].props = JSON.parse('{"__proto__":{"x":1}}')), /Forbidden/],
    ["unknown override device", (j: Json) => (j.nodes[TEXT].overrides.watch = {}), /Unknown device/],
    ["contradictory visibility", (j: Json) => (j.nodes[HERO].visibility = { showOn: ["mobile"], hideOn: ["mobile"] }), /Contradictory/],
    ["region landmark without label", (j: Json) => (j.nodes[HERO].a11y = { landmark: "region" }), /label is required/],
    ["decorative image with alt", (j: Json) => (j.nodes[IMAGE].a11y = { decorative: true, alt: "x" }), /Decorative/],
    ["id both ordered and hidden", (j: Json) => (j.pages[0].deviceLayout.mobile = { order: [HERO], hidden: [HERO] }), /both ordered and hidden/],
    ["desktop composition", (j: Json) => (j.pages[0].deviceLayout.desktop = {}), /Unknown device/],
    ["non-scalar token", (j: Json) => (j.tokens.primary = { r: 1 }), /Token values/],
    ["missing props", (j: Json) => delete j.nodes[TEXT].props, /props must be an object/],
    ["bad kind", (j: Json) => (j.kind = "deck"), /kind/],
  ])("rejects %s", (_name, mutate, pattern) => reject(mutate, pattern));

  it.each([
    ["missing parent", (j: Json) => (j.nodes[TEXT].parentId = "00000000-0000-4000-8000-00000000dead"), /Missing parent/],
    ["parent on another page", (j: Json) => (j.nodes[TEXT].pageId = PAGE_B), /different page/],
    ["unknown page", (j: Json) => (j.nodes[HERO].pageId = "00000000-0000-4000-8000-00000000beef"), /Unknown page/],
    ["duplicate sibling order key", (j: Json) => (j.nodes[IMAGE].orderKey = "F"), /Duplicate order key/],
    ["parent cycle", (j: Json) => (j.nodes[SECTION].parentId = TEXT), /cycle/],
    ["duplicate page slug", (j: Json) => (j.pages[1].slug = "home"), /Duplicate page slug/],
  ])("rejects structure: %s", (_name, mutate, pattern) => reject(mutate, pattern));

  it("reports no structural issues for a valid document", () => {
    expect(checkStructure(richDocument())).toEqual([]);
  });

  it("accepts nodes of unknown types (they are preserved, not malformed)", () => {
    const json = good();
    json.nodes[TEXT].type = "video";
    json.nodes[TEXT].typeVersion = 9;
    const parsed = parseDocument(json);
    expect(parsed.ok).toBe(true);
  });

  it("orders pages canonically", () => {
    const json = good();
    json.pages.reverse();
    const parsed = parseDocument(json);
    if (!parsed.ok) throw new Error("parse failed");
    expect(parsed.document.pages.map((p) => p.id)).toEqual([PAGE_A, PAGE_B]);
  });

  it("rejects parent chains that loop through several nodes", () => {
    const json = good();
    json.nodes[SECTION].parentId = IMAGE as NodeId;
    json.nodes[SECTION].orderKey = "z";
    const parsed = parseDocument(json);
    expect(parsed.ok).toBe(false);
  });
});
