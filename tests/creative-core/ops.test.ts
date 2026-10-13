/**
 * S1 gate — operations: invariants (tree, identity, ordering, props, versions), atomicity,
 * conflicts, limits, legacy 3B boundary, unsupported nodes, rebalance, inversion.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  PILOT_DEFINITIONS,
  REBALANCE_KEY_LENGTH,
  TX_LIMITS,
  applyTransaction,
  children,
  createRegistry,
  duplicateSubtreeOp,
  evenlySpacedKeys,
  expectFor,
  keyBetween,
  roots,
  type ApplyResult,
  type KcdDocument,
  type NodeId,
  type Op,
  type Registry,
} from "@/lib/creative-core";
import { PAGE_A, PAGE_B, applyOptions, content, emptyDocument, idSource, node, registry, uuidFor } from "./helpers";

const newId = idSource(0x0b5);
let txCounter = 0;

function tx(doc: KcdDocument, ops: Op[], expect = expectFor(doc, ops)) {
  return { txId: uuidFor(++txCounter, 0x7a), origin: "user" as const, label: "test", ops, expect };
}

function apply(doc: KcdDocument, ops: Op[], reg: Registry = registry): ApplyResult {
  return applyTransaction(doc, tx(doc, ops), reg, applyOptions);
}

function ok(result: ApplyResult) {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result;
}

function fail(result: ApplyResult, pattern: RegExp, code = "KCD_INVALID") {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.code).toBe(code);
  expect(result.error.message).toMatch(pattern);
}

/** Undo: apply the inverse against the resulting document. */
function undo(result: Extract<ApplyResult, { ok: true }>) {
  return ok(apply(result.document, result.inverse));
}

/** Page A: hero (legacy) · section > group > [text, image] */
function fixture() {
  const doc = emptyDocument([PAGE_A, PAGE_B]);
  const ids = { hero: newId(), section: newId(), group: newId(), text: newId(), image: newId() };
  doc.nodes[ids.hero] = node({ id: ids.hero, type: "legacy-section:hero", pageId: PAGE_A, orderKey: "F", props: { heading: "Welcome", subheading: "", align: "center" } });
  doc.nodes[ids.section] = node({ id: ids.section, type: "section", pageId: PAGE_A, orderKey: "V", props: { paddingY: "md" } });
  doc.nodes[ids.group] = node({ id: ids.group, type: "group", pageId: PAGE_A, parentId: ids.section, orderKey: "V", props: { direction: "row" } });
  doc.nodes[ids.text] = node({ id: ids.text, type: "text", pageId: PAGE_A, parentId: ids.group, orderKey: "F", props: { text: "Hello" } });
  doc.nodes[ids.image] = node({ id: ids.image, type: "image", pageId: PAGE_A, parentId: ids.group, orderKey: "V", props: { src: "/a.jpg" }, a11y: { alt: "A" } });
  return { doc, ids };
}

const textNode = (id: NodeId, text = "New") => ({ id, type: "text", typeVersion: 1, props: { text }, overrides: {} });

