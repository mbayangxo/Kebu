/**
 * Real-SQL verification of 20261027030000_kebu_mail_shared_access.sql —
 * reproduces the pre-fix bug (a 'shared' mailbox granted read/send access
 * to every active business member, identically to a 'business' mailbox,
 * because can_access_mailbox()/can_send_mailbox() never distinguished the
 * two types) before confirming the fix: access to a shared mailbox now
 * requires an explicit mail_shared_access row (or business-admin
 * fallback), and only a 'manager' row (or admin) can manage that roster.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = { exec: (sql: string) => Promise<unknown>; query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; close: () => Promise<void> };

const founder = "11111111-1111-4111-8111-111111111111";
const employeeA = "22222222-2222-4222-8222-222222222222";
const employeeB = "33333333-3333-4333-8333-333333333333";
const outsider = "44444444-4444-4444-8444-444444444444";

const MAIL_MIGRATIONS_THROUGH_REPAIR = [
  "20260920084000_kebu_mail_m1.sql",
  "20260920091000_kebu_mail_m2.sql",
  "20260920121000_kebu_business_mail_m3.sql",
  "20261020010000_kebu_business_mailbox_insert_repair.sql",
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
    insert into auth.users(id) values ('${founder}'),('${employeeA}'),('${employeeB}'),('${outsider}');
  `);
  for (const migration of MAIL_MIGRATIONS_THROUGH_REPAIR) {
    await db.exec(readFileSync(resolve("supabase/migrations", migration), "utf8"));
  }
  if (opts.withFix) {
    await db.exec(readFileSync(resolve("supabase/migrations/20261027030000_kebu_mail_shared_access.sql"), "utf8"));
  }
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

async function asService(db: Db, sql: string, params: unknown[] = []) {
  await db.exec("reset role; set role service_role;");
  return db.query(sql, params);
}

async function seedBusinessAndSharedMailbox(db: Db): Promise<{ businessId: string; mailboxId: string }> {
  const business = await asService(db, "insert into public.businesses(created_by) values ($1) returning id", [founder]);
  const businessId = business.rows[0].id as string;
  await asService(
    db,
    `insert into public.business_members(business_id,user_id,role,status) values
       ($1,$2,'founder','active'), ($1,$3,'employee','active'), ($1,$4,'employee','active')`,
    [businessId, founder, employeeA, employeeB],
  );
  const mailbox = await asService(
    db,
    "insert into public.mailboxes(business_id, mailbox_type, address, display_name, owner_user_id) values ($1,'shared','support@biz.test','Support',null) returning id",
    [businessId],
  );
  return { businessId, mailboxId: mailbox.rows[0].id as string };
}

describe.skipIf(!root)("Kebu Mail shared mailbox access (real RLS)", () => {
  it("before the fix: any active business member (not just granted members) can read a shared mailbox's messages", async () => {
    const db = await openDb({ withFix: false });
    const { mailboxId } = await seedBusinessAndSharedMailbox(db);
    await asService(db, "insert into public.mail_threads(mailbox_id, subject) values ($1,'t')", [mailboxId]);

    // employeeB was never granted shared-mailbox access, yet the pre-fix
    // policy only checks business_members, so they can see it anyway.
    const result = await asUser(db, employeeB, "select id from public.mail_threads where mailbox_id = $1", [mailboxId]);
    expect(result.rows).toHaveLength(1);
    await db.close();
  }, 30_000);

  it("after the fix: a business member with no mail_shared_access row cannot read the shared mailbox at all", async () => {
    const db = await openDb({ withFix: true });
    const { mailboxId } = await seedBusinessAndSharedMailbox(db);
    await asService(db, "insert into public.mail_threads(mailbox_id, subject) values ($1,'t')", [mailboxId]);

    const mailboxRow = await asUser(db, employeeB, "select id from public.mailboxes where id = $1", [mailboxId]);
    expect(mailboxRow.rows).toHaveLength(0);
    const threads = await asUser(db, employeeB, "select id from public.mail_threads where mailbox_id = $1", [mailboxId]);
    expect(threads.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("after the fix: an unrelated outsider (not even a business member) cannot read or join the mailbox", async () => {
    const db = await openDb({ withFix: true });
    const { mailboxId } = await seedBusinessAndSharedMailbox(db);
    const mailboxRow = await asUser(db, outsider, "select id from public.mailboxes where id = $1", [mailboxId]);
    expect(mailboxRow.rows).toHaveLength(0);
    await expect(
      asUser(db, outsider, "insert into public.mail_shared_access(mailbox_id,user_id,role,added_by) values ($1,$2,'member',$2)", [mailboxId, outsider]),
    ).rejects.toThrow(/row-level security policy/i);
    await db.close();
  }, 30_000);

  it("after the fix: the founder (business-wide admin) can grant employeeA 'member' access without needing a mail_shared_access row themselves", async () => {
    const db = await openDb({ withFix: true });
    const { mailboxId } = await seedBusinessAndSharedMailbox(db);
    const grant = await asUser(
      db, founder,
      "insert into public.mail_shared_access(mailbox_id,user_id,role,added_by) values ($1,$2,'member',$3) returning role",
      [mailboxId, employeeA, founder],
    );
    expect(grant.rows[0].role).toBe("member");
    await db.close();
  }, 30_000);

  it("after the fix: once granted 'member', employeeA can read and send in the shared mailbox", async () => {
    const db = await openDb({ withFix: true });
    const { mailboxId } = await seedBusinessAndSharedMailbox(db);
    await asService(db, "insert into public.mail_threads(mailbox_id, subject) values ($1,'t')", [mailboxId]);
    await asUser(db, founder, "insert into public.mail_shared_access(mailbox_id,user_id,role,added_by) values ($1,$2,'member',$3)", [mailboxId, employeeA, founder]);

    const threads = await asUser(db, employeeA, "select id from public.mail_threads where mailbox_id = $1", [mailboxId]);
    expect(threads.rows).toHaveLength(1);

    const sent = await asUser(
      db, employeeA,
      `insert into public.mail_messages(mailbox_id, thread_id, direction, folder, from_address, to_addresses, subject)
       values ($1, (select id from public.mail_threads where mailbox_id=$1 limit 1), 'outbound', 'sent', 'support@biz.test', array['customer@example.com'], 'Re: t')
       returning id`,
      [mailboxId],
    );
    expect(sent.rows).toHaveLength(1);
    await db.close();
  }, 30_000);

  it("after the fix: a plain 'member' cannot add or remove other members (only a 'manager' or admin can)", async () => {
    const db = await openDb({ withFix: true });
    const { mailboxId } = await seedBusinessAndSharedMailbox(db);
    await asUser(db, founder, "insert into public.mail_shared_access(mailbox_id,user_id,role,added_by) values ($1,$2,'member',$3)", [mailboxId, employeeA, founder]);

    await expect(
      asUser(db, employeeA, "insert into public.mail_shared_access(mailbox_id,user_id,role,added_by) values ($1,$2,'member',$3)", [mailboxId, employeeB, employeeA]),
    ).rejects.toThrow(/row-level security policy/i);
    await db.close();
  }, 30_000);

  it("after the fix: a 'manager' (not a business-wide admin) can add and remove members on their own mailbox", async () => {
    const db = await openDb({ withFix: true });
    const { mailboxId } = await seedBusinessAndSharedMailbox(db);
    await asUser(db, founder, "insert into public.mail_shared_access(mailbox_id,user_id,role,added_by) values ($1,$2,'manager',$3)", [mailboxId, employeeA, founder]);

    const added = await asUser(
      db, employeeA,
      "insert into public.mail_shared_access(mailbox_id,user_id,role,added_by) values ($1,$2,'member',$3) returning user_id",
      [mailboxId, employeeB, employeeA],
    );
    expect(added.rows[0].user_id).toBe(employeeB);

    const removed = await asUser(db, employeeA, "delete from public.mail_shared_access where mailbox_id=$1 and user_id=$2 returning user_id", [mailboxId, employeeB]);
    expect(removed.rows).toHaveLength(1);
    await db.close();
  }, 30_000);

  it("after the fix: removing employeeA's access revokes their read access immediately", async () => {
    const db = await openDb({ withFix: true });
    const { mailboxId } = await seedBusinessAndSharedMailbox(db);
    await asUser(db, founder, "insert into public.mail_shared_access(mailbox_id,user_id,role,added_by) values ($1,$2,'member',$3)", [mailboxId, employeeA, founder]);
    const before = await asUser(db, employeeA, "select id from public.mailboxes where id=$1", [mailboxId]);
    expect(before.rows).toHaveLength(1);

    await asUser(db, founder, "delete from public.mail_shared_access where mailbox_id=$1 and user_id=$2", [mailboxId, employeeA]);
    const after = await asUser(db, employeeA, "select id from public.mailboxes where id=$1", [mailboxId]);
    expect(after.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("after the fix: a row can't be attached to a non-shared mailbox (trigger guard)", async () => {
    const db = await openDb({ withFix: true });
    const business = await asService(db, "insert into public.businesses(created_by) values ($1) returning id", [founder]);
    const businessId = business.rows[0].id as string;
    await asService(db, "insert into public.business_members(business_id,user_id,role,status) values ($1,$2,'founder','active')", [businessId, founder]);
    const personal = await asService(
      db,
      "insert into public.mailboxes(owner_user_id, mailbox_type, address, display_name) values ($1,'personal','founder@kebu.africa','Founder') returning id",
      [founder],
    );
    await expect(
      asUser(db, founder, "insert into public.mail_shared_access(mailbox_id,user_id,role,added_by) values ($1,$2,'manager',$2)", [personal.rows[0].id, founder]),
    ).rejects.toThrow(/must reference a shared mailbox/i);
    await db.close();
  }, 30_000);

  it("after the fix: 'business' mailbox read/send access for a plain active member is unchanged (still broad for reads, admin-only for send)", async () => {
    const db = await openDb({ withFix: true });
    const business = await asService(db, "insert into public.businesses(created_by) values ($1) returning id", [founder]);
    const businessId = business.rows[0].id as string;
    await asService(
      db,
      "insert into public.business_members(business_id,user_id,role,status) values ($1,$2,'founder','active'), ($1,$3,'employee','active')",
      [businessId, founder, employeeA],
    );
    const bizMailbox = await asService(
      db,
      "insert into public.mailboxes(business_id, mailbox_type, address, display_name, owner_user_id) values ($1,'business','hello@biz.test','Biz',null) returning id",
      [businessId],
    );
    const mailboxId = bizMailbox.rows[0].id as string;
    await asService(db, "insert into public.mail_threads(mailbox_id, subject) values ($1,'t')", [mailboxId]);

    // read: any active member, unchanged
    const read = await asUser(db, employeeA, "select id from public.mail_threads where mailbox_id=$1", [mailboxId]);
    expect(read.rows).toHaveLength(1);

    // send/manage: still admin-tier only, unchanged (not this slice's scope to loosen)
    await expect(
      asUser(db, employeeA, "insert into public.mail_threads(mailbox_id, subject) values ($1,'t2')", [mailboxId]),
    ).rejects.toThrow(/row-level security policy/i);
    await db.close();
  }, 30_000);
});
