/**
 * Real-SQL verification of the Studio Creative Assets Marketplace migration
 * (20261020030000_studio_creative_assets_marketplace.sql) applied verbatim —
 * not a reimplementation. Covers both halves of what this migration does:
 * (1) ports developer_profiles into the canonical chain for the first time
 * (it previously only existed in the archived legacy SQL, so a fresh/local
 * database had no table at all — reproduced below before trusting the fix),
 * and (2) the new marketplace_creative_assets / creative_asset_library RLS,
 * including the free-only launch scope being enforced at the database layer,
 * not just in application code. Hosted Supabase Auth/RLS acceptance remains
 * explicitly open.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = { exec: (sql: string) => Promise<unknown>; query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; close: () => Promise<void> };

const devA = "11111111-1111-4111-8111-111111111111";
const devB = "22222222-2222-4222-8222-222222222222";
const stranger = "33333333-3333-4333-8333-333333333333";

async function openBaseDb(): Promise<Db> {
  const { PGlite } = await import(pathToFileURL(resolve(root!, "dist/index.js")).href);
  const { pgcrypto } = await import(pathToFileURL(resolve(root!, "dist/contrib/pgcrypto.js")).href);
  const db: Db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    create extension if not exists pgcrypto;
    create schema auth;
    create table auth.users(id uuid primary key, email text, created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    do $$begin
      if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
      if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
      if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
    end$$;
    alter default privileges in schema public grant all on tables to authenticated,anon,service_role;
    grant usage on schema public, auth to authenticated, anon, service_role;
    grant execute on all functions in schema auth to authenticated, anon, service_role;
    create or replace function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at = now(); return new; end$$;
    insert into auth.users(id) values ('${devA}'), ('${devB}'), ('${stranger}');
  `);
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

describe.skipIf(!root)("Studio Creative Assets Marketplace migration (real SQL)", () => {
  it("reproduces the pre-fix defect: developer_profiles does not exist on a fresh database", { timeout: 20000 }, async () => {
    const db = await openBaseDb();
    try {
      await expect(db.query("select 1 from public.developer_profiles limit 1")).rejects.toThrow(/does not exist/);
    } finally {
      await db.close();
    }
  });

  it("creates developer_profiles, marketplace_creative_assets and creative_asset_library with working RLS", { timeout: 20000 }, async () => {
    const db = await openBaseDb();
    try {
      await db.exec(readFileSync(resolve("supabase/migrations/20261020030000_studio_creative_assets_marketplace.sql"), "utf8"));

      // Developer A creates their profile (auto-approved, matching the aesthetics marketplace precedent).
      await asUser(db, devA, "insert into developer_profiles(user_id, display_name, status, reviewed_at) values ($1,'Dev A','approved',now())", [devA]);
      const devARow = await asUser(db, devA, "select id, status from developer_profiles where user_id=$1", [devA]);
      expect(devARow.rows[0]?.status).toBe("approved");
      const devAId = devARow.rows[0]!.id as string;

      // Developer B profile stays pending (not approved) — cannot publish.
      await asUser(db, devB, "insert into developer_profiles(user_id, display_name, status) values ($1,'Dev B','pending')", [devB]);
      const devBRow = await asUser(db, devB, "select id from developer_profiles where user_id=$1", [devB]);
      const devBId = devBRow.rows[0]!.id as string;

      // Public (approved) profile readable by a stranger; a stranger cannot read a pending one's identity beyond nothing leaking.
      const publicRead = await asUser(db, stranger, "select display_name from developer_profiles where id=$1", [devAId]);
      expect(publicRead.rows[0]?.display_name).toBe("Dev A");
      const pendingRead = await asUser(db, stranger, "select display_name from developer_profiles where id=$1", [devBId]);
      expect(pendingRead.rows.length).toBe(0);

      // Approved developer A publishes a free pattern.
      await asUser(
        db,
        devA,
        "insert into marketplace_creative_assets(developer_id, slug, kind, name, file_url, price_cents, status) values ($1,'kente-stripe','pattern','Kente stripe','https://files.example/kente.png',0,'published')",
        [devAId],
      );
      const published = await asUser(db, stranger, "select name, status from marketplace_creative_assets where developer_id=$1", [devAId]);
      expect(published.rows[0]?.name).toBe("Kente stripe");

      // Non-approved developer B cannot publish (RLS WITH CHECK requires status='approved').
      await expect(
        asUser(
          db,
          devB,
          "insert into marketplace_creative_assets(developer_id, slug, kind, name, file_url, price_cents, status) values ($1,'blocked','photo','Should fail','https://files.example/x.png',0,'published')",
          [devBId],
        ),
      ).rejects.toThrow();

      // Free-only launch scope enforced at the database layer, not just application code.
      await expect(
        asUser(
          db,
          devA,
          "insert into marketplace_creative_assets(developer_id, slug, kind, name, file_url, price_cents, status) values ($1,'paid-attempt','photo','Paid attempt','https://files.example/y.png',500,'published')",
          [devAId],
        ),
      ).rejects.toThrow();

      // Stranger cannot forge another developer's listing.
      await expect(
        asUser(
          db,
          stranger,
          "insert into marketplace_creative_assets(developer_id, slug, kind, name, file_url, price_cents, status) values ($1,'forged','photo','Forged','https://files.example/z.png',0,'published')",
          [devAId],
        ),
      ).rejects.toThrow();

      // A draft asset is only visible to its own developer, not strangers.
      await asUser(
        db,
        devA,
        "insert into marketplace_creative_assets(developer_id, slug, kind, name, file_url, price_cents, status) values ($1,'wip-font','font','WIP font','https://files.example/f.ttf',0,'draft')",
        [devAId],
      );
      const draftAsStranger = await asUser(db, stranger, "select id from marketplace_creative_assets where slug='wip-font'");
      expect(draftAsStranger.rows.length).toBe(0);
      const draftAsOwner = await asUser(db, devA, "select id from marketplace_creative_assets where slug='wip-font'");
      expect(draftAsOwner.rows.length).toBe(1);

      // Stranger acquires the published pattern into their own library.
      const patternId = (await asUser(db, stranger, "select id from marketplace_creative_assets where slug='kente-stripe'")).rows[0]!.id as string;
      await asUser(db, stranger, "insert into creative_asset_library(owner_id, asset_id, status) values ($1,$2,'owned')", [stranger, patternId]);
      const myLibrary = await asUser(db, stranger, "select asset_id from creative_asset_library where owner_id=$1", [stranger]);
      expect(myLibrary.rows.length).toBe(1);

      // Nobody else can read a stranger's library.
      const othersLibrary = await asUser(db, devA, "select asset_id from creative_asset_library where owner_id=$1", [stranger]);
      expect(othersLibrary.rows.length).toBe(0);

      // Nobody can forge an acquisition for someone else.
      await expect(
        asUser(db, devA, "insert into creative_asset_library(owner_id, asset_id, status) values ($1,$2,'owned')", [stranger, patternId]),
      ).rejects.toThrow();
    } finally {
      await db.close();
    }
  });
});
