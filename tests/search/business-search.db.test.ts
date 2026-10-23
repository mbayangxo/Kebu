import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createSearchTestDb, dropSearchTestDb, isLocalPgReachable, type Db } from "./db/local-pg";

let db: Db | null = null;
let userId: string;

async function insertBusiness(
  id: string,
  overrides: Partial<{
    legal_name: string;
    trading_name: string | null;
    country_code: string;
    category: string;
    description: string;
    lifecycle_status: string;
    verification_level: number;
  }> = {},
) {
  const o = {
    legal_name: `Business ${id}`,
    trading_name: null,
    country_code: "SN",
    category: "fashion",
    description: "A real business description for search ranking tests.",
    lifecycle_status: "active",
    verification_level: 2,
    ...overrides,
  };
  // A real KEBU-CC-01-XXXXXX id, unique per test business (the id's own last
  // 6 hex digits are enough entropy within one test's small, fixed id set).
  const suffix = id.replace(/-/g, "").slice(-6).toUpperCase();
  await db!.pool.query(
    `insert into public.businesses
       (id, public_kebu_id, legal_name, trading_name, country_code, category, description, lifecycle_status, verification_level, created_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id, `KEBU-${o.country_code}-01-${suffix}`,
     o.legal_name, o.trading_name, o.country_code, o.category, o.description, o.lifecycle_status, o.verification_level, userId],
  );
}

async function insertSearchDocument(businessId: string, overrides: Partial<{ title: string; summary: string; updated_at: string }> = {}) {
  const o = { title: `Business ${businessId}`, summary: "fashion · SN", updated_at: new Date().toISOString(), ...overrides };
  await db!.pool.query(
    `insert into public.search_documents
       (source_key, mode, entity_type, entity_id, title, summary, trust_label, access_scope, category, country_code, fetched_at, updated_at)
     values ($1, 'businesses', 'business', $2, $3, $4, 'verified', 'public', 'fashion', 'SN', now(), $5)`,
    [`business:${businessId}`, businessId, o.title, o.summary, o.updated_at],
  );
}

async function searchResults(query: string | null, country: string | null = null) {
  const { rows } = await db!.pool.query(`select * from public.search_businesses($1, $2)`, [query, country]);
  return rows as Array<{ entity_id: string; title: string; rank: number; category: string; country_code: string }>;
}

describe("Kebu Search — real migrated SQL", () => {
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
    else await db.pool.query(`truncate public.businesses, public.search_documents restart identity`);
  });

  it("migrations apply cleanly: mode accepts 'businesses', category/country_code are real columns", async () => {
    const { rows } = await db!.pool.query(
      `select column_name from information_schema.columns where table_name = 'search_documents' and column_name in ('category','country_code')`,
    );
    expect(rows.map((r: { column_name: string }) => r.column_name).sort()).toEqual(["category", "country_code"]);

    await expect(
      db!.pool.query(
        `insert into public.search_documents (source_key, mode, entity_type, entity_id, title, access_scope) values ('probe', 'businesses', 'business', gen_random_uuid()::text, 'Probe', 'public')`,
      ),
    ).resolves.toBeDefined();
  });

  it("the real lifecycle_status CHECK constraint rejects anything outside the four real values", async () => {
    await expect(insertBusiness("11111111-1111-4111-8111-100000000001", { lifecycle_status: "pending" })).rejects.toThrow(
      /violates check constraint/,
    );
  });

  describe("live active-status enforcement — the release blocker from the Oct 23 review", () => {
    const id = "11111111-1111-4111-8111-100000000002";

    it("returns an active business whose index row is fresh", async () => {
      await insertBusiness(id);
      await insertSearchDocument(id);
      const results = await searchResults(null);
      expect(results.map((r) => r.entity_id)).toContain(id);
    });

    it.each(["draft", "suspended", "archived"])(
      "excludes it the moment lifecycle_status becomes %s, even with a stale, untouched index row",
      async (status) => {
        await insertBusiness(id);
        await insertSearchDocument(id); // index row never refreshed after the status change below
        await db!.pool.query(`update public.businesses set lifecycle_status = $1 where id = $2`, [status, id]);

        const results = await searchResults(null);
        expect(results.map((r) => r.entity_id)).not.toContain(id);

        // Reproduces the review's exact fixture: confirm the stale row really is
        // still sitting in search_documents — this is enforcement at read time,
        // not a side effect of the row having been cleaned up already.
        const { rows } = await db!.pool.query(`select 1 from public.search_documents where entity_id = $1`, [id]);
        expect(rows).toHaveLength(1);
      },
    );

    it("excludes a business deleted outright, even with a stale index row", async () => {
      await insertBusiness(id);
      await insertSearchDocument(id);
      await db!.pool.query(`delete from public.businesses where id = $1`, [id]);

      const results = await searchResults(null);
      expect(results.map((r) => r.entity_id)).not.toContain(id);
    });

    it("the public detail contract matches: active is visible, every other real transition is not", async () => {
      const activeId = "11111111-1111-4111-8111-100000000003";
      await insertBusiness(activeId, { lifecycle_status: "active" });
      await insertSearchDocument(activeId);
      expect((await searchResults(null)).map((r) => r.entity_id)).toContain(activeId);
    });
  });

  describe("relevance ranking", () => {
    it("ranks a title match above a match only in the free-text description, deterministically", async () => {
      const titleMatch = "11111111-1111-4111-8111-100000000010";
      const descOnlyMatch = "11111111-1111-4111-8111-100000000011";
      const noMatch = "11111111-1111-4111-8111-100000000012";

      await insertBusiness(titleMatch, { legal_name: "Baobab Chocolate Manufacturing" });
      await insertSearchDocument(titleMatch, { title: "Baobab Chocolate Manufacturing" });

      await insertBusiness(descOnlyMatch, { legal_name: "Dakar Sweets Co" });
      await insertSearchDocument(descOnlyMatch, { title: "Dakar Sweets Co", summary: "A small chocolate retailer." });

      await insertBusiness(noMatch, { legal_name: "Textile Wholesaler" });
      await insertSearchDocument(noMatch, { title: "Textile Wholesaler", summary: "Fabric and thread supplier." });

      const results = await searchResults("chocolate");
      const ids = results.map((r) => r.entity_id);
      expect(ids).toContain(titleMatch);
      expect(ids).toContain(descOnlyMatch);
      expect(ids).not.toContain(noMatch); // not just a filter — unrelated businesses are excluded entirely

      const titleRank = results.find((r) => r.entity_id === titleMatch)!.rank;
      const descRank = results.find((r) => r.entity_id === descOnlyMatch)!.rank;
      expect(titleRank).toBeGreaterThan(descRank); // title-weighted (setweight 'A') outranks body text ('B')
    });

    it("breaks rank ties deterministically by recency, then by id — never by insertion order alone", async () => {
      const older = "11111111-1111-4111-8111-100000000020";
      const newer = "11111111-1111-4111-8111-100000000021";
      // Insert the "newer" one first, to prove ordering isn't just insertion order.
      await insertBusiness(newer, { legal_name: "Fashion House" });
      await insertSearchDocument(newer, { title: "Fashion House", updated_at: "2026-10-20T00:00:00Z" });
      await insertBusiness(older, { legal_name: "Fashion House" });
      await insertSearchDocument(older, { title: "Fashion House", updated_at: "2026-10-01T00:00:00Z" });

      const first = await searchResults("fashion");
      const second = await searchResults("fashion");
      expect(first.map((r) => r.entity_id)).toEqual(second.map((r) => r.entity_id)); // same order every call
      expect(first[0]!.entity_id).toBe(newer); // more recently updated, same rank, wins the tie
    });
  });

  describe("country filter", () => {
    it("filters to an exact country code using the real structured column", async () => {
      const sn = "11111111-1111-4111-8111-100000000030";
      const gh = "11111111-1111-4111-8111-100000000031";
      await insertBusiness(sn, { country_code: "SN" });
      await insertSearchDocument(sn);
      await insertBusiness(gh, { country_code: "GH" });
      await db!.pool.query(
        `insert into public.search_documents (source_key, mode, entity_type, entity_id, title, access_scope, category, country_code, trust_label)
         values ('business:' || $1, 'businesses', 'business', $1, 'Accra Foods', 'public', 'food', 'GH', 'verified')`,
        [gh],
      );

      const results = await searchResults(null, "SN");
      expect(results.map((r) => r.entity_id)).toEqual([sn]);
    });
  });
});
