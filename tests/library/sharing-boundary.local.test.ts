/**
 * Real-SQL verification of Library sharing/revocation RLS — the actual
 * supabase/migrations/20261016120000_library_sharing.sql applied verbatim
 * against PGlite, exercised by switching Postgres role/JWT claim per query
 * exactly as PostgREST does for the real app/api/library/{nodes,shares}
 * routes. Not a reimplementation: a bug in the real policy SQL would
 * actually surface here. Hosted Supabase Auth/Storage/PostgREST acceptance
 * remains explicitly open — this verifies the SQL locally.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = { exec: (sql: string) => Promise<unknown>; query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; close: () => Promise<void> };

const owner = "11111111-1111-4111-8111-111111111111";
const recipient = "22222222-2222-4222-8222-222222222222";
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
    insert into auth.users(id) values ('${owner}'), ('${recipient}'), ('${stranger}');
  `);
  // The real migration, verbatim.
  await db.exec(readFileSync(resolve("supabase/migrations/20261016120000_library_sharing.sql"), "utf8"));
  return db;
}

/**
 * Mirrors PostgREST: set role + the request.jwt.claim.sub the real auth.uid()
 * reads. Plain SET, not SET LOCAL — SET LOCAL only lives for the current
 * transaction, and db.exec/db.query here are separate statements, so a SET
 * LOCAL here would silently vanish before the query below ran (every
 * operation would then run as the unrestricted default role, and RLS would
 * never actually trigger — exactly the failure caught by running this for
 * real instead of assuming the policies work).
 */
async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

