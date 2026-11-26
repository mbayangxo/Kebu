/**
 * Real-SQL verification that 20261107040000_workspace_item_rich_content.sql
 * applies cleanly on top of the real workspace_items migration chain, and
 * that the existing RLS policies (which operate on the whole row, not named
 * columns) keep gating the new rich_content column exactly like every other
 * column — a private item's rich_content is invisible to a teammate, a
 * teammate can't write it, and it defaults to null. Not a reimplementation:
 * a real policy bug would surface here, same as workspace-item-visibility.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = { exec: (sql: string) => Promise<unknown>; query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; close: () => Promise<void> };

const owner = "11111111-1111-4111-8111-111111111111";
const teammate = "22222222-2222-4222-8222-222222222222";
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
    insert into auth.users(id) values ('${owner}'), ('${teammate}');
    insert into public.businesses(id) values ('${businessId}');
    insert into public.business_members(business_id,user_id,status) values ('${businessId}','${owner}','active'), ('${businessId}','${teammate}','active');
  `);
  await db.exec(readFileSync(resolve("supabase/migrations/20260920081000_workspace_items.sql"), "utf8"));
  await db.exec("alter table public.workspace_items add column if not exists room_id uuid references public.rooms(id) on delete cascade;");
  await db.exec(readFileSync(resolve("supabase/migrations/20260920086000_room_scope_hardening.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261014043916_workspace_item_identity_guard.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261016150000_workspace_item_visibility.sql"), "utf8"));
  // Strip the `notify pgrst, 'reload schema'` tail — PGlite has no PostgREST listening on that channel.
  await db.exec(readFileSync(resolve("supabase/migrations/20261107040000_workspace_item_rich_content.sql"), "utf8").replace(/notify pgrst[^;]*;/i, ""));
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

describe.skipIf(!root)("workspace_items.rich_content (real RLS, real migration)", () => {
  it("defaults to null and round-trips a real document through the owner's own read", async () => {
    const db = await openDb();
    const doc = JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }] });
    const insert = await asUser(db, owner, "insert into workspace_items(owner_id,kind,title) values($1,'doc','Untitled') returning id,rich_content", [owner]);
    expect(insert.rows[0].rich_content).toBeNull();
    const itemId = insert.rows[0].id as string;
    await asUser(db, owner, "update workspace_items set rich_content=$2::jsonb where id=$1", [itemId, doc]);
    const read = await asUser(db, owner, "select rich_content from workspace_items where id=$1", [itemId]);
    expect(read.rows[0].rich_content).toEqual(JSON.parse(doc));
    await db.close();
  }, 30_000);

  it("a private doc's rich_content is invisible to a teammate, same as every other column", async () => {
    const db = await openDb();
    const doc = JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "secret plan" }] }] });
    const insert = await asUser(db, owner, "insert into workspace_items(owner_id,business_id,kind,title,visibility,rich_content) values($1,$2,'doc','Notes','private',$3::jsonb) returning id", [owner, businessId, doc]);
    const itemId = insert.rows[0].id as string;
    const teammateRead = await asUser(db, teammate, "select rich_content from workspace_items where id=$1", [itemId]);
    expect(teammateRead.rows).toHaveLength(0);
    const ownerRead = await asUser(db, owner, "select rich_content from workspace_items where id=$1", [itemId]);
    expect(ownerRead.rows[0].rich_content).toEqual(JSON.parse(doc));
    await db.close();
  }, 30_000);

  it("a teammate cannot write rich_content into a private doc either", async () => {
    const db = await openDb();
    const insert = await asUser(db, owner, "insert into workspace_items(owner_id,business_id,kind,title,visibility) values($1,$2,'doc','Notes','private') returning id", [owner, businessId]);
    const itemId = insert.rows[0].id as string;
    const teammateWrite = await asUser(db, teammate, "update workspace_items set rich_content=$2::jsonb where id=$1 returning id", [itemId, JSON.stringify({ type: "doc", content: [] })]);
    expect(teammateWrite.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("a team-visible doc's rich_content IS visible to a teammate, like the rest of the row", async () => {
    const db = await openDb();
    const doc = JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "shared" }] }] });
    const insert = await asUser(db, owner, "insert into workspace_items(owner_id,business_id,kind,title,rich_content) values($1,$2,'doc','Notes',$3::jsonb) returning id", [owner, businessId, doc]);
    const itemId = insert.rows[0].id as string;
    const teammateRead = await asUser(db, teammate, "select rich_content from workspace_items where id=$1", [itemId]);
    expect(teammateRead.rows[0].rich_content).toEqual(JSON.parse(doc));
    await db.close();
  }, 30_000);
});
