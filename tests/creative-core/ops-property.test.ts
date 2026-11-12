/**
 * S1 gate — property tests over seeded random transactions (1–6 ops each) on random documents
 * mixing pilot primitives and legacy sections:
 *
 *   apply ∘ inverse = identity (content)   Undo restores the exact pre-state
 *   inverse ∘ inverse = forward (content)  Redo restores the exact post-state
 *   stable identity                        surviving ids keep their type; unaddressed nodes are untouched
 *   invariants hold                        structure check + canonical serialization round trip
 */
import { describe, expect, it } from "vitest";
import {
  applyTransaction,
  checkStructure,
  duplicateSubtreeOp,
  expectFor,
  keyBetween,
  parseDocument,
  serializeDocument,
  type ApplyResult,
  type KcdDocument,
  type KcdNode,
  type NodeId,
  type Op,
  type PageId,
} from "@/lib/creative-core";
import { PAGE_A, PAGE_B, applyOptions, content, emptyDocument, registry, rng, uuidFor, type Rng } from "./helpers";

let idCounter = 0;
const freshId = () => uuidFor(++idCounter, 0x9e9) as NodeId;
let txCounter = 0;

function run(doc: KcdDocument, ops: Op[]): ApplyResult {
  return applyTransaction(doc, { txId: uuidFor(++txCounter, 0x7b), origin: "user", label: "p", ops, expect: expectFor(doc, ops) }, registry, applyOptions);
}

function siblingsOf(doc: KcdDocument, pageId: PageId, parentId: NodeId | null): KcdNode[] {
  return Object.values(doc.nodes)
    .filter((n) => n.pageId === pageId && n.parentId === parentId)
    .sort((a, b) => (a.orderKey < b.orderKey ? -1 : a.orderKey > b.orderKey ? 1 : 0));
}

function slotKey(r: Rng, doc: KcdDocument, pageId: PageId, parentId: NodeId | null): string {
  const sibs = siblingsOf(doc, pageId, parentId);
  const at = r.int(sibs.length + 1);
  return keyBetween(sibs[at - 1]?.orderKey ?? null, sibs[at]?.orderKey ?? null);
}

const TEXTS = ["Akwaaba", "Nanga def", "Bienvenue", "", "Jambo 🌍", "Shop now"];

function newPrimitive(r: Rng, type: "group" | "text" | "image"): Omit<KcdNode, "version" | "pageId" | "parentId" | "orderKey"> {
  const id = freshId();
  if (type === "text") return { id, type, typeVersion: 1, props: { text: r.pick(TEXTS), ...(r.chance(0.4) ? { variant: "heading" } : {}) }, overrides: {} };
  if (type === "image") return { id, type, typeVersion: 1, props: { src: "/img/a.jpg" }, overrides: {}, a11y: { alt: "Photo" } };
  return { id, type, typeVersion: 1, props: { direction: r.pick(["row", "column"]) }, overrides: {} };
}

function randomDocument(r: Rng): KcdDocument {
  let doc = emptyDocument([PAGE_A, PAGE_B]);
  for (let i = 0; i < 30; i++) {
    const op = randomOp(r, doc, true);
    if (!op) continue;
    const res = run(doc, [op]);
    if (res.ok) doc = res.document;
  }
  return doc;
}