describe.skipIf(!root)("Library sharing — real RLS: independent owner/recipient access, sharing, revocation, unauthorized access", () => {
  it("the owner can create and read their own node; a stranger sees nothing", async () => {
    const db = await openDb();
    const insert = await asUser(db, owner, "insert into library_nodes(owner_id,kind,title) values($1,'document','Plan') returning id", [owner]);
    const nodeId = insert.rows[0].id as string;

    const ownerRead = await asUser(db, owner, "select id from library_nodes where id=$1", [nodeId]);
    expect(ownerRead.rows).toHaveLength(1);

    const strangerRead = await asUser(db, stranger, "select id from library_nodes where id=$1", [nodeId]);
    expect(strangerRead.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("sharing grants the recipient independent read access as themselves — not as the owner", async () => {
    const db = await openDb();
    const insert = await asUser(db, owner, "insert into library_nodes(owner_id,kind,title) values($1,'document','Plan') returning id", [owner]);
    const nodeId = insert.rows[0].id as string;

    await asUser(db, owner, "insert into library_shares(node_id,shared_with_user_id,permission,shared_by_user_id) values($1,$2,'viewer',$3)", [nodeId, recipient, owner]);

    const recipientRead = await asUser(db, recipient, "select id from library_nodes where id=$1", [nodeId]);
    expect(recipientRead.rows).toHaveLength(1);

    const strangerRead = await asUser(db, stranger, "select id from library_nodes where id=$1", [nodeId]);
    expect(strangerRead.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("a viewer cannot write; an editor can", async () => {
    const db = await openDb();
    const insert = await asUser(db, owner, "insert into library_nodes(owner_id,kind,title) values($1,'document','Plan') returning id", [owner]);
    const nodeId = insert.rows[0].id as string;
    await asUser(db, owner, "insert into library_shares(node_id,shared_with_user_id,permission,shared_by_user_id) values($1,$2,'viewer',$3)", [nodeId, recipient, owner]);

    const viewerWrite = await asUser(db, recipient, "update library_nodes set title='Hijacked' where id=$1 returning id", [nodeId]);
    expect(viewerWrite.rows).toHaveLength(0);

    await asUser(db, owner, "update library_shares set permission='editor' where node_id=$1 and shared_with_user_id=$2", [nodeId, recipient]);
    const editorWrite = await asUser(db, recipient, "update library_nodes set title='Edited by collaborator' where id=$1 returning title", [nodeId]);
    expect(editorWrite.rows).toMatchObject([{ title: "Edited by collaborator" }]);
    await db.close();
  }, 30_000);

  it("an editor cannot reassign ownership or change the node's kind, even though they can edit the title", async () => {
    const db = await openDb();
    const insert = await asUser(db, owner, "insert into library_nodes(owner_id,kind,title) values($1,'document','Plan') returning id", [owner]);
    const nodeId = insert.rows[0].id as string;
    await asUser(db, owner, "insert into library_shares(node_id,shared_with_user_id,permission,shared_by_user_id) values($1,$2,'editor',$3)", [nodeId, recipient, owner]);

    await expect(asUser(db, recipient, "update library_nodes set owner_id=$1 where id=$2", [recipient, nodeId])).rejects.toThrow(/ownership cannot be changed/);
    await expect(asUser(db, recipient, "update library_nodes set kind='sheet' where id=$1", [nodeId])).rejects.toThrow(/kind cannot be changed/);
    await db.close();
  }, 30_000);

  it("revocation actually cuts off access on the very next request — not just the UI hiding it", async () => {
    const db = await openDb();
    const insert = await asUser(db, owner, "insert into library_nodes(owner_id,kind,title) values($1,'document','Plan') returning id", [owner]);
    const nodeId = insert.rows[0].id as string;
    await asUser(db, owner, "insert into library_shares(node_id,shared_with_user_id,permission,shared_by_user_id) values($1,$2,'editor',$3)", [nodeId, recipient, owner]);

    const beforeRevoke = await asUser(db, recipient, "select id from library_nodes where id=$1", [nodeId]);
    expect(beforeRevoke.rows).toHaveLength(1);

    await asUser(db, owner, "delete from library_shares where node_id=$1 and shared_with_user_id=$2", [nodeId, recipient]);

    const afterRevoke = await asUser(db, recipient, "select id from library_nodes where id=$1", [nodeId]);
    expect(afterRevoke.rows).toHaveLength(0);
    const writeAfterRevoke = await asUser(db, recipient, "update library_nodes set title='still trying' where id=$1 returning id", [nodeId]);
    expect(writeAfterRevoke.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("only the owner can share — a recipient (even an editor) cannot grant access to someone else", async () => {
    const db = await openDb();
    const insert = await asUser(db, owner, "insert into library_nodes(owner_id,kind,title) values($1,'document','Plan') returning id", [owner]);
    const nodeId = insert.rows[0].id as string;
    await asUser(db, owner, "insert into library_shares(node_id,shared_with_user_id,permission,shared_by_user_id) values($1,$2,'editor',$3)", [nodeId, recipient, owner]);

    await expect(
      asUser(db, recipient, "insert into library_shares(node_id,shared_with_user_id,permission,shared_by_user_id) values($1,$2,'viewer',$3)", [nodeId, stranger, recipient]),
    ).rejects.toThrow(/Only the item owner can share/);
    await db.close();
  }, 30_000);

  it("a stranger cannot create a share naming a node they don't own, even by claiming to be the owner in the payload", async () => {
    const db = await openDb();
    const insert = await asUser(db, owner, "insert into library_nodes(owner_id,kind,title) values($1,'document','Plan') returning id", [owner]);
    const nodeId = insert.rows[0].id as string;

    await expect(
      asUser(db, stranger, "insert into library_shares(node_id,shared_with_user_id,permission,shared_by_user_id) values($1,$2,'editor',$3)", [nodeId, stranger, stranger]),
    ).rejects.toThrow(/Only the item owner can share/);
    await db.close();
  }, 30_000);

  it("a stranger cannot delete (revoke) a share on a node they don't own", async () => {
    const db = await openDb();
    const insert = await asUser(db, owner, "insert into library_nodes(owner_id,kind,title) values($1,'document','Plan') returning id", [owner]);
    const nodeId = insert.rows[0].id as string;
    await asUser(db, owner, "insert into library_shares(node_id,shared_with_user_id,permission,shared_by_user_id) values($1,$2,'viewer',$3)", [nodeId, recipient, owner]);

    const strangerDelete = await asUser(db, stranger, "delete from library_shares where node_id=$1 and shared_with_user_id=$2 returning node_id", [nodeId, recipient]);
    expect(strangerDelete.rows).toHaveLength(0);
    const stillThere = await asUser(db, owner, "select 1 from library_shares where node_id=$1 and shared_with_user_id=$2", [nodeId, recipient]);
    expect(stillThere.rows).toHaveLength(1);
    await db.close();
  }, 30_000);

  it("the recipient of a share sees only their own share row, not other collaborators' — the owner sees all", async () => {
    const db = await openDb();
    const insert = await asUser(db, owner, "insert into library_nodes(owner_id,kind,title) values($1,'document','Plan') returning id", [owner]);
    const nodeId = insert.rows[0].id as string;
    await asUser(db, owner, "insert into library_shares(node_id,shared_with_user_id,permission,shared_by_user_id) values($1,$2,'viewer',$3)", [nodeId, recipient, owner]);
    await asUser(db, owner, "insert into library_shares(node_id,shared_with_user_id,permission,shared_by_user_id) values($1,$2,'viewer',$3)", [nodeId, stranger, owner]);

    const recipientView = await asUser(db, recipient, "select shared_with_user_id from library_shares where node_id=$1", [nodeId]);
    expect(recipientView.rows).toEqual([{ shared_with_user_id: recipient }]);

    const ownerView = await asUser(db, owner, "select shared_with_user_id from library_shares where node_id=$1 order by created_at", [nodeId]);
    expect(ownerView.rows).toHaveLength(2);
    await db.close();
  }, 30_000);

  it("cannot share an item with yourself", async () => {
    const db = await openDb();
    const insert = await asUser(db, owner, "insert into library_nodes(owner_id,kind,title) values($1,'document','Plan') returning id", [owner]);
    const nodeId = insert.rows[0].id as string;
    await expect(
      asUser(db, owner, "insert into library_shares(node_id,shared_with_user_id,permission,shared_by_user_id) values($1,$2,'editor',$3)", [nodeId, owner, owner]),
    ).rejects.toThrow(/Cannot share .* with yourself/);
    await db.close();
  }, 30_000);

  it("only the owner can permanently delete a node — an editor cannot", async () => {
    const db = await openDb();
    const insert = await asUser(db, owner, "insert into library_nodes(owner_id,kind,title) values($1,'document','Plan') returning id", [owner]);
    const nodeId = insert.rows[0].id as string;
    await asUser(db, owner, "insert into library_shares(node_id,shared_with_user_id,permission,shared_by_user_id) values($1,$2,'editor',$3)", [nodeId, recipient, owner]);

    const editorDelete = await asUser(db, recipient, "delete from library_nodes where id=$1 returning id", [nodeId]);
    expect(editorDelete.rows).toHaveLength(0);

    const ownerDelete = await asUser(db, owner, "delete from library_nodes where id=$1 returning id", [nodeId]);
    expect(ownerDelete.rows).toHaveLength(1);
    await db.close();
  }, 30_000);

  it("only the owner can move a node to a new parent — an editor cannot relocate it", async () => {
    const db = await openDb();
    const folder = await asUser(db, owner, "insert into library_nodes(owner_id,kind,title) values($1,'folder','Archive') returning id", [owner]);
    const folderId = folder.rows[0].id as string;
    const doc = await asUser(db, owner, "insert into library_nodes(owner_id,kind,title) values($1,'document','Plan') returning id", [owner]);
    const nodeId = doc.rows[0].id as string;
    await asUser(db, owner, "insert into library_shares(node_id,shared_with_user_id,permission,shared_by_user_id) values($1,$2,'editor',$3)", [nodeId, recipient, owner]);

    await expect(asUser(db, recipient, "update library_nodes set parent_id=$1 where id=$2", [folderId, nodeId])).rejects.toThrow(/Only the owner can move/);
    await db.close();
  }, 30_000);
});
