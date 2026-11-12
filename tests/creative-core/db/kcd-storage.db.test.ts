/**
 * 3C S4 gate — KCD storage evolution on PostgreSQL (disposable database on the QA cluster).
 *
 *   • additive migration over existing 3B data: order_key backfilled in 3B order, props untouched
 *   • SQL order keys ≡ TypeScript order keys; SQL type rules ≡ the TypeScript registry
 *   • 3B keeps working: inserts get keys (also concurrently), reorder / batch RPCs, deployments
 *   • versions increase for every writer; stale readers cannot miss a change
 *   • structure enforced for every writer: same-page parent (no cross-project), no cycles, placement
 *   • published snapshots immutable; opt-in rebases keys; opt-out refused with native content
 *   • privileges: anon cannot execute apply_node_ops; the journal is owner-read-only
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { evenlySpacedKeys, isValidOrderKey, keyBetween, overridableKeys } from "@/lib/creative-core";
import { builderRegistry } from "@/lib/create/kcd-adapter";
import { createKcdDb, dropKcdDb, SKIP_DB, asUser, asAnon, type Db, type Row } from "./kcd-db";
import { createUser, pgError, readRows, seedProject } from "./kcd-fixtures";
import { rng } from "../helpers";

describe.skipIf(SKIP_DB)("KCD storage migration [PostgreSQL / QA]", () => {
  let db: Db;
  let legacy: { projectId: string; pages: { id: string; sections: { id: string; sort: number; created: number }[] }[]; props: Record<string, string> };

  beforeAll(async () => {
    // 3B data written BEFORE the migration: gaps, ties, reversed insert order.
    db = await createKcdDb({
      seed: async (c) => {
        const { rows: [u] } = await c.query(`INSERT INTO auth.users DEFAULT VALUES RETURNING id`);
        const { rows: [p] } = await c.query(`INSERT INTO public.projects (owner_id, title) VALUES ($1, 'Legacy') RETURNING id`, [u.id]);
        legacy = { projectId: p.id, pages: [], props: {} };
        for (let pi = 0; pi < 3; pi++) {
          const { rows: [pg] } = await c.query(`INSERT INTO public.project_pages (project_id, slug, title, sort_order) VALUES ($1, $2, 'P', $3) RETURNING id`, [p.id, `p${pi}`, pi]);
          const sections: { id: string; sort: number; created: number }[] = [];
          const sorts = pi === 0 ? [30, 10, 20, 10] : pi === 1 ? [0, 0, 0] : [5];
          for (const [k, sort] of sorts.entries()) {
            const props = JSON.stringify({ heading: `L${pi}-${k}`, deviceOverrides: {}, _a11y: { landmark: "region" } });
            const { rows: [s] } = await c.query(
              `INSERT INTO public.project_sections (page_id, section_type, sort_order, props, created_at) VALUES ($1, 'hero', $2, $3, now() - ($4 || ' seconds')::interval) RETURNING id`,
              [pg.id, sort, props, String(100 - k)],
            );
            sections.push({ id: s.id, sort, created: -k });
            legacy.props[s.id] = props;
          }
          legacy.pages.push({ id: pg.id, sections });
        }
      },
    });
  }, 180_000);

  afterAll(async () => dropKcdDb(db), 60_000);

  it("backfills order_key per page in 3B order (sort_order, then created_at, id) with evenly spaced keys", async () => {
    for (const page of legacy.pages) {
      const { rows } = await db.pool.query(`SELECT id, order_key, created_at, sort_order FROM public.project_sections WHERE page_id = $1`, [page.id]);
      const expected = [...rows].sort((a: Row, b: Row) => a.sort_order - b.sort_order || a.created_at - b.created_at || (a.id < b.id ? -1 : 1));
      const keys = evenlySpacedKeys(rows.length);
      expect(expected.map((r: Row) => r.order_key)).toEqual(keys);
    }
  });

  it("is additive: stored props untouched, versions start at 1, no nesting", async () => {
    const { rows } = await db.pool.query(`SELECT id, props::text AS props, node_version::int AS v, type_version, parent_id FROM public.project_sections`);
    for (const r of rows) {
      expect(JSON.parse(r.props)).toEqual(JSON.parse(legacy.props[r.id]));
      expect([r.v, r.type_version, r.parent_id]).toEqual([1, 1, null]);
    }
    const { rows: [p] } = await db.pool.query(`SELECT document_schema_version FROM public.projects WHERE id = $1`, [legacy.projectId]);
    expect(p.document_schema_version).toBeNull();
  });

  it("SQL order keys are identical to the TypeScript implementation", async () => {
    for (const n of [0, 1, 2, 3, 15, 16, 40, 61, 62, 100, 257, 1000, 2000, 5000]) {
      const { rows: [r] } = await db.pool.query(`SELECT public.kcd_evenly_spaced_keys($1) AS k`, [n]);
      expect(r.k, `n=${n}`).toEqual(evenlySpacedKeys(n));
    }
    const r = rng(404);
    const samples: (string | null)[] = [null];
    let key: string | null = null;
    for (let i = 0; i < 300; i++) samples.push((key = keyBetween(key, null)));
    for (let i = 0; i < 300; i++) samples.push(keyBetween(null, samples[1 + r.int(299)]!));
    const { rows: after } = await db.pool.query(`SELECT a, public.kcd_order_key_after(a) AS k FROM unnest($1::text[]) a`, [samples]);
    for (const row of after) expect(row.k, String(row.a)).toBe(keyBetween(row.a, null));
    const junk = ["", "0", "V0", "a b", "zz", "é", "A".repeat(128), "A".repeat(129), "-1", "Vz", "00001"];
    const { rows: valid } = await db.pool.query(`SELECT k, public.kcd_order_key_valid(k) AS ok FROM unnest($1::text[]) k`, [junk]);
    for (const row of valid) expect(row.ok, JSON.stringify(row.k)).toBe(isValidOrderKey(row.k));
  });

  it("SQL type rules are identical to the TypeScript registry", async () => {
    const { rows } = await db.pool.query(`SELECT * FROM public.kcd_node_types ORDER BY type`);
    expect(rows.map((r: Row) => r.type)).toEqual(builderRegistry.types());
    for (const row of rows) {
      const def = builderRegistry.get(row.type)!;
      expect(row.storage_type).toBe(row.type.startsWith("legacy-section:") ? row.type.slice(15) : row.type);
      expect(row.version).toBe(def.version);
      expect(row.placement).toBe(def.placement);
      expect(row.allowed_children).toEqual(def.children === "none" ? [] : [...def.children.allow].sort());
      expect(row.max_children).toBe(def.children === "none" ? null : (def.children.max ?? null));
      expect(row.overridable).toEqual([...overridableKeys(def)].sort());
    }
  });

  describe("3B keeps working", () => {
    it("rows inserted without a key go after their last sibling (single and multi-row inserts)", async () => {
      const s = await seedProject(db.pool, { sections: 2 });
      await db.pool.query(
        `INSERT INTO public.project_sections (page_id, section_type, sort_order, props) VALUES ($1, 'faq', 9, '{}'), ($1, 'faq', 10, '{}')`,
        [s.pageIds[0]],
      );
      const { rows } = await db.pool.query(`SELECT order_key FROM public.project_sections WHERE page_id = $1 ORDER BY order_key COLLATE "C"`, [s.pageIds[0]]);
      expect(rows.map((r: Row) => r.order_key)).toEqual(["V", "W", "X", "Y"]);
    });

    it("concurrent 3B inserts into one page never collide", async () => {
      const s = await seedProject(db.pool, { sections: 1 });
      await Promise.all(
        Array.from({ length: 12 }, (_, i) =>
          db.pool.query(`INSERT INTO public.project_sections (page_id, section_type, sort_order, props) VALUES ($1, 'faq', $2, '{}')`, [s.pageIds[0], i + 1]),
        ),
      );
      const { rows } = await db.pool.query(`SELECT count(DISTINCT order_key)::int AS n, count(*)::int AS total FROM public.project_sections WHERE page_id = $1`, [s.pageIds[0]]);
      expect(rows[0]).toEqual({ n: 13, total: 13 });
    });

    it("reorder_sections and batch_update_section_props still work as the owner; versions follow every change", async () => {
      const s = await seedProject(db.pool, { sections: 3 });
      const reversed = [...s.sectionIds[0]].reverse();
      await asUser(db.pool, s.ownerId, (c) => c.query(`SELECT public.reorder_sections($1, $2::uuid[])`, [s.projectId, reversed]));
      await asUser(db.pool, s.ownerId, (c) =>
        c.query(`SELECT public.batch_update_section_props($1, $2::jsonb)`, [s.projectId, JSON.stringify([{ id: reversed[0], props: { heading: "Edited" } }])]),
      );
      const { rows } = await db.pool.query(`SELECT id, sort_order, node_version::int AS v FROM public.project_sections WHERE page_id = $1 ORDER BY sort_order`, [s.pageIds[0]]);
      expect(rows.map((r: Row) => r.id)).toEqual(reversed);
      // sort_order-only changes are not content changes; the prop edit bumps the version.
      expect(rows.map((r: Row) => r.v)).toEqual([2, 1, 1]);
    });

    it("device layout changes by any writer bump layout_version", async () => {
      const s = await seedProject(db.pool);
      await db.pool.query(`UPDATE public.project_pages SET device_layouts = '{"mobile":{"hiddenSections":["x"]}}' WHERE id = $1`, [s.pageIds[0]]);
      await db.pool.query(`UPDATE public.project_pages SET title = 'Renamed' WHERE id = $1`, [s.pageIds[0]]);
      const { rows: [pg] } = await db.pool.query(`SELECT layout_version::int AS v FROM public.project_pages WHERE id = $1`, [s.pageIds[0]]);
      expect(pg.v).toBe(2);
    });

    it("published snapshots are immutable; status changes still work (supersede, fail, suspend)", async () => {
      const s = await seedProject(db.pool);
      const { rows: [d] } = await db.pool.query(
        `INSERT INTO public.deployments (project_id, subdomain, snapshot, public_path) VALUES ($1, 'kcd-imm', '{"a":1}', '/sites/kcd-imm') RETURNING id, schema_version`,
        [s.projectId],
      );
      expect(d.schema_version).toBe("website-v1");
      await db.pool.query(`UPDATE public.deployments SET status = 'superseded' WHERE id = $1`, [d.id]);
      for (const change of [`snapshot = '{"a":2}'`, `schema_version = 'kcd-1'`, `content_hash = 'x'`]) {
        const err = await pgError(db.pool.query(`UPDATE public.deployments SET ${change} WHERE id = $1`, [d.id]));
        expect(err?.message, change).toContain("immutable");
      }
    });
  });

  describe("structure is enforced for every writer", () => {
    it("a parent on another page or another project is refused, even through the owner's direct table access", async () => {
      const a = await seedProject(db.pool, { pages: 2, kcd: true });
      const b = await seedProject(db.pool, { kcd: true });
      // Owner of B tries to hang a group under a section of A (another owner's project).
      const cross = await pgError(
        asUser(db.pool, b.ownerId, (c) =>
          c.query(`INSERT INTO public.project_sections (page_id, parent_id, section_type, props) VALUES ($1, $2, 'group', '{}')`, [b.pageIds[0], a.sectionIds[0][0]]),
        ),
      );
      expect(cross?.message).toContain("same page");
      const otherPage = await pgError(
        db.pool.query(`INSERT INTO public.project_sections (page_id, parent_id, section_type, props) VALUES ($1, $2, 'group', '{}')`, [a.pageIds[1], a.sectionIds[0][0]]),
      );
      expect(otherPage?.message).toContain("same page");
    });

    it("cycles and misplaced types are refused", async () => {
      const s = await seedProject(db.pool, { kcd: true });
      const { rows: [sec] } = await db.pool.query(`INSERT INTO public.project_sections (page_id, section_type, props) VALUES ($1, 'section', '{}') RETURNING id`, [s.pageIds[0]]);
      const { rows: [g1] } = await db.pool.query(`INSERT INTO public.project_sections (page_id, parent_id, section_type, props) VALUES ($1, $2, 'group', '{}') RETURNING id`, [s.pageIds[0], sec.id]);
      const { rows: [g2] } = await db.pool.query(`INSERT INTO public.project_sections (page_id, parent_id, section_type, props) VALUES ($1, $2, 'group', '{}') RETURNING id`, [s.pageIds[0], g1.id]);
      expect((await pgError(db.pool.query(`UPDATE public.project_sections SET parent_id = $1 WHERE id = $2`, [g2.id, g1.id])))?.message).toContain("cycle");
      expect((await pgError(db.pool.query(`INSERT INTO public.project_sections (page_id, section_type, props) VALUES ($1, 'group', '{}')`, [s.pageIds[0]])))?.code).toBe("23514");
      expect((await pgError(db.pool.query(`INSERT INTO public.project_sections (page_id, parent_id, section_type, props) VALUES ($1, $2, 'hero', '{}')`, [s.pageIds[0], sec.id])))?.code).toBe("23514");
    });

    it("nested or native elements are refused in a project on the 3B path (any writer)", async () => {
      const s = await seedProject(db.pool, { sections: 1 });
      const native = await pgError(asUser(db.pool, s.ownerId, (c) => c.query(`INSERT INTO public.project_sections (page_id, section_type, props) VALUES ($1, 'section', '{}')`, [s.pageIds[0]])));
      expect(native?.message).toContain("Kebu Creative Document format");
      const nested = await pgError(db.pool.query(`INSERT INTO public.project_sections (page_id, parent_id, section_type, props) VALUES ($1, $2, 'text', '{}')`, [s.pageIds[0], s.sectionIds[0][0]]));
      expect(nested?.message).toContain("Kebu Creative Document format");
      const retype = await pgError(db.pool.query(`UPDATE public.project_sections SET section_type = 'section' WHERE id = $1`, [s.sectionIds[0][0]]));
      expect(retype?.message).toContain("Kebu Creative Document format");
    });

    it("sibling order keys are unique", async () => {
      const s = await seedProject(db.pool, { sections: 2 });
      const { rows } = await db.pool.query(`SELECT order_key FROM public.project_sections WHERE id = $1`, [s.sectionIds[0][0]]);
      const err = await pgError(db.pool.query(`UPDATE public.project_sections SET order_key = $1 WHERE id = $2`, [rows[0].order_key, s.sectionIds[0][1]]));
      expect(err?.code).toBe("23505");
    });
  });

  describe("per-project opt-in (§19)", () => {
    it("opting in rebases root keys from the current 3B order; opting out works while there is no native content", async () => {
      const s = await seedProject(db.pool, { sections: 4 });
      const reversed = [...s.sectionIds[0]].reverse();
      await asUser(db.pool, s.ownerId, (c) => c.query(`SELECT public.reorder_sections($1, $2::uuid[])`, [s.projectId, reversed]));
      await db.pool.query(`UPDATE public.projects SET document_schema_version = 'kcd-1' WHERE id = $1`, [s.projectId]);
      const { rows } = await db.pool.query(`SELECT id, order_key FROM public.project_sections WHERE page_id = $1 ORDER BY order_key COLLATE "C"`, [s.pageIds[0]]);
      expect(rows.map((r: Row) => r.id)).toEqual(reversed);
      expect(rows.map((r: Row) => r.order_key)).toEqual(evenlySpacedKeys(4));
      await db.pool.query(`UPDATE public.projects SET document_schema_version = NULL WHERE id = $1`, [s.projectId]);
    });

    it("opting out is refused once nested or native elements exist", async () => {
      const s = await seedProject(db.pool, { kcd: true });
      await db.pool.query(`INSERT INTO public.project_sections (page_id, section_type, props) VALUES ($1, 'section', '{}')`, [s.pageIds[0]]);
      const err = await pgError(db.pool.query(`UPDATE public.projects SET document_schema_version = NULL WHERE id = $1`, [s.projectId]));
      expect(err?.message).toContain("cannot return to the 3B path");
    });

    it("the adapter reads an opted-in project from the storage columns", async () => {
      const s = await seedProject(db.pool, { sections: 3, kcd: true });
      const rows = await readRows(db.pool, s.projectId);
      expect(rows.project.document_schema_version).toBe("kcd-1");
      expect(rows.sections.every((r: Row) => isValidOrderKey(r.order_key))).toBe(true);
    });
  });

  describe("privileges", () => {
    it("anon cannot execute apply_node_ops; authenticated and service_role can; internals are not callable", async () => {
      const { rows: [r] } = await db.pool.query(`
        SELECT has_function_privilege('anon', 'public.apply_node_ops(uuid, jsonb)', 'EXECUTE') AS anon,
               has_function_privilege('authenticated', 'public.apply_node_ops(uuid, jsonb)', 'EXECUTE') AS auth,
               has_function_privilege('service_role', 'public.apply_node_ops(uuid, jsonb)', 'EXECUTE') AS svc,
               has_function_privilege('authenticated', 'public.kcd__apply(uuid, jsonb)', 'EXECUTE') AS internal_auth,
               has_function_privilege('anon', 'public.kcd__apply(uuid, jsonb)', 'EXECUTE') AS internal_anon`);
      expect(r).toEqual({ anon: false, auth: true, svc: true, internal_auth: false, internal_anon: false });
      const s = await seedProject(db.pool, { kcd: true });
      const err = await pgError(asAnon(db.pool, (c) => c.query(`SELECT public.apply_node_ops($1, '{}'::jsonb)`, [s.projectId])));
      expect(err?.code).toBe("42501");
    });

    it("the journal is readable only by the project's owner and writable by nobody directly", async () => {
      const s = await seedProject(db.pool, { kcd: true });
      await db.pool.query(
        `INSERT INTO public.creative_op_journal (tx_id, project_id, execution_path, origin, op_types, op_count, expected_versions, status)
         VALUES (gen_random_uuid(), $1, 'owner', 'user', '{setProp}', 1, '{}', 'committed')`,
        [s.projectId],
      );
      const stranger = await createUser(db.pool);
      const count = (userId: string) =>
        asUser(db.pool, userId, async (c): Promise<number> => (await c.query(`SELECT count(*)::int AS n FROM public.creative_op_journal WHERE project_id = $1`, [s.projectId])).rows[0].n);
      expect([await count(s.ownerId), await count(stranger)]).toEqual([1, 0]);
      for (const sql of [
        `INSERT INTO public.creative_op_journal (tx_id, project_id, execution_path, origin, op_types, op_count, expected_versions, status) VALUES (gen_random_uuid(), '${s.projectId}', 'owner', 'user', '{}', 0, '{}', 'committed')`,
        `UPDATE public.creative_op_journal SET status = 'rejected' WHERE project_id = '${s.projectId}'`,
        `DELETE FROM public.creative_op_journal WHERE project_id = '${s.projectId}'`,
      ]) {
        expect((await pgError(asUser(db.pool, s.ownerId, (c) => c.query(sql))))?.code, sql.slice(0, 20)).toBe("42501");
      }
      expect((await pgError(asAnon(db.pool, (c) => c.query(`SELECT 1 FROM public.creative_op_journal`))))?.code).toBe("42501");
    });
  });
});
