/**
 * Real-SQL verification of Kebu Liguey (K066) acceptance case 1 — worker
 * access and profile — against the actual migration SQL applied verbatim
 * (not a reimplementation): 20261016180000_liguey_worker_profiles.sql on
 * top of the real library_sharing migration (for the evidence-ownership
 * check). Hosted Supabase Auth/RLS acceptance remains explicitly open.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = { exec: (sql: string) => Promise<unknown>; query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; close: () => Promise<void> };

const worker = "11111111-1111-4111-8111-111111111111";
const otherWorker = "22222222-2222-4222-8222-222222222222";
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
    -- library_sharing's own migration needs this (uncaptured drift, same
    -- as this session's new migration documents); defined once here so
    -- library_nodes' triggers can actually be created.
    create or replace function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at = now(); return new; end$$;
    insert into auth.users(id) values ('${worker}'), ('${otherWorker}'), ('${stranger}');
  `);
  await db.exec(readFileSync(resolve("supabase/migrations/20261016120000_library_sharing.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261016180000_liguey_worker_profiles.sql"), "utf8"));
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

describe.skipIf(!root)("Kebu Liguey — worker profile (real RLS)", () => {
  it("a worker can create their own profile with self-reported fields", async () => {
    const db = await openDb();
    const result = await asUser(
      db, worker,
      `insert into worker_profiles(user_id, headline, bio, skills, languages, experience, availability)
       values ($1, 'Translator and community organizer', 'I have led neighborhood literacy drives for six years.',
         array['Wolof-French translation','community organizing'], array['Wolof','French'],
         $2::jsonb, 'open') returning user_id, headline, skills, experience`,
      [worker, JSON.stringify([{ title: "Neighborhood literacy coordinator", kind: "informal", description: "Organized weekly literacy sessions, no formal employer." }])],
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ user_id: worker, headline: "Translator and community organizer" });
    await db.close();
  }, 30_000);

  it("a worker without a conventional employment record can still create a profile (informal experience is not rejected)", async () => {
    const db = await openDb();
    const result = await asUser(
      db, worker,
      `insert into worker_profiles(user_id, bio, experience) values ($1, 'Self-taught.', $2::jsonb) returning experience`,
      [worker, JSON.stringify([{ title: "Helped run a family farm", kind: "informal" }])],
    );
    expect(result.rows[0].experience).toEqual([{ title: "Helped run a family farm", kind: "informal" }]);
    await db.close();
  }, 30_000);

  it("no client write can ever set verified_at/verified_by — column grants reject it outright, not just RLS", async () => {
    const db = await openDb();
    await expect(
      asUser(db, worker, `insert into worker_profiles(user_id, verified_at) values ($1, now())`, [worker]),
    ).rejects.toThrow(/permission denied/i);
    await db.close();
  }, 30_000);

  it("a worker's profile is private by default — another worker cannot read it", async () => {
    const db = await openDb();
    await asUser(db, worker, "insert into worker_profiles(user_id, headline) values ($1, 'Visible?')", [worker]);
    const otherRead = await asUser(db, otherWorker, "select user_id from worker_profiles where user_id=$1", [worker]);
    expect(otherRead.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("a worker can update their own profile; is_discoverable defaults closed and must be explicitly opted into", async () => {
    const db = await openDb();
    await asUser(db, worker, "insert into worker_profiles(user_id) values ($1)", [worker]);
    const before = await asUser(db, worker, "select is_discoverable from worker_profiles where user_id=$1", [worker]);
    expect(before.rows[0].is_discoverable).toBe(false);
    await asUser(db, worker, "update worker_profiles set is_discoverable = true, headline = 'Open to work' where user_id=$1", [worker]);
    const after = await asUser(db, worker, "select is_discoverable, headline from worker_profiles where user_id=$1", [worker]);
    expect(after.rows[0]).toMatchObject({ is_discoverable: true, headline: "Open to work" });
    await db.close();
  }, 30_000);

  it("a worker cannot create another worker's profile", async () => {
    const db = await openDb();
    await expect(
      asUser(db, worker, "insert into worker_profiles(user_id) values ($1)", [otherWorker]),
    ).rejects.toThrow(/row-level security policy/i);
    await db.close();
  }, 30_000);

  it("a worker can link a Library node they own as portfolio evidence", async () => {
    const db = await openDb();
    await asUser(db, worker, "insert into worker_profiles(user_id) values ($1)", [worker]);
    const node = await asUser(db, worker, "insert into library_nodes(owner_id, kind, title) values ($1, 'document', 'Sample translation work') returning id", [worker]);
    const nodeId = node.rows[0].id as string;
    const evidence = await asUser(db, worker, "insert into worker_profile_evidence(user_id, library_node_id, label) values ($1, $2, 'Translation sample') returning label", [worker, nodeId]);
    expect(evidence.rows[0].label).toBe("Translation sample");
    await db.close();
  }, 30_000);

  it("a worker cannot link a Library node they do not own as their own evidence", async () => {
    const db = await openDb();
    await asUser(db, worker, "insert into worker_profiles(user_id) values ($1)", [worker]);
    const node = await asUser(db, otherWorker, "insert into library_nodes(owner_id, kind, title) values ($1, 'document', 'Not yours') returning id", [otherWorker]);
    const nodeId = node.rows[0].id as string;
    await expect(
      asUser(db, worker, "insert into worker_profile_evidence(user_id, library_node_id) values ($1, $2)", [worker, nodeId]),
    ).rejects.toThrow(/row-level security policy/i);
    await db.close();
  }, 30_000);

  it("a worker can remove their own evidence link, and a stranger cannot read any of it", async () => {
    const db = await openDb();
    await asUser(db, worker, "insert into worker_profiles(user_id) values ($1)", [worker]);
    const node = await asUser(db, worker, "insert into library_nodes(owner_id, kind, title) values ($1, 'document', 'Removable sample') returning id", [worker]);
    const nodeId = node.rows[0].id as string;
    await asUser(db, worker, "insert into worker_profile_evidence(user_id, library_node_id) values ($1, $2)", [worker, nodeId]);
    const strangerRead = await asUser(db, stranger, "select id from worker_profile_evidence where user_id=$1", [worker]);
    expect(strangerRead.rows).toHaveLength(0);
    await asUser(db, worker, "delete from worker_profile_evidence where user_id=$1 and library_node_id=$2", [worker, nodeId]);
    const afterDelete = await asUser(db, worker, "select id from worker_profile_evidence where user_id=$1", [worker]);
    expect(afterDelete.rows).toHaveLength(0);
    await db.close();
  }, 30_000);
});
