import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createSearchTestDb, dropSearchTestDb, isLocalPgReachable, type Db } from "./db/local-pg";

let db: Db | null = null;
let userId: string;

async function insertDoc(
  mode: string,
  entityId: string,
  overrides: Partial<{ title: string; summary: string; accessScope: string; entityType: string }> = {},
) {
  const o = { title: `${mode} ${entityId}`, summary: "summary", accessScope: "public", entityType: mode, ...overrides };
  await db!.pool.query(
    `insert into public.search_documents
       (source_key, mode, entity_type, entity_id, title, summary, trust_label, access_scope, fetched_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, 'published', $7, now(), now())`,
    [`${mode}:${entityId}`, mode, o.entityType, entityId, o.title, o.summary, o.accessScope],
  );
}

describe("Kebu Search — Opportunities/People/Research/Trade/Culture/Africa — real migrated SQL", () => {
  beforeAll(async () => {
    if (!(await isLocalPgReachable())) return;
    db = await createSearchTestDb();
    const { rows } = await db.pool.query(`insert into auth.users default values returning id`);
    userId = rows[0].id;
  });

  afterAll(async () => {
    if (db) await dropSearchTestDb(db);
  });

  beforeEach(async (ctx) => {
    if (!db) ctx.skip();
    else {
      await db.pool.query(
        `truncate public.search_documents, public.afrique_ids, public.developer_profiles,
                  public.country_profiles, public.projects restart identity cascade`,
      );
    }
  });

  describe("search_opportunities — live-joins the caller's own afrique_ids row, not the entity", () => {
    const entityId = "22222222-2222-4222-8222-100000000001";

    it("returns zero rows (never an error) for a caller with no afrique_ids row at all", async () => {
      await insertDoc("opportunities", entityId, { accessScope: "opportunity_verified" });
      const { rows } = await db!.pool.query(`select * from public.search_opportunities($1)`, [userId]);
      expect(rows).toHaveLength(0);
    });

    it("returns zero rows for a caller whose Afrique ID is pending, not verified", async () => {
      await insertDoc("opportunities", entityId, { accessScope: "opportunity_verified" });
      await db!.pool.query(
        `insert into public.afrique_ids (user_id, public_afrique_id, country_code, identity_type, eligibility_status)
         values ($1, 'AID-SN-01-000001', 'SN', 'indigenous', 'pending')`,
        [userId],
      );
      const { rows } = await db!.pool.query(`select * from public.search_opportunities($1)`, [userId]);
      expect(rows).toHaveLength(0);
    });

    it("returns zero rows for a verified caller whose identity_type is visitor, not indigenous", async () => {
      await insertDoc("opportunities", entityId, { accessScope: "opportunity_verified" });
      await db!.pool.query(
        `insert into public.afrique_ids (user_id, public_afrique_id, country_code, identity_type, eligibility_status)
         values ($1, 'AID-SN-01-000002', 'SN', 'visitor', 'verified')`,
        [userId],
      );
      const { rows } = await db!.pool.query(`select * from public.search_opportunities($1)`, [userId]);
      expect(rows).toHaveLength(0);
    });

    it("returns the result once the caller is verified and indigenous — and loses it the instant that flips back", async () => {
      await insertDoc("opportunities", entityId, { accessScope: "opportunity_verified" });
      await db!.pool.query(
        `insert into public.afrique_ids (user_id, public_afrique_id, country_code, identity_type, eligibility_status)
         values ($1, 'AID-SN-01-000003', 'SN', 'indigenous', 'verified')`,
        [userId],
      );
      const verified = await db!.pool.query(`select * from public.search_opportunities($1)`, [userId]);
      expect(verified.rows.map((r: { entity_id: string }) => r.entity_id)).toContain(entityId);

      await db!.pool.query(`update public.afrique_ids set eligibility_status = 'suspended' where user_id = $1`, [userId]);
      const suspended = await db!.pool.query(`select * from public.search_opportunities($1)`, [userId]);
      expect(suspended.rows.map((r: { entity_id: string }) => r.entity_id)).not.toContain(entityId);
    });
  });

  describe("search_people — live-joins developer_profiles.status", () => {
    it("excludes a developer the instant status leaves 'approved', even with a stale index row", async () => {
      const { rows: devRows } = await db!.pool.query(
        `insert into public.developer_profiles (user_id, display_name, status) values ($1, 'Amina Dev', 'approved') returning id`,
        [userId],
      );
      const devId = devRows[0].id;
      await insertDoc("people", devId, { title: "Amina Dev" });

      const before = await db!.pool.query(`select * from public.search_people(null)`);
      expect(before.rows.map((r: { entity_id: string }) => r.entity_id)).toContain(devId);

      await db!.pool.query(`update public.developer_profiles set status = 'suspended' where id = $1`, [devId]);
      const after = await db!.pool.query(`select * from public.search_people(null)`);
      expect(after.rows.map((r: { entity_id: string }) => r.entity_id)).not.toContain(devId);
    });
  });

  describe("search_country_intel — one shared function over research/trade/culture, live-joining publish_status", () => {
    beforeEach(async () => {
      await db!.pool.query(
        `insert into public.country_profiles (country, country_code, economy_overview, cultural_notes, publish_status)
         values ('Senegal', 'SN', 'Services and trade dominate.', 'Teranga hospitality culture.', 'published')`,
      );
      await insertDoc("research", "SN", { title: "Senegal" });
      await insertDoc("trade", "SN", { title: "Senegal" });
      await insertDoc("culture", "SN", { title: "Senegal" });
    });

    it.each(["research", "trade", "culture"])("mode '%s' returns the published country", async (mode) => {
      const { rows } = await db!.pool.query(`select * from public.search_country_intel($1, null)`, [mode]);
      expect(rows.map((r: { entity_id: string }) => r.entity_id)).toContain("SN");
    });

    it("rejects an unrecognized p_mode value (no fourth mode exists)", async () => {
      const { rows } = await db!.pool.query(`select * from public.search_country_intel($1, null)`, ["gossip"]);
      expect(rows).toHaveLength(0);
    });

    it.each(["research", "trade", "culture"])(
      "excludes Senegal under '%s' the instant it reverts to draft, even with a stale index row",
      async (mode) => {
        await db!.pool.query(`update public.country_profiles set publish_status = 'draft' where country_code = 'SN'`);
        const { rows } = await db!.pool.query(`select * from public.search_country_intel($1, null)`, [mode]);
        expect(rows.map((r: { entity_id: string }) => r.entity_id)).not.toContain("SN");
      },
    );
  });

  describe("search_sites (exposed in the UI as Africa) — live-joins projects.status and subdomain", () => {
    it("excludes a site the instant it's unpublished, even with a stale index row", async () => {
      const { rows: projRows } = await db!.pool.query(
        `insert into public.projects (owner_id, title, status, subdomain) values ($1, 'Baobab Store', 'published', 'baobab') returning id`,
        [userId],
      );
      const projectId = projRows[0].id;
      await insertDoc("sites", projectId, { title: "Baobab Store", entityType: "store" });

      const before = await db!.pool.query(`select * from public.search_sites(null)`);
      expect(before.rows.map((r: { entity_id: string }) => r.entity_id)).toContain(projectId);

      await db!.pool.query(`update public.projects set status = 'draft' where id = $1`, [projectId]);
      const after = await db!.pool.query(`select * from public.search_sites(null)`);
      expect(after.rows.map((r: { entity_id: string }) => r.entity_id)).not.toContain(projectId);
    });

    it("excludes a project with no subdomain assigned yet, even if marked published", async () => {
      const { rows: projRows } = await db!.pool.query(
        `insert into public.projects (owner_id, title, status, subdomain) values ($1, 'No Subdomain Yet', 'published', null) returning id`,
        [userId],
      );
      const projectId = projRows[0].id;
      await insertDoc("sites", projectId, { title: "No Subdomain Yet" });

      const { rows } = await db!.pool.query(`select * from public.search_sites(null)`);
      expect(rows.map((r: { entity_id: string }) => r.entity_id)).not.toContain(projectId);
    });
  });
});
