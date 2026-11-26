/**
 * Real-SQL verification of 20261016210000_liguey_applicant_listing_visibility.sql,
 * applied verbatim on top of 20261016190000_liguey_job_listings_applications.sql
 * against a locally reconstructed businesses/business_members fixture matching
 * the archived schema (see tests/business/business-members-select-policy.local.test.ts's
 * own caveat — this is not a hosted-schema verification).
 *
 * Found while building real-browser verification for K066 case 8: the prior
 * "Business members read their listings" policy was the ONLY SELECT policy on
 * job_listings, so an applicant could never resolve a listing's title for their
 * own /liguey/applications page (confirmed to reproduce before this policy was
 * written — see the "before" case below).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = { exec: (sql: string) => Promise<unknown>; query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; close: () => Promise<void> };

const founder = "11111111-1111-4111-8111-111111111111";
const employee = "22222222-2222-4222-8222-222222222222";
const applicant = "33333333-3333-4333-8333-333333333333";
const otherApplicant = "44444444-4444-4444-8444-444444444444";
const strangerBusinessFounder = "55555555-5555-4555-8555-555555555555";

async function openDb(opts: { withFix: boolean }): Promise<Db> {
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
    create table public.businesses(id uuid primary key default gen_random_uuid(), created_by uuid not null references auth.users(id));
    create table public.business_members(
      id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
      user_id uuid not null references auth.users(id) on delete cascade,
      role text not null check (role in ('founder','cofounder','beneficial_owner','director','administrator','finance_manager','store_manager','developer','designer','employee','accountant','legal_representative','viewer')),
      status text not null default 'active' check (status in ('pending','active','removed')),
      unique(business_id,user_id)
    );
    alter table public.business_members enable row level security;
    create policy "members select own" on public.business_members for select using (user_id = auth.uid());
    insert into auth.users(id) values ('${founder}'),('${employee}'),('${applicant}'),('${otherApplicant}'),('${strangerBusinessFounder}');
  `);
  await db.exec(readFileSync(resolve("supabase/migrations/20261016190000_liguey_job_listings_applications.sql"), "utf8"));
  if (opts.withFix) await db.exec(readFileSync(resolve("supabase/migrations/20261016210000_liguey_applicant_listing_visibility.sql"), "utf8"));
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

async function seedPublishedListing(db: Db) {
  await db.exec(`reset role;`);
  const business = await db.query(`insert into public.businesses(created_by) values ('${founder}') returning id`);
  const businessId = business.rows[0].id as string;
  await db.exec(`
    insert into public.business_members(business_id,user_id,role,status) values
      ('${businessId}','${founder}','founder','active'),
      ('${businessId}','${employee}','employee','active');
  `);
  const listing = await asUser(db, founder,
    `insert into job_listings(business_id, public_id, title, employment_type, status, created_by) values ($1, $2, 'Bookkeeper needed', 'contract', 'published', $3) returning id`,
    [businessId, "job_" + Math.random().toString(36).slice(2), founder],
  );
  return { businessId, listingId: listing.rows[0].id as string };
}

describe.skipIf(!root)("Kebu Liguey — applicant listing visibility (real RLS)", () => {
  it("before the fix: an applicant with a real application still cannot read the listing's own title (reproduces the gap)", async () => {
    const db = await openDb({ withFix: false });
    const { businessId, listingId } = await seedPublishedListing(db);
    await asUser(db, applicant, "insert into job_applications(listing_id, business_id, applicant_user_id) values ($1,$2,$3)", [listingId, businessId, applicant]);
    const read = await asUser(db, applicant, "select id, title from job_listings where id=$1", [listingId]);
    expect(read.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("after applying, the worker can read the listing they applied to", async () => {
    const db = await openDb({ withFix: true });
    const { businessId, listingId } = await seedPublishedListing(db);
    await asUser(db, applicant, "insert into job_applications(listing_id, business_id, applicant_user_id) values ($1,$2,$3)", [listingId, businessId, applicant]);
    const read = await asUser(db, applicant, "select id, title from job_listings where id=$1", [listingId]);
    expect(read.rows).toHaveLength(1);
    expect(read.rows[0].title).toBe("Bookkeeper needed");
    await db.close();
  }, 30_000);

  it("withdrawing does not revoke the worker's own read access to the listing's title", async () => {
    const db = await openDb({ withFix: true });
    const { businessId, listingId } = await seedPublishedListing(db);
    const application = await asUser(db, applicant, "insert into job_applications(listing_id, business_id, applicant_user_id) values ($1,$2,$3) returning id", [listingId, businessId, applicant]);
    await asUser(db, applicant, "update job_applications set status='withdrawn' where id=$1", [application.rows[0].id]);
    const read = await asUser(db, applicant, "select id, title from job_listings where id=$1", [listingId]);
    expect(read.rows).toHaveLength(1);
    await db.close();
  }, 30_000);

  it("a different applicant who never applied still cannot read the listing", async () => {
    const db = await openDb({ withFix: true });
    const { businessId, listingId } = await seedPublishedListing(db);
    await asUser(db, applicant, "insert into job_applications(listing_id, business_id, applicant_user_id) values ($1,$2,$3)", [listingId, businessId, applicant]);
    const read = await asUser(db, otherApplicant, "select id from job_listings where id=$1", [listingId]);
    expect(read.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("business-member read access is unchanged: an active member still reads it, an unrelated founder still cannot", async () => {
    const db = await openDb({ withFix: true });
    const { listingId } = await seedPublishedListing(db);
    const memberRead = await asUser(db, employee, "select id from job_listings where id=$1", [listingId]);
    expect(memberRead.rows).toHaveLength(1);
    const strangerRead = await asUser(db, strangerBusinessFounder, "select id from job_listings where id=$1", [listingId]);
    expect(strangerRead.rows).toHaveLength(0);
    await db.close();
  }, 30_000);
});
