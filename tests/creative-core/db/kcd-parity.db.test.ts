/**
 * 3C S4 gate — the database authority applies operations exactly as the core does.
 *
 * Seeded random transactions (1–4 ops of every kind: prop / override / a11y / visibility / lock
 * edits, moves across parents, inserts, subtree duplication, removal, restore of removed subtrees
 * with their SAME ids, device compositions) run through the TypeScript core (applyTransaction)
 * and through apply_node_ops on PostgreSQL. For every transaction:
 *   core accepts ⇔ database commits;  versions, removed ids and rebalanced parents identical;
 *   the document read back from the database == the core's resulting document.
 * Values are generated content-valid, so the only difference allowed by S4 decision 1 (content
 * validation in the API) never arises. Also records apply_node_ops latency baselines.
 */
import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  applyTransaction,
  duplicateSubtreeOp,
  keyBetween,
  type KcdDocument,
  type KcdNode,
  type NodeId,
  type Op,
  type PageId,
} from "@/lib/creative-core";
import { builderRegistry } from "@/lib/create/kcd-adapter";
import { asService, createKcdDb, dropKcdDb, SKIP_DB, type Db, type Row } from "./kcd-db";
import { applyAsOwner, applyAsService, readDocument, seedProject, tx, type ApplyResultSql } from "./kcd-fixtures";
import { applyOptions, rng, type Rng } from "../helpers";

const u4 = () => randomUUID() as NodeId;
const sortedKids = (doc: KcdDocument, pageId: string, parentId: string | null) =>
  Object.values(doc.nodes).filter((n) => n.pageId === pageId && n.parentId === parentId).sort((a, b) => (a.orderKey < b.orderKey ? -1 : a.orderKey > b.orderKey ? 1 : a.id < b.id ? -1 : 1));

function keyAt(doc: KcdDocument, pageId: string, parentId: string | null, r: Rng, exclude?: string): string {
  const kids = sortedKids(doc, pageId, parentId).filter((n) => n.id !== exclude);
  const i = r.int(kids.length + 1);
  return keyBetween(kids[i - 1]?.orderKey ?? null, kids[i]?.orderKey ?? null);
}

/** Every node of `id`'s subtree, parents first. */
function subtree(doc: KcdDocument, id: NodeId): KcdNode[] {
  const out: KcdNode[] = [];
  const visit = (n: KcdNode) => {
    out.push(n);
    for (const k of sortedKids(doc, n.pageId, n.id)) visit(k);
  };
  visit(doc.nodes[id]);
  return out;
}

