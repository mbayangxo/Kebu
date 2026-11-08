/**
 * Real-SQL verification of sheet_bodies RLS -- the actual
 * supabase/migrations/20261016120000_library_sharing.sql and
 * supabase/migrations/20261107010000_sheet_bodies.sql applied verbatim
 * against PGlite, exercised by switching Postgres role/JWT claim per query
 * exactly as PostgREST does for the real app/api/library/sheets/[id] route.
 * Not a reimplementation: a bug in the real policy SQL would actually
 * surface here.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = { exec: (sql: string) => Promise<unknown>; query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; close: () => Promise<void> };

const owner = "11111111-1111-4111-8111-111111111111";
const editor = "22222222-2222-4222-8222-222222222222";
const viewer = "44444444-4444-4444-8444-444444444444";
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
    create or replace function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at = now(); return new; end$$;
    do $$begin
      if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
      if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
      if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
    end$$;
    alter default privileges in schema public grant all on tables to authenticated,anon,service_role;
    grant usage on schema public, auth to authenticated, anon, service_role;
    grant execute on all functions in schema auth to authenticated, anon, service_role;
    insert into auth.users(id) values ('${owner}'), ('${editor}'), ('${viewer}'), ('${stranger}');
  `);
  // The real migrations, verbatim, in the real order.
  await db.exec(readFileSync(resolve("supabase/migrations/20261016120000_library_sharing.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261107010000_sheet_bodies.sql"), "utf8"));
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

async function makeSheet(db: Db) {
  const insert = await asUser(db, owner, "insert into library_nodes(owner_id,kind,title) values($1,'sheet','Budget') returning id", [owner]);
  return insert.rows[0].id as string;
}

describe.skipIf(!root)("sheet_bodies — real RLS: owner/editor/viewer/stranger", () => {
  it("the owner can create (lazy insert) and read the body of their own sheet; a stranger sees nothing", async () => {
    const db = await openDb();
    const nodeId = await makeSheet(db);

    const insert = await asUser(db, owner, "insert into sheet_bodies(id, cells) values($1, $2) returning id", [nodeId, JSON.stringify({ A1: { raw: "12" } })]);
    expect(insert.rows).toHaveLength(1);

    const ownerRead = await asUser(db, owner, "select cells from sheet_bodies where id=$1", [nodeId]);
    expect(ownerRead.rows).toEqual([{ cells: { A1: { raw: "12" } } }]);

    const strangerRead = await asUser(db, stranger, "select id from sheet_bodies where id=$1", [nodeId]);
    expect(strangerRead.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("a viewer-only share can read the body but cannot write it", async () => {
    const db = await openDb();
    const nodeId = await makeSheet(db);
    await asUser(db, owner, "insert into sheet_bodies(id, cells) values($1, $2)", [nodeId, JSON.stringify({ A1: { raw: "1" } })]);
    await asUser(db, owner, "insert into library_shares(node_id,shared_with_user_id,permission,shared_by_user_id) values($1,$2,'viewer',$3)", [nodeId, viewer, owner]);

    const viewerRead = await asUser(db, viewer, "select id from sheet_bodies where id=$1", [nodeId]);
    expect(viewerRead.rows).toHaveLength(1);

    const viewerWrite = await asUser(db, viewer, "update sheet_bodies set cells=$2 where id=$1 returning id", [nodeId, JSON.stringify({ A1: { raw: "hijacked" } })]);
    expect(viewerWrite.rows).toHaveLength(0);

    const stillOriginal = await asUser(db, owner, "select cells from sheet_bodies where id=$1", [nodeId]);
    expect(stillOriginal.rows).toEqual([{ cells: { A1: { raw: "1" } } }]);
    await db.close();
  }, 30_000);

  it("a non-shared user gets neither read nor write access", async () => {
    const db = await openDb();
    const nodeId = await makeSheet(db);
    await asUser(db, owner, "insert into sheet_bodies(id, cells) values($1, $2)", [nodeId, JSON.stringify({ A1: { raw: "1" } })]);

    const strangerRead = await asUser(db, stranger, "select id from sheet_bodies where id=$1", [nodeId]);
    expect(strangerRead.rows).toHaveLength(0);

    const strangerWrite = await asUser(db, stranger, "update sheet_bodies set cells=$2 where id=$1 returning id", [nodeId, JSON.stringify({ A1: { raw: "x" } })]);
    expect(strangerWrite.rows).toHaveLength(0);

    const strangerInsert = await asUser(db, stranger, "insert into sheet_bodies(id, cells) values($1,$2) returning id", [nodeId, JSON.stringify({})]).catch(cause => cause);
    expect(strangerInsert).toBeInstanceOf(Error);
    await db.close();
  }, 30_000);

  it("an editor share can perform the lazy-create insert on a brand-new sheet with no body row yet, and then update it", async () => {
    const db = await openDb();
    const nodeId = await makeSheet(db);
    await asUser(db, owner, "insert into library_shares(node_id,shared_with_user_id,permission,shared_by_user_id) values($1,$2,'editor',$3)", [nodeId, editor, owner]);

    const editorInsert = await asUser(db, editor, "insert into sheet_bodies(id, cells) values($1,$2) returning id", [nodeId, JSON.stringify({ A1: { raw: "=1+1" } })]);
    expect(editorInsert.rows).toHaveLength(1);

    const editorUpdate = await asUser(db, editor, "update sheet_bodies set cells=$2 where id=$1 returning cells", [nodeId, JSON.stringify({ A1: { raw: "=2+2" } })]);
    expect(editorUpdate.rows).toEqual([{ cells: { A1: { raw: "=2+2" } } }]);
    await db.close();
  }, 30_000);

  it("an editor cannot delete the body — only the owner can", async () => {
    const db = await openDb();
    const nodeId = await makeSheet(db);
    await asUser(db, owner, "insert into sheet_bodies(id, cells) values($1, $2)", [nodeId, JSON.stringify({ A1: { raw: "1" } })]);
    await asUser(db, owner, "insert into library_shares(node_id,shared_with_user_id,permission,shared_by_user_id) values($1,$2,'editor',$3)", [nodeId, editor, owner]);

    const editorDelete = await asUser(db, editor, "delete from sheet_bodies where id=$1 returning id", [nodeId]);
    expect(editorDelete.rows).toHaveLength(0);

    const ownerDelete = await asUser(db, owner, "delete from sheet_bodies where id=$1 returning id", [nodeId]);
    expect(ownerDelete.rows).toHaveLength(1);
    await db.close();
  }, 30_000);

  it("the body is deleted automatically when the owning library_nodes row is deleted (on delete cascade)", async () => {
    const db = await openDb();
    const nodeId = await makeSheet(db);
    await asUser(db, owner, "insert into sheet_bodies(id, cells) values($1, $2)", [nodeId, JSON.stringify({ A1: { raw: "1" } })]);

    await asUser(db, owner, "delete from library_nodes where id=$1", [nodeId]);
    const afterCascade = await asUser(db, owner, "select id from sheet_bodies where id=$1", [nodeId]);
    expect(afterCascade.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("revoking a share cuts off sheet_bodies access on the very next request", async () => {
    const db = await openDb();
    const nodeId = await makeSheet(db);
    await asUser(db, owner, "insert into sheet_bodies(id, cells) values($1, $2)", [nodeId, JSON.stringify({ A1: { raw: "1" } })]);
    await asUser(db, owner, "insert into library_shares(node_id,shared_with_user_id,permission,shared_by_user_id) values($1,$2,'editor',$3)", [nodeId, editor, owner]);

    const before = await asUser(db, editor, "select id from sheet_bodies where id=$1", [nodeId]);
    expect(before.rows).toHaveLength(1);

    await asUser(db, owner, "delete from library_shares where node_id=$1 and shared_with_user_id=$2", [nodeId, editor]);

    const after = await asUser(db, editor, "select id from sheet_bodies where id=$1", [nodeId]);
    expect(after.rows).toHaveLength(0);
    const writeAfterRevoke = await asUser(db, editor, "update sheet_bodies set cells=$2 where id=$1 returning id", [nodeId, JSON.stringify({ A1: { raw: "x" } })]);
    expect(writeAfterRevoke.rows).toHaveLength(0);
    await db.close();
  }, 30_000);
});