describe("insertNode", () => {
  it("inserts at version 1 and inverts to removeNode", () => {
    const { doc, ids } = fixture();
    const t = newId();
    const r = ok(apply(doc, [{ op: "insertNode", node: textNode(t), parentId: ids.group, pageId: PAGE_A, orderKey: "k" }]));
    expect(r.document.nodes[t]).toMatchObject({ version: 1, parentId: ids.group, orderKey: "k" });
    expect(r.versions).toEqual({ [t]: 1 });
    expect(r.inverse).toEqual([{ op: "removeNode", id: t }]);
    expect(children(r.document, ids.group).map((n) => n.id)).toEqual([ids.text, ids.image, t]);
    expect(doc.nodes[t]).toBeUndefined(); // input untouched
    expect(content(undo(r).document)).toEqual(content(doc));
  });

  it.each([
    ["text at page root", () => ({ parentId: null, node: textNode(newId()) }), /inside another element/],
    ["section nested", (ids: Record<string, NodeId>) => ({ parentId: ids.group, node: { ...textNode(newId()), type: "section", props: {} } }), /top level/],
    ["legacy section nested", (ids: Record<string, NodeId>) => ({ parentId: ids.section, node: { ...textNode(newId()), type: "legacy-section:faq", props: { heading: "Q" } } }), /top level/],
    ["child of a text", (ids: Record<string, NodeId>) => ({ parentId: ids.text, node: textNode(newId()) }), /cannot contain/],
    ["child of a legacy section", (ids: Record<string, NodeId>) => ({ parentId: ids.hero, node: textNode(newId()) }), /top level|cannot contain/],
    ["unknown prop on a primitive", (ids: Record<string, NodeId>) => ({ parentId: ids.group, node: { ...textNode(newId()), props: { text: "x", arbitraryCss: "position:fixed" } } }), /Unrecognized key|arbitraryCss/],
    ["missing required prop", (ids: Record<string, NodeId>) => ({ parentId: ids.group, node: { ...textNode(newId()), props: {} } }), /text/],
    ["unsafe content", (ids: Record<string, NodeId>) => ({ parentId: ids.group, node: textNode(newId(), "<script>alert(1)</script>") }), /blocked for security/],
    ["non-v4 id", (ids: Record<string, NodeId>) => ({ parentId: ids.group, node: textNode("aaaaaaaa-aaaa-1aaa-8aaa-aaaaaaaaaaaa" as NodeId) }), /UUID v4/],
    ["an id already in use", (ids: Record<string, NodeId>) => ({ parentId: ids.group, node: textNode(ids.image) }), /already in use/],
    ["an unknown type", (ids: Record<string, NodeId>) => ({ parentId: ids.group, node: { ...textNode(newId()), type: "future-video" } }), /Unknown element type/],
    ["a stale typeVersion", (ids: Record<string, NodeId>) => ({ parentId: ids.group, node: { ...textNode(newId()), typeVersion: 2 } }), /version 1/],
    ["a reserved prop key", (ids: Record<string, NodeId>) => ({ parentId: ids.group, node: { ...textNode(newId()), props: { text: "x", _motion: {} } } }), /Invalid prop key/],
    ["a non-overridable override", (ids: Record<string, NodeId>) => ({ parentId: ids.group, node: { ...textNode(newId()), overrides: { mobile: { color: "#fff" } } } }), /cannot be set per device/],
    ["incomplete motion on a primitive", (ids: Record<string, NodeId>) => ({ parentId: ids.group, node: { ...textNode(newId()), motion: { preset: "fade" } } }), /Invalid motion/],
  ])("rejects %s", (_name, make, pattern) => {
    const { doc, ids } = fixture();
    const { parentId, node: n } = make(ids);
    fail(apply(doc, [{ op: "insertNode", node: n as never, parentId, pageId: PAGE_A, orderKey: "z" }]), pattern);
  });

  it("rejects a sibling position already taken (checked when the transaction completes)", () => {
    const { doc, ids } = fixture();
    fail(apply(doc, [{ op: "insertNode", node: textNode(newId()), parentId: ids.group, pageId: PAGE_A, orderKey: "F" }]), /share the position/);
  });

  it("enforces the parent's child limit", () => {
    const { doc, ids } = fixture();
    const ops: Op[] = [];
    let key: string | null = "V";
    for (let i = 0; i < 49; i++) ops.push({ op: "insertNode", node: textNode(newId()), parentId: ids.group, pageId: PAGE_A, orderKey: (key = keyBetween(key, null)) });
    fail(apply(doc, ops), /at most 50/);
    expect(apply(doc, ops.slice(0, 48)).ok).toBe(true);
  });
});

