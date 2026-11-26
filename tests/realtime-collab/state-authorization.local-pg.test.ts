import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
const root = process.env.KEBU_LOCAL_PGLITE_ROOT;

describe.skipIf(!root)("document Realtime authorization — actual migration SQL", () => {
  it("denies guessed document topics to strangers for receive and send", async () => {
    const { PGlite } = await import(pathToFileURL(resolve(root!, "dist/index.js")).href);
    const db = new PGlite();
    const owner = "11111111-1111-4111-8111-111111111111", stranger = "22222222-2222-4222-8222-222222222222", id = "33333333-3333-4333-8333-333333333333";
    const epoch = "44444444-4444-4444-8444-444444444444";
    try {
      // The Realtime server owns this schema in production. This local fixture
      // supplies its policy surface; the application's migration is unmodified.
      await db.exec(`create role authenticated; create schema auth; create schema realtime;
        create function auth.uid() returns uuid language sql stable as $$select current_setting('request.jwt.claim.sub')::uuid$$;
        create function realtime.topic() returns text language sql stable as $$select current_setting('request.topic')$$;
        create table public.workspace_items(id uuid primary key,owner_id uuid,kind text, rich_content jsonb, body text);
        alter table public.workspace_items enable row level security;
        create policy owner_only on public.workspace_items for select to authenticated using(owner_id=auth.uid());
        create table realtime.messages(topic text,extension text);
        alter table realtime.messages enable row level security;
        grant usage on schema public,auth,realtime to authenticated;
        grant select on public.workspace_items to authenticated;
        grant select,insert on realtime.messages to authenticated;
        insert into public.workspace_items(id,owner_id,kind) values('${id}','${owner}','doc');
        insert into realtime.messages values('doc-collab:${id}:${epoch}','broadcast'),('doc-presence:${id}:${epoch}','presence');`);
      await db.exec(readFileSync(resolve("supabase/migrations/20261112075718_document_collaboration_state.sql"), "utf8"));
      await db.query("update workspace_items set collab_epoch=$1 where id=$2", [epoch,id]);
      for (const prefix of ["doc-collab", "doc-presence"]) {
        for (const user of [owner, stranger]) {
          await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${user}',false); select set_config('request.topic','${prefix}:${id}:${epoch}',false);`);
          const rows = await db.query("select * from realtime.messages");
          expect(rows.rows.length > 0).toBe(user === owner);
          if (user === stranger) await expect(db.query("insert into realtime.messages values($1,'broadcast')", [`${prefix}:${id}:${epoch}`])).rejects.toThrow();
          else await db.query("insert into realtime.messages values($1,'broadcast')", [`${prefix}:${id}:${epoch}`]);
          await db.exec("reset role");
        }
      }
      await db.exec(`create table public.room_calls(id uuid primary key,ended_at timestamptz);
        create table public.room_call_participants(call_id uuid,user_id uuid,left_at timestamptz);
        grant select on public.room_calls,public.room_call_participants to authenticated;
        insert into room_calls values('${id}',null);
        insert into room_call_participants values('${id}','${owner}',null);`);
      await db.exec(readFileSync(resolve("supabase/migrations/20261112081206_private_room_call_signaling.sql"), "utf8"));
      for (const user of [owner, stranger]) {
        await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${user}',false); select set_config('request.topic','room-call:${id}',false);`);
        expect((await db.query("select * from realtime.messages")).rows.length > 0).toBe(user === owner);
        if (user === stranger) await expect(db.query("insert into realtime.messages values('guessed','broadcast')")).rejects.toThrow();
        await db.exec("reset role");
      }
      await db.query("update room_call_participants set left_at=now()");
      await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false);`);
      expect((await db.query("select * from realtime.messages")).rows).toHaveLength(0);
      await db.exec("reset role");
      await db.query("update workspace_items set collab_state='old',collab_epoch=$1 where id=$2", [epoch,id]);
      await db.query("update workspace_items set body='old-client edit' where id=$1", [id]);
      expect((await db.query("select collab_state,collab_epoch from workspace_items where id=$1", [id])).rows).toEqual([{ collab_state:null,collab_epoch:null }]);
    } finally { await db.close(); }
  });
});
