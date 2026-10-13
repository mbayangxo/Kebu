/**
 * 3C S4 gate — apply_node_ops, the KCD database authority (disposable database on the QA cluster).
 *
 *   authorization   owner / service role / stranger / anon / missing project / not opted in
 *   atomicity       a failing op anywhere rolls back every write of the transaction
 *   concurrency     stale versions conflict (409 shape) instead of overwriting — also after 3B writes
 *   idempotency     a committed txId never applies twice (sequential and concurrent replays)
 *   cross-project   nodes/pages/parents of another project are never reachable
 *   identity        restore brings back the SAME ids at recorded version + 1; ids are never reused
 *   ordering        rebalance inside the transaction preserves ids and order
 *   limits          ops, path depth, label, node and transaction size
 *   journal         minimal; committed/rejected/conflicted rows only for authorized callers
 */
import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { evenlySpacedKeys, keyBetween, type KcdDocument, type NodeId, type Op, type PageId } from "@/lib/creative-core";
import { createKcdDb, dropKcdDb, SKIP_DB, type Db } from "./kcd-db";
import { applyAsAnon, applyAsOwner, applyAsService, createUser, journal, pgError, readDocument, seedProject, tx, type Seeded } from "./kcd-fixtures";

const u4 = () => randomUUID() as NodeId;

/** A native section > group > [text, text] subtree at the end of page 0. */
function nativeSubtree(doc: KcdDocument, pageId: string) {
  const roots = Object.values(doc.nodes).filter((n) => n.pageId === pageId && n.parentId === null).map((n) => n.orderKey).sort();
  const section = u4(), group = u4(), t1 = u4(), t2 = u4();
  const op: Op = {
    op: "insertSubtree",
    nodes: [
      { id: section, type: "section", typeVersion: 1, pageId: pageId as PageId, parentId: null, orderKey: keyBetween(roots.at(-1) ?? null, null), props: { paddingY: "md" }, overrides: {} },
      { id: group, type: "group", typeVersion: 1, pageId: pageId as PageId, parentId: section, orderKey: "V", props: { direction: "row" }, overrides: {} },
      { id: t1, type: "text", typeVersion: 1, pageId: pageId as PageId, parentId: group, orderKey: "V", props: { text: "One" }, overrides: { mobile: { text: "1" } } },
      { id: t2, type: "text", typeVersion: 1, pageId: pageId as PageId, parentId: group, orderKey: "W", props: { text: "Two" }, overrides: {}, locked: true },
    ],
  };
  return { op, section, group, t1, t2 };
}