describe("identity", () => {
  it("ids survive move, reparent, reorder and device edits", () => {
    const { doc, ids } = fixture();
    const g2 = newId();
    const r = ok(apply(doc, [
      { op: "insertNode", node: { id: g2, type: "group", typeVersion: 1, props: {}, overrides: {} }, parentId: ids.section, pageId: PAGE_A, orderKey: "k" },
      { op: "moveNode", id: ids.text, parentId: g2, orderKey: "V" },
      { op: "moveNode", id: ids.image, parentId: ids.group, orderKey: "A" },
      { op: "setOverride", id: ids.text, device: "mobile", key: "text", value: "Hi" },
      { op: "moveNode", id: ids.section, parentId: null, orderKey: "B" },
    ]));
    for (const id of Object.values(ids)) expect(r.document.nodes[id].id).toBe(id);
    expect(r.document.nodes[ids.text]).toMatchObject({ parentId: g2, type: "text", props: { text: "Hello" }, overrides: { mobile: { text: "Hi" } } });
    expect(roots(r.document, PAGE_A).map((n) => n.id)).toEqual([ids.section, ids.hero]);
    expect(content(undo(r).document)).toEqual(content(doc));
  });

  it("duplicate creates new ids for the whole subtree and preserves content and order", () => {
    const { doc, ids } = fixture();
    const op = duplicateSubtreeOp(doc, ids.group, { parentId: ids.section, orderKey: "k" }, newId);
    const r = ok(apply(doc, [op]));
    const copies = op.nodes.map((n) => n.id);
    expect(copies).toHaveLength(3);
    for (const id of copies) expect(Object.values(ids)).not.toContain(id);
    const copyGroup = r.document.nodes[copies[0]];
    expect(copyGroup).toMatchObject({ type: "group", parentId: ids.section, props: { direction: "row" } });
    expect(children(r.document, copyGroup.id).map((n) => n.props)).toEqual([{ text: "Hello" }, { src: "/a.jpg" }]);
    expect(children(r.document, ids.group).map((n) => n.id)).toEqual([ids.text, ids.image]); // original untouched
    expect(r.inverse).toEqual([{ op: "removeNode", id: copies[0] }]);
    expect(content(undo(r).document)).toEqual(content(doc));
  });

  it("insertSubtree requires parents before children", () => {
    const { doc, ids } = fixture();
    const op = duplicateSubtreeOp(doc, ids.group, { parentId: ids.section, orderKey: "k" }, newId);
    fail(apply(doc, [{ op: "insertSubtree", nodes: [...op.nodes].reverse() }]), /parents before/);
  });
});

describe("remove and restore", () => {
  it("removes a whole subtree and Undo restores the SAME ids", () => {
    const { doc, ids } = fixture();
    const r = ok(apply(doc, [{ op: "removeNode", id: ids.section }]));
    expect(Object.keys(r.document.nodes)).toEqual([ids.hero]);
    expect(r.removed).toEqual([ids.section, ids.group, ids.text, ids.image].sort());
    const restored = undo(r);
    expect(content(restored.document)).toEqual(content(doc));
    // Restored rows come back one version above what was recorded.
    expect(restored.versions).toEqual({ [ids.section]: 2, [ids.group]: 2, [ids.text]: 2, [ids.image]: 2 });
  });

  it("refuses to restore over an existing id", () => {
    const { doc, ids } = fixture();
    fail(apply(doc, [{ op: "restoreSubtree", nodes: [doc.nodes[ids.text]] }]), /already exists/);
  });

  it("refuses to reuse a removed id for a new element in the same transaction", () => {
    const { doc, ids } = fixture();
    fail(apply(doc, [{ op: "removeNode", id: ids.text }, { op: "insertNode", node: textNode(ids.text), parentId: ids.group, pageId: PAGE_A, orderKey: "z" }]), /already in use/);
  });

  it("remove then restore inside one transaction is a net content no-op with one version bump", () => {
    const { doc, ids } = fixture();
    const sub = [doc.nodes[ids.group], doc.nodes[ids.text], doc.nodes[ids.image]];
    const r = ok(apply(doc, [{ op: "removeNode", id: ids.group }, { op: "restoreSubtree", nodes: sub }]));
    expect(content(r.document)).toEqual(content(doc));
    expect(r.removed).toEqual([]);
    expect(r.versions).toEqual({ [ids.group]: 2, [ids.text]: 2, [ids.image]: 2 });
  });
});

