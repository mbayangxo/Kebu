/**
 * Real-SQL RLS coverage for liguey_company_reviews (20261020020000) —
 * PGlite, real Postgres semantics, no mocks (same caveat as every other
 * .local.test.ts file in this repo: verifies the migration as written,
 * not the hosted Supabase schema).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = { exec: (sql: string) => Promise<unknown>; query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; close: () => Promise<void> };

const founder = "11111111-1111-4111-8111-111111111111";
const hiredWorker = "22222222-2222-4222-8222-222222222222";
const neverHiredWorker = "33333333-3333-4333-8333-333333333333";
const businessId = "44444444-4444-4444-8444-444444444444";
const listingId = "55555555-5555-4555-8555-555555555555";
const hiredApplicationId = "66666666-6666-4666-8666-666666666666";
const unhiredApplicationId = "77777777-7777-4777-8777-777777777777";

async function openDb(): Promise<Db> {
  const { PGlite } = await import(pathToFileURL(resolve(root!, "dist/index.js")).href);
  const { pgcrypto } = await import(pathToFileURL(resolve(root!, "dist/contrib/pgcrypto.js")).href);
  const db: Db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    create extension if not exists pgcrypto;
    create schema auth;
    create table auth.users(id uuid primary key);
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
    create table public.businesses(id uuid primary key default gen_random_uuid(), created_by uuid not null references auth.users(id), legal_name text not null default 'Fixture Business', trading_name text);
    create table public.business_members(id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, role text not null, status text not null default 'active');
    insert into auth.users(id) values ('${founder}'),('${hiredWorker}'),('${neverHiredWorker}');
    insert into public.businesses(id, created_by) values ('${businessId}', '${founder}');
    insert into public.business_members(business_id, user_id, role, status) values ('${businessId}', '${founder}', 'founder', 'active');
  `);
  await db.exec(readFileSync(resolve("supabase/migrations/20261016190000_liguey_job_listings_applications.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261020020000_liguey_listing_pay_photo_and_company_reviews.sql"), "utf8"));
  await db.exec("set role service_role;");
  await db.exec(`
    insert into public.job_listings(id, business_id, public_id, title, employment_type, status, created_by)
      values ('${listingId}', '${businessId}', 'job_fixture', 'Translator', 'contract', 'published', '${founder}');
    insert into public.job_applications(id, listing_id, business_id, applicant_user_id, status)
      values ('${hiredApplicationId}', '${listingId}', '${businessId}', '${hiredWorker}', 'accepted');
    insert into public.job_applications(id, listing_id, business_id, applicant_user_id, status)
      values ('${unhiredApplicationId}', '${listingId}', '${businessId}', '${neverHiredWorker}', 'submitted');
  `);
  await db.exec("reset role;");
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

describe.skipIf(!root)("Liguey company reviews (real RLS)", () => {
  it("a worker who was actually hired can post a real review", async () => {
    const db = await openDb();
    const result = await asUser(
      db, hiredWorker,
      "insert into liguey_company_reviews(business_id, reviewer_user_id, application_id, rating, body) values ($1,$2,$3,5,'Great place.') returning id",
      [businessId, hiredWorker, hiredApplicationId],
    );
    expect(result.rows).toHaveLength(1);
    await db.close();
  }, 30_000);

  it("a worker who was never hired cannot post a review about this business", async () => {
    const db = await openDb();
    await expect(
      asUser(
        db, neverHiredWorker,
        "insert into liguey_company_reviews(business_id, reviewer_user_id, application_id, rating, body) values ($1,$2,$3,1,'Fake.') returning id",
        [businessId, neverHiredWorker, unhiredApplicationId],
      ),
    ).rejects.toThrow(/row-level security/i);
    await db.close();
  }, 30_000);

  it("a worker cannot post a review claiming someone else's application id as their own", async () => {
    const db = await openDb();
    await expect(
      asUser(
        db, neverHiredWorker,
        "insert into liguey_company_reviews(business_id, reviewer_user_id, application_id, rating, body) values ($1,$2,$3,1,'Spoofed.') returning id",
        [businessId, neverHiredWorker, hiredApplicationId],
      ),
    ).rejects.toThrow(/row-level security/i);
    await db.close();
  }, 30_000);

  it("only one review per business per reviewer — a second insert conflicts", async () => {
    const db = await openDb();
    await asUser(
      db, hiredWorker,
      "insert into liguey_company_reviews(business_id, reviewer_user_id, application_id, rating, body) values ($1,$2,$3,5,'First.') returning id",
      [businessId, hiredWorker, hiredApplicationId],
    );
    await expect(
      asUser(
        db, hiredWorker,
        "insert into liguey_company_reviews(business_id, reviewer_user_id, application_id, rating, body) values ($1,$2,$3,3,'Second.') returning id",
        [businessId, hiredWorker, hiredApplicationId],
      ),
    ).rejects.toThrow(/duplicate key|unique constraint/i);
    await db.close();
  }, 30_000);

  it("the business's own founder can read but never edit or delete a real review about it", async () => {
    const db = await openDb();
    await asUser(
      db, hiredWorker,
      "insert into liguey_company_reviews(business_id, reviewer_user_id, application_id, rating, body) values ($1,$2,$3,5,'Great place.') returning id",
      [businessId, hiredWorker, hiredApplicationId],
    );
    const seen = await asUser(db, founder, "select rating from liguey_company_reviews where business_id=$1", [businessId]);
    expect(seen.rows).toHaveLength(1);

    const updated = await asUser(db, founder, "update liguey_company_reviews set rating=1 where business_id=$1 returning id", [businessId]);
    expect(updated.rows).toHaveLength(0);
    const unchanged = await asUser(db, founder, "select rating from liguey_company_reviews where business_id=$1", [businessId]);
    expect(unchanged.rows[0].rating).toBe(5);
    await db.close();
  }, 30_000);

  it("the author can edit their own review and later withdraw it (soft-remove)", async () => {
    const db = await openDb();
    await asUser(
      db, hiredWorker,
      "insert into liguey_company_reviews(business_id, reviewer_user_id, application_id, rating, body) values ($1,$2,$3,4,'Original.') returning id",
      [businessId, hiredWorker, hiredApplicationId],
    );
    await asUser(db, hiredWorker, "update liguey_company_reviews set body='Updated.' where reviewer_user_id=$1", [hiredWorker]);
    const edited = await asUser(db, hiredWorker, "select body from liguey_company_reviews where reviewer_user_id=$1", [hiredWorker]);
    expect(edited.rows[0].body).toBe("Updated.");

    await asUser(db, hiredWorker, "update liguey_company_reviews set status='removed' where reviewer_user_id=$1", [hiredWorker]);
    const withdrawn = await asUser(db, hiredWorker, "select status from liguey_company_reviews where reviewer_user_id=$1", [hiredWorker]);
    expect(withdrawn.rows[0].status).toBe("removed");
    await db.close();
  }, 30_000);

  it("a review's application_id can never be reassigned after creation — blocked at the grant level, even before the identity-guard trigger runs", async () => {
    const db = await openDb();
    await asUser(
      db, hiredWorker,
      "insert into liguey_company_reviews(business_id, reviewer_user_id, application_id, rating, body) values ($1,$2,$3,4,'Original.') returning id",
      [businessId, hiredWorker, hiredApplicationId],
    );
    await expect(
      asUser(db, hiredWorker, "update liguey_company_reviews set application_id=$1 where reviewer_user_id=$2", [unhiredApplicationId, hiredWorker]),
    ).rejects.toThrow(/permission denied|cannot be changed/);
    await db.close();
  }, 30_000);

  it("any other signed-in user can read a visible review, but not once it's removed", async () => {
    const db = await openDb();
    await asUser(
      db, hiredWorker,
      "insert into liguey_company_reviews(business_id, reviewer_user_id, application_id, rating, body) values ($1,$2,$3,4,'Visible.') returning id",
      [businessId, hiredWorker, hiredApplicationId],
    );
    const visible = await asUser(db, neverHiredWorker, "select id from liguey_company_reviews where business_id=$1", [businessId]);
    expect(visible.rows).toHaveLength(1);

    await asUser(db, hiredWorker, "update liguey_company_reviews set status='removed' where reviewer_user_id=$1", [hiredWorker]);
    const hidden = await asUser(db, neverHiredWorker, "select id from liguey_company_reviews where business_id=$1", [businessId]);
    expect(hidden.rows).toHaveLength(0);
    await db.close();
  }, 30_000);
});
