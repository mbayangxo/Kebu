/**
 * Real-SQL verification of Kebu Liguey (K066) acceptance case 4 (employer/
 * recruiter workflow) plus the minimum of case 3 (submit/withdraw) needed
 * to make review real: 20261016190000_liguey_job_listings_applications.sql
 * applied verbatim against a locally reconstructed businesses/
 * business_members fixture matching the archived schema (see
 * tests/business/business-members-select-policy.local.test.ts's own
 * caveat — this is not a hosted-schema verification).
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
    insert into auth.users(id) values ('${founder}'),('${employee}'),('${applicant}'),('${otherApplicant}'),('${strangerBusinessFounder}');
  `);
  await db.exec(readFileSync(resolve("supabase/migrations/20261016190000_liguey_job_listings_applications.sql"), "utf8"));
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

async function seedBusinessAndListing(db: Db, opts: { publish: boolean }) {
  await db.exec(`reset role;`);
  const business = await db.query(`insert into public.businesses(created_by) values ('${founder}') returning id`);
  const businessId = business.rows[0].id as string;
  await db.exec(`
    insert into public.business_members(business_id,user_id,role,status) values
      ('${businessId}','${founder}','founder','active'),
      ('${businessId}','${employee}','employee','active');
  `);
  const listing = await asUser(db, founder,
    `insert into job_listings(business_id, public_id, title, employment_type, status, created_by) values ($1, $2, 'Community translator', 'contract', $3, $4) returning id`,
    [businessId, "job_" + Math.random().toString(36).slice(2), opts.publish ? "published" : "draft", founder],
  );
  return { businessId, listingId: listing.rows[0].id as string };
}

describe.skipIf(!root)("Kebu Liguey — job listings and applications (real RLS)", () => {
  it("a founder (manager role) can create a listing", async () => {
    const db = await openDb();
    const { listingId } = await seedBusinessAndListing(db, { publish: false });
    expect(listingId).toBeTruthy();
    await db.close();
  }, 30_000);

  it("a plain employee (not a manager role) cannot create a listing", async () => {
    const db = await openDb();
    await db.exec(`reset role;`);
    const business = await db.query(`insert into public.businesses(created_by) values ('${founder}') returning id`);
    const businessId = business.rows[0].id as string;
    await db.exec(`insert into public.business_members(business_id,user_id,role,status) values ('${businessId}','${employee}','employee','active')`);
    await expect(
      asUser(db, employee, `insert into job_listings(business_id, public_id, title, employment_type) values ($1,$2,'Role','gig')`, [businessId, "job_x"]),
    ).rejects.toThrow(/row-level security policy/i);
    await db.close();
  }, 30_000);

  it("a plain employee CAN still read the business's listings, including drafts", async () => {
    const db = await openDb();
    const { listingId } = await seedBusinessAndListing(db, { publish: false });
    const read = await asUser(db, employee, "select id, status from job_listings where id=$1", [listingId]);
    expect(read.rows).toHaveLength(1);
    expect(read.rows[0].status).toBe("draft");
    await db.close();
  }, 30_000);

  it("a stranger business (unrelated founder) cannot read another business's listings at all", async () => {
    const db = await openDb();
    const { listingId } = await seedBusinessAndListing(db, { publish: true });
    const read = await asUser(db, strangerBusinessFounder, "select id from job_listings where id=$1", [listingId]);
    expect(read.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("a worker cannot apply to a draft (unpublished) listing", async () => {
    const db = await openDb();
    const { businessId, listingId } = await seedBusinessAndListing(db, { publish: false });
    await expect(
      asUser(db, applicant, "insert into job_applications(listing_id, business_id, applicant_user_id, cover_note) values ($1,$2,$3,'Interested')", [listingId, businessId, applicant]),
    ).rejects.toThrow(/row-level security policy/i);
    await db.close();
  }, 30_000);

  it("a worker can apply to a published listing, and cannot apply twice to the same listing", async () => {
    const db = await openDb();
    const { businessId, listingId } = await seedBusinessAndListing(db, { publish: true });
    const result = await asUser(db, applicant, "insert into job_applications(listing_id, business_id, applicant_user_id, cover_note) values ($1,$2,$3,'Interested') returning status", [listingId, businessId, applicant]);
    expect(result.rows[0].status).toBe("submitted");
    await expect(
      asUser(db, applicant, "insert into job_applications(listing_id, business_id, applicant_user_id, cover_note) values ($1,$2,$3,'Again')", [listingId, businessId, applicant]),
    ).rejects.toThrow(/duplicate key|unique/i);
    await db.close();
  }, 30_000);

  it("a worker cannot spoof a different business_id than the listing's own", async () => {
    const db = await openDb();
    const { listingId } = await seedBusinessAndListing(db, { publish: true });
    const otherBusiness = await db.query(`insert into public.businesses(created_by) values ('${strangerBusinessFounder}') returning id`);
    await expect(
      asUser(db, applicant, "insert into job_applications(listing_id, business_id, applicant_user_id) values ($1,$2,$3)", [listingId, otherBusiness.rows[0].id, applicant]),
    ).rejects.toThrow(/row-level security policy/i);
    await db.close();
  }, 30_000);

  it("the applicant can read their own application; a different applicant cannot", async () => {
    const db = await openDb();
    const { businessId, listingId } = await seedBusinessAndListing(db, { publish: true });
    await asUser(db, applicant, "insert into job_applications(listing_id, business_id, applicant_user_id) values ($1,$2,$3)", [listingId, businessId, applicant]);
    const ownRead = await asUser(db, applicant, "select id from job_applications where listing_id=$1", [listingId]);
    expect(ownRead.rows).toHaveLength(1);
    const otherRead = await asUser(db, otherApplicant, "select id from job_applications where listing_id=$1", [listingId]);
    expect(otherRead.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("any active business member (not only managers) can read applications to their own listings", async () => {
    const db = await openDb();
    const { businessId, listingId } = await seedBusinessAndListing(db, { publish: true });
    await asUser(db, applicant, "insert into job_applications(listing_id, business_id, applicant_user_id) values ($1,$2,$3)", [listingId, businessId, applicant]);
    const employeeRead = await asUser(db, employee, "select id from job_applications where listing_id=$1", [listingId]);
    expect(employeeRead.rows).toHaveLength(1);
    await db.close();
  }, 30_000);

  it("a manager accepting an application stamps decided_at/decided_by automatically — the applicant cannot forge either", async () => {
    const db = await openDb();
    const { businessId, listingId } = await seedBusinessAndListing(db, { publish: true });
    const application = await asUser(db, applicant, "insert into job_applications(listing_id, business_id, applicant_user_id) values ($1,$2,$3) returning id", [listingId, businessId, applicant]);
    const applicationId = application.rows[0].id as string;
    await asUser(db, founder, "update job_applications set status='accepted' where id=$1", [applicationId]);
    const decided = await asUser(db, founder, "select status, decided_at, decided_by from job_applications where id=$1", [applicationId]);
    expect(decided.rows[0].status).toBe("accepted");
    expect(decided.rows[0].decided_at).not.toBeNull();
    expect(decided.rows[0].decided_by).toBe(founder);
    await db.close();
  }, 30_000);

  it("the applicant sees the accepted decision on their own read-back", async () => {
    const db = await openDb();
    const { businessId, listingId } = await seedBusinessAndListing(db, { publish: true });
    const application = await asUser(db, applicant, "insert into job_applications(listing_id, business_id, applicant_user_id) values ($1,$2,$3) returning id", [listingId, businessId, applicant]);
    await asUser(db, founder, "update job_applications set status='declined' where id=$1", [application.rows[0].id]);
    const applicantRead = await asUser(db, applicant, "select status from job_applications where id=$1", [application.rows[0].id]);
    expect(applicantRead.rows[0].status).toBe("declined");
    await db.close();
  }, 30_000);

  it("an applicant can withdraw their own application but cannot set any other status", async () => {
    const db = await openDb();
    const { businessId, listingId } = await seedBusinessAndListing(db, { publish: true });
    const application = await asUser(db, applicant, "insert into job_applications(listing_id, business_id, applicant_user_id) values ($1,$2,$3) returning id", [listingId, businessId, applicant]);
    const applicationId = application.rows[0].id as string;
    await expect(
      asUser(db, applicant, "update job_applications set status='accepted' where id=$1", [applicationId]),
    ).rejects.toThrow(/row-level security policy/i);
    const withdraw = await asUser(db, applicant, "update job_applications set status='withdrawn' where id=$1 returning status", [applicationId]);
    expect(withdraw.rows[0].status).toBe("withdrawn");
    await db.close();
  }, 30_000);

  it("a plain employee (not a manager, not the applicant) cannot decide on an application — RLS silently excludes the row rather than erroring, like every other owner-scoped update in this codebase", async () => {
    const db = await openDb();
    const { businessId, listingId } = await seedBusinessAndListing(db, { publish: true });
    const application = await asUser(db, applicant, "insert into job_applications(listing_id, business_id, applicant_user_id) values ($1,$2,$3) returning id", [listingId, businessId, applicant]);
    const result = await asUser(db, employee, "update job_applications set status='accepted' where id=$1 returning id", [application.rows[0].id]);
    expect(result.rows).toHaveLength(0);
    const stillSubmitted = await asUser(db, founder, "select status from job_applications where id=$1", [application.rows[0].id]);
    expect(stillSubmitted.rows[0].status).toBe("submitted");
    await db.close();
  }, 30_000);

  it("the application's business cannot be reassigned after creation — blocked at the column-grant layer before RLS or the identity-guard trigger even run", async () => {
    const db = await openDb();
    const { businessId, listingId } = await seedBusinessAndListing(db, { publish: true });
    const application = await asUser(db, applicant, "insert into job_applications(listing_id, business_id, applicant_user_id) values ($1,$2,$3) returning id", [listingId, businessId, applicant]);
    const otherBusiness = await db.query(`insert into public.businesses(created_by) values ('${strangerBusinessFounder}') returning id`);
    await expect(
      asUser(db, founder, "update job_applications set business_id=$2 where id=$1", [application.rows[0].id, otherBusiness.rows[0].id]),
    ).rejects.toThrow(/permission denied/i);
    await db.close();
  }, 30_000);
});
