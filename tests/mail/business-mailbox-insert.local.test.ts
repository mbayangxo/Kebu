/**
 * Real-SQL verification of 20261020010000_kebu_business_mailbox_insert_repair.sql
 * — reproduces the pre-fix bug (no RLS policy ever allowed inserting a
 * 'business' mailbox, so app/api/mail/business/route.ts's create_mailbox
 * action always failed with a bare row-level-security error) before
 * confirming the fix resolves it.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = { exec: (sql: string) => Promise<unknown>; query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; close: () => Promise<void> };

const founder = "11111111-1111-4111-8111-111111111111";
const employee = "22222222-2222-4222-8222-222222222222";

const MAIL_MIGRATIONS_THROUGH_M3 = [
  "20260920084000_kebu_mail_m1.sql",
  "20260920091000_kebu_mail_m2.sql",
  "20260920121000_kebu_business_mail_m3.sql",
];

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
    create table public.site_domains(id uuid primary key default gen_random_uuid());
    insert into auth.users(id) values ('${founder}'),('${employee}');
  `);
  for (const migration of MAIL_MIGRATIONS_THROUGH_M3) {
    await db.exec(readFileSync(resolve("supabase/migrations", migration), "utf8"));
  }
  if (opts.withFix) await db.exec(readFileSync(resolve("supabase/migrations/20261020010000_kebu_business_mailbox_insert_repair.sql"), "utf8"));
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

async function seedBusiness(db: Db): Promise<string> {
  await db.exec("reset role;");
  const business = await db.query("insert into public.businesses(created_by) values ($1) returning id", [founder]);
  const businessId = business.rows[0].id as string;
  await db.exec(`
    insert into public.business_members(business_id,user_id,role,status) values
      ('${businessId}','${founder}','founder','active'),
      ('${businessId}','${employee}','employee','active');
  `);
  return businessId;
}

describe.skipIf(!root)("Kebu Mail business mailbox creation (real RLS)", () => {
  it("before the fix: a founder's own session cannot create a business mailbox at all (reproduces the bug)", async () => {
    const db = await openDb({ withFix: false });
    const businessId = await seedBusiness(db);
    await expect(
      asUser(db, founder,
        "insert into mailboxes(business_id, mailbox_type, address, display_name) values ($1,'business','hello@biz.test','Biz')",
        [businessId],
      ),
    ).rejects.toThrow(/row-level security policy/i);
    await db.close();
  }, 30_000);

  it("after the fix: a founder (manager role) can create the business mailbox", async () => {
    const db = await openDb({ withFix: true });
    const businessId = await seedBusiness(db);
    const result = await asUser(db, founder,
      "insert into mailboxes(business_id, mailbox_type, address, display_name) values ($1,'business','hello@biz.test','Biz') returning id, address",
      [businessId],
    );
    expect(result.rows[0].address).toBe("hello@biz.test");
    await db.close();
  }, 30_000);

  it("after the fix: a plain employee (not a manager role) still cannot create a business mailbox", async () => {
    const db = await openDb({ withFix: true });
    const businessId = await seedBusiness(db);
    await expect(
      asUser(db, employee,
        "insert into mailboxes(business_id, mailbox_type, address, display_name) values ($1,'business','hello@biz.test','Biz')",
        [businessId],
      ),
    ).rejects.toThrow(/row-level security policy/i);
    await db.close();
  }, 30_000);

  it("after the fix: personal mailbox creation is unaffected", async () => {
    const db = await openDb({ withFix: true });
    const result = await asUser(db, founder,
      "insert into mailboxes(owner_user_id, mailbox_type, address, display_name) values ($1,'personal','founder@kebu.africa','Founder') returning address",
      [founder],
    );
    expect(result.rows[0].address).toBe("founder@kebu.africa");
    await db.close();
  }, 30_000);

  it("after the fix: a founder still cannot smuggle a personal-looking mailbox through the business check by setting owner_user_id", async () => {
    const db = await openDb({ withFix: true });
    const businessId = await seedBusiness(db);
    await expect(
      asUser(db, founder,
        "insert into mailboxes(owner_user_id, business_id, mailbox_type, address, display_name) values ($1,$2,'business','hello@biz.test','Biz')",
        [founder, businessId],
      ),
    ).rejects.toThrow(/row-level security policy/i);
    await db.close();
  }, 30_000);
});
