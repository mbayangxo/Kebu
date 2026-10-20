/**
 * Real-SQL verification of 20261020000000_liguey_yande_applicant_insight.sql
 * (table, RLS, and the liguey_reserve_ai_generation monthly-cap function),
 * applied verbatim on top of the real job_listings/job_applications
 * migration, against a locally reconstructed businesses/business_members
 * fixture matching the archived schema — not a hosted-schema verification
 * (same caveat as every other .local.test.ts file in this repo).
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
const strangerBusinessFounder = "44444444-4444-4444-8444-444444444444";

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
      status text not null default 'active' check (status in ('pending','active','removed')), unique(business_id,user_id)
    );
    alter table public.business_members enable row level security;
    create policy "members select own" on public.business_members for select using (user_id = auth.uid());
    insert into auth.users(id) values ('${founder}'),('${employee}'),('${applicant}'),('${strangerBusinessFounder}');
  `);
  await db.exec(readFileSync(resolve("supabase/migrations/20261016190000_liguey_job_listings_applications.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261020000000_liguey_yande_applicant_insight.sql"), "utf8"));
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

async function seedApplication(db: Db): Promise<{ businessId: string; listingId: string; applicationId: string }> {
  await db.exec("reset role;");
  const business = await db.query("insert into public.businesses(created_by) values ($1) returning id", [founder]);
  const businessId = business.rows[0].id as string;
  await db.exec(`
    insert into public.business_members(business_id,user_id,role,status) values
      ('${businessId}','${founder}','founder','active'),
      ('${businessId}','${employee}','employee','active');
  `);
  const listing = await asUser(db, founder,
    "insert into job_listings(business_id, public_id, title, employment_type, status, created_by) values ($1,$2,'Translator','contract','published',$3) returning id",
    [businessId, "job_" + Math.random().toString(36).slice(2), founder],
  );
  const listingId = listing.rows[0].id as string;
  const application = await asUser(db, applicant,
    "insert into job_applications(listing_id, business_id, applicant_user_id, cover_note) values ($1,$2,$3,'Interested') returning id",
    [listingId, businessId, applicant],
  );
  return { businessId, listingId, applicationId: application.rows[0].id as string };
}

describe.skipIf(!root)("Kebu Liguey — Yande applicant insight (real RLS)", () => {
  it("a manager can generate an insight; a plain employee cannot", async () => {
    const db = await openDb();
    const { businessId, applicationId } = await seedApplication(db);

    const created = await asUser(db, founder,
      "insert into liguey_applicant_insights(application_id,business_id,generated_by,model,summary) values ($1,$2,$3,'test-model','A real summary.') returning id",
      [applicationId, businessId, founder],
    );
    expect(created.rows).toHaveLength(1);

    await db.exec("delete from liguey_applicant_insights");
    await expect(
      asUser(db, employee,
        "insert into liguey_applicant_insights(application_id,business_id,generated_by,model,summary) values ($1,$2,$3,'test-model','A real summary.')",
        [applicationId, businessId, employee],
      ),
    ).rejects.toThrow(/row-level security policy/i);
    await db.close();
  }, 30_000);

  it("any active business member (not only managers) can read a generated insight", async () => {
    const db = await openDb();
    const { businessId, applicationId } = await seedApplication(db);
    await asUser(db, founder,
      "insert into liguey_applicant_insights(application_id,business_id,generated_by,model,summary) values ($1,$2,$3,'test-model','A real summary.')",
      [applicationId, businessId, founder],
    );
    const employeeRead = await asUser(db, employee, "select summary from liguey_applicant_insights where application_id=$1", [applicationId]);
    expect(employeeRead.rows).toHaveLength(1);
    await db.close();
  }, 30_000);

  it("a stranger business's founder can neither read nor insert an insight for a business they don't belong to", async () => {
    const db = await openDb();
    const { businessId, applicationId } = await seedApplication(db);
    await asUser(db, founder,
      "insert into liguey_applicant_insights(application_id,business_id,generated_by,model,summary) values ($1,$2,$3,'test-model','A real summary.')",
      [applicationId, businessId, founder],
    );
    const strangerRead = await asUser(db, strangerBusinessFounder, "select id from liguey_applicant_insights where application_id=$1", [applicationId]);
    expect(strangerRead.rows).toHaveLength(0);

    const otherBusiness = await db.query("insert into public.businesses(created_by) values ($1) returning id", [strangerBusinessFounder]);
    await expect(
      asUser(db, strangerBusinessFounder,
        "insert into liguey_applicant_insights(application_id,business_id,generated_by,model,summary) values ($1,$2,$3,'test-model','Fake.')",
        [applicationId, otherBusiness.rows[0].id, strangerBusinessFounder],
      ),
    ).rejects.toThrow(/row-level security policy/i);
    await db.close();
  }, 30_000);

  it("the business_id cannot be spoofed to an unrelated business even by a real manager of a different business", async () => {
    const db = await openDb();
    const { applicationId } = await seedApplication(db);
    await db.exec("reset role;");
    const otherBusiness = await db.query("insert into public.businesses(created_by) values ($1) returning id", [strangerBusinessFounder]);
    await db.exec(`insert into public.business_members(business_id,user_id,role,status) values ('${otherBusiness.rows[0].id}','${strangerBusinessFounder}','founder','active')`);
    await expect(
      asUser(db, strangerBusinessFounder,
        "insert into liguey_applicant_insights(application_id,business_id,generated_by,model,summary) values ($1,$2,$3,'test-model','Fake.')",
        [applicationId, otherBusiness.rows[0].id, strangerBusinessFounder],
      ),
    ).rejects.toThrow(/row-level security policy/i);
    await db.close();
  }, 30_000);

  it("a manager can regenerate (update) an existing insight; a plain employee cannot", async () => {
    const db = await openDb();
    const { businessId, applicationId } = await seedApplication(db);
    await asUser(db, founder,
      "insert into liguey_applicant_insights(application_id,business_id,generated_by,model,summary) values ($1,$2,$3,'test-model','First version.')",
      [applicationId, businessId, founder],
    );
    const updated = await asUser(db, founder,
      "update liguey_applicant_insights set summary='Second version.', generated_by=$2 where application_id=$1 returning summary",
      [applicationId, founder],
    );
    expect(updated.rows[0].summary).toBe("Second version.");

    const employeeUpdate = await asUser(db, employee,
      "update liguey_applicant_insights set summary='Hijacked.', generated_by=$2 where application_id=$1 returning id",
      [applicationId, employee],
    );
    expect(employeeUpdate.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("liguey_reserve_ai_generation enforces a real monthly cap per business", async () => {
    const db = await openDb();
    const business = await db.query("insert into public.businesses(created_by) values ($1) returning id", [founder]);
    const businessId = business.rows[0].id as string;

    await db.exec("set role service_role;");
    const first = await db.query("select liguey_reserve_ai_generation($1,$2) as allowed", [businessId, 2]);
    const second = await db.query("select liguey_reserve_ai_generation($1,$2) as allowed", [businessId, 2]);
    const third = await db.query("select liguey_reserve_ai_generation($1,$2) as allowed", [businessId, 2]);
    expect(first.rows[0].allowed).toBe(true);
    expect(second.rows[0].allowed).toBe(true);
    expect(third.rows[0].allowed).toBe(false);

    const usage = await db.query("select generation_count from liguey_ai_usage where business_id=$1", [businessId]);
    expect(usage.rows[0].generation_count).toBe(2);
    await db.close();
  }, 30_000);

  it("liguey_reserve_ai_generation is not callable by an ordinary authenticated session", async () => {
    const db = await openDb();
    const business = await db.query("insert into public.businesses(created_by) values ($1) returning id", [founder]);
    await expect(
      asUser(db, founder, "select liguey_reserve_ai_generation($1,$2) as allowed", [business.rows[0].id, 10]),
    ).rejects.toThrow(/permission denied/i);
    await db.close();
  }, 30_000);
});
