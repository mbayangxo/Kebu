/**
 * Real-SQL verification of a K063 severity-critical bug, larger in scope
 * than it first appeared: EVERY write to room_members has always failed
 * with "infinite recursion detected in policy for relation room_members"
 * — including a room's own creator inserting their own first owner-member
 * row during room creation (app/api/rooms/route.ts, no .select() on that
 * call, so the failure was silently swallowed with no error check at all)
 * and the "member" action adding any second person to a room
 * (app/api/rooms/[id]/route.ts, which DOES check the error and would 500
 * every time). This stayed invisible because can_access_room()'s
 * created_by branch already gives a room's creator full access without
 * ever needing a room_members row — so a single-person room looked
 * entirely functional while no room_members row was ever actually
 * created for anyone, and no second person could ever be added to any
 * room. Reproduced against the actual migration SQL, not a
 * reimplementation; confirmed to fail without the fix before trusting
 * that the fix resolves it. Hosted Supabase Auth/RLS acceptance remains
 * explicitly open, but this is a logic bug in the policy SQL itself.
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

async function openDb(opts: { applyFix: boolean }): Promise<Db> {
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
  await db.exec(readFileSync(resolve("supabase/migrations/20260920081000_workspace_items.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20260920082000_space_chat.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20260920083000_workspace_scope_hardening.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20260920085000_kebu_rooms.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20260920086000_room_scope_hardening.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261016161000_room_creation_returning_fix.sql"), "utf8"));
  if (opts.applyFix) {
    await db.exec(readFileSync(resolve("supabase/migrations/20261016162000_room_members_recursion_fix.sql"), "utf8"));
  }
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

describe.skipIf(!root)("K063 — room_members infinite recursion fix (real RLS)", () => {
  it("confirms the regression is real: without the fix, even the room's own creator cannot insert their own owner-member row", async () => {
    const db = await openDb({ applyFix: false });
    const room = await asUser(db, creator, "insert into rooms(created_by,name) values($1,'Broken') returning id", [creator]);
    const roomId = room.rows[0].id as string;
    await expect(
      asUser(db, creator, "insert into room_members(room_id,user_id,role) values($1,$2,'owner')", [roomId, creator]),
    ).rejects.toThrow(/infinite recursion/i);
    await db.close();
  }, 30_000);

  it("with the fix, the creator can insert their own owner-member row", async () => {
    const db = await openDb({ applyFix: true });
    const room = await asUser(db, creator, "insert into rooms(created_by,name) values($1,'Fixed') returning id", [creator]);
    const roomId = room.rows[0].id as string;
    await asUser(db, creator, "insert into room_members(room_id,user_id,role) values($1,$2,'owner')", [roomId, creator]);
    const rows = await asUser(db, creator, "select user_id, role from room_members where room_id=$1", [roomId]);
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]).toMatchObject({ user_id: creator, role: "owner" });
    await db.close();
  }, 30_000);

  it("an owner can add a second member — the actual 'member' action's real-world case", async () => {
    const db = await openDb({ applyFix: true });
    const room = await asUser(db, creator, "insert into rooms(created_by,name) values($1,'Team room') returning id", [creator]);
    const roomId = room.rows[0].id as string;
    await asUser(db, creator, "insert into room_members(room_id,user_id,role) values($1,$2,'owner')", [roomId, creator]);
    const result = await asUser(db, creator, "insert into room_members(room_id,user_id,role) values($1,$2,'member') returning user_id, role", [roomId, member]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ user_id: member, role: "member" });
    await db.close();
  }, 30_000);

  it("a non-admin member cannot add another member (authorization is preserved, not just unblocked)", async () => {
    const db = await openDb({ applyFix: true });
    const room = await asUser(db, creator, "insert into rooms(created_by,name) values($1,'Guarded room') returning id", [creator]);
    const roomId = room.rows[0].id as string;
    await asUser(db, creator, "insert into room_members(room_id,user_id,role) values($1,$2,'owner')", [roomId, creator]);
    await asUser(db, creator, "insert into room_members(room_id,user_id,role) values($1,$2,'member')", [roomId, member]);
    await expect(
      asUser(db, member, "insert into room_members(room_id,user_id,role) values($1,$2,'member')", [roomId, stranger]),
    ).rejects.toThrow(/row-level security policy/i);
    await db.close();
  }, 30_000);

  it("a stranger reading the membership list sees nothing", async () => {
    const db = await openDb({ applyFix: true });
    const room = await asUser(db, creator, "insert into rooms(created_by,name) values($1,'Private membership') returning id", [creator]);
    const roomId = room.rows[0].id as string;
    await asUser(db, creator, "insert into room_members(room_id,user_id,role) values($1,$2,'owner')", [roomId, creator]);
    const strangerRead = await asUser(db, stranger, "select user_id from room_members where room_id=$1", [roomId]);
    expect(strangerRead.rows).toHaveLength(0);
    await db.close();
  }, 30_000);
});