/** One plausible op against `doc` (may still be invalid — invalid transactions are skipped). */
function randomOp(r: Rng, doc: KcdDocument, growOnly = false): Op | null {
  const all = Object.values(doc.nodes).sort((a, b) => (a.id < b.id ? -1 : 1));
  const containers = all.filter((n) => n.type === "section" || n.type === "group");
  const pageId = r.pick([PAGE_A, PAGE_B]);
  const kind = growOnly ? r.pick(["insertRoot", "insertChild", "insertChild"]) : r.pick([
    "insertRoot", "insertChild", "remove", "move", "move", "setProp", "unsetProp", "setOverride", "clearOverride",
    "composition", "a11y", "visibility", "lock", "duplicate",
  ]);
  const target = all.length ? r.pick(all) : null;
  switch (kind) {
    case "insertRoot": {
      if (r.chance(0.5)) {
        return { op: "insertNode", node: { id: freshId(), type: "section", typeVersion: 1, props: { paddingY: "md" }, overrides: {} }, parentId: null, pageId, orderKey: slotKey(r, doc, pageId, null) };
      }
      return {
        op: "insertNode",
        node: { id: freshId(), type: "legacy-section:hero", typeVersion: 1, props: { heading: r.pick(TEXTS.filter(Boolean)), align: "center" }, overrides: {} },
        parentId: null,
        pageId,
        orderKey: slotKey(r, doc, pageId, null),
      };
    }
    case "insertChild": {
      if (!containers.length) return null;
      const parent = r.pick(containers);
      return { op: "insertNode", node: newPrimitive(r, r.pick(["group", "text", "text", "image"] as const)), parentId: parent.id, pageId: parent.pageId, orderKey: slotKey(r, doc, parent.pageId, parent.id) };
    }
    case "remove":
      return target && { op: "removeNode", id: target.id };
    case "move": {
      if (!target) return null;
      if (target.parentId === null) return { op: "moveNode", id: target.id, parentId: null, orderKey: slotKey(r, doc, target.pageId, null) };
      const parents = containers.filter((c) => c.pageId === target.pageId);
      if (!parents.length) return null;
      const parent = r.pick(parents);
      return { op: "moveNode", id: target.id, parentId: parent.id, orderKey: slotKey(r, doc, parent.pageId, parent.id) };
    }
    case "setProp":
      if (!target) return null;
      if (target.type === "text") return { op: "setProp", id: target.id, path: r.pick(["text", "align"]), value: r.pick(["start", "center"]) };
      if (target.type === "image") return { op: "setProp", id: target.id, path: "fit", value: r.pick(["cover", "contain"]) };
      if (target.type === "section") return { op: "setProp", id: target.id, path: "paddingY", value: r.pick(["sm", "lg"]) };
      if (target.type === "group") return { op: "setProp", id: target.id, path: "wrap", value: r.chance(0.5) };
      return { op: "setProp", id: target.id, path: r.pick(["heading", "subheading"]), value: r.pick(TEXTS) };
    case "unsetProp":
      return target && { op: "unsetProp", id: target.id, path: r.pick(["variant", "paddingY", "align", "wrap", "subheading"]) };
    case "setOverride": {
      if (!target) return null;
      const device = r.pick(["tablet", "mobile"] as const);
      if (target.type === "text") return { op: "setOverride", id: target.id, device, key: r.pick(["text", "align"]), value: r.pick(["center", "end"]) };
      if (target.type === "legacy-section:hero") return { op: "setOverride", id: target.id, device, key: r.pick(["heading", "align"]), value: r.pick(["left", "center"]) };
      if (target.type === "group") return { op: "setOverride", id: target.id, device, key: "direction", value: "column" };
      return { op: "setOverride", id: target.id, device, key: "paddingY", value: "sm" };
    }
    case "clearOverride":
      return target && { op: "clearOverride", id: target.id, device: r.pick(["tablet", "mobile"] as const), ...(r.chance(0.5) ? { key: r.pick(["text", "align", "heading"]) } : {}) };
    case "composition": {
      const roots = siblingsOf(doc, pageId, null).map((n) => n.id);
      const shuffled = [...roots].sort(() => r.next() - 0.5);
      const order = shuffled.slice(0, r.int(shuffled.length + 1));
      const hidden = shuffled.filter((id) => !order.includes(id) && r.chance(0.3));
      return { op: "setDeviceComposition", pageId, device: r.pick(["tablet", "mobile"] as const), composition: r.chance(0.2) ? null : { order, hidden } };
    }
    case "a11y":
      if (!target) return null;
      if (target.type === "image") return { op: "setA11y", id: target.id, value: r.chance(0.5) ? { alt: "", decorative: true } : { alt: "A market in Dakar" } };
      return { op: "setA11y", id: target.id, value: r.chance(0.3) ? null : { label: "Area", role: "region" } };
    case "visibility":
      return target && { op: "setVisibility", id: target.id, value: r.pick([null, { hideOn: ["mobile"] }, { showOn: ["desktop"] }]) };
    case "lock":
      return target && { op: "setLocked", id: target.id, value: r.pick([true, false, null]) };
    case "duplicate": {
      if (!target) return null;
      return duplicateSubtreeOp(doc, target.id, { parentId: target.parentId, orderKey: slotKey(r, doc, target.pageId, target.parentId) }, freshId);
    }
  }
  return null;
}

