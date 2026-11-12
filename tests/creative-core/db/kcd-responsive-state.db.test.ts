import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyTransaction, type NodeId, type Op } from "@/lib/creative-core";
import { builderRegistry } from "@/lib/create/kcd-adapter";
import { createKcdDb, dropKcdDb, migration, SKIP_DB, type Db } from "./kcd-db";
import { applyAsAnon, applyAsOwner, journal, readDocument, seedProject, tx } from "./kcd-fixtures";

describe.skipIf(SKIP_DB)("S5 responsive state authority [PostgreSQL / QA]", { timeout: 120_000 }, () => {
  let db: Db;
  beforeAll(async () => {
    db = await createKcdDb();
    await db.pool.query(migration("20261002033337_kcd_responsive_state_ops.sql"));
  }, 180_000);
  afterAll(async () => dropKcdDb(db), 60_000);

  it("commits a device edit atomically, bumps once, and replays idempotently", async () => {
    const s = await seedProject(db.pool, { kcd: true });
    const doc = await readDocument(db.pool, s.projectId);
    const id = s.sectionIds[0][0] as NodeId;
    const transaction = tx(doc, [
      { op: "setOverride", id, device: "mobile", key: "align", value: "left" },
      { op: "setResponsiveState", id, value: { mode: "custom", baseHash: "abc123" } },
    ]);
    const result = await applyAsOwner(db.pool, s.ownerId, s.projectId, transaction);
    expect(result).toMatchObject({ status: "committed", versions: { [id]: 2 } });
    const after = await readDocument(db.pool, s.projectId);
    expect(after.nodes[id]).toMatchObject({ version: 2, overrides: { mobile: { align: "left" } }, responsiveState: { mode: "custom", baseHash: "abc123" } });
    expect(await applyAsOwner(db.pool, s.ownerId, s.projectId, transaction)).toMatchObject({ status: "committed", replayed: true });
    expect(await readDocument(db.pool, s.projectId)).toEqual(after);
    expect(await journal(db.pool, s.projectId)).toHaveLength(1);
  });

  it("Reset to Auto and its inverse preserve the original device state", async () => {
    const s = await seedProject(db.pool, { kcd: true });
    let doc = await readDocument(db.pool, s.projectId);
    const id = s.sectionIds[0][0] as NodeId;
    await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(doc, [
      { op: "setOverride", id, device: "mobile", key: "align", value: "left" },
      { op: "setResponsiveState", id, value: { mode: "custom", baseHash: "original" } },
    ]));
    doc = await readDocument(db.pool, s.projectId);
    const reset = tx(doc, [
      { op: "clearOverride", id, device: "mobile" },
      { op: "setResponsiveState", id, value: null },
    ]);
    const local = applyTransaction(doc, reset, builderRegistry);
    if (!local.ok) throw new Error(local.error.message);
    expect(await applyAsOwner(db.pool, s.ownerId, s.projectId, reset)).toMatchObject({ status: "committed" });
    const cleared = await readDocument(db.pool, s.projectId);
    expect(cleared.nodes[id].overrides).toEqual({});
    expect(cleared.nodes[id].responsiveState).toBeUndefined();
    expect(await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(cleared, local.inverse))).toMatchObject({ status: "committed" });
    const restored = await readDocument(db.pool, s.projectId);
    expect(restored.nodes[id].overrides).toEqual(doc.nodes[id].overrides);
    expect(restored.nodes[id].responsiveState).toEqual(doc.nodes[id].responsiveState);
  });

  it.each([{ mode: "invalid" }, { mode: "custom", extra: true }, { mode: "custom", baseHash: "x".repeat(33) }])("rejects invalid metadata and rolls back preceding edits: %j", async (value) => {
    const s = await seedProject(db.pool, { kcd: true });
    const doc = await readDocument(db.pool, s.projectId);
    const id = s.sectionIds[0][0] as NodeId;
    const ops: Op[] = [
      { op: "setProp", id, path: "heading", value: "Must not persist" },
      { op: "setResponsiveState", id, value },
    ];
    expect(await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(doc, ops))).toMatchObject({ status: "rejected", code: "KCD_INVALID" });
    expect(await readDocument(db.pool, s.projectId)).toEqual(doc);
  });

  it("retains the anon/internal privilege boundary", async () => {
    const s = await seedProject(db.pool, { kcd: true });
    const doc = await readDocument(db.pool, s.projectId);
    const id = s.sectionIds[0][0] as NodeId;
    await expect(applyAsAnon(db.pool, s.projectId, tx(doc, [{ op: "setResponsiveState", id, value: { mode: "custom" } }]))).rejects.toThrow(/permission denied/);
    const result = await db.pool.query("SELECT has_function_privilege('authenticated', 'public.kcd__apply(uuid,jsonb)', 'execute') AS allowed");
    expect(result.rows[0].allowed).toBe(false);
    expect(await journal(db.pool, s.projectId)).toHaveLength(0);
  });
});