function randomOp(doc: KcdDocument, r: Rng, removed: KcdNode[][]): Op {
  const nodes = Object.values(doc.nodes);
  const pageId = doc.pages[0].id;
  const groups = nodes.filter((n) => n.type === "group");
  const sections = nodes.filter((n) => n.type === "section");
  const leaves = nodes.filter((n) => n.type === "text" || n.type === "image");
  const legacy = nodes.filter((n) => n.type.startsWith("legacy-section:"));
  const pick = r.next();
  if (pick < 0.12 && groups.length) {
    const g = r.pick(groups);
    const text = r.chance(0.6);
    return { op: "insertNode", node: text ? { id: u4(), type: "text", typeVersion: 1, props: { text: `T${r.int(999)}`, variant: r.pick(["heading", "body"]) }, overrides: {} } : { id: u4(), type: "image", typeVersion: 1, props: { src: "/templates/a.jpg" }, overrides: {} }, parentId: g.id, pageId: g.pageId, orderKey: keyAt(doc, g.pageId, g.id, r) };
  }
  if (pick < 0.17) {
    const s = u4(), g = u4();
    return { op: "insertSubtree", nodes: [
      { id: s, type: "section", typeVersion: 1, pageId: pageId as PageId, parentId: null, orderKey: keyAt(doc, pageId, null, r), props: { paddingY: "md" }, overrides: {} },
      { id: g, type: "group", typeVersion: 1, pageId: pageId as PageId, parentId: s, orderKey: "V", props: { direction: "row" }, overrides: {} },
      { id: u4(), type: "text", typeVersion: 1, pageId: pageId as PageId, parentId: g, orderKey: "V", props: { text: "Fresh" }, overrides: {} },
    ] };
  }
  if (pick < 0.22 && sections.length) {
    const src = r.pick(sections);
    return duplicateSubtreeOp(doc, src.id, { parentId: null, orderKey: keyAt(doc, src.pageId, null, r) }, u4);
  }
  if (pick < 0.3 && nodes.length > 4) {
    const n = r.pick(nodes);
    return { op: "removeNode", id: n.id };
  }
  if (pick < 0.36 && removed.length) {
    const sub = removed[r.int(removed.length)];
    return { op: "restoreSubtree", nodes: sub };
  }
  if (pick < 0.46 && leaves.length && groups.length) {
    const n = r.pick(leaves);
    const g = r.pick(groups);
    return { op: "moveNode", id: n.id, parentId: g.id, orderKey: keyAt(doc, g.pageId, g.id, r, n.id) };
  }
  if (pick < 0.52) {
    const roots = sortedKids(doc, pageId, null);
    const n = r.pick(roots);
    return { op: "moveNode", id: n.id, parentId: null, orderKey: keyAt(doc, pageId, null, r, n.id) };
  }
  if (pick < 0.58) {
    const roots = sortedKids(doc, pageId, null).map((n) => n.id);
    const order = roots.filter(() => r.chance(0.6)).reverse();
    const hidden = roots.filter((id) => !order.includes(id) && r.chance(0.3));
    return { op: "setDeviceComposition", pageId: pageId as PageId, device: r.pick(["tablet", "mobile"] as const), composition: r.chance(0.2) ? null : { order, ...(hidden.length ? { hidden } : {}) } };
  }
  const n = r.pick(nodes);
  const which = r.int(7);
  if (which === 0) return { op: "setA11y", id: n.id, value: r.chance(0.3) ? null : n.type === "image" ? { alt: "An image" } : { label: "Region label", ...(n.type.startsWith("legacy") ? { landmark: "region" } : {}) } };
  if (which === 1 && n.type !== "section" && n.type !== "group") return { op: "setVisibility", id: n.id, value: r.chance(0.3) ? null : { hideOn: [r.pick(["mobile", "tablet"] as const)] } };
  if (which === 2) return { op: "setLocked", id: n.id, value: r.chance(0.3) ? null : r.chance(0.5) };
  const device = r.pick(["tablet", "mobile"] as const);
  if (n.type === "text") {
    if (which === 3) {
      const [key, value] = r.pick([["text", "Phone copy"], ["align", "center"], ["align", "end"], ["variant", "caption"]] as const);
      return { op: "setOverride", id: n.id, device, key, value };
    }
    if (which === 4) return { op: "clearOverride", id: n.id, device, ...(r.chance(0.5) ? { key: "text" } : {}) };
    return { op: "setProp", id: n.id, path: "text", value: `Edit ${r.int(1000)}` };
  }
  if (n.type === "image") return which === 3 ? { op: "setOverride", id: n.id, device, key: "fit", value: "contain" } : { op: "setProp", id: n.id, path: "fit", value: r.pick(["cover", "contain"]) };
  if (n.type === "group") return which === 3 ? { op: "setOverride", id: n.id, device, key: "direction", value: "column" } : { op: "setProp", id: n.id, path: "gap", value: r.pick(["sm", "md", "lg"]) };
  if (n.type === "section") return which === 3 ? { op: "setOverride", id: n.id, device, key: "paddingY", value: "lg" } : r.chance(0.5) ? { op: "unsetProp", id: n.id, path: "paddingY" } : { op: "setProp", id: n.id, path: "paddingY", value: "sm" };
  // Legacy hero / text sections.
  if (which === 3) return { op: "setOverride", id: n.id, device, key: "heading", value: "Phone heading" };
  if (which === 4) return { op: "clearOverride", id: n.id, device };
  void legacy;
  return { op: "setProp", id: n.id, path: "heading", value: `Heading ${r.int(1000)}` };
}

