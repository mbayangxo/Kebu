/**
 * Real-SQL verification of the K062 business-item visibility fix — the
 * actual migrations applied verbatim against PGlite (base workspace_items
 * table, both hardening follow-ups, and the new
 * 20261016150000_workspace_item_visibility.sql), exercised by switching
 * Postgres role/JWT claim per query exactly as PostgREST does. Not a
 * reimplementation: a bug in the real policy SQL would actually surface
 * here. Hosted Supabase Auth/RLS acceptance remains explicitly open.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = { exec: (sql: string) => Promise<unknown>; query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; close: () => Promise<void> };

const owner = "11111111-1111-4111-8111-111111111111";
const teammate = "22222222-2222-4222-8222-222222222222";
const stranger = "33333333-3333-4333-8333-333333333333";
const businessId = "44444444-4444-4444-8444-444444444444";

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
    create table public.businesses(id uuid primary key default gen_random_uuid());
    create table public.business_members(
      id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
      user_id uuid not null references auth.users(id) on delete cascade, role text not null default 'employee',
      status text not null default 'active' check (status in ('pending','active','removed')), unique(business_id,user_id)
    );
    create table public.rooms(id uuid primary key default gen_random_uuid(), created_by uuid, archived_at timestamptz);
    create table public.room_members(room_id uuid not null, user_id uuid not null);
    insert into auth.users(id) values ('${owner}'), ('${teammate}'), ('${stranger}');
    insert into public.businesses(id) values ('${businessId}');
    insert into public.business_members(business_id,user_id,status) values ('${businessId}','${owner}','active'), ('${businessId}','${teammate}','active');
  `);
  // Real migrations, verbatim, in order. 086000 redefines can_access_room
  // itself (against the rooms/room_members stand-ins created above) and sets
  // the complete current workspace_items policy state — the exact baseline
  // this slice's migration modifies — so 085000_kebu_rooms.sql's much larger
  // room/space feature set (not under test here) isn't needed at all.
  await db.exec(readFileSync(resolve("supabase/migrations/20260920081000_workspace_items.sql"), "utf8"));
  // room_id itself is added by 085000_kebu_rooms.sql (not run here, see above) — just the column.
  await db.exec("alter table public.workspace_items add column if not exists room_id uuid references public.rooms(id) on delete cascade;");
  await db.exec(readFileSync(resolve("supabase/migrations/20260920086000_room_scope_hardening.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261014043916_workspace_item_identity_guard.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261016150000_workspace_item_visibility.sql"), "utf8"));
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

describe.skipIf(!root)("K062 — business work-item visibility (real RLS)", () => {
  it("defaults to 'team': every existing-shape row stays visible to the whole business, unchanged from before this migration", async () => {
    const db = await openDb();
    const insert = await asUser(db, owner, "insert into workspace_items(owner_id,business_id,kind,title) values($1,$2,'task','Quarterly plan') returning id,visibility", [owner, businessId]);
    expect(insert.rows[0].visibility).toBe("team");
    const teammateRead = await asUser(db, teammate, "select id from workspace_items where id=$1", [insert.rows[0].id]);
    expect(teammateRead.rows).toHaveLength(1);
    await db.close();
  }, 30_000);

  it("a private item is invisible to a teammate, even though they're an active business member", async () => {
    const db = await openDb();
    const insert = await asUser(db, owner, "insert into workspace_items(owner_id,business_id,kind,title,visibility) values($1,$2,'task','Salary notes','private') returning id", [owner, businessId]);
    const itemId = insert.rows[0].id as string;
    const teammateRead = await asUser(db, teammate, "select id from workspace_items where id=$1", [itemId]);
    expect(teammateRead.rows).toHaveLength(0);
    const ownerRead = await asUser(db, owner, "select id from workspace_items where id=$1", [itemId]);
    expect(ownerRead.rows).toHaveLength(1);
    await db.close();
  }, 30_000);

  it("a teammate cannot write to a private item either", async () => {
    const db = await openDb();
    const insert = await asUser(db, owner, "insert into workspace_items(owner_id,business_id,kind,title,visibility) values($1,$2,'task','Salary notes','private') returning id", [owner, businessId]);
    const itemId = insert.rows[0].id as string;
    const teammateWrite = await asUser(db, teammate, "update workspace_items set title='leaked' where id=$1 returning id", [itemId]);
    expect(teammateWrite.rows).toHaveLength(0);
    const teammateDelete = await asUser(db, teammate, "delete from workspace_items where id=$1 returning id", [itemId]);
    expect(teammateDelete.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("flipping a team item to private cuts off the teammate's access on the very next request", async () => {
    const db = await openDb();
    const insert = await asUser(db, owner, "insert into workspace_items(owner_id,business_id,kind,title) values($1,$2,'event','Standup') returning id", [owner, businessId]);
    const itemId = insert.rows[0].id as string;
    expect((await asUser(db, teammate, "select id from workspace_items where id=$1", [itemId])).rows).toHaveLength(1);
    await asUser(db, owner, "update workspace_items set visibility='private' where id=$1", [itemId]);
    expect((await asUser(db, teammate, "select id from workspace_items where id=$1", [itemId])).rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("only the owner can change visibility — a teammate cannot expose or hide someone else's item", async () => {
    const db = await openDb();
    const insert = await asUser(db, owner, "insert into workspace_items(owner_id,business_id,kind,title) values($1,$2,'task','Team plan') returning id", [owner, businessId]);
    const itemId = insert.rows[0].id as string;
    await expect(asUser(db, teammate, "update workspace_items set visibility='private' where id=$1", [itemId]))
      .rejects.toThrow(/Only the owner can change.*visibility/);
    await db.close();
  }, 30_000);

  it("a stranger (not a business member at all) sees nothing regardless of visibility", async () => {
    const db = await openDb();
    const insert = await asUser(db, owner, "insert into workspace_items(owner_id,business_id,kind,title) values($1,$2,'task','Team plan') returning id", [owner, businessId]);
    const itemId = insert.rows[0].id as string;
    expect((await asUser(db, stranger, "select id from workspace_items where id=$1", [itemId])).rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("personal items (no business) are unaffected by any of this — owner-only, as before", async () => {
    const db = await openDb();
    const insert = await asUser(db, owner, "insert into workspace_items(owner_id,kind,title) values($1,'task','Buy groceries') returning id", [owner]);
    const itemId = insert.rows[0].id as string;
    expect((await asUser(db, teammate, "select id from workspace_items where id=$1", [itemId])).rows).toHaveLength(0);
    expect((await asUser(db, owner, "select id from workspace_items where id=$1", [itemId])).rows).toHaveLength(1);
    await db.close();
  }, 30_000);
});
