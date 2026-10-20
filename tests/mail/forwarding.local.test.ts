/**
 * Real-SQL verification of 20261020000000_kebu_mail_forwarding.sql, applied
 * verbatim on top of the full real Mail migration chain (m1 through
 * reputation guardrails) against a locally reconstructed auth/businesses
 * fixture — not a hosted-schema verification (same caveat as every other
 * .local.test.ts file in this repo).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = { exec: (sql: string) => Promise<unknown>; query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; close: () => Promise<void> };

const founder = "11111111-1111-4111-8111-111111111111";
const employee = "22222222-2222-4222-8222-222222222222";
const stranger = "33333333-3333-4333-8333-333333333333";
const owner = "44444444-4444-4444-8444-444444444444";

const MAIL_MIGRATIONS = [
  "20260920084000_kebu_mail_m1.sql",
  "20260920091000_kebu_mail_m2.sql",
  "20260920121000_kebu_business_mail_m3.sql",
  "20260920223000_kebu_mail_delivery_infrastructure.sql",
  "20260920223500_kebu_mail_platform_domain_and_alerts.sql",
  "20260920224000_kebu_mail_domain_event_metrics.sql",
  "20260920230000_kebu_mail_reputation_guardrails.sql",
  "20260921011500_mail_message_attention_states.sql",
  "20261020000000_kebu_mail_forwarding.sql",
  "20261020010000_kebu_business_mailbox_insert_repair.sql",
];

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
    insert into auth.users(id) values ('${founder}'),('${employee}'),('${stranger}'),('${owner}');
  `);
  for (const migration of MAIL_MIGRATIONS) {
    await db.exec(readFileSync(resolve("supabase/migrations", migration), "utf8"));
  }
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

async function seedPersonalMailbox(db: Db, userId: string): Promise<string> {
  await db.exec("reset role;");
  const result = await asUser(db, userId,
    "insert into mailboxes(owner_user_id, mailbox_type, address, display_name) values ($1,'personal',$2,'Test') returning id",
    [userId, "owner-" + userId.slice(0, 8) + "@kebu.africa"],
  );
  return result.rows[0].id as string;
}

async function seedBusinessMailbox(db: Db): Promise<{ businessId: string; mailboxId: string }> {
  await db.exec("reset role;");
  const business = await db.query("insert into public.businesses(created_by) values ($1) returning id", [founder]);
  const businessId = business.rows[0].id as string;
  await db.exec(`
    insert into public.business_members(business_id,user_id,role,status) values
      ('${businessId}','${founder}','founder','active'),
      ('${businessId}','${employee}','employee','active');
  `);
  const mailbox = await db.query(
    "insert into mailboxes(business_id, mailbox_type, address, display_name) values ($1,'business','hello@biz.test','Biz') returning id",
    [businessId],
  );
  return { businessId, mailboxId: mailbox.rows[0].id as string };
}

describe.skipIf(!root)("Kebu Mail forwarding (real RLS)", () => {
  it("a personal mailbox owner can create, read, update and delete their own forwarding rule", async () => {
    const db = await openDb();
    const mailboxId = await seedPersonalMailbox(db, owner);

    const created = await asUser(db, owner,
      "insert into mail_forwarding_rules(mailbox_id, forward_to_address, created_by) values ($1,$2,$3) returning id, is_active",
      [mailboxId, "forward@example.com", owner],
    );
    expect(created.rows[0].is_active).toBe(true);

    const read = await asUser(db, owner, "select forward_to_address from mail_forwarding_rules where mailbox_id=$1", [mailboxId]);
    expect(read.rows[0].forward_to_address).toBe("forward@example.com");

    const updated = await asUser(db, owner,
      "update mail_forwarding_rules set is_active=false where mailbox_id=$1 returning is_active",
      [mailboxId],
    );
    expect(updated.rows[0].is_active).toBe(false);

    const deleted = await asUser(db, owner, "delete from mail_forwarding_rules where mailbox_id=$1 returning id", [mailboxId]);
    expect(deleted.rows).toHaveLength(1);
    await db.close();
  }, 30_000);

  it("a stranger cannot read, create, or modify another user's forwarding rule", async () => {
    const db = await openDb();
    const mailboxId = await seedPersonalMailbox(db, owner);
    await asUser(db, owner,
      "insert into mail_forwarding_rules(mailbox_id, forward_to_address, created_by) values ($1,$2,$3)",
      [mailboxId, "forward@example.com", owner],
    );

    const read = await asUser(db, stranger, "select id from mail_forwarding_rules where mailbox_id=$1", [mailboxId]);
    expect(read.rows).toHaveLength(0);

    await expect(
      asUser(db, stranger, "insert into mail_forwarding_rules(mailbox_id, forward_to_address, created_by) values ($1,$2,$3)", [mailboxId, "evil@example.com", stranger]),
    ).rejects.toThrow(/row-level security policy/i);

    const updateResult = await asUser(db, stranger, "update mail_forwarding_rules set is_active=false where mailbox_id=$1 returning id", [mailboxId]);
    expect(updateResult.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("a business manager can manage the business mailbox's forwarding rule; a plain employee cannot", async () => {
    const db = await openDb();
    const { mailboxId } = await seedBusinessMailbox(db);

    const created = await asUser(db, founder,
      "insert into mail_forwarding_rules(mailbox_id, forward_to_address, created_by) values ($1,$2,$3) returning id",
      [mailboxId, "ops@example.com", founder],
    );
    expect(created.rows).toHaveLength(1);

    await expect(
      asUser(db, employee, "insert into mail_forwarding_rules(mailbox_id, forward_to_address, created_by) values ($1,$2,$3)", [mailboxId, "evil@example.com", employee]),
    ).rejects.toThrow(/row-level security policy/i);

    const employeeUpdate = await asUser(db, employee, "update mail_forwarding_rules set is_active=false where mailbox_id=$1 returning id", [mailboxId]);
    expect(employeeUpdate.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("only one forwarding rule per mailbox is allowed (unique constraint)", async () => {
    const db = await openDb();
    const mailboxId = await seedPersonalMailbox(db, owner);
    await asUser(db, owner, "insert into mail_forwarding_rules(mailbox_id, forward_to_address, created_by) values ($1,$2,$3)", [mailboxId, "first@example.com", owner]);
    await expect(
      asUser(db, owner, "insert into mail_forwarding_rules(mailbox_id, forward_to_address, created_by) values ($1,$2,$3)", [mailboxId, "second@example.com", owner]),
    ).rejects.toThrow(/duplicate key|unique/i);
    await db.close();
  }, 30_000);

  it("mail_messages accepts forward tracking columns within the 0-5 depth bound and rejects beyond it", async () => {
    const db = await openDb();
    const mailboxId = await seedPersonalMailbox(db, owner);
    const thread = await asUser(db, owner, "insert into mail_threads(mailbox_id, subject) values ($1,'Test') returning id", [mailboxId]);
    const threadId = thread.rows[0].id as string;

    const ok = await asUser(db, owner,
      "insert into mail_messages(mailbox_id, thread_id, direction, folder, from_address, status, forward_depth) values ($1,$2,'inbound','inbox','a@b.com','received',5) returning forward_depth",
      [mailboxId, threadId],
    );
    expect(ok.rows[0].forward_depth).toBe(5);

    await expect(
      asUser(db, owner,
        "insert into mail_messages(mailbox_id, thread_id, direction, folder, from_address, status, forward_depth) values ($1,$2,'inbound','inbox','a@b.com','received',6)",
        [mailboxId, threadId],
      ),
    ).rejects.toThrow(/check/i);
    await db.close();
  }, 30_000);
});
