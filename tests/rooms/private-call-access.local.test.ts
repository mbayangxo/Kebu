import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
const host = "10000000-0000-4000-8000-000000000001";
const guest = "10000000-0000-4000-8000-000000000002";
const other = "10000000-0000-4000-8000-000000000003";
const outsider = "10000000-0000-4000-8000-000000000004";
const room = "10000000-0000-4000-8000-000000000005";
const sdp = "v=0\r\ns=Test description\r\n";

it.skipIf(!root)("restricts call data to two current room members and enforces signaling order and teardown", async () => {
  const { PGlite } = await import(pathToFileURL(resolve(root!, "dist/index.js")).href);
  const db: { exec(sql: string): Promise<unknown>; query<T>(sql: string, values?: unknown[]): Promise<{rows: T[]}>; close(): Promise<void> } = new PGlite();
  try {
    await db.exec(`
      create schema auth;
      create role anon;
      create role authenticated;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable
        as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
      create table public.rooms(id uuid primary key, created_by uuid not null, archived_at timestamptz, room_type text);
      create table public.room_members(room_id uuid, user_id uuid);
      insert into auth.users values ('${host}'),('${guest}'),('${other}'),('${outsider}');
      insert into rooms values ('${room}','${host}',null,'project');
      insert into room_members values ('${room}','${guest}'),('${room}','${other}');
    `);
    await db.exec(readFileSync("supabase/migrations/20261106030000_private_room_calls.sql", "utf8"));
    type State = { id: string; host: boolean; offer: string | null; answer: string | null; ended: boolean };
    async function as(actor: string, action: string, id?: string, peer?: string, description?: string) {
      await db.query("select set_config('test.actor',$1,false)", [actor]);
      const result = await db.query<{ value: State | null }>(
        "select public.room_call_exchange($1,$2,$3,$4,$5) as value", [room, action, id ?? null, peer ?? null, description ?? null]);
      return result.rows[0].value;
    }
    await db.exec("set role anon");
    await expect(as(host, "create", undefined, guest)).rejects.toThrow(/permission denied/i);
    await db.exec("set role authenticated");
    await expect(db.exec("select * from public.room_calls")).rejects.toThrow(/permission denied/i);
    expect(await as(host, "create", undefined, outsider)).toBeNull();
    const id = (await as(host, "create", undefined, guest))!.id;
    await expect(as(host, "create", undefined, guest)).rejects.toThrow(/current call/i);
    expect(await as(other, "read", id)).toBeNull();
    expect(await as(guest, "answer", id, undefined, sdp)).toBeNull();
    expect(await as(guest, "offer", id, undefined, sdp)).toBeNull();
    expect((await as(host, "offer", id, undefined, sdp))?.offer).toBe(sdp);
    expect((await as(guest, "read", id))?.offer).toBe(sdp);
    expect((await as(guest, "answer", id, undefined, sdp))?.answer).toBe(sdp);
    expect((await as(host, "read", id))?.answer).toBe(sdp);
    expect(await as(other, "end", id)).toBeNull();
    expect(await as(guest, "end", id)).toMatchObject({ ended: true, offer: null, answer: null });
    expect(await as(host, "offer", id, undefined, sdp)).toBeNull();

    const revoked = (await as(host, "create", undefined, guest))!.id;
    await db.exec("reset role");
    await db.query("delete from room_members where user_id=$1", [guest]);
    await db.exec("set role authenticated");
    expect(await as(guest, "read", revoked)).toBeNull();
    expect(await as(host, "read", revoked)).toBeNull();
    await db.exec("reset role");
    expect((await db.query("select ended_at is not null as ended from room_calls where id=$1", [revoked])).rows).toEqual([{ ended: true }]);
  } finally {
    await db.close();
  }
});
