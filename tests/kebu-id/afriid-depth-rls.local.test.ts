/**
 * Local-fixture (PGlite) verification of 20261027040000_afriid_kebu_id_depth.sql's
 * two real RLS/trigger fixes, plus the new schema's protected columns.
 *
 * Same explicit limitation as tests/business/business-members-select-policy.local.test.ts:
 * businesses/afrique_ids have never been captured in this repo's canonical
 * migration chain (see supabase/MIGRATION_HISTORY.md). This reconstructs a
 * minimal fixture matching the archived schema (005_kebu_id_draft_business.sql,
 * 027_afrique_id.sql, 037_african_id_aid_types.sql, 085_afrique_id_rls_identity_type.sql)
 * as ground truth, then applies this slice's real migration SQL on top and
 * proves its logic — not that it matches whatever is currently live on the
 * hosted project, which this workspace cannot inspect.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = { exec: (sql: string) => Promise<unknown>; query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; close: () => Promise<void> };

const founder = "11111111-1111-4111-8111-111111111111";
const admin = "22222222-2222-4222-8222-222222222222";
const stranger = "44444444-4444-4444-8444-444444444444";

const SCHEMA_FIXTURE = `
  create extension if not exists pgcrypto;
  create schema auth;
  create table auth.users(id uuid primary key, email text, created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create function auth.role() returns text language sql stable as $$select coalesce(current_setting('request.jwt.claim.role',true),'authenticated')$$;
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
    created_by uuid not null references auth.users(id) on delete restrict,
    legal_name text not null default 'Test Co',
    trading_name text,
    lifecycle_status text not null default 'draft' check (lifecycle_status in ('draft','active','suspended','archived')),
    verification_level integer not null default 1 check (verification_level between 1 and 4),
    updated_at timestamptz not null default now()
  );
  create table public.business_members (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references public.businesses(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null,
    status text not null default 'active'
  );
  alter table public.businesses enable row level security;

  -- Real SELECT policy, unchanged by this slice (005_kebu_id_draft_business.sql).
  -- UPDATE/DELETE need SELECT-level row visibility to evaluate a WHERE
  -- clause against candidate rows -- without this, even a correct UPDATE
  -- policy's USING clause never gets the chance to match anything.
  create policy "Members select own businesses"
    on public.businesses for select
    using (created_by = auth.uid() or exists (
      select 1 from public.business_members m
      where m.business_id = businesses.id and m.user_id = auth.uid() and m.status = 'active'
    ));

  -- Pre-fix archived policy (006_kebu_id_lock_draft_status.sql): pins
  -- verification_level=1 and lifecycle_status='draft' on every update.
  create policy "Founders update own draft businesses"
    on public.businesses for update
    using (exists (select 1 from public.business_members m where m.business_id = businesses.id and m.user_id = auth.uid() and m.status='active' and m.role in ('founder','administrator')))
    with check (verification_level = 1 and lifecycle_status = 'draft' and exists (select 1 from public.business_members m where m.business_id = businesses.id and m.user_id = auth.uid() and m.status='active' and m.role in ('founder','administrator')));

  create table public.afrique_ids (
    user_id uuid primary key references auth.users(id) on delete cascade,
    public_afrique_id text not null default 'AID-SN-01-TEST01',
    country_code char(2) not null default 'SN',
    identity_type text not null default 'indigenous',
    eligibility_status text not null default 'unverified' check (eligibility_status in ('unverified','pending','verified','rejected','expired','suspended','manual_review')),
    verified_at timestamptz,
    occupation text,
    updated_at timestamptz not null default now()
  );
  alter table public.afrique_ids enable row level security;
  -- Real SELECT policy, unchanged by this slice (027_afrique_id.sql). Same
  -- reason as businesses above: UPDATE needs this to see the row at all.
  create policy "Users read own Afrique ID"
    on public.afrique_ids for select
    using (auth.uid() = user_id);
  create policy "Users update own Afrique ID"
    on public.afrique_ids for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id and eligibility_status not in ('verified','suspended','manual_review'));
`;

async function openDb(): Promise<Db> {
  const { PGlite } = await import(pathToFileURL(resolve(root!, "dist/index.js")).href);
  const { pgcrypto } = await import(pathToFileURL(resolve(root!, "dist/contrib/pgcrypto.js")).href);
  const db: Db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SCHEMA_FIXTURE);
  await db.exec(`insert into auth.users(id) values ('${founder}'), ('${admin}'), ('${stranger}');`);
  return db;
}

async function applyRepair(db: Db) {
  const sql = readFileSync(resolve("supabase/migrations/20261027040000_afriid_kebu_id_depth.sql"), "utf8");
  // This fixture doesn't have the newer columns the migration also adds
  // (delivery_radius_km etc.) as pre-existing — the migration's own ADD
  // COLUMN IF NOT EXISTS handles that; what this test cares about is the
  // policy/trigger replacement further down the same file.
  await db.exec(sql);
}

async function asUser(db: Db, userId: string, sql: string) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set request.jwt.claim.role = 'authenticated'; set role authenticated;`);
  return db.query(sql);
}

async function asServiceRole(db: Db, sql: string) {
  await db.exec(`reset role; set request.jwt.claim.role = 'service_role'; set role service_role;`);
  return db.query(sql);
}

describe.skipIf(!root)("Kebu ID / AfriID depth migration — real RLS/trigger fixes (local fixture)", () => {
  it("confirms the regression: the archived policy blocks a trivial update once a business is active", async () => {
    const db = await openDb();
    await db.exec(`reset role;`);
    const biz = await db.query(`insert into public.businesses(created_by, lifecycle_status) values ('${founder}', 'active') returning id`);
    const businessId = biz.rows[0].id as string;
    await db.exec(`insert into public.business_members(business_id, user_id, role, status) values ('${businessId}', '${founder}', 'founder', 'active');`);

    await expect(
      asUser(db, founder, `update public.businesses set trading_name = 'New Name' where id = '${businessId}'`),
    ).rejects.toThrow(/row-level security|permission denied/i);
    await db.close();
  });

  it("after the fix: a founder can update an active business, but cannot self-set verification_level or lifecycle_status", async () => {
    const db = await openDb();
    await applyRepair(db);
    await db.exec(`reset role;`);
    const biz = await db.query(`insert into public.businesses(created_by, lifecycle_status) values ('${founder}', 'active') returning id`);
    const businessId = biz.rows[0].id as string;
    await db.exec(`insert into public.business_members(business_id, user_id, role, status) values ('${businessId}', '${founder}', 'founder', 'active');`);

    await asUser(db, founder, `update public.businesses set trading_name = 'New Name' where id = '${businessId}'`);
    const after = await asUser(db, founder, `select trading_name from public.businesses where id = '${businessId}'`);
    expect(after.rows[0].trading_name).toBe("New Name");

    await expect(
      asUser(db, founder, `update public.businesses set verification_level = 4 where id = '${businessId}'`),
    ).rejects.toThrow(/cannot be changed from the browser/i);
    await expect(
      asUser(db, founder, `update public.businesses set lifecycle_status = 'suspended' where id = '${businessId}'`),
    ).rejects.toThrow(/cannot be changed from the browser/i);

    // service_role (the admin client the recompute function uses) is exempt.
    await asServiceRole(db, `update public.businesses set verification_level = 2 where id = '${businessId}'`);
    const level = await asServiceRole(db, `select verification_level from public.businesses where id = '${businessId}'`);
    expect(level.rows[0].verification_level).toBe(2);

    // A stranger's update matches zero rows under RLS (USING hides the row
    // entirely rather than raising) — the real assertion is the row itself
    // never changed.
    await asUser(db, stranger, `update public.businesses set trading_name = 'Hijacked' where id = '${businessId}'`);
    const unchanged = await asServiceRole(db, `select trading_name from public.businesses where id = '${businessId}'`);
    expect(unchanged.rows[0].trading_name).toBe("New Name");
    await db.close();
  });

  it("confirms the regression: a verified AfriID owner can never update any field on their own row again", async () => {
    const db = await openDb();
    await db.exec(`reset role;`);
    await db.exec(`insert into public.afrique_ids(user_id, eligibility_status) values ('${founder}', 'verified');`);

    await expect(
      asUser(db, founder, `update public.afrique_ids set occupation = 'Tailor' where user_id = '${founder}'`),
    ).rejects.toThrow(/row-level security|permission denied/i);
    await db.close();
  });

  it("after the fix: a verified owner can update occupation, but cannot self-promote to verified/suspended/manual_review", async () => {
    const db = await openDb();
    await applyRepair(db);
    await db.exec(`reset role;`);
    await db.exec(`insert into public.afrique_ids(user_id, eligibility_status) values ('${founder}', 'verified');`);

    await asUser(db, founder, `update public.afrique_ids set occupation = 'Tailor' where user_id = '${founder}'`);
    const after = await asUser(db, founder, `select occupation from public.afrique_ids where user_id = '${founder}'`);
    expect(after.rows[0].occupation).toBe("Tailor");

    await db.exec(`reset role;`);
    await db.exec(`update public.afrique_ids set eligibility_status = 'pending' where user_id = '${founder}';`);
    await expect(
      asUser(db, founder, `update public.afrique_ids set eligibility_status = 'verified' where user_id = '${founder}'`),
    ).rejects.toThrow(/cannot be self-set/i);

    await asServiceRole(db, `update public.afrique_ids set eligibility_status = 'verified' where user_id = '${founder}'`);
    const final = await asServiceRole(db, `select eligibility_status from public.afrique_ids where user_id = '${founder}'`);
    expect(final.rows[0].eligibility_status).toBe("verified");
    await db.close();
  });

  it("new commerce/profile-depth/sensitive columns exist with the right constraints", async () => {
    const db = await openDb();
    await applyRepair(db);
    const cols = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_name = 'businesses' and column_name in ('delivery_radius_km','cross_border_willing','years_operating','supply_capacity','verification_documents_reviewed_at') order by column_name`,
    );
    expect(cols.rows.map((r) => r.column_name)).toEqual([
      "cross_border_willing",
      "delivery_radius_km",
      "supply_capacity",
      "verification_documents_reviewed_at",
      "years_operating",
    ]);

    const aidCols = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_name = 'afrique_ids' and column_name in ('birth_country_code','occupation','skills','financial_status','next_of_kin','land_declaration','sensitive_fields_consent') order by column_name`,
    );
    expect(aidCols.rows).toHaveLength(7);

    await db.exec(`reset role;`);
    await expect(
      db.query(`insert into public.afrique_ids(user_id, financial_status) values ('${admin}', 'not_a_real_status')`),
    ).rejects.toThrow(/violates check constraint/);
    await db.close();
  });
});
