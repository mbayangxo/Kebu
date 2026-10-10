/**
 * S1 gate — registry integrity, capability negotiation (type ∩ renderer), publish preflight
 * for unsupported types/versions/capabilities, and the node migration framework.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  CAPABILITIES,
  PILOT_DEFINITIONS,
  createRegistry,
  effectiveCapabilities,
  inertOverrideKeys,
  inspectorControls,
  migrateDocument,
  migrateNode,
  preflight,
  resolveNode,
  resolveProp,
  storedCapabilities,
  textDefinition,
  type Capability,
  type NodeTypeDefinition,
  type RendererManifest,
} from "@/lib/creative-core";
import { LEGACY_DEFINITIONS, PAGE_A, emptyDocument, idSource, node, registry } from "./helpers";

const id = idSource(0x7e9);

function manifest(unsupported: Capability[] = [], knownTypes?: string[]): RendererManifest {
  return {
    renderer: "test-dom",
    version: 1,
    supports: (_type, capability) => !unsupported.includes(capability),
    supportsNodeType: (type) => (knownTypes ? knownTypes.includes(type) : registry.has(type)),
  };
}

const base: NodeTypeDefinition = {
  type: "probe",
  version: 1,
  displayName: "Probe",
  capabilities: new Set<Capability>(["text.edit", "responsive.overrides"]),
  propsSchema: z.strictObject({ a: z.string().optional() }),
  writePolicy: "reject-unknown",
  properties: [{ key: "a", label: "A", control: "text", capability: "text.edit", overridable: true }],
  children: "none",
  placement: "any",
  migrations: [],
};

describe("registry integrity", () => {
  it("registers the pilot primitives and all 41 legacy sections", () => {
    expect(registry.types()).toEqual(expect.arrayContaining(["section", "group", "text", "image", "legacy-section:hero", "legacy-section:kdirection-page"]));
    expect(LEGACY_DEFINITIONS).toHaveLength(41);
  });

  it("every pilot inspector property has an accessible label and a declared capability", () => {
    for (const def of PILOT_DEFINITIONS) {
      for (const p of def.properties) {
        expect(p.label.trim().length, `${def.type}.${p.key}`).toBeGreaterThan(1);
        expect(def.capabilities.has(p.capability)).toBe(true);
        if (p.control === "select") expect(p.options!.every((o) => o.label.trim())).toBe(true);
      }
    }
  });

  it.each([
    ["an unlabelled property", { properties: [{ key: "a", label: " ", control: "text", capability: "text.edit", overridable: false }] }, /accessible label/],
    ["a property whose capability the type lacks", { properties: [{ key: "a", label: "A", control: "text", capability: "media", overridable: false }] }, /capability "media"/],
    ["an overridable property without responsive.overrides", { capabilities: new Set(["text.edit"]) }, /overridable/],
    ["children without nesting", { children: { allow: ["text"] } }, /nesting/],
    ["a select without options", { properties: [{ key: "a", label: "A", control: "select", capability: "text.edit", overridable: false }] }, /no options/],
    ["a gap in the migration chain", { version: 3, migrations: [{ from: 2, to: 3, up: (p: unknown) => p }] }, /n → n\+1/],
    ["a legacy boundary without validateWrite", { writePolicy: "legacy-3b-boundary" }, /validateWrite/],
    ["an invalid type id", { type: "Probe Type" }, /invalid type id/],
  ])("rejects %s", (_name, patch, pattern) => {
    expect(() => createRegistry([{ ...base, ...(patch as Partial<NodeTypeDefinition>) }])).toThrow(pattern);
  });

  it("rejects duplicate types", () => {
    expect(() => createRegistry([base, base])).toThrow(/Duplicate/);
  });
});

describe("capability negotiation", () => {
  it("shows a control only when the type AND the renderer support its capability", () => {
    const all = inspectorControls(textDefinition, manifest()).map((p) => p.key);
    expect(all).toEqual(["position", "x", "y", "elementWidth", "elementHeight", "layer", "constraintX", "constraintY", "rotation", "scaleX", "scaleY", "fillContainer", "gridSpan", "mask", "opacity", "blur", "brightness", "saturation", "shadow", "fontSize", "lineHeight", "letterSpacing", "runs", "text", "variant", "align", "color", "href"]);
    const noLinks = inspectorControls(textDefinition, manifest(["links", "fill", "layout.positioned"])).map((p) => p.key);
    expect(noLinks).toEqual(["mask", "opacity", "blur", "brightness", "saturation", "shadow", "fontSize", "lineHeight", "letterSpacing", "runs", "text", "variant", "align"]);
    expect(effectiveCapabilities(textDefinition, manifest(["links"])).has("links")).toBe(false);
  });

  it("maps 3B extensions to capabilities", () => {
    const n = node({ id: id(), type: "legacy-section:hero", pageId: PAGE_A, orderKey: "V", motion: {}, interaction: {}, dataBinding: {}, a11y: {}, visibility: { hideOn: ["mobile"] } });
    expect([...storedCapabilities(n, registry.get(n.type))].sort()).toEqual(["a11y", "dataBinding", "interaction", "motion", "responsive.overrides"]);
  });
});

describe("publish preflight", () => {
  it("passes a supported document", () => {
    const doc = emptyDocument();
    const s = id();
    doc.nodes[s] = node({ id: s, type: "section", pageId: PAGE_A, orderKey: "V" });
    expect(preflight(doc, registry, manifest())).toEqual([]);
  });

  it("blocks stored values whose capability the renderer lacks — never silently ignored", () => {
    const doc = emptyDocument();
    const h = id();
    doc.nodes[h] = node({ id: h, type: "legacy-section:hero", pageId: PAGE_A, orderKey: "V", interaction: { trigger: "hover" }, dataBinding: { source: "x" } });
    const issues = preflight(doc, registry, manifest(["interaction", "dataBinding"]));
    expect(issues.map((i) => i.code === "renderer-capability" && i.capability)).toEqual(["dataBinding", "interaction"]);
    expect(issues[0].message).toMatch(/data connections, which is not supported/);
  });

  it("blocks unknown types and versions newer than the editor", () => {
    const doc = emptyDocument();
    const v = id();
    const t = id();
    doc.nodes[v] = node({ id: v, type: "future-video", pageId: PAGE_A, orderKey: "F" });
    doc.nodes[t] = node({ id: t, type: "text", pageId: PAGE_A, orderKey: "V", typeVersion: 5, props: { text: "x" } });
    const codes = preflight(doc, registry, manifest()).map((i) => i.code).sort();
    expect(codes).toEqual(["unknown-type", "unsupported-version"]);
  });

  it("blocks a registered type the renderer cannot display", () => {
    const doc = emptyDocument();
    const t = id();
    doc.nodes[t] = node({ id: t, type: "text", pageId: PAGE_A, orderKey: "V", props: { text: "x" } });
    expect(preflight(doc, registry, manifest([], ["section"]))[0].code).toBe("renderer-node-type");
  });
});

describe("override application policy", () => {
  it("native primitives apply only overridable keys; inert keys are reported", () => {
    const n = node({ id: id(), type: "text", pageId: PAGE_A, orderKey: "V", props: { text: "a", color: "#000" }, overrides: { mobile: { text: "b", color: "#fff" } } });
    expect(resolveNode(n, "mobile", textDefinition)).toEqual({ text: "b", color: "#000" });
    expect(resolveProp(n, "mobile", "color", textDefinition)).toBe("#000");
    expect(inertOverrideKeys(n, textDefinition)).toEqual([{ device: "mobile", key: "color" }]);
  });

  it("legacy sections apply every stored key, as 3B does", () => {
    const def = registry.get("legacy-section:hero")!;
    const n = node({ id: id(), type: def.type, pageId: PAGE_A, orderKey: "V", props: { heading: "a", foo: 1 }, overrides: { tablet: { foo: 2 } } });
    expect(resolveNode(n, "tablet", def)).toEqual({ heading: "a", foo: 2 });
    expect(inertOverrideKeys(n, def)).toEqual([]);
  });

  it("Tablet and Phone each fall back to Desktop, never to each other", () => {
    const n = node({ id: id(), type: "text", pageId: PAGE_A, orderKey: "V", props: { text: "desktop" }, overrides: { mobile: { text: "phone" } } });
    expect(resolveProp(n, "tablet", "text", textDefinition)).toBe("desktop");
    expect(resolveProp(n, "mobile", "text", textDefinition)).toBe("phone");
  });
});

describe("migrations", () => {
  const v3: NodeTypeDefinition = {
    ...base,
    type: "card",
    version: 3,
    propsSchema: z.strictObject({ title: z.string(), tone: z.string().optional() }),
    properties: [],
    capabilities: new Set<Capability>(["text.edit"]),
    migrations: [
      { from: 2, to: 3, up: (p) => ({ ...(p as object), tone: "calm" }) },
      { from: 1, to: 2, up: (p) => { const { heading, ...rest } = p as Record<string, unknown>; return { ...rest, title: heading }; } },
    ],
  };
  const reg = createRegistry([v3]);
  const card = (typeVersion: number, props: Record<string, unknown>) => node({ id: id(), type: "card", pageId: PAGE_A, orderKey: "V", typeVersion, props });

  it("runs the chain n → n+1 in order and is idempotent at the target", () => {
    const n = card(1, { heading: "Hi" });
    const r = migrateNode(n, reg);
    expect(r.status).toBe("migrated");
    expect(r.node.props).toEqual({ title: "Hi", tone: "calm" });
    expect(r.node.typeVersion).toBe(3);
    const again = migrateNode(r.node, reg);
    expect(again.status).toBe("current");
    expect(again.node).toBe(r.node);
    expect(n.props).toEqual({ heading: "Hi" }); // input untouched
  });

  it("keeps nodes it cannot migrate verbatim and marks them unsupported", () => {
    const newer = card(4, { title: "x" });
    expect(migrateNode(newer, reg)).toMatchObject({ status: "unsupported", reason: "newer-version", node: newer });
    const unknown = node({ id: id(), type: "hologram", pageId: PAGE_A, orderKey: "V" });
    expect(migrateNode(unknown, reg)).toMatchObject({ status: "unsupported", reason: "unknown-type", node: unknown });
    const broken = createRegistry([{ ...v3, migrations: [v3.migrations[1], { from: 2, to: 3, up: () => { throw new Error("boom"); } }] }]);
    const failed = migrateNode(card(1, { heading: "x" }), broken);
    expect(failed).toMatchObject({ status: "unsupported", reason: "migration-failed" });
    expect(failed.status === "unsupported" && failed.message).toMatch(/boom/);
  });

  it("migrates a document in memory, leaving unsupported nodes as stored", () => {
    const doc = emptyDocument();
    const a = card(1, { heading: "A" });
    const b = node({ id: id(), type: "hologram", pageId: PAGE_A, orderKey: "k" });
    doc.nodes[a.id] = a;
    doc.nodes[b.id] = b;
    const result = migrateDocument(doc, reg);
    expect(result.migrated).toEqual([a.id]);
    expect(result.unsupported.map((u) => u.id)).toEqual([b.id]);
    expect(result.document.nodes[b.id]).toBe(b);
    expect(doc.nodes[a.id].typeVersion).toBe(1);
  });
});

it("CAPABILITIES matches the frozen vocabulary", () => {
  expect([...CAPABILITIES]).toEqual([
    "layout.flow", "layout.positioned", "nesting", "responsive.overrides", "text.edit", "media", "typography", "fill",
    "effects", "mask", "a11y", "links", "motion", "interaction", "component", "dataBinding",
  ]);
});
