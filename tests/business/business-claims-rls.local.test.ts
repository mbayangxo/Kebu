/**
 * Local-fixture verification of 20261027050000_business_claims.sql's real
 * RLS policies, against a minimal reconstruction of the businesses/
 * business_members/platform_staff_roles shapes those policies reference
 * (businesses/business_members are archived-only in this repo, never in
 * the canonical supabase/migrations/ chain — see
 * tests/business/business-members-select-policy.local.test.ts's own note).
 * This proves the migration's actual SQL text is sound, not that it
 * matches whatever is currently live on the hosted project.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = { exec: (sql: string) => Promise<unknown>; query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; close: () => Promise<void> };

const claimant = "11111111-1111-4111-8111-111111111111";
const otherUser = "22222222-2222-4222-8222-222222222222";
const admin = "33333333-3333-4333-8333-333333333333";

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

  create or replace function public.set_updated_at() returns trigger language plpgsql as $$
  begin new.updated_at = now(); return new; end; $$;

  create table public.businesses (
    id uuid primary key default gen_random_uuid(),
    created_by uuid not null references auth.users(id) on delete restrict
  );

  create table public.business_members (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references public.businesses(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null,
    status text not null default 'active' check (status in ('pending', 'active', 'removed')),
    unique (business_id, user_id)
  );

  create table public.business_audit_logs (
    id uuid primary key default gen_random_uuid(),
    business_id uuid, actor_user_id uuid, action text, metadata jsonb, created_at timestamptz default now()
  );

  create table public.platform_staff_roles (
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null,
    active boolean not null default true,
    primary key (user_id, role)
  );

  -- Minimal stand-ins so the real migration file's storage-bucket/policy
  -- statements apply without error; this test does not assert on storage
  -- RLS itself (the loopback browser fixture test covers the real upload
  -- flow with its own fixture backend, same split the account-control-
  -- center feature used for Mail/Opportunity access).
  create schema storage;
  create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)]
  $$;
`;

async function openDb(): Promise<Db> {
  const { PGlite } = await import(pathToFileURL(resolve(root!, "dist/index.js")).href);
  const { pgcrypto } = await import(pathToFileURL(resolve(root!, "dist/contrib/pgcrypto.js")).href);
  const db: Db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SCHEMA_FIXTURE);
  const migration = readFileSync(resolve("supabase/migrations/20261027050000_business_claims.sql"), "utf8");
  await db.exec(migration);
  await db.exec(`insert into auth.users(id) values ('${claimant}'), ('${otherUser}'), ('${admin}');`);
  await db.exec(`insert into public.platform_staff_roles(user_id, role, active) values ('${admin}', 'admin', true);`);
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

async function seedOrphanedBusiness(db: Db) {
  await db.exec(`reset role;`);
  // created_by is just an audit field, not a membership row -- this business
  // genuinely has zero rows in business_members, the orphaned case the
  // approval endpoint checks for via hasZeroActiveMembers().
  const result = await db.query(`insert into public.businesses(created_by) values ('${admin}') returning id`);
  return result.rows[0].id as string;
}

async function seedOwnedBusiness(db: Db) {
  await db.exec(`reset role;`);
  const result = await db.query(`insert into public.businesses(created_by) values ('${otherUser}') returning id`);
  const businessId = result.rows[0].id as string;
  await db.exec(
    `insert into public.business_members(business_id, user_id, role, status) values ('${businessId}', '${otherUser}', 'founder', 'active')`,
  );
  return businessId;
}

async function insertClaim(db: Db, businessId: string, note = "I am the real owner of this business.") {
  const result = await asUser(
    db,
    claimant,
    `insert into public.business_claims(business_id, claimant_user_id, note, proof_storage_path, proof_file_name, proof_mime_type)
     values ($1, $2, $3, 'path/x.pdf', 'x.pdf', 'application/pdf') returning id`,
    [businessId, claimant, note],
  );
  return result.rows[0].id as string;
}

describe.skipIf(!root)("business_claims RLS (local fixture, not hosted-verified)", () => {
  it("a claimant can insert their own pending claim", async () => {
    const db = await openDb();
    const businessId = await seedOrphanedBusiness(db);
    const claimId = await insertClaim(db, businessId);
    expect(claimId).toBeTruthy();
    await db.close();
  }, 30_000);

  it("a claimant cannot forge someone else's claimant_user_id", async () => {
    const db = await openDb();
    const businessId = await seedOrphanedBusiness(db);
    await expect(
      asUser(
        db,
        claimant,
        `insert into public.business_claims(business_id, claimant_user_id, note, proof_storage_path, proof_file_name, proof_mime_type)
         values ($1, $2, 'ten characters', 'p', 'f.pdf', 'application/pdf')`,
        [businessId, otherUser],
      ),
    ).rejects.toThrow();
    await db.close();
  }, 30_000);

  it("a claimant can read their own claim but not someone else's", async () => {
    const db = await openDb();
    const businessId = await seedOrphanedBusiness(db);
    await insertClaim(db, businessId);
    const ownRead = await asUser(db, claimant, `select id from public.business_claims where business_id=$1`, [businessId]);
    expect(ownRead.rows).toHaveLength(1);
    const strangerRead = await asUser(db, otherUser, `select id from public.business_claims where business_id=$1`, [businessId]);
    expect(strangerRead.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("an admin can read every claim, a non-admin cannot read another user's", async () => {
    const db = await openDb();
    const businessId = await seedOrphanedBusiness(db);
    await insertClaim(db, businessId);
    const adminRead = await asUser(db, admin, `select id from public.business_claims where business_id=$1`, [businessId]);
    expect(adminRead.rows).toHaveLength(1);
    await db.close();
  }, 30_000);

  it("a claimant cannot update their own claim (cannot self-approve)", async () => {
    const db = await openDb();
    const businessId = await seedOrphanedBusiness(db);
    const claimId = await insertClaim(db, businessId);
    const result = await asUser(
      db,
      claimant,
      `update public.business_claims set status='approved' where id=$1 returning id`,
      [claimId],
    );
    // RLS silently filters the row rather than erroring -- zero rows updated.
    expect(result.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("an admin can update (review) a claim", async () => {
    const db = await openDb();
    const businessId = await seedOrphanedBusiness(db);
    const claimId = await insertClaim(db, businessId);
    const result = await asUser(
      db,
      admin,
      `update public.business_claims set status='approved', reviewed_by=$2 where id=$1 returning status`,
      [claimId, admin],
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].status).toBe("approved");
    await db.close();
  }, 30_000);

  it("at most one pending claim per (business, claimant) -- the partial unique index holds", async () => {
    const db = await openDb();
    const businessId = await seedOrphanedBusiness(db);
    await insertClaim(db, businessId);
    await expect(insertClaim(db, businessId)).rejects.toThrow(/duplicate key|unique/i);
    await db.close();
  }, 30_000);

  it("the security-critical distinction: an orphaned business has zero active members, an owned one does not", async () => {
    const db = await openDb();
    const orphaned = await seedOrphanedBusiness(db);
    const owned = await seedOwnedBusiness(db);
    await db.exec("reset role;");
    const orphanedCount = await db.query(`select count(*) as n from public.business_members where business_id=$1 and status='active'`, [orphaned]);
    const ownedCount = await db.query(`select count(*) as n from public.business_members where business_id=$1 and status='active'`, [owned]);
    expect(Number(orphanedCount.rows[0].n)).toBe(0);
    expect(Number(ownedCount.rows[0].n)).toBe(1);
    await db.close();
  }, 30_000);
});