describe("moveNode", () => {
  it("rejects moving an element inside itself or its descendants", () => {
    const { doc, ids } = fixture();
    fail(apply(doc, [{ op: "moveNode", id: ids.group, parentId: ids.group, orderKey: "z" }]), /inside itself/);
    const inner = newId();
    const withInner = ok(apply(doc, [{ op: "insertNode", node: { id: inner, type: "group", typeVersion: 1, props: {}, overrides: {} }, parentId: ids.group, pageId: PAGE_A, orderKey: "z" }])).document;
    fail(apply(withInner, [{ op: "moveNode", id: ids.group, parentId: inner, orderKey: "z" }]), /inside itself/);
  });

  it("rejects a parent on another page and an invalid key", () => {
    const { doc, ids } = fixture();
    const other = newId();
    const d2 = ok(apply(doc, [{ op: "insertNode", node: { id: other, type: "section", typeVersion: 1, props: {}, overrides: {} }, parentId: null, pageId: PAGE_B, orderKey: "V" }])).document;
    fail(apply(d2, [{ op: "moveNode", id: ids.text, parentId: other, orderKey: "V" }]), /same page/);
    fail(apply(doc, [{ op: "moveNode", id: ids.text, parentId: ids.group, orderKey: "V0" }]), /Invalid order key/);
  });

  it("a move to the same place is a no-op without a version bump", () => {
    const { doc, ids } = fixture();
    const r = ok(apply(doc, [{ op: "moveNode", id: ids.text, parentId: ids.group, orderKey: "F" }]));
    expect(r.versions).toEqual({});
    expect(r.inverse).toEqual([]);
  });

  it("swapping two siblings through a transient collision is allowed", () => {
    const { doc, ids } = fixture();
    const r = ok(apply(doc, [
      { op: "moveNode", id: ids.text, parentId: ids.group, orderKey: "V" },
      { op: "moveNode", id: ids.image, parentId: ids.group, orderKey: "F" },
    ]));
    expect(children(r.document, ids.group).map((n) => n.id)).toEqual([ids.image, ids.text]);
  });
});

