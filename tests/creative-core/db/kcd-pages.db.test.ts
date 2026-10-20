import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyTransaction, type PageId } from "@/lib/creative-core";
import { builderRegistry, rowsToDocument } from "@/lib/create/kcd-adapter";
import { createKcdDb, dropKcdDb, migration, SKIP_DB, type Db } from "./kcd-db";
import { applyAsAnon, applyAsOwner, readRows, seedProject, tx } from "./kcd-fixtures";

describe.skipIf(SKIP_DB)("S5 page authority [PostgreSQL / QA]", { timeout: 120_000 }, () => {
  let db: Db;
  beforeAll(async () => {
    db = await createKcdDb();
    await db.pool.query(migration("20261002033337_kcd_responsive_state_ops.sql"));
    await db.pool.query(migration("20261003023326_kcd_page_lifecycle_ops.sql"));
  }, 180_000);
  afterAll(async () => dropKcdDb(db), 60_000);
  async function document(projectId: string) {
    const rows = await readRows(db.pool, projectId);
    const { rows: pages } = await db.pool.query("select id,order_key,kcd_unknown from project_pages where project_id=$1", [projectId]);
    rows.pages = rows.pages.map((page) => ({ ...page, ...pages.find((row: { id: string; order_key: string; kcd_unknown: Record<string, unknown> | null }) => row.id === page.id) }));
    return rowsToDocument(rows).document;
  }
  it("inserts and replays a canonical page without another version bump", async () => {
    const s = await seedProject(db.pool, { kcd: true }); const doc = await document(s.projectId);
    const id = randomUUID() as PageId;
    const transaction = tx(doc, [{ op: "insertPage", page: { id, title: "About", slug: "about", orderKey: "k", deviceLayout: {}, unknown: { extension: "kept" } } }]);
    expect(await applyAsOwner(db.pool, s.ownerId, s.projectId, transaction)).toMatchObject({ status: "committed", versions: { [id]: 1 } });
    expect(await applyAsOwner(db.pool, s.ownerId, s.projectId, transaction)).toMatchObject({ status: "committed", replayed: true });
    expect((await document(s.projectId)).pages.find((page) => page.id === id)).toMatchObject({ layoutVersion: 1, unknown: { extension: "kept" } });
  });
  it("deletes and restores a page forest at recorded versions with the original identities", async () => {
    const s = await seedProject(db.pool, { kcd: true, pages: 2 }); const doc = await document(s.projectId);
    const transaction = tx(doc, [{ op: "removePage", pageId: doc.pages[1].id }]);
    const result = applyTransaction(doc, transaction, builderRegistry); if (!result.ok) throw new Error(result.error.message);
    expect(await applyAsOwner(db.pool, s.ownerId, s.projectId, transaction)).toMatchObject({ status: "committed", removed: result.removed });
    const after = await document(s.projectId);
    expect(await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(after, result.inverse))).toMatchObject({ status: "committed" });
    const restored = await document(s.projectId);
    expect(restored.pages.find((page) => page.id === doc.pages[1].id)?.layoutVersion).toBe(2);
    for (const id of s.sectionIds[1]) expect(restored.nodes[id as keyof typeof restored.nodes].version).toBe(2);
  });
  it("conflicts deletion against a concurrent edit instead of deleting newer content", async () => {
    const s = await seedProject(db.pool, { kcd: true, pages: 2 }); const doc = await document(s.projectId);
    const id = s.sectionIds[1][0] as keyof typeof doc.nodes;
    const deletion = tx(doc, [{ op: "removePage", pageId: doc.pages[1].id }]);
    await applyAsOwner(db.pool, s.ownerId, s.projectId, tx(doc, [{ op: "setProp", id, path: "heading", value: "Newer content" }]));
    expect(await applyAsOwner(db.pool, s.ownerId, s.projectId, deletion)).toMatchObject({ status: "conflicted" });
    expect((await document(s.projectId)).nodes[id].props.heading).toBe("Newer content");
  });
  it("preserves owner-only authority and denies anonymous page writes", async () => {
    const s = await seedProject(db.pool, { kcd: true }); const doc = await document(s.projectId);
    await expect(applyAsAnon(db.pool, s.projectId, tx(doc, [{ op: "updatePage", pageId: doc.pages[0].id, title: "Anonymous" }]))).rejects.toThrow(/permission denied/i);
    await expect(applyAsOwner(db.pool, randomUUID(), s.projectId, tx(doc, [{ op: "updatePage", pageId: doc.pages[0].id, title: "Stranger" }]))).rejects.toThrow(/access denied/i);
  });
});