describe.skipIf(SKIP_DB)("apply_node_ops ≡ core applyTransaction [PostgreSQL / QA]", { timeout: 600_000 }, () => {
  let db: Db;
  beforeAll(async () => {
    db = await createKcdDb();
  }, 180_000);
  afterAll(async () => dropKcdDb(db), 60_000);

  it.each([1, 2, 3])("seed %i: 60 random transactions agree", async (seed) => {
    const r = rng(0x5400 + seed);
    const s = await seedProject(db.pool, { sections: 4, kcd: true });
    const removed: KcdNode[][] = [];
    let committed = 0;
    for (let i = 0; i < 60; i++) {
      const doc = await readDocument(db.pool, s.projectId);
      const ops = Array.from({ length: 1 + r.int(4) }, () => randomOp(doc, r, removed));
      const t = tx(doc, ops);
      const core = applyTransaction(doc, t, builderRegistry, applyOptions);
      const sql: ApplyResultSql = await applyAsOwner(db.pool, s.ownerId, s.projectId, t);
      const where = `seed ${seed} tx ${i}: ${JSON.stringify(ops.map((o) => o.op))} core=${core.ok ? "ok" : core.error.message} sql=${sql.status}:${sql.message ?? ""}`;
      expect(sql.status === "committed", where).toBe(core.ok);
      if (!core.ok) continue;
      committed++;
      expect(sql.versions, where).toEqual(core.versions);
      expect([...(sql.removed ?? [])].sort(), where).toEqual([...core.removed].sort());
      expect(sql.rebalanced ?? [], where).toEqual(core.rebalanced);
      const after = await readDocument(db.pool, s.projectId);
      expect(after, where).toEqual(core.document);
      // Keep removed subtrees (as recorded before removal) for later restores.
      for (const op of ops) if (op.op === "removeNode" && doc.nodes[op.id]) removed.push(subtree(doc, op.id));
      for (let k = removed.length - 1; k >= 0; k--) if (removed[k].some((n) => after.nodes[n.id])) removed.splice(k, 1);
    }
    expect(committed).toBeGreaterThan(30);
  });

  it("latency baselines at 100 / 500 / 2,000 elements (service role; median of 9)", async () => {
    const report: string[] = [];
    const results: Record<number, { setProp: number; move: number; dup: number }> = {};
    for (const size of [100, 500, 2000]) {
      const s = await seedProject(db.pool, { sections: 2, kcd: true });
      // Grow the page with native sections of 1 group + 8 texts until `size` elements.
      let doc = await readDocument(db.pool, s.projectId);
      while (Object.keys(doc.nodes).length < size) {
        const sec = u4(), g = u4();
        const nodes = [
          { id: sec, type: "section", typeVersion: 1, pageId: s.pageIds[0] as PageId, parentId: null, orderKey: keyAt(doc, s.pageIds[0], null, rng(1)), props: {}, overrides: {} },
          { id: g, type: "group", typeVersion: 1, pageId: s.pageIds[0] as PageId, parentId: sec, orderKey: "V", props: {}, overrides: {} },
          ...Array.from({ length: 8 }, (_, k) => ({ id: u4(), type: "text", typeVersion: 1, pageId: s.pageIds[0] as PageId, parentId: g, orderKey: "VWXYZabcd"[k] ?? "e", props: { text: `t${k}` }, overrides: {} })),
        ];
        await applyAsService(db.pool, s.projectId, tx(doc, [{ op: "insertSubtree", nodes } as Op]));
        doc = await readDocument(db.pool, s.projectId);
      }
      const text = Object.values(doc.nodes).find((n) => n.type === "text")!;
      // Server-side execution time of the call itself (EXPLAIN ANALYZE executes it), so network and
      // the document read are excluded.
      const time = async (makeOps: (d: KcdDocument) => Op[]) => {
        const samples: number[] = [];
        for (let i = 0; i < 9; i++) {
          const d = await readDocument(db.pool, s.projectId);
          const plan = await asService(db.pool, (c) =>
            c.query(`EXPLAIN (ANALYZE, FORMAT JSON) SELECT public.apply_node_ops($1, $2::jsonb)`, [s.projectId, JSON.stringify(tx(d, makeOps(d)))]),
          );
          samples.push((plan as { rows: Row[] }).rows[0]["QUERY PLAN"][0]["Execution Time"]);
        }
        return samples.sort((a, b) => a - b)[4];
      };
      const setProp = await time(() => [{ op: "setProp", id: text.id, path: "text", value: randomUUID() }]);
      const move = await time((d) => [{ op: "moveNode", id: text.id, parentId: text.parentId, orderKey: keyAt(d, text.pageId, text.parentId, rng(2), text.id) }]);
      const sectionId = Object.values(doc.nodes).find((n) => n.type === "section")!.id;
      const dup = await time((d) => [duplicateSubtreeOp(d, sectionId, { parentId: null, orderKey: keyAt(d, s.pageIds[0], null, rng(3)) }, u4)]);
      report.push(`[kcd-perf] apply_node_ops ${String(size).padStart(5)} elements (server): setProp ${setProp.toFixed(2)} ms · moveNode ${move.toFixed(2)} ms · duplicate 10-element subtree ${dup.toFixed(2)} ms`);
      results[size] = { setProp, move, dup };
    }
    if (process.env.KCD_PERF_REPORT) process.stdout.write(report.join("\n") + "\n");
    // Single-element edits must not grow with document size (no whole-document work, §15).
    for (const k of ["setProp", "move"] as const) {
      const exponent = Math.log(results[2000][k] / results[100][k]) / Math.log(20);
      expect(exponent, `${k}: ${JSON.stringify(results)}`).toBeLessThan(0.6);
    }
  });
});