/** 1–6 ops, each generated against the state left by the previous ones. */
function randomTransaction(r: Rng, doc: KcdDocument): Op[] {
  const ops: Op[] = [];
  let shadow = doc;
  const n = 1 + r.int(6);
  for (let i = 0; i < n; i++) {
    const op = randomOp(r, shadow);
    if (!op) continue;
    const res = run(shadow, [op]);
    if (!res.ok) continue;
    ops.push(op);
    shadow = res.document;
  }
  return ops;
}

describe("operation properties", () => {
  it("apply ∘ inverse = identity, redo = forward, ids stable, invariants hold", () => {
    const stats = { committed: 0, noops: 0, ops: {} as Record<string, number>, rebalanced: 0 };
    for (let seed = 1; seed <= 12; seed++) {
      const r = rng(seed * 7919);
      let doc = randomDocument(r);
      for (let t = 0; t < 60; t++) {
        const ops = randomTransaction(r, doc);
        if (!ops.length) continue;
        const fwd = run(doc, ops);
        if (!fwd.ok) throw new Error(`seed ${seed} tx ${t}: ${fwd.error.message}`); // generated sequentially, so must commit
        stats.committed++;
        for (const op of ops) stats.ops[op.op] = (stats.ops[op.op] ?? 0) + 1;
        if (fwd.rebalanced.length) stats.rebalanced++;

        // A transaction of no-ops has nothing to undo (history records no entry for it).
        if (!fwd.inverse.length) {
          expect(content(fwd.document)).toEqual(content(doc));
          stats.noops++;
          continue;
        }

        // Undo
        const back = run(fwd.document, fwd.inverse);
        if (!back.ok) throw new Error(`seed ${seed} tx ${t} undo: ${back.error.message}`);
        expect(content(back.document), `seed ${seed} tx ${t} undo`).toEqual(content(doc));

        // Redo
        const again = run(back.document, back.inverse);
        if (!again.ok) throw new Error(`seed ${seed} tx ${t} redo: ${again.error.message}`);
        expect(content(again.document), `seed ${seed} tx ${t} redo`).toEqual(content(fwd.document));

        // Identity: survivors keep type; nodes no op addressed are the same object.
        const addressed = new Set(ops.flatMap((o) => ("id" in o ? [o.id] : [])));
        for (const [id, before] of Object.entries(doc.nodes)) {
          const after = fwd.document.nodes[id as NodeId];
          if (!after) {
            expect(fwd.removed).toContain(id);
            continue;
          }
          expect(after.type).toBe(before.type);
          if (!addressed.has(id as NodeId) && !fwd.rebalanced.length && !fwd.removed.length) expect(after).toBe(before);
        }

        // Invariants
        expect(checkStructure(fwd.document)).toEqual([]);
        const parsed = parseDocument(serializeDocument(fwd.document));
        expect(parsed.ok && content(parsed.document)).toEqual(content(fwd.document));

        doc = fwd.document;
      }
    }
    expect(stats.committed).toBeGreaterThan(500);
    for (const name of ["insertNode", "insertSubtree", "removeNode", "moveNode", "setProp", "unsetProp", "setOverride", "clearOverride", "setDeviceComposition", "setA11y", "setVisibility", "setLocked"]) {
      expect(stats.ops[name] ?? 0, name).toBeGreaterThan(20);
    }
  }, 60_000);

  it("every stored version only ever increases", () => {
    const r = rng(99);
    let doc = randomDocument(r);
    const seen = new Map<string, number>();
    for (let t = 0; t < 200; t++) {
      const ops = randomTransaction(r, doc);
      if (!ops.length) continue;
      const res = run(doc, ops);
      if (!res.ok) throw new Error(res.error.message);
      for (const [id, v] of Object.entries(res.versions)) {
        const prev = seen.get(id);
        if (prev !== undefined) expect(v).toBeGreaterThan(prev);
        seen.set(id, v);
      }
      doc = res.document;
    }
  });
});
