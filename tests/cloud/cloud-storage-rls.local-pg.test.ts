/**
 * Real-SQL verification of Kebu Cloud's RLS -- the actual
 * supabase/migrations/20261109010000_cloud_storage.sql applied verbatim
 * against PGlite, exercised by switching Postgres role/JWT claim per query
 * exactly as PostgREST does for the real app/api/cloud/* routes. Mirrors
 * tests/library/slide-bodies-rls.local-pg.test.ts's harness shape; the
 * storage.* schema stub (buckets/objects/foldername) mirrors the one in
 * tests/generation/database.ts, with the extra grants (insert/delete on
 * storage.objects) this migration's object-level policies actually need
 * and that shared stub doesn't grant (it's only ever exercised read-only
 * there).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = { exec: (sql: string) => Promise<unknown>; query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; close: () => Promise<void> };

const owner = "11111111-1111-4111-8111-111111111111";
const stranger = "22222222-2222-4222-8222-222222222222";

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

    create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid() primary key, bucket_id text, name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
    grant usage on schema storage to authenticated, anon, service_role;
    grant select, insert, update, delete on storage.objects to authenticated;
    grant select on storage.buckets to authenticated;

    insert into auth.users(id) values ('${owner}'), ('${stranger}');
  `);
  await db.exec(readFileSync(resolve("supabase/migrations/20261109010000_cloud_storage.sql"), "utf8"));
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

describe.skipIf(!root)("Kebu Cloud — real RLS: storage buckets/files, deployments/versions, storage.objects", () => {
  it("bucket creation requires lowercase-pattern names and is owner-scoped", async () => {
    const db = await openDb();
    const ok = await asUser(db, owner, "insert into cloud_storage_buckets(owner_id,name) values($1,'my-bucket') returning id", [owner]);
    expect(ok.rows).toHaveLength(1);

    const badName = await asUser(db, owner, "insert into cloud_storage_buckets(owner_id,name) values($1,'Not Valid!') returning id", [owner]).catch((e) => e);
    expect(badName).toBeInstanceOf(Error);

    const strangerRead = await asUser(db, stranger, "select id from cloud_storage_buckets where owner_id=$1", [owner]);
    expect(strangerRead.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("a stranger cannot insert a file row into another owner's bucket", async () => {
    const db = await openDb();
    const bucket = await asUser(db, owner, "insert into cloud_storage_buckets(owner_id,name) values($1,'docs') returning id", [owner]);
    const bucketId = bucket.rows[0].id as string;

    const ownerInsert = await asUser(
      db, owner,
      "insert into cloud_storage_files(bucket_id,storage_path,file_name,mime_type,size_bytes,uploaded_by) values($1,$2,'a.txt','text/plain',10,$3) returning id",
      [bucketId, `${owner}/${bucketId}/1-a.txt`, owner],
    );
    expect(ownerInsert.rows).toHaveLength(1);

    const strangerInsert = await asUser(
      db, stranger,
      "insert into cloud_storage_files(bucket_id,storage_path,file_name,mime_type,size_bytes,uploaded_by) values($1,$2,'evil.txt','text/plain',10,$3) returning id",
      [bucketId, `${stranger}/${bucketId}/evil.txt`, stranger],
    ).catch((e) => e);
    expect(strangerInsert).toBeInstanceOf(Error);

    const strangerRead = await asUser(db, stranger, "select id from cloud_storage_files where bucket_id=$1", [bucketId]);
    expect(strangerRead.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("deleting a bucket cascades to its files", async () => {
    const db = await openDb();
    const bucket = await asUser(db, owner, "insert into cloud_storage_buckets(owner_id,name) values($1,'tmp') returning id", [owner]);
    const bucketId = bucket.rows[0].id as string;
    await asUser(
      db, owner,
      "insert into cloud_storage_files(bucket_id,storage_path,file_name,mime_type,size_bytes,uploaded_by) values($1,$2,'a.txt','text/plain',10,$3)",
      [bucketId, `${owner}/${bucketId}/a.txt`, owner],
    );
    await asUser(db, owner, "delete from cloud_storage_buckets where id=$1", [bucketId]);
    const after = await asUser(db, owner, "select id from cloud_storage_files where bucket_id=$1", [bucketId]);
    expect(after.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("a stranger cannot see or promote another owner's deployment, and the live_version_id FK only accepts that deployment's own versions", async () => {
    const db = await openDb();
    const deployment = await asUser(db, owner, "insert into cloud_deployments(owner_id,name,slug) values($1,'My App','my-app') returning id", [owner]);
    const deploymentId = deployment.rows[0].id as string;
    const version = await asUser(
      db, owner,
      "insert into cloud_deployment_versions(deployment_id,version_number,storage_prefix,size_bytes,file_count,asset_paths) values($1,1,$2,100,1,$3) returning id",
      [deploymentId, `${deploymentId}/v1`, [`${deploymentId}/v1/index.html`]],
    );
    const versionId = version.rows[0].id as string;

    const strangerRead = await asUser(db, stranger, "select id from cloud_deployments where id=$1", [deploymentId]);
    expect(strangerRead.rows).toHaveLength(0);

    const strangerPromote = await asUser(db, stranger, "update cloud_deployments set live_version_id=$2 where id=$1 returning id", [deploymentId, versionId]);
    expect(strangerPromote.rows).toHaveLength(0);

    const ownerPromote = await asUser(db, owner, "update cloud_deployments set live_version_id=$2 where id=$1 returning live_version_id", [deploymentId, versionId]);
    expect(ownerPromote.rows).toEqual([{ live_version_id: versionId }]);
    await db.close();
  }, 30_000);

  it("the cloud-user-storage bucket was registered by the migration with the expected 25MB cap and no mime restriction", async () => {
    const db = await openDb();
    const row = await db.query("select public, file_size_limit, allowed_mime_types from storage.buckets where id='cloud-user-storage'");
    expect(row.rows).toEqual([{ public: false, file_size_limit: 26214400, allowed_mime_types: null }]);
    await db.close();
  }, 30_000);

  it("storage.objects: a user can write/read only under their own auth.uid() folder in cloud-user-storage", async () => {
    const db = await openDb();
    const ownerWrite = await asUser(db, owner, "insert into storage.objects(bucket_id,name) values('cloud-user-storage',$1) returning id", [`${owner}/some-bucket/1-a.txt`]);
    expect(ownerWrite.rows).toHaveLength(1);

    const strangerWriteIntoOwnerFolder = await asUser(db, stranger, "insert into storage.objects(bucket_id,name) values('cloud-user-storage',$1) returning id", [`${owner}/some-bucket/evil.txt`]).catch((e) => e);
    expect(strangerWriteIntoOwnerFolder).toBeInstanceOf(Error);

    const strangerRead = await asUser(db, stranger, "select id from storage.objects where bucket_id='cloud-user-storage' and name=$1", [`${owner}/some-bucket/1-a.txt`]);
    expect(strangerRead.rows).toHaveLength(0);

    const ownerRead = await asUser(db, owner, "select id from storage.objects where bucket_id='cloud-user-storage' and name=$1", [`${owner}/some-bucket/1-a.txt`]);
    expect(ownerRead.rows).toHaveLength(1);
    await db.close();
  }, 30_000);

  it("storage.objects: cloud-deployments writes are authorized by cloud_deployments ownership, not by path alone", async () => {
    const db = await openDb();
    const deployment = await asUser(db, owner, "insert into cloud_deployments(owner_id,name,slug) values($1,'App','app-x') returning id", [owner]);
    const deploymentId = deployment.rows[0].id as string;

    const ownerWrite = await asUser(db, owner, "insert into storage.objects(bucket_id,name) values('cloud-deployments',$1) returning id", [`${deploymentId}/v1/index.html`]);
    expect(ownerWrite.rows).toHaveLength(1);

    // A stranger cannot write into this deployment's own id-prefixed path, even
    // though the path itself contains no auth.uid() -- the policy's join to
    // cloud_deployments.owner_id is what actually gates this, not the string.
    const strangerWrite = await asUser(db, stranger, "insert into storage.objects(bucket_id,name) values('cloud-deployments',$1) returning id", [`${deploymentId}/v1/evil.html`]).catch((e) => e);
    expect(strangerWrite).toBeInstanceOf(Error);

    const strangerRead = await asUser(db, stranger, "select id from storage.objects where bucket_id='cloud-deployments' and name like $1", [`${deploymentId}/%`]);
    expect(strangerRead.rows).toHaveLength(0);
    await db.close();
  }, 30_000);
});

describe.skipIf(!root)("Cloud deployment identity constraints", () => {
  it("rejects cross-deployment publication and forged prefixes, while deleting a live version clears only its pointer", async () => {
    const db = await openDb();
    try {
      await db.exec(readFileSync(resolve("supabase/migrations/20261112075919_cloud_deployment_version_ownership.sql"), "utf8"));
      const a = "55555555-5555-4555-8555-555555555555", b = "66666666-6666-4666-8666-666666666666", v = "77777777-7777-4777-8777-777777777777";
      await db.query("insert into cloud_deployments(id,owner_id,name,slug) values($1,$3,'A','a'),($2,$3,'B','b')", [a,b,owner]);
      await expect(db.query("insert into cloud_deployment_versions(id,deployment_id,version_number,storage_prefix,size_bytes,file_count) values($1,$2,1,'forged',1,1)", [v,a])).rejects.toThrow();
      await db.query("insert into cloud_deployment_versions(id,deployment_id,version_number,storage_prefix,size_bytes,file_count) values($1,$2,1,$3,1,1)", [v,a,`${a}/${v}`]);
      await expect(db.query("update cloud_deployments set live_version_id=$1 where id=$2", [v,b])).rejects.toThrow();
      await db.query("update cloud_deployments set live_version_id=$1 where id=$2", [v,a]);
      await db.query("delete from cloud_deployment_versions where id=$1", [v]);
      expect((await db.query("select id,live_version_id from cloud_deployments where id=$1", [a])).rows).toEqual([{ id:a, live_version_id:null }]);
    } finally { await db.close(); }
  });
});
