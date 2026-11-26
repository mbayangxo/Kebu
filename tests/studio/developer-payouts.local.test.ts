/**
 * Real-SQL verification of the developer payout settings migration
 * (20261020040000_developer_payout_settings.sql) applied verbatim on top of
 * 20261020030000_studio_creative_assets_marketplace.sql — not a
 * reimplementation. Confirms: a paid listing is rejected at the database
 * layer until a real payout destination is on file (reproduced before
 * confirming the fix), a payout request must match the developer's own
 * recorded destination, a developer cannot forge another developer's
 * payout, and a developer cannot self-mark a payout as paid. Hosted
 * Supabase Auth/RLS acceptance remains explicitly open.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = { exec: (sql: string) => Promise<unknown>; query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; close: () => Promise<void> };

const devA = "11111111-1111-4111-8111-111111111111";
const devB = "22222222-2222-4222-8222-222222222222";

async function openDb(): Promise<Db> {
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
    insert into auth.users(id) values ('${devA}'), ('${devB}');
  `);
  await db.exec(readFileSync(resolve("supabase/migrations/20261020030000_studio_creative_assets_marketplace.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261020040000_developer_payout_settings.sql"), "utf8"));
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

describe.skipIf(!root)("Developer payout settings migration (real SQL)", () => {
  it("blocks a paid listing until a real payout destination is on file, then allows it once one is", { timeout: 20000 }, async () => {
    const db = await openDb();
    try {
      await asUser(db, devA, "insert into developer_profiles(user_id, display_name, status, reviewed_at) values ($1,'Dev A','approved',now())", [devA]);
      const devAId = (await asUser(db, devA, "select id from developer_profiles where user_id=$1", [devA])).rows[0]!.id as string;

      // Reproduce the defect first: no payout destination yet, paid listing must fail.
      await expect(
        asUser(
          db,
          devA,
          "insert into marketplace_creative_assets(developer_id, slug, kind, name, file_url, price_cents, status) values ($1,'paid-pattern','pattern','Paid pattern','https://files.example/p.png',500,'published')",
          [devAId],
        ),
      ).rejects.toThrow();

      // Partial payout setup (method only, no phone/name) still must not unlock paid listings.
      await asUser(db, devA, "update developer_profiles set payout_method='wave' where id=$1", [devAId]);
      await expect(
        asUser(
          db,
          devA,
          "insert into marketplace_creative_assets(developer_id, slug, kind, name, file_url, price_cents, status) values ($1,'still-blocked','pattern','Still blocked','https://files.example/p2.png',500,'published')",
          [devAId],
        ),
      ).rejects.toThrow();

      // Full payout destination on file — now a paid listing is allowed.
      await asUser(db, devA, "update developer_profiles set payout_phone='+221700000000', payout_account_name='Dev A' where id=$1", [devAId]);
      const paid = await asUser(
        db,
        devA,
        "insert into marketplace_creative_assets(developer_id, slug, kind, name, file_url, price_cents, status) values ($1,'paid-pattern-2','pattern','Paid pattern 2','https://files.example/p3.png',500,'published') returning id",
        [devAId],
      );
      expect(paid.rows.length).toBe(1);

      // Free listings keep working regardless of payout setup.
      await asUser(
        db,
        devA,
        "insert into marketplace_creative_assets(developer_id, slug, kind, name, file_url, price_cents, status) values ($1,'free-still-fine','pattern','Free still fine','https://files.example/p4.png',0,'published')",
        [devAId],
      );
    } finally {
      await db.close();
    }
  });

  it("requires a payout request to match the developer's own recorded destination, and only service_role can mark it paid", { timeout: 20000 }, async () => {
    const db = await openDb();
    try {
      await asUser(db, devA, "insert into developer_profiles(user_id, display_name, status, reviewed_at, payout_method, payout_phone, payout_account_name) values ($1,'Dev A','approved',now(),'wave','+221700000000','Dev A')", [devA]);
      const devAId = (await asUser(db, devA, "select id from developer_profiles where user_id=$1", [devA])).rows[0]!.id as string;
      await asUser(db, devB, "insert into developer_profiles(user_id, display_name, status, reviewed_at) values ($1,'Dev B','approved',now())", [devB]);
      const devBId = (await asUser(db, devB, "select id from developer_profiles where user_id=$1", [devB])).rows[0]!.id as string;

      // Dev B has no payout destination at all — any request fails.
      await expect(
        asUser(
          db,
          devB,
          "insert into developer_payouts(developer_id, amount_cents, method, destination_phone, destination_account_name) values ($1,1000,'wave','+221799999999','Dev B')",
          [devBId],
        ),
      ).rejects.toThrow();

      // Dev A requesting a payout to a DIFFERENT number than what's on file must fail (no forged destinations).
      await expect(
        asUser(
          db,
          devA,
          "insert into developer_payouts(developer_id, amount_cents, method, destination_phone, destination_account_name) values ($1,1000,'wave','+221000000000','Dev A')",
          [devAId],
        ),
      ).rejects.toThrow();

      // Dev A requesting a payout to their own actual recorded destination succeeds.
      const req = await asUser(
        db,
        devA,
        "insert into developer_payouts(developer_id, amount_cents, method, destination_phone, destination_account_name) values ($1,1000,'wave','+221700000000','Dev A') returning id, status",
        [devAId],
      );
      expect(req.rows[0]?.status).toBe("requested");
      const payoutId = req.rows[0]!.id as string;

      // Dev A cannot forge another developer's payout request.
      await expect(
        asUser(
          db,
          devA,
          "insert into developer_payouts(developer_id, amount_cents, method, destination_phone, destination_account_name) values ($1,1000,'wave','+221799999999','Dev B')",
          [devBId],
        ),
      ).rejects.toThrow();

      // The developer themself cannot mark their own payout as paid — no UPDATE policy exists for
      // authenticated, so RLS silently matches zero rows (Postgres doesn't throw for this on UPDATE,
      // unlike a WITH CHECK failure on INSERT — it just updates nothing).
      const selfMarkAttempt = await asUser(db, devA, "update developer_payouts set status='paid' where id=$1 returning id", [payoutId]);
      expect(selfMarkAttempt.rows.length).toBe(0);
      const stillRequested = await asUser(db, devA, "select status from developer_payouts where id=$1", [payoutId]);
      expect(stillRequested.rows[0]?.status).toBe("requested");

      // service_role (the real admin path) can.
      await db.exec("reset role; set role service_role;");
      const marked = await db.query("update developer_payouts set status='paid', processed_at=now() where id=$1 returning status", [payoutId]);
      expect(marked.rows[0]?.status).toBe("paid");

      // Dev A can read their own payout history; Dev B cannot read Dev A's.
      const devAHistory = await asUser(db, devA, "select id from developer_payouts where developer_id=$1", [devAId]);
      expect(devAHistory.rows.length).toBe(1);
      const devBReadsDevA = await asUser(db, devB, "select id from developer_payouts where developer_id=$1", [devAId]);
      expect(devBReadsDevA.rows.length).toBe(0);
    } finally {
      await db.close();
    }
  });
});
