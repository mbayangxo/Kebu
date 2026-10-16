/**
 * Local-fixture verification of the business_members SELECT-policy forward
 * repair (20261016170000_business_members_select_recursion_repair.sql).
 *
 * IMPORTANT — this is NOT a hosted-schema verification. businesses/
 * business_members/business_invites have never been captured in this
 * repository's canonical supabase/migrations/ chain (see
 * supabase/MIGRATION_HISTORY.md's "Bootstrap limitation" and
 * supabase/migrations_archive/README.md); they exist only on the hosted
 * project and in the archived, explicitly non-executable legacy SQL. This
 * test reconstructs a MINIMAL fixture matching the archived schema
 * (supabase/migrations_archive/legacy/005_kebu_id_draft_business.sql) as
 * ground truth for the two policy variants that have ever existed, and
 * verifies the repair migration's actual SQL text against that fixture —
 * it proves the repair logic is sound, not that it matches whatever is
 * currently live on the hosted project (which this workspace cannot
 * inspect). The full businesses/business_members/business_invites
 * bootstrap gate, and hosted/live-schema compatibility, remain explicitly
 * open.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = { exec: (sql: string) => Promise<unknown>; query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; close: () => Promise<void> };

const founder = "11111111-1111-4111-8111-111111111111";
const admin = "22222222-2222-4222-8222-222222222222";
const employee = "33333333-3333-4333-8333-333333333333";
const stranger = "44444444-4444-4444-8444-444444444444";

// Verbatim table shape from 005_kebu_id_draft_business.sql, trimmed to the
// columns these policies actually reference.
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

  create table public.businesses (
    id uuid primary key default gen_random_uuid(),
    created_by uuid not null references auth.users(id) on delete restrict
  );

  create table public.business_members (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references public.businesses(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in (
      'founder', 'cofounder', 'beneficial_owner', 'director', 'administrator',
      'finance_manager', 'store_manager', 'developer', 'designer', 'employee',
      'accountant', 'legal_representative', 'viewer'
    )),
    status text not null default 'active' check (status in ('pending', 'active', 'removed')),
    unique (business_id, user_id)
  );
  alter table public.business_members enable row level security;
`;

// Archived variant 1: the original, recursive policy
// (005_kebu_id_draft_business.sql / APPLY_MIGRATIONS_005_007.sql).
const RECURSIVE_VARIANT = `
  drop policy if exists "Users select own memberships" on public.business_members;
  create policy "Users select own memberships"
    on public.business_members for select
    using (user_id = auth.uid() or exists (
      select 1 from public.business_members m2
      where m2.business_id = business_members.business_id
        and m2.user_id = auth.uid()
        and m2.status = 'active'
        and m2.role in ('founder', 'administrator')
    ));
`;

// Archived variant 2: 020_fix_business_members_rls.sql's self-row-only fix.
const SELF_ROW_ONLY_VARIANT = `
  drop policy if exists "Users select own memberships" on public.business_members;
  create policy "Users select own memberships"
    on public.business_members for select
    using (user_id = auth.uid());
`;

async function openDb(preFixVariant: "recursive" | "self-row-only", applyRepair: boolean): Promise<Db> {
  const { PGlite } = await import(pathToFileURL(resolve(root!, "dist/index.js")).href);
  const { pgcrypto } = await import(pathToFileURL(resolve(root!, "dist/contrib/pgcrypto.js")).href);
  const db: Db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SCHEMA_FIXTURE);
  await db.exec(preFixVariant === "recursive" ? RECURSIVE_VARIANT : SELF_ROW_ONLY_VARIANT);
  await db.exec(`insert into auth.users(id) values ('${founder}'), ('${admin}'), ('${employee}'), ('${stranger}');`);
  if (applyRepair) {
    const sql = readFileSync(resolve("supabase/migrations/20261016170000_business_members_select_recursion_repair.sql"), "utf8");
    await db.exec(sql);
  }
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

async function seedBusinessWithTeam(db: Db) {
  await db.exec(`reset role;`);
  const business = await db.query(`insert into public.businesses(created_by) values ('${founder}') returning id`);
  const businessId = business.rows[0].id as string;
  await db.exec(`
    insert into public.business_members(business_id, user_id, role, status) values
      ('${businessId}', '${founder}', 'founder', 'active'),
      ('${businessId}', '${admin}', 'administrator', 'active'),
      ('${businessId}', '${employee}', 'employee', 'active');
  `);
  return businessId;
}

describe.skipIf(!root)("business_members SELECT-policy forward repair (local fixture, not hosted-verified)", () => {
  it("confirms the regression against the recursive archived variant: a founder reading a teammate's row hits infinite recursion", async () => {
    const db = await openDb("recursive", false);
    const businessId = await seedBusinessWithTeam(db);
    await expect(
      asUser(db, founder, "select user_id, role from business_members where business_id=$1 and user_id=$2", [businessId, employee]),
    ).rejects.toThrow(/infinite recursion/i);
    await db.close();
  }, 30_000);

  it("confirms the limitation of the self-row-only archived variant: a founder cannot see a teammate's row at all (no error, just missing)", async () => {
    const db = await openDb("self-row-only", false);
    const businessId = await seedBusinessWithTeam(db);
    const result = await asUser(db, founder, "select user_id from business_members where business_id=$1 and user_id=$2", [businessId, employee]);
    expect(result.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  for (const variant of ["recursive", "self-row-only"] as const) {
    it(`with the repair applied on top of the "${variant}" archived variant, a founder can see the full team roster without recursion`, async () => {
      const db = await openDb(variant, true);
      const businessId = await seedBusinessWithTeam(db);
      const result = await asUser(db, founder, "select user_id, role from business_members where business_id=$1 order by role", [businessId]);
      expect(result.rows).toHaveLength(3);
      await db.close();
    }, 30_000);

    it(`with the repair applied on top of the "${variant}" archived variant, an administrator (not just the founder) can see the full roster`, async () => {
      const db = await openDb(variant, true);
      const businessId = await seedBusinessWithTeam(db);
      const result = await asUser(db, admin, "select user_id from business_members where business_id=$1", [businessId]);
      expect(result.rows).toHaveLength(3);
      await db.close();
    }, 30_000);

    it(`with the repair applied on top of the "${variant}" archived variant, a non-admin employee still sees only their own row — the original, tighter authorization is preserved, not widened`, async () => {
      const db = await openDb(variant, true);
      const businessId = await seedBusinessWithTeam(db);
      const result = await asUser(db, employee, "select user_id from business_members where business_id=$1", [businessId]);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].user_id).toBe(employee);
      await db.close();
    }, 30_000);

    it(`with the repair applied on top of the "${variant}" archived variant, a non-member stranger sees nothing`, async () => {
      const db = await openDb(variant, true);
      const businessId = await seedBusinessWithTeam(db);
      const result = await asUser(db, stranger, "select user_id from business_members where business_id=$1", [businessId]);
      expect(result.rows).toHaveLength(0);
      await db.close();
    }, 30_000);
  }
});
