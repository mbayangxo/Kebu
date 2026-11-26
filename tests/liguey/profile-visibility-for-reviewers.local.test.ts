/**
 * Real-SQL verification of Kebu Liguey (K066) acceptance case 6: a
 * reviewing business member can read an applicant's worker_profile and
 * worker_profile_evidence only once that worker has a non-withdrawn
 * application to one of the business's listings — and loses that
 * visibility the moment the application is withdrawn. Applies the actual
 * migration chain verbatim (library_sharing -> worker_profiles ->
 * job_listings_applications -> this repair), not a reimplementation.
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
const otherBusinessFounder = "44444444-4444-4444-8444-444444444444";
const stranger = "55555555-5555-4555-8555-555555555555";

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
    insert into auth.users(id) values ('${founder}'),('${employee}'),('${applicant}'),('${otherBusinessFounder}'),('${stranger}');
  `);
  await db.exec(readFileSync(resolve("supabase/migrations/20261016120000_library_sharing.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261016180000_liguey_worker_profiles.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261016190000_liguey_job_listings_applications.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261016200000_liguey_profile_visibility_for_reviewers.sql"), "utf8"));
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

async function seedBusinessWithTeamAndListing(db: Db) {
  await db.exec(`reset role;`);
  const business = await db.query(`insert into public.businesses(created_by) values ('${founder}') returning id`);
  const businessId = business.rows[0].id as string;
  await db.exec(`
    insert into public.business_members(business_id,user_id,role,status) values
      ('${businessId}','${founder}','founder','active'),
      ('${businessId}','${employee}','employee','active');
  `);
  const listing = await asUser(db, founder,
    `insert into job_listings(business_id, public_id, title, employment_type, status, created_by) values ($1,$2,'Translator','contract','published',$3) returning id`,
    [businessId, "job_" + Math.random().toString(36).slice(2), founder],
  );
  return { businessId, listingId: listing.rows[0].id as string };
}

describe.skipIf(!root)("Kebu Liguey — profile visibility for reviewers (real RLS)", () => {
  it("a business member cannot read a stranger's profile before any application exists", async () => {
    const db = await openDb();
    await seedBusinessWithTeamAndListing(db);
    await asUser(db, applicant, "insert into worker_profiles(user_id, headline) values ($1, 'Translator for hire')", [applicant]);
    const founderRead = await asUser(db, founder, "select user_id from worker_profiles where user_id=$1", [applicant]);
    expect(founderRead.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("once the worker applies, any active business member (not only managers) can read their profile", async () => {
    const db = await openDb();
    const { businessId, listingId } = await seedBusinessWithTeamAndListing(db);
    await asUser(db, applicant, "insert into worker_profiles(user_id, headline, skills) values ($1, 'Translator for hire', array['Wolof-French translation'])", [applicant]);
    await asUser(db, applicant, "insert into job_applications(listing_id, business_id, applicant_user_id) values ($1,$2,$3)", [listingId, businessId, applicant]);
    const founderRead = await asUser(db, founder, "select headline, skills from worker_profiles where user_id=$1", [applicant]);
    expect(founderRead.rows).toHaveLength(1);
    expect(founderRead.rows[0].headline).toBe("Translator for hire");
    const employeeRead = await asUser(db, employee, "select headline from worker_profiles where user_id=$1", [applicant]);
    expect(employeeRead.rows).toHaveLength(1);
    await db.close();
  }, 30_000);

  it("a member of an unrelated business (no application to them) still cannot read the profile", async () => {
    const db = await openDb();
    const { businessId, listingId } = await seedBusinessWithTeamAndListing(db);
    await asUser(db, applicant, "insert into worker_profiles(user_id, headline) values ($1, 'Translator for hire')", [applicant]);
    await asUser(db, applicant, "insert into job_applications(listing_id, business_id, applicant_user_id) values ($1,$2,$3)", [listingId, businessId, applicant]);
    await db.exec(`reset role;`);
    const otherBusiness = await db.query(`insert into public.businesses(created_by) values ('${otherBusinessFounder}') returning id`);
    await db.exec(`insert into public.business_members(business_id,user_id,role,status) values ('${otherBusiness.rows[0].id}','${otherBusinessFounder}','founder','active')`);
    const unrelatedRead = await asUser(db, otherBusinessFounder, "select user_id from worker_profiles where user_id=$1", [applicant]);
    expect(unrelatedRead.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("withdrawing the application revokes profile visibility on the very next read", async () => {
    const db = await openDb();
    const { businessId, listingId } = await seedBusinessWithTeamAndListing(db);
    await asUser(db, applicant, "insert into worker_profiles(user_id, headline) values ($1, 'Translator for hire')", [applicant]);
    const application = await asUser(db, applicant, "insert into job_applications(listing_id, business_id, applicant_user_id) values ($1,$2,$3) returning id", [listingId, businessId, applicant]);
    expect((await asUser(db, founder, "select user_id from worker_profiles where user_id=$1", [applicant])).rows).toHaveLength(1);
    await asUser(db, applicant, "update job_applications set status='withdrawn' where id=$1", [application.rows[0].id]);
    expect((await asUser(db, founder, "select user_id from worker_profiles where user_id=$1", [applicant])).rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("the worker always reads their own profile regardless of any application", async () => {
    const db = await openDb();
    await asUser(db, applicant, "insert into worker_profiles(user_id, headline) values ($1, 'Translator for hire')", [applicant]);
    expect((await asUser(db, applicant, "select user_id from worker_profiles where user_id=$1", [applicant])).rows).toHaveLength(1);
    await db.close();
  }, 30_000);

  it("portfolio evidence follows the same visibility rule as the profile", async () => {
    const db = await openDb();
    const { businessId, listingId } = await seedBusinessWithTeamAndListing(db);
    await asUser(db, applicant, "insert into worker_profiles(user_id) values ($1)", [applicant]);
    const node = await asUser(db, applicant, "insert into library_nodes(owner_id, kind, title) values ($1,'document','Sample translation') returning id", [applicant]);
    await asUser(db, applicant, "insert into worker_profile_evidence(user_id, library_node_id) values ($1,$2)", [applicant, node.rows[0].id]);
    const founderReadBefore = await asUser(db, founder, "select id from worker_profile_evidence where user_id=$1", [applicant]);
    expect(founderReadBefore.rows).toHaveLength(0);
    await asUser(db, applicant, "insert into job_applications(listing_id, business_id, applicant_user_id) values ($1,$2,$3)", [listingId, businessId, applicant]);
    const founderReadAfter = await asUser(db, founder, "select id from worker_profile_evidence where user_id=$1", [applicant]);
    expect(founderReadAfter.rows).toHaveLength(1);
    await db.close();
  }, 30_000);

  it("a complete stranger (no business relationship at all) can never read the profile via this mechanism", async () => {
    const db = await openDb();
    const { businessId, listingId } = await seedBusinessWithTeamAndListing(db);
    await asUser(db, applicant, "insert into worker_profiles(user_id, headline) values ($1, 'Translator for hire')", [applicant]);
    await asUser(db, applicant, "insert into job_applications(listing_id, business_id, applicant_user_id) values ($1,$2,$3)", [listingId, businessId, applicant]);
    const strangerRead = await asUser(db, stranger, "select user_id from worker_profiles where user_id=$1", [applicant]);
    expect(strangerRead.rows).toHaveLength(0);
    await db.close();
  }, 30_000);
});