describe("props and overrides", () => {
  it("setProp validates the resulting node and inverts to the old value", () => {
    const { doc, ids } = fixture();
    const r = ok(apply(doc, [{ op: "setProp", id: ids.text, path: "text", value: "  Bonjour" }]));
    expect(r.document.nodes[ids.text].props.text).toBe("  Bonjour");
    expect(r.inverse).toEqual([{ op: "setProp", id: ids.text, path: "text", value: "Hello" }]);
    fail(apply(doc, [{ op: "setProp", id: ids.text, path: "variant", value: "shout" }]), /variant/);
    fail(apply(doc, [{ op: "setProp", id: ids.text, path: "fontSize", value: 3 }]), /Unrecognized key|fontSize/);
  });

  it("setProp on an absent prop inverts to unsetProp; nested paths unset at the first created segment", () => {
    const { doc, ids } = fixture();
    const r = ok(apply(doc, [{ op: "setProp", id: ids.hero, path: "variant", value: "split" }]));
    expect(r.inverse).toEqual([{ op: "unsetProp", id: ids.hero, path: "variant" }]);
    expect(content(undo(r).document)).toEqual(content(doc));
  });

  it.each([
    ["an empty path", "", /required/],
    ["an empty segment", "a..b", /Invalid property path/],
    ["a prototype segment", "a.__proto__", /Forbidden/],
    ["a reserved storage key", "deviceOverrides.mobile", /dedicated operation/],
    ["an extension key", "_motion", /dedicated operation/],
    ["a path deeper than the limit", "a.b.c.d.e.f.g.h.i", /too deep/],
  ])("rejects setProp with %s", (_name, path, pattern) => {
    const { doc, ids } = fixture();
    const r = apply(doc, [{ op: "setProp", id: ids.hero, path, value: 1 }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toMatch(pattern);
  });

  it("setProp rejects undefined and non-JSON values; unsafe content is blocked", () => {
    const { doc, ids } = fixture();
    fail(apply(doc, [{ op: "setProp", id: ids.text, path: "text", value: undefined }]), /unsetProp/);
    fail(apply(doc, [{ op: "setProp", id: ids.hero, path: "heading", value: new Date() as unknown }]), /Non-plain/);
    fail(apply(doc, [{ op: "setProp", id: ids.text, path: "href", value: "javascript:alert(1)" }]), /blocked for security|Invalid link/);
  });

  it("unsetProp of an absent prop is a no-op", () => {
    const { doc, ids } = fixture();
    const r = ok(apply(doc, [{ op: "unsetProp", id: ids.text, path: "variant" }]));
    expect(r.inverse).toEqual([]);
    expect(r.versions).toEqual({});
  });

  it("setOverride only for overridable keys; clearOverride(key) and Reset (no key) invert", () => {
    const { doc, ids } = fixture();
    fail(apply(doc, [{ op: "setOverride", id: ids.text, device: "mobile", key: "href", value: "/x" }]), /cannot be set per device/);
    fail(apply(doc, [{ op: "setOverride", id: ids.text, device: "desktop" as never, key: "text", value: "x" }]), /Unknown device/);
    const set = ok(apply(doc, [
      { op: "setOverride", id: ids.text, device: "mobile", key: "text", value: "Phone" },
      { op: "setOverride", id: ids.text, device: "mobile", key: "align", value: "center" },
      { op: "setOverride", id: ids.text, device: "tablet", key: "text", value: "Tab" },
    ]));
    expect(set.document.nodes[ids.text].overrides).toEqual({ mobile: { text: "Phone", align: "center" }, tablet: { text: "Tab" } });
    expect(set.versions[ids.text]).toBe(2); // several ops, one bump
    const reset = ok(apply(set.document, [{ op: "clearOverride", id: ids.text, device: "mobile" }]));
    expect(reset.document.nodes[ids.text].overrides).toEqual({ tablet: { text: "Tab" } });
    expect(content(undo(reset).document)).toEqual(content(set.document));
    const one = ok(apply(set.document, [{ op: "clearOverride", id: ids.text, device: "tablet", key: "text" }]));
    expect(one.document.nodes[ids.text].overrides).toEqual({ mobile: { text: "Phone", align: "center" } });
    expect(content(undo(set).document)).toEqual(content(doc));
  });

  it("validates each device's merged props", () => {
    const { doc, ids } = fixture();
    fail(apply(doc, [{ op: "setOverride", id: ids.text, device: "mobile", key: "variant", value: "huge" }]), /mobile/);
  });
});

describe("legacy sections keep the 3B save boundary", () => {
  it("accepts valid edits and device overrides of DEVICE_OVERRIDE_KEYS", () => {
    const { doc, ids } = fixture();
    const r = ok(apply(doc, [
      { op: "setProp", id: ids.hero, path: "heading", value: "Akwaaba" },
      { op: "setOverride", id: ids.hero, device: "mobile", key: "align", value: "left" },
    ]));
    expect(r.document.nodes[ids.hero].overrides.mobile).toEqual({ align: "left" });
  });

  it("rejects what 3B rejects (schema-invalid and unsafe content)", () => {
    const { doc, ids } = fixture();
    fail(apply(doc, [{ op: "setProp", id: ids.hero, path: "heading", value: 42 }]), /Invalid props/);
    fail(apply(doc, [{ op: "setProp", id: ids.hero, path: "heading", value: "<iframe src=x>" }]), /blocked for security/);
    fail(apply(doc, [{ op: "setOverride", id: ids.hero, device: "tablet", key: "brand", value: "x" }]), /cannot be set per device/);
  });

  it("keeps a key the 3B boundary would strip (the core never strips; stripping is the persistence boundary's)", () => {
    const { doc, ids } = fixture();
    const r = ok(apply(doc, [{ op: "setProp", id: ids.hero, path: "futureField", value: 1 }]));
    expect(r.document.nodes[ids.hero].props.futureField).toBe(1);
  });
});

describe("page composition, a11y, visibility, lock", () => {
  it("setDeviceComposition bumps layoutVersion and inverts", () => {
    const { doc, ids } = fixture();
    const r = ok(apply(doc, [{ op: "setDeviceComposition", pageId: PAGE_A, device: "mobile", composition: { order: [ids.section, ids.hero] } }]));
    expect(r.document.pages[0].deviceLayout.mobile).toEqual({ order: [ids.section, ids.hero] });
    expect(r.versions).toEqual({ [PAGE_A]: 2 });
    expect(content(undo(r).document)).toEqual(content(doc));
    fail(apply(doc, [{ op: "setDeviceComposition", pageId: PAGE_A, device: "mobile", composition: { order: [ids.hero], hidden: [ids.hero] } }]), /both ordered and hidden/);
  });

  it("setA11y / setVisibility / setLocked validate, clear with null, and invert", () => {
    const { doc, ids } = fixture();
    const r = ok(apply(doc, [
      { op: "setA11y", id: ids.image, value: { alt: "", decorative: true } },
      { op: "setVisibility", id: ids.group, value: { hideOn: ["mobile"] } },
      { op: "setLocked", id: ids.section, value: true },
      { op: "setA11y", id: ids.hero, value: { landmark: "region", label: "Welcome" } },
    ]));
    expect(r.document.nodes[ids.image].a11y).toEqual({ alt: "", decorative: true });
    expect(r.document.nodes[ids.section].locked).toBe(true);
    expect(content(undo(r).document)).toEqual(content(doc));
    const cleared = ok(apply(r.document, [{ op: "setVisibility", id: ids.group, value: null }]));
    expect(cleared.document.nodes[ids.group].visibility).toBeUndefined();
    fail(apply(doc, [{ op: "setA11y", id: ids.hero, value: { landmark: "region" } }]), /label is required/);
    fail(apply(doc, [{ op: "setVisibility", id: ids.hero, value: { hideOn: ["desktop", "tablet", "mobile"] } }]), /everywhere/);
    fail(apply(doc, [{ op: "setLocked", id: ids.hero, value: "yes" }]), /true or false/);
  });
});

describe("versions and conflicts", () => {
  it("rejects a stale expected version with KCD_CONFLICT listing every conflict", () => {
    const { doc, ids } = fixture();
    const ops: Op[] = [{ op: "setProp", id: ids.text, path: "text", value: "x" }, { op: "setDeviceComposition", pageId: PAGE_A, device: "tablet", composition: null }];
    const r = applyTransaction(doc, tx(doc, ops, { [ids.text]: 3, [PAGE_A]: 1 }), registry, applyOptions);
    expect(r).toEqual({ ok: false, error: { code: "KCD_CONFLICT", message: expect.stringMatching(/Changed elsewhere/), conflicts: [{ id: ids.text, expected: 3, actual: 1 }] } });
  });

  it("requires an expected version for every existing element addressed", () => {
    const { doc, ids } = fixture();
    const r = applyTransaction(doc, tx(doc, [{ op: "setProp", id: ids.text, path: "text", value: "x" }], {}), registry, applyOptions);
    fail(r, /Missing expected version/);
  });

  it("is atomic: a failing op leaves nothing applied", () => {
    const { doc, ids } = fixture();
    const before = JSON.stringify(doc);
    const r = apply(doc, [{ op: "setProp", id: ids.text, path: "text", value: "ok" }, { op: "removeNode", id: newId() }]);
    expect(r).toMatchObject({ ok: false, error: { code: "KCD_INVALID", opIndex: 1 } });
    expect(JSON.stringify(doc)).toBe(before);
  });

  it("bumps each touched element once and leaves untouched ones alone", () => {
    const { doc, ids } = fixture();
    const r = ok(apply(doc, [
      { op: "setProp", id: ids.text, path: "text", value: "a" },
      { op: "setProp", id: ids.text, path: "text", value: "b" },
      { op: "moveNode", id: ids.image, parentId: ids.group, orderKey: "A" },
    ]));
    expect(r.versions).toEqual({ [ids.text]: 2, [ids.image]: 2 });
    expect(r.document.nodes[ids.group].version).toBe(1);
    expect(r.document.nodes[ids.hero]).toBe(doc.nodes[ids.hero]); // structural sharing
  });
});

describe("limits and transaction shape", () => {
  it("rejects more than the op limit", () => {
    const { doc, ids } = fixture();
    const ops: Op[] = Array.from({ length: TX_LIMITS.maxOps + 1 }, () => ({ op: "setLocked", id: ids.text, value: true }));
    fail(apply(doc, ops), /Too many operations/, "KCD_LIMIT");
  });

  it("rejects an element larger than the per-node limit", () => {
    const blobRegistry = createRegistry([
      {
        type: "blob",
        version: 1,
        displayName: "Blob",
        capabilities: new Set(),
        propsSchema: z.strictObject({ data: z.string() }),
        writePolicy: "reject-unknown",
        properties: [],
        children: "none",
        placement: "any",
        migrations: [],
      },
    ]);
    const doc = emptyDocument();
    const b = newId();
    doc.nodes[b] = node({ id: b, type: "blob", pageId: PAGE_A, orderKey: "V", props: { data: "" } });
    fail(apply(doc, [{ op: "setProp", id: b, path: "data", value: "x".repeat(TX_LIMITS.maxNodeBytes) }], blobRegistry), /too large/, "KCD_LIMIT");
    expect(apply(doc, [{ op: "setProp", id: b, path: "data", value: "x".repeat(TX_LIMITS.maxNodeBytes - 100) }], blobRegistry).ok).toBe(true);
  });

  it("rejects malformed transactions", () => {
    const { doc, ids } = fixture();
    const good = tx(doc, [{ op: "setLocked", id: ids.text, value: true }]);
    for (const [bad, pattern] of [
      [{ ...good, txId: "nope" }, /txId/],
      [{ ...good, origin: "robot" }, /origin/],
      [{ ...good, ops: [] }, /at least one/],
      [{ ...good, ops: [{ op: "toString" }] }, /Unknown operation/],
      [{ ...good, expect: { [ids.text]: 0 } }, /expected version/],
    ] as const) {
      const r = applyTransaction(doc, bad as never, registry);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.message).toMatch(pattern);
    }
  });
});

describe("unsupported nodes", () => {
  it("cannot be edited or moved, can be explicitly removed, and restore verbatim", () => {
    const { doc } = fixture();
    const v = newId();
    doc.nodes[v] = node({ id: v, type: "future-video", typeVersion: 3, pageId: PAGE_A, orderKey: "z", props: { src: "x", loop: true }, unknown: { future: 1 } });
    fail(apply(doc, [{ op: "setProp", id: v, path: "src", value: "y" }]), /unsupported type "future-video"/);
    fail(apply(doc, [{ op: "moveNode", id: v, parentId: null, orderKey: "A" }]), /can only be removed/);
    const removed = ok(apply(doc, [{ op: "removeNode", id: v }]));
    const back = undo(removed);
    expect(content(back.document)).toEqual(content(doc));
  });

  it("an out-of-date node is migrated on its next write", () => {
    const v2 = createRegistry([
      ...PILOT_DEFINITIONS.filter((d) => d.type !== "text"),
      {
        ...PILOT_DEFINITIONS.find((d) => d.type === "text")!,
        version: 2,
        propsSchema: z.strictObject({ text: z.string(), variant: z.string().optional() }),
        properties: [],
        migrations: [{ from: 1, to: 2, up: (p) => ({ ...(p as object), variant: "body" }) }],
      },
    ]);
    const { doc, ids } = fixture();
    const r = ok(apply(doc, [{ op: "setProp", id: ids.text, path: "text", value: "x" }], v2));
    expect(r.document.nodes[ids.text]).toMatchObject({ typeVersion: 2, props: { text: "x", variant: "body" } });
  });
});

describe("rebalance", () => {
  it("rebalances a parent whose keys grow too long — order and identity unchanged, versions bumped, undo keeps order", () => {
    const { doc, ids } = fixture();
    const a = newId();
    const b = newId();
    let d = ok(apply(doc, [
      { op: "insertNode", node: textNode(a, "first"), parentId: ids.group, pageId: PAGE_A, orderKey: "1" },
      { op: "insertNode", node: textNode(b, "last"), parentId: ids.group, pageId: PAGE_A, orderKey: "k" },
    ])).document;
    const order = [a, ids.text, ids.image, b];
    // Nudge "text" ever closer to "image": each move lengthens its key until rebalance.
    let r: Extract<ApplyResult, { ok: true }> | null = null;
    for (let i = 0; i < 400; i++) {
      const key = keyBetween(d.nodes[ids.text].orderKey, d.nodes[ids.image].orderKey);
      const step = ok(apply(d, [{ op: "moveNode", id: ids.text, parentId: ids.group, orderKey: key }]));
      expect(children(step.document, ids.group).map((n) => n.id)).toEqual(order);
      expect(step.rebalanced.length > 0).toBe(key.length > REBALANCE_KEY_LENGTH);
      if (step.rebalanced.length) {
        r = step;
        break;
      }
      d = step.document;
    }
    expect(r).not.toBeNull();
    expect(r!.rebalanced).toEqual([ids.group]);
    const kids = children(r!.document, ids.group);
    expect(kids.map((n) => n.id)).toEqual(order);
    expect(kids.map((n) => n.orderKey)).toEqual(evenlySpacedKeys(4));
    // Every sibling whose key changed got exactly one version bump.
    for (const n of kids) {
      if (n.orderKey !== d.nodes[n.id].orderKey) expect(r!.versions[n.id]).toBe(d.nodes[n.id].version + 1);
    }
    // Other parents untouched.
    expect(r!.document.nodes[ids.hero]).toBe(d.nodes[ids.hero]);
    const undone = undo(r!);
    expect(children(undone.document, ids.group).map((n) => n.id)).toEqual(order);
  });
});
