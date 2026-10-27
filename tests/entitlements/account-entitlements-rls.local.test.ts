/**
 * Local-fixture verification of the REAL account_entitlements RLS policies
 * (supabase/migrations_archive/legacy/062_account_entitlements.sql), applied
 * verbatim against real PostgreSQL semantics via PGlite — not a rewritten
 * approximation. Proves the ownership boundary the account control center's
 * revoke/restore feature depends on actually holds: a user can read/write
 * only their own entitlement row, never another user's, at the database
 * layer itself (independent of whatever the application code additionally
 * enforces). Same local-fixture convention and limits as
 * tests/business/business-members-select-policy.local.test.ts — this is not
 * a hosted-schema verification; account_entitlements exists only in the
 * archived legacy SQL and (per 20260919101805_enforce_opportunity_verified_access.sql,
 * which already assumes its live presence) on the hosted project.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = { exec: (sql: string) => Promise<unknown>; query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; close: () => Promise<void> };

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";

const SCHEMA_FIXTURE = `
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

  -- Shared updated_at trigger helper, verbatim from
  -- supabase/migrations_archive/legacy/005_kebu_id_draft_business.sql --
  -- 062's own trigger depends on this already existing on the real baseline.
  create or replace function public.set_updated_at()
  returns trigger language plpgsql as $$
  begin
    new.updated_at = now();
    return new;
  end;
  $$;

  insert into auth.users(id) values ('${userA}'), ('${userB}');
`;

async function openDb(): Promise<Db> {
  const { PGlite } = await import(pathToFileURL(resolve(root!, "dist/index.js")).href);
  const { pgcrypto } = await import(pathToFileURL(resolve(root!, "dist/contrib/pgcrypto.js")).href);
  const db: Db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SCHEMA_FIXTURE);
  const migration = readFileSync(resolve("supabase/migrations_archive/legacy/062_account_entitlements.sql"), "utf8");
  await db.exec(migration);
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

describe.skipIf(!root)("account_entitlements RLS (real migration, local fixture, not hosted-verified)", () => {
  it("a user can insert and read their own entitlement row", async () => {
    const db = await openDb();
    await asUser(
      db, userA,
      `insert into public.account_entitlements(user_id, entitlement_key, status) values ($1, 'african_opportunity_access', 'verified')`,
      [userA],
    );
    const result = await asUser(db, userA, `select status from public.account_entitlements where user_id=$1`, [userA]);
    expect(result.rows).toEqual([{ status: "verified" }]);
    await db.close();
  }, 30_000);

  it("a user cannot insert an entitlement row for someone else — RLS WITH CHECK blocks it, not just app code", async () => {
    const db = await openDb();
    await expect(
      asUser(
        db, userA,
        `insert into public.account_entitlements(user_id, entitlement_key, status) values ($1, 'african_opportunity_access', 'verified')`,
        [userB],
      ),
    ).rejects.toThrow(/row-level security/i);
    await db.close();
  }, 30_000);

  it("a user cannot read another user's entitlement row — the revoke status of one user never leaks to another", async () => {
    const db = await openDb();
    await asUser(
      db, userB,
      `insert into public.account_entitlements(user_id, entitlement_key, status) values ($1, 'african_opportunity_access', 'revoked')`,
      [userB],
    );
    const asA = await asUser(db, userA, `select status from public.account_entitlements where user_id=$1`, [userB]);
    expect(asA.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("a user can revoke (update their own row to 'revoked') and later restore it — the real revoke/restore contract", async () => {
    const db = await openDb();
    await asUser(
      db, userA,
      `insert into public.account_entitlements(user_id, entitlement_key, status) values ($1, 'african_opportunity_access', 'verified')`,
      [userA],
    );
    await asUser(
      db, userA,
      `update public.account_entitlements set status='revoked', revoked_at=now() where user_id=$1 and entitlement_key='african_opportunity_access'`,
      [userA],
    );
    const revoked = await asUser(db, userA, `select status from public.account_entitlements where user_id=$1`, [userA]);
    expect(revoked.rows).toEqual([{ status: "revoked" }]);

    await asUser(
      db, userA,
      `update public.account_entitlements set status='verified', revoked_at=null where user_id=$1 and entitlement_key='african_opportunity_access'`,
      [userA],
    );
    const restored = await asUser(db, userA, `select status from public.account_entitlements where user_id=$1`, [userA]);
    expect(restored.rows).toEqual([{ status: "verified" }]);
    await db.close();
  }, 30_000);

  it("a user cannot update another user's entitlement row — one account can never revoke or restore someone else's permission", async () => {
    const db = await openDb();
    await asUser(
      db, userB,
      `insert into public.account_entitlements(user_id, entitlement_key, status) values ($1, 'african_opportunity_access', 'verified')`,
      [userB],
    );
    const result = await asUser(
      db, userA,
      `update public.account_entitlements set status='revoked' where user_id=$1 returning status`,
      [userB],
    );
    // RLS silently filters the target row rather than erroring -- 0 rows
    // updated, not an exception. Confirm B's row is genuinely untouched.
    expect(result.rows).toHaveLength(0);
    const stillVerified = await asUser(db, userB, `select status from public.account_entitlements where user_id=$1`, [userB]);
    expect(stillVerified.rows).toEqual([{ status: "verified" }]);
    await db.close();
  }, 30_000);
});
