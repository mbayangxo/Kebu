/**
 * Real-SQL verification of the K063 room-chat read-policy fix — the actual
 * migrations applied verbatim against PGlite (base workspace_items, space
 * chat, workspace/space hardening, Rooms, room-scope hardening, and the new
 * 20261016160000_room_chat_read_policy.sql), exercised by switching
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

const creator = "11111111-1111-4111-8111-111111111111";
const member = "22222222-2222-4222-8222-222222222222";
const stranger = "33333333-3333-4333-8333-333333333333";

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
    insert into auth.users(id) values ('${creator}'), ('${member}'), ('${stranger}');
  `);
  // Real migrations, verbatim, in the order the repository actually applies
  // them, up to and including the fix under test.
  await db.exec(readFileSync(resolve("supabase/migrations/20260920081000_workspace_items.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20260920082000_space_chat.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20260920083000_workspace_scope_hardening.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20260920085000_kebu_rooms.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20260920086000_room_scope_hardening.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261016160000_room_chat_read_policy.sql"), "utf8"));
  // Rooms creation (insert + select, i.e. RETURNING) is broken without this
  // fix (see room-creation-returning.local.test.ts) — applied here too so
  // this file's room/channel setup uses the real, working migration chain.
  await db.exec(readFileSync(resolve("supabase/migrations/20261016161000_room_creation_returning_fix.sql"), "utf8"));
  // Adding a member below would otherwise hit infinite recursion (see
  // room-members-recursion.local.test.ts) — applied here too.
  await db.exec(readFileSync(resolve("supabase/migrations/20261016162000_room_members_recursion_fix.sql"), "utf8"));
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

async function createRoomWithChannel(db: Db) {
  const room = await asUser(db, creator, "insert into rooms(created_by,name) values($1,'Project room') returning id", [creator]);
  const roomId = room.rows[0].id as string;
  await asUser(db, creator, "insert into room_members(room_id,user_id,role) values($1,$2,'member')", [roomId, member]);
  const channel = await asUser(db, creator, "insert into space_channels(created_by,room_id,name) values($1,$2,'General') returning id", [creator, roomId]);
  return { roomId, channelId: channel.rows[0].id as string };
}

describe.skipIf(!root)("K063 — room chat read policy (real RLS)", () => {
  it("before the fix's absence would mean this: a non-creator room member could not read room chat at all (regression guard via the real policy set)", async () => {
    const db = await openDb();
    const { channelId } = await createRoomWithChannel(db);
    await asUser(db, member, "insert into space_messages(channel_id,author_id,body) values($1,$2,'hello team')", [channelId, member]);
    const memberRead = await asUser(db, member, "select id, body from space_messages where channel_id=$1", [channelId]);
    expect(memberRead.rows).toHaveLength(1);
    expect(memberRead.rows[0].body).toBe("hello team");
    await db.close();
  }, 30_000);

  it("a member can read the creator's messages too, not only their own", async () => {
    const db = await openDb();
    const { channelId } = await createRoomWithChannel(db);
    await asUser(db, creator, "insert into space_messages(channel_id,author_id,body) values($1,$2,'welcome')", [channelId, creator]);
    const memberRead = await asUser(db, member, "select id from space_messages where channel_id=$1", [channelId]);
    expect(memberRead.rows).toHaveLength(1);
    await db.close();
  }, 30_000);

  it("a stranger who is not a room member cannot read room chat", async () => {
    const db = await openDb();
    const { channelId } = await createRoomWithChannel(db);
    await asUser(db, creator, "insert into space_messages(channel_id,author_id,body) values($1,$2,'private to the room')", [channelId, creator]);
    const strangerRead = await asUser(db, stranger, "select id from space_messages where channel_id=$1", [channelId]);
    expect(strangerRead.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("a removed member loses read access to room chat on the very next request", async () => {
    const db = await openDb();
    const { roomId, channelId } = await createRoomWithChannel(db);
    await asUser(db, creator, "insert into space_messages(channel_id,author_id,body) values($1,$2,'still here')", [channelId, creator]);
    expect((await asUser(db, member, "select id from space_messages where channel_id=$1", [channelId])).rows).toHaveLength(1);
    await asUser(db, creator, "delete from room_members where room_id=$1 and user_id=$2", [roomId, member]);
    expect((await asUser(db, member, "select id from space_messages where channel_id=$1", [channelId])).rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("a non-room business chat channel is unaffected — business members still read business chat via the pre-existing policy", async () => {
    const db = await openDb();
    const businessId = "44444444-4444-4444-8444-444444444444";
    await db.exec(`insert into public.businesses(id) values ('${businessId}')`);
    await db.exec(`insert into public.business_members(business_id,user_id,status) values ('${businessId}','${creator}','active'), ('${businessId}','${member}','active')`);
    const channel = await asUser(db, creator, "insert into space_channels(created_by,business_id,name) values($1,$2,'Business chat') returning id", [creator, businessId]);
    const channelId = channel.rows[0].id as string;
    await asUser(db, creator, "insert into space_messages(channel_id,author_id,body) values($1,$2,'business update')", [channelId, creator]);
    const memberRead = await asUser(db, member, "select id from space_messages where channel_id=$1", [channelId]);
    expect(memberRead.rows).toHaveLength(1);
    await db.close();
  }, 30_000);
});
