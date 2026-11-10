import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
const host = "10000000-0000-4000-8000-000000000001";
const guest = "10000000-0000-4000-8000-000000000002";
const admin = "10000000-0000-4000-8000-000000000003";
const outsider = "10000000-0000-4000-8000-000000000004";
const bystander = "10000000-0000-4000-8000-000000000006";
const room = "10000000-0000-4000-8000-000000000005";

it.skipIf(!root)("group calls: membership-gated join/leave/end, capacity, and RLS-locked tables", async () => {
  const { PGlite } = await import(pathToFileURL(resolve(root!, "dist/index.js")).href);
  const { pgcrypto } = await import(pathToFileURL(resolve(root!, "dist/contrib/pgcrypto.js")).href);
  const db: {
    exec(sql: string): Promise<unknown>;
    query<T>(sql: string, values?: unknown[]): Promise<{ rows: T[] }>;
    close(): Promise<void>;
  } = new PGlite({ extensions: { pgcrypto } });
  try {
    await db.exec(`
      create extension if not exists pgcrypto;
      create schema auth;
      create role anon;
      create role authenticated;
      create role service_role;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable
        as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
      create table public.businesses(id uuid primary key);
      create table public.business_members(business_id uuid, user_id uuid, status text);
      insert into auth.users values ('${host}'),('${guest}'),('${admin}'),('${outsider}'),('${bystander}');
      grant usage on schema public, auth to authenticated, anon;
      grant select on public.business_members to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
    `);
    // The real rooms migration creates rooms/room_members/can_access_room with
    // their full, real columns and policies; workspace_items/space_channels/
    // space_messages aren't part of this fixture, so drop whole statements that
    // touch them (statement-level, since several span lines).
    const roomsMigration = readFileSync("supabase/migrations/20260920085000_kebu_rooms.sql", "utf8")
      .split(";")
      .filter((stmt) => !/workspace_items|space_channels|space_messages/.test(stmt))
      .join(";");
    await db.exec(roomsMigration);
    await db.exec(`
      grant select on public.rooms, public.room_members to authenticated, anon;
      insert into public.rooms(id, created_by, name, room_type) values ('${room}','${host}','Test room','project');
      insert into public.room_members(room_id, user_id, role) values
        ('${room}','${guest}','member'), ('${room}','${admin}','admin'), ('${room}','${bystander}','member');
    `);
    await db.exec(readFileSync("supabase/migrations/20261108020000_room_calls_mesh.sql", "utf8"));
    await db.exec(readFileSync("supabase/migrations/20261109010000_room_call_join_created_flag.sql", "utf8"));

    async function as<T>(actor: string, sql: string, values: unknown[] = []): Promise<T> {
      await db.query("select set_config('test.actor',$1,false)", [actor]);
      const result = await db.query<{ v: T }>(`select (${sql}) as v`, values);
      return result.rows[0]!.v;
    }
    type Joined = { id: string; roomId: string; startedAt: string; maxParticipants: number; created: boolean } | null;

    // Direct table access is locked down; only the RPCs and the select policy work.
    await db.exec("set role anon");
    await expect(db.query("select public.room_call_join($1)", [room])).rejects.toThrow(/permission denied/i);
    await db.exec("set role authenticated");
    await db.query("select set_config('test.actor',$1,false)", [outsider]);
    await expect(db.exec("insert into public.room_calls(room_id, started_by) values (gen_random_uuid(), gen_random_uuid())")).rejects.toThrow(/permission denied/i);

    // An outsider (not a room member, not the owner) can't join.
    expect(await as<Joined>(outsider, "public.room_call_join($1)", [room])).toBeNull();

    // The host starts a call; a room member joins the same active call.
    // `created` distinguishes the two — only a genuinely new call should ever
    // trigger a "call started" notification, never a join of one in progress.
    const started = await as<Joined>(host, "public.room_call_join($1)", [room]);
    expect(started?.roomId).toBe(room);
    expect(started?.created).toBe(true);
    const joined = await as<Joined>(guest, "public.room_call_join($1)", [room]);
    expect(joined?.id).toBe(started!.id);
    expect(joined?.created).toBe(false);

    // History is readable by any room member (RLS select policy), not by an outsider.
    await db.query("select set_config('test.actor',$1,false)", [admin]);
    const adminSees = await db.query<{ id: string }>("select id from public.room_calls where id=$1", [started!.id]);
    expect(adminSees.rows).toHaveLength(1);
    await db.query("select set_config('test.actor',$1,false)", [outsider]);
    const outsiderSees = await db.query<{ id: string }>("select id from public.room_calls where id=$1", [started!.id]);
    expect(outsiderSees.rows).toHaveLength(0);

    // Capacity: cap the call at 2, confirm a third distinct room member is rejected.
    // (RLS-bypassing admin tweak for the test fixture itself, not part of what's exercised.)
    await db.exec("reset role");
    await db.query("update public.room_calls set max_participants=2 where id=$1", [started!.id]);
    await db.exec("set role authenticated");
    await expect(as<Joined>(bystander, "public.room_call_join($1)", [room])).rejects.toThrow(/call is full/i);

    // Leaving while another participant remains doesn't end the call.
    await as(guest, "public.room_call_leave($1)", [started!.id]);
    const stillOpen = await db.query<{ ended_at: string | null }>("select ended_at from public.room_calls where id=$1", [started!.id]);
    expect(stillOpen.rows[0]!.ended_at).toBeNull();

    // A non-owner, non-admin, non-starter can't force-end the call.
    expect(await as<{ ended: boolean } | null>(bystander, "public.room_call_end($1)", [started!.id])).toBeNull();
    // A room admin (not the starter) can force-end it for everyone.
    const ended = await as<{ ended: boolean }>(admin, "public.room_call_end($1)", [started!.id]);
    expect(ended.ended).toBe(true);
    const finalRow = await db.query<{ ended_at: string | null }>("select ended_at from public.room_calls where id=$1", [started!.id]);
    expect(finalRow.rows[0]!.ended_at).not.toBeNull();
    const finalParticipants = await db.query<{ left_at: string | null }>("select left_at from public.room_call_participants where call_id=$1", [started!.id]);
    expect(finalParticipants.rows.every((r) => r.left_at !== null)).toBe(true);

    // Joining again after the call ended opens a fresh one, not the ended one —
    // and is reported as created again, since it's a genuinely new call.
    const fresh = await as<Joined>(host, "public.room_call_join($1)", [room]);
    expect(fresh!.id).not.toBe(started!.id);
    expect(fresh!.created).toBe(true);
    await as<Joined>(guest, "public.room_call_join($1)", [room]);

    // Rejoining after leaving resets left_at (no duplicate participant rows).
    // Guest also stays active, so the call doesn't end out from under this check.
    await as(host, "public.room_call_leave($1)", [fresh!.id]);
    const leftRow = await db.query<{ left_at: string | null }>(
      "select left_at from public.room_call_participants where call_id=$1 and user_id=$2", [fresh!.id, host],
    );
    expect(leftRow.rows[0]!.left_at).not.toBeNull();
    await as<Joined>(host, "public.room_call_join($1)", [room]);
    const rows = await db.query<{ left_at: string | null }>(
      "select left_at from public.room_call_participants where call_id=$1 and user_id=$2", [fresh!.id, host],
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]!.left_at).toBeNull();
  } finally {
    await db.close();
  }
}, 20000);