describe.skipIf(SKIP_DB)("apply_node_ops [PostgreSQL / QA]", { timeout: 120_000 }, () => {
  let db: Db;
  beforeAll(async () => {
    db = await createKcdDb();
  }, 180_000);
  afterAll(async () => dropKcdDb(db), 60_000);

  async function kcdProject(sections = 3): Promise<Seeded & { doc: KcdDocument }> {
    const s = await seedProject(db.pool, { sections, kcd: true });
    return { ...s, doc: await readDocument(db.pool, s.projectId) };
  }

  describe("authorization", () => {
    it("the owner commits; the journal records the owner path", async () => {
      const s = await kcdProject();
      const id = s.sectionIds[0][0] as NodeId;
      const r = await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(s.doc, [{ op: "setProp", id, path: "heading", value: "Owner edit" }]));
      expect(r).toMatchObject({ status: "committed", replayed: false, versions: { [id]: s.doc.nodes[id].version + 1 } });
      const [j] = await journal(db.pool, s.projectId);
      expect(j).toMatchObject({ status: "committed", execution_path: "owner", actor_id: s.ownerId, op_types: ["setProp"], op_count: 1 });
    });

    it("the service role (team/support behind the API) commits with the service path", async () => {
      const s = await kcdProject();
      const r = await applyAsService(db.pool, s.projectId, tx(s.doc, [{ op: "setProp", id: s.sectionIds[0][1] as NodeId, path: "heading", value: "Support edit" }]));
      expect(r.status).toBe("committed");
      expect((await journal(db.pool, s.projectId))[0]).toMatchObject({ execution_path: "service", actor_id: null });
    });

    it("a stranger, anon, or a missing project is refused before anything is written or journaled", async () => {
      const s = await kcdProject();
      const t = tx(s.doc, [{ op: "setProp", id: s.sectionIds[0][0] as NodeId, path: "heading", value: "x" }]);
      const stranger = await createUser(db.pool);
      expect((await pgError(applyAsOwner(db.pool, stranger, s.projectId, t)))?.code).toBe("42501");
      expect((await pgError(applyAsAnon(db.pool, s.projectId, t)))?.code).toBe("42501");
      expect((await pgError(applyAsService(db.pool, randomUUID(), t)))?.code).toBe("P0002");
      expect(await journal(db.pool, s.projectId)).toEqual([]);
      const doc = await readDocument(db.pool, s.projectId);
      expect(doc.nodes[s.sectionIds[0][0] as NodeId].props.heading).toBe("Hero 0");
    });

    it("malformed requests raise without a journal row; a project on the 3B path is rejected (journaled)", async () => {
      const s = await seedProject(db.pool, { sections: 1 });
      const doc = await readDocument(db.pool, s.projectId);
      expect((await pgError(applyAsOwner(db.pool, s.ownerId, s.projectId, { txId: "nope", ops: [] })))?.code).toBe("22023");
      expect((await pgError(applyAsOwner(db.pool, s.ownerId, s.projectId, { txId: randomUUID(), origin: "user", ops: "x", expect: {} })))?.code).toBe("22023");
      expect(await journal(db.pool, s.projectId)).toEqual([]);
      const r = await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(doc, [{ op: "setProp", id: s.sectionIds[0][0] as NodeId, path: "heading", value: "x" }]));
      expect(r).toMatchObject({ status: "rejected", code: "KCD_INVALID" });
      expect((await journal(db.pool, s.projectId)).map((j) => j.status)).toEqual(["rejected"]);
    });
  });

  describe("atomicity", () => {
    it("a failing op rolls back every earlier write of the transaction (props, inserts, removals, layouts)", async () => {
      const s = await kcdProject(3);
      const before = await readDocument(db.pool, s.projectId);
      const native = nativeSubtree(before, s.pageIds[0]);
      const ops: Op[] = [
        { op: "setProp", id: s.sectionIds[0][0] as NodeId, path: "heading", value: "Should not persist" },
        native.op,
        { op: "removeNode", id: s.sectionIds[0][1] as NodeId },
        { op: "setDeviceComposition", pageId: s.pageIds[0] as PageId, device: "mobile", composition: { hidden: [s.sectionIds[0][2] as NodeId] } },
        { op: "moveNode", id: s.sectionIds[0][2] as NodeId, parentId: native.group, orderKey: "X" }, // legacy section cannot nest
      ];
      const r = await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(before, ops));
      expect(r).toMatchObject({ status: "rejected", code: "KCD_INVALID", opIndex: 4 });
      const after = await readDocument(db.pool, s.projectId);
      expect(after).toEqual(before);
      const { rows } = await db.pool.query(`SELECT count(*)::int AS n FROM public.project_sections WHERE id = ANY($1::uuid[])`, [[native.section, native.group, native.t1]]);
      expect(rows[0].n).toBe(0);
      expect((await journal(db.pool, s.projectId)).map((j) => [j.status, j.result_versions])).toEqual([["rejected", null]]);
    });

    it("a sibling position collision found at the end rolls everything back", async () => {
      const s = await kcdProject(2);
      const [a, b] = s.sectionIds[0] as NodeId[];
      const keyA = s.doc.nodes[a].orderKey;
      const r = await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(s.doc, [
        { op: "setProp", id: a, path: "heading", value: "no" },
        { op: "moveNode", id: b, parentId: null, orderKey: keyA },
      ]));
      expect(r).toMatchObject({ status: "rejected", code: "KCD_INVALID" });
      expect(await readDocument(db.pool, s.projectId)).toEqual(s.doc);
    });

    it("swapping two siblings' positions in one transaction commits (uniqueness is checked at the end)", async () => {
      const s = await kcdProject(2);
      const [a, b] = s.sectionIds[0] as NodeId[];
      const [ka, kb] = [s.doc.nodes[a].orderKey, s.doc.nodes[b].orderKey];
      const r = await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(s.doc, [
        { op: "moveNode", id: a, parentId: null, orderKey: kb },
        { op: "moveNode", id: b, parentId: null, orderKey: ka },
      ]));
      expect(r.status).toBe("committed");
      const doc = await readDocument(db.pool, s.projectId);
      expect([doc.nodes[a].orderKey, doc.nodes[b].orderKey]).toEqual([kb, ka]);
    });
  });

  describe("concurrency", () => {
    it("a stale version conflicts instead of overwriting (409 shape, journaled, nothing written)", async () => {
      const s = await kcdProject();
      const id = s.sectionIds[0][0] as NodeId;
      expect((await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(s.doc, [{ op: "setProp", id, path: "heading", value: "First" }]))).status).toBe("committed");
      const stale = await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(s.doc, [{ op: "setProp", id, path: "heading", value: "Stale" }]));
      const v = s.doc.nodes[id].version;
      expect(stale).toMatchObject({ status: "conflicted", code: "KCD_CONFLICT", conflicts: [{ id, expected: v, actual: v + 1 }] });
      expect((await readDocument(db.pool, s.projectId)).nodes[id].props.heading).toBe("First");
      expect((await journal(db.pool, s.projectId)).map((j) => j.status)).toEqual(["committed", "conflicted"]);
    });

    it("a change made through 3B also makes a KCD client's version stale", async () => {
      const s = await kcdProject();
      const id = s.sectionIds[0][0] as NodeId;
      await db.pool.query(`UPDATE public.project_sections SET props = props || '{"heading":"3B edit"}' WHERE id = $1`, [id]);
      const r = await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(s.doc, [{ op: "setProp", id, path: "heading", value: "KCD" }]));
      expect(r.status).toBe("conflicted");
      expect((await readDocument(db.pool, s.projectId)).nodes[id].props.heading).toBe("3B edit");
    });

    it("two editors racing on the same element: exactly one commits, the other conflicts", async () => {
      const s = await kcdProject();
      const id = s.sectionIds[0][0] as NodeId;
      const results = await Promise.all(
        ["Alice", "Bob", "Carol", "Dan"].map((name) => applyAsOwner(db.pool, s.ownerId, s.projectId, tx(s.doc, [{ op: "setProp", id, path: "heading", value: name }]))),
      );
      expect(results.filter((r) => r.status === "committed")).toHaveLength(1);
      expect(results.filter((r) => r.status === "conflicted")).toHaveLength(3);
      expect((await readDocument(db.pool, s.projectId)).nodes[id].version).toBe(s.doc.nodes[id].version + 1);
    });

    it("a missing expected version is rejected", async () => {
      const s = await kcdProject();
      const r = await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(s.doc, [{ op: "setProp", id: s.sectionIds[0][0] as NodeId, path: "heading", value: "x" }], { expect: {} }));
      expect(r).toMatchObject({ status: "rejected", code: "KCD_INVALID" });
    });
  });

  describe("idempotency", () => {
    it("replaying a committed txId returns the original result and applies nothing", async () => {
      const s = await kcdProject();
      const id = s.sectionIds[0][0] as NodeId;
      const t = tx(s.doc, [{ op: "setProp", id, path: "heading", value: "Once" }]);
      const first = await applyAsOwner(db.pool, s.ownerId, s.projectId, t);
      const again = await applyAsOwner(db.pool, s.ownerId, s.projectId, t);
      expect(again).toMatchObject({ status: "committed", replayed: true, versions: first.versions });
      expect((await readDocument(db.pool, s.projectId)).nodes[id].version).toBe(s.doc.nodes[id].version + 1);
      expect((await journal(db.pool, s.projectId)).map((j) => j.status)).toEqual(["committed"]);
    });

    it("concurrent replays of one txId (an offline queue retry) apply exactly once", async () => {
      const s = await kcdProject();
      const native = nativeSubtree(s.doc, s.pageIds[0]);
      const t = tx(s.doc, [native.op]);
      const results = await Promise.all(Array.from({ length: 5 }, () => applyAsOwner(db.pool, s.ownerId, s.projectId, t)));
      expect(results.filter((r) => r.status === "committed" && !r.replayed)).toHaveLength(1);
      expect(results.filter((r) => r.replayed)).toHaveLength(4);
      const { rows } = await db.pool.query(`SELECT count(*)::int AS n FROM public.project_sections WHERE id = $1`, [native.t1]);
      expect(rows[0].n).toBe(1);
    });

    it("a txId from another project is refused", async () => {
      const a = await kcdProject();
      const b = await kcdProject();
      const t = tx(a.doc, [{ op: "setProp", id: a.sectionIds[0][0] as NodeId, path: "heading", value: "A" }]);
      expect((await applyAsService(db.pool, a.projectId, t)).status).toBe("committed");
      expect((await pgError(applyAsService(db.pool, b.projectId, t)))?.code).toBe("22023");
    });
  });

  describe("cross-project protection", () => {
    it("another project's nodes, pages and parents are unreachable", async () => {
      const a = await kcdProject();
      const b = await kcdProject();
      const bNative = nativeSubtree(b.doc, b.pageIds[0]);
      expect((await applyAsOwner(db.pool, b.ownerId, b.projectId, tx(b.doc, [bNative.op]))).status).toBe("committed");
      const aDoc = await readDocument(db.pool, a.projectId);
      const attempts: Op[] = [
        { op: "setProp", id: b.sectionIds[0][0] as NodeId, path: "heading", value: "hijack" },
        { op: "removeNode", id: b.sectionIds[0][0] as NodeId },
        { op: "moveNode", id: b.sectionIds[0][0] as NodeId, parentId: null, orderKey: "z" },
        { op: "setDeviceComposition", pageId: b.pageIds[0] as PageId, device: "mobile", composition: { hidden: [] } },
        { op: "insertNode", node: { id: u4(), type: "text", typeVersion: 1, props: { text: "x" }, overrides: {} }, parentId: bNative.group, pageId: a.pageIds[0] as PageId, orderKey: "z" },
        { op: "insertNode", node: { id: u4(), type: "section", typeVersion: 1, props: {}, overrides: {} }, parentId: null, pageId: b.pageIds[0] as PageId, orderKey: "z" },
      ];
      // An attacker supplies the foreign element's / page's real version, so only project scoping can refuse.
      const bDoc = await readDocument(db.pool, b.projectId);
      const foreign = { [b.sectionIds[0][0]]: bDoc.nodes[b.sectionIds[0][0] as NodeId].version, [b.pageIds[0]]: bDoc.pages[0].layoutVersion };
      for (const op of attempts) {
        const t = tx(aDoc, [op]);
        const r = await applyAsOwner(db.pool, a.ownerId, a.projectId, { ...t, expect: { ...t.expect, ...foreign } });
        expect(r.status, op.op).toBe("rejected");
        expect(r.message, op.op).toMatch(/does not exist/);
      }
      // Moving A's own node under B's group is equally impossible.
      const aNative = nativeSubtree(aDoc, a.pageIds[0]);
      expect((await applyAsOwner(db.pool, a.ownerId, a.projectId, tx(aDoc, [aNative.op]))).status).toBe("committed");
      const aDoc2 = await readDocument(db.pool, a.projectId);
      const moveTx = tx(aDoc2, [{ op: "moveNode", id: aNative.t1, parentId: bNative.group, orderKey: "z" }]);
      const move = await applyAsOwner(db.pool, a.ownerId, a.projectId, { ...moveTx, expect: { ...moveTx.expect, [bNative.group]: 1 } });
      expect(move.status).toBe("rejected");
      expect(move.message).toMatch(/does not exist/);
      expect(await readDocument(db.pool, b.projectId)).toEqual(await readDocument(db.pool, b.projectId));
      const bAfter = await readDocument(db.pool, b.projectId);
      expect(bAfter.nodes[b.sectionIds[0][0] as NodeId].props.heading).toBe("Hero 0");
      expect(Object.values(bAfter.nodes).filter((n) => n.parentId === bNative.group)).toHaveLength(2);
    });
  });

  describe("identity: remove → restore", () => {
    it("restores the SAME ids at the recorded version + 1; tombstoned ids are never reused", async () => {
      const s = await kcdProject(1);
      const native = nativeSubtree(s.doc, s.pageIds[0]);
      await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(s.doc, [native.op]));
      const d1 = await readDocument(db.pool, s.projectId);
      const edited = await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(d1, [{ op: "setProp", id: native.t1, path: "text", value: "Edited" }]));
      expect(edited.versions![native.t1]).toBe(d1.nodes[native.t1].version + 1);
      const d2 = await readDocument(db.pool, s.projectId);
      const removedNodes = [native.section, native.group, native.t1, native.t2].map((id) => d2.nodes[id]);
      const removed = await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(d2, [{ op: "removeNode", id: native.section }]));
      expect(removed.removed!.sort()).toEqual([native.section, native.group, native.t1, native.t2].sort());
      const d3 = await readDocument(db.pool, s.projectId);

      // A new element can never take a removed id.
      const reuse = await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(d3, [{ op: "insertNode", node: { id: native.section, type: "section", typeVersion: 1, props: {}, overrides: {} }, parentId: null, pageId: s.pageIds[0] as PageId, orderKey: "z" }]));
      expect(reuse.status).toBe("rejected");
      // A wrong recorded version is refused.
      const wrong = await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(d3, [{ op: "restoreSubtree", nodes: removedNodes.map((n) => ({ ...n, version: n.version + 5 })) }]));
      expect(wrong.status).toBe("rejected");
      // Undo: the same ids come back, versions only increase, content identical.
      const undo = await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(d3, [{ op: "restoreSubtree", nodes: removedNodes }]));
      expect(undo.status).toBe("committed");
      const d4 = await readDocument(db.pool, s.projectId);
      for (const n of removedNodes) {
        expect(d4.nodes[n.id]).toEqual({ ...n, version: n.version + 1 });
      }
    });

    it("an id that was never removed from this document cannot be restored (another project's tombstone included)", async () => {
      const a = await kcdProject(1);
      const b = await kcdProject(1);
      const aHero = a.doc.nodes[a.sectionIds[0][0] as NodeId];
      await applyAsOwner(db.pool, a.ownerId, a.projectId, tx(a.doc, [{ op: "removeNode", id: aHero.id }]));
      // Free positions, valid pages: only the tombstone rule can refuse these.
      const r = await applyAsOwner(db.pool, b.ownerId, b.projectId, tx(b.doc, [{ op: "restoreSubtree", nodes: [{ ...aHero, pageId: b.pageIds[0] as PageId, orderKey: "z" }] }]));
      expect(r).toMatchObject({ status: "rejected", message: expect.stringMatching(/was not removed from this document/) });
      const fresh = await applyAsOwner(db.pool, b.ownerId, b.projectId, tx(b.doc, [{ op: "restoreSubtree", nodes: [{ ...aHero, id: u4(), pageId: b.pageIds[0] as PageId, orderKey: "z" }] }]));
      expect(fresh).toMatchObject({ status: "rejected", message: expect.stringMatching(/was not removed from this document/) });
    });
  });

  describe("ordering and rebalance", () => {
    it("a key beyond 24 characters rebalances the parent inside the same transaction; ids and order are stable", async () => {
      const s = await kcdProject(1);
      const native = nativeSubtree(s.doc, s.pageIds[0]);
      await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(s.doc, [native.op]));
      const doc = await readDocument(db.pool, s.projectId);
      // Between t1 ("V") and t2 ("W"): a valid but long key, as many insertions at one spot produce.
      let key = "V";
      while (key.length <= 29) key = keyBetween(key, "W");
      const id = u4();
      const r = await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(doc, [{ op: "insertNode", node: { id, type: "text", typeVersion: 1, props: { text: "middle" }, overrides: {} }, parentId: native.group, pageId: s.pageIds[0] as PageId, orderKey: key }]));
      expect(r.status).toBe("committed");
      expect(r.rebalanced).toEqual([native.group]);
      const after = await readDocument(db.pool, s.projectId);
      const kids = Object.values(after.nodes).filter((n) => n.parentId === native.group).sort((a, b) => (a.orderKey < b.orderKey ? -1 : 1));
      expect(kids.map((n) => n.id)).toEqual([native.t1, id, native.t2]);
      expect(kids.map((n) => n.orderKey)).toEqual(evenlySpacedKeys(3));
      for (const n of kids) expect(r.orderKeys![n.id] ?? n.orderKey).toBe(n.orderKey);
      // Rebalanced existing elements are new versions (other clients must refresh); the insert is version 1.
      expect(after.nodes[id].version).toBe(1);
      for (const k of [native.t1, native.t2]) {
        expect(after.nodes[k].version).toBe(doc.nodes[k].orderKey === after.nodes[k].orderKey ? doc.nodes[k].version : doc.nodes[k].version + 1);
      }
    });

    it("page roots keep a dense 3B sort_order in KCD order", async () => {
      const s = await kcdProject(3);
      const [a, b, c] = s.sectionIds[0] as NodeId[];
      await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(s.doc, [{ op: "moveNode", id: a, parentId: null, orderKey: keyBetween(s.doc.nodes[c].orderKey, null) }]));
      const { rows } = await db.pool.query(`SELECT id, sort_order FROM public.project_sections WHERE page_id = $1 ORDER BY sort_order`, [s.pageIds[0]]);
      expect(rows.map((r: { id: string; sort_order: number }) => [r.id, r.sort_order])).toEqual([[b, 0], [c, 1], [a, 2]]);
    });
  });

  describe("limits", () => {
    it("rejects oversized transactions and paths (KCD_LIMIT) and bad labels", async () => {
      const s = await kcdProject(1);
      const id = s.sectionIds[0][0] as NodeId;
      const many = Array.from({ length: 501 }, (): Op => ({ op: "setProp", id, path: "heading", value: "x" }));
      expect(await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(s.doc, many))).toMatchObject({ status: "rejected", code: "KCD_LIMIT" });
      expect(await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(s.doc, [{ op: "setProp", id, path: "a.b.c.d.e.f.g.h.i", value: 1 }]))).toMatchObject({ status: "rejected", code: "KCD_LIMIT" });
      expect(await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(s.doc, [{ op: "setProp", id, path: "heading", value: "x".repeat(400 * 1024) }]))).toMatchObject({ status: "rejected", code: "KCD_LIMIT" });
      expect(await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(s.doc, [{ op: "setProp", id, path: "heading", value: "x".repeat(3 * 1024 * 1024) }]))).toMatchObject({ status: "rejected", code: "KCD_LIMIT" });
      expect(await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(s.doc, [{ op: "setProp", id, path: "heading", value: "x" }], { label: "L".repeat(121) }))).toMatchObject({ status: "rejected", code: "KCD_INVALID" });
      expect(await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(s.doc, [{ op: "setProp", id, path: "_a11y", value: {} }]))).toMatchObject({ status: "rejected", code: "KCD_INVALID" });
      expect(await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(s.doc, [{ op: "setProp", id, path: "a.__proto__", value: 1 }]))).toMatchObject({ status: "rejected" });
      expect((await readDocument(db.pool, s.projectId)).nodes[id].version).toBe(s.doc.nodes[id].version);
    });
  });

  describe("journal is minimal", () => {
    it("records no prop values, labels or documents — only identity, path, op types/count, versions, result", async () => {
      const s = await kcdProject(1);
      const secret = `SECRET-${randomUUID()}`;
      const native = nativeSubtree(s.doc, s.pageIds[0]);
      await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(s.doc, [native.op, { op: "setProp", id: s.sectionIds[0][0] as NodeId, path: "heading", value: secret }], { label: secret }));
      const d = await readDocument(db.pool, s.projectId);
      await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(d, [{ op: "setProp", id: s.sectionIds[0][0] as NodeId, path: "heading", value: secret }], { expect: { [s.sectionIds[0][0]]: s.doc.nodes[s.sectionIds[0][0] as NodeId].version } }));
      const rows = await journal(db.pool, s.projectId);
      expect(rows.map((r) => r.status)).toEqual(["committed", "conflicted"]);
      expect(JSON.stringify(rows)).not.toContain(secret);
      expect(JSON.stringify(rows)).not.toContain("One"); // text content of the inserted nodes
      expect(Object.keys(rows[0]).sort()).toEqual([
        "actor_id", "created_at", "diagnostic", "error_code", "execution_path", "expected_versions", "id", "op_count", "op_types",
        "origin", "project_id", "removed_nodes", "result_versions", "status", "tx_id",
      ]);
      expect(rows[0].op_types).toEqual(["insertSubtree", "setProp"]);
    });
  });
});
