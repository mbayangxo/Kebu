/**
 * Real-SQL verification of a K063 severity-critical bug: room creation was
 * completely broken for every user. app/api/rooms/route.ts's POST handler
 * creates a room with `.insert({...}).select("*").single()` (INSERT ...
 * RETURNING). The rooms table's only SELECT policy was a bare
 * `can_access_room(id)` call whose own body re-queries `rooms` for a row
 * matching that id — the same table and the same row the RETURNING clause
 * just inserted, in the same statement. This hits a real, independently
 * confirmed upstream PostgreSQL defect (matches postgresql.org bug #19015:
 * a function called from a SELECT policy does not see the row the current
 * statement just inserted), reproduced here with the actual migration SQL,
 * not a reimplementation, and confirmed first to fail without the fix
 * before trusting that the fix resolves it. Hosted Supabase Auth/RLS
 * acceptance remains explicitly open, but this is a logic bug in the
 * policy SQL itself, not a hosted-environment-only concern — it reproduces
 * identically here.
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
  if (opts.applyFix) {
    await db.exec(readFileSync(resolve("supabase/migrations/20261016161000_room_creation_returning_fix.sql"), "utf8"));
    // Adding a member below would otherwise hit a separate, independently
    // fixed infinite-recursion bug (see room-members-recursion.local.test.ts).
    await db.exec(readFileSync(resolve("supabase/migrations/20261016162000_room_members_recursion_fix.sql"), "utf8"));
  }
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

describe.skipIf(!root)("K063 — room creation RETURNING fix (real RLS)", () => {
  it("confirms the regression is real: without the fix, the exact app-code INSERT...RETURNING shape fails for every user", async () => {
    const db = await openDb({ applyFix: false });
    await expect(
      asUser(db, creator, "insert into rooms(created_by,name) values($1,'Broken room') returning id, name", [creator]),
    ).rejects.toThrow(/row-level security policy/i);
    await db.close();
  }, 30_000);

  it("with the fix, the room's own creator can create a room via the real app-code shape (insert + select, i.e. RETURNING)", async () => {
    const db = await openDb({ applyFix: true });
    const result = await asUser(db, creator, "insert into rooms(created_by,name) values($1,'Working room') returning id, name, created_by", [creator]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe("Working room");
    await db.close();
  }, 30_000);

  it("the fix does not weaken read access: a stranger still cannot read a room they don't belong to", async () => {
    const db = await openDb({ applyFix: true });
    const insert = await asUser(db, creator, "insert into rooms(created_by,name) values($1,'Private room') returning id", [creator]);
    const roomId = insert.rows[0].id as string;
    const strangerRead = await asUser(db, stranger, "select id from rooms where id=$1", [roomId]);
    expect(strangerRead.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("the fix does not weaken read access: a non-creator member still reads the room normally via can_access_room", async () => {
    const db = await openDb({ applyFix: true });
    const insert = await asUser(db, creator, "insert into rooms(created_by,name) values($1,'Shared room') returning id", [creator]);
    const roomId = insert.rows[0].id as string;
    await asUser(db, creator, "insert into room_members(room_id,user_id,role) values($1,$2,'member')", [roomId, member]);
    const memberRead = await asUser(db, member, "select id from rooms where id=$1", [roomId]);
    expect(memberRead.rows).toHaveLength(1);
    await db.close();
  }, 30_000);
});
