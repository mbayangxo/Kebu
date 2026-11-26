/**
 * Real-SQL verification of the May's World fan community RLS
 * (20261103120000_site_fan_community.sql) against PGlite, switching
 * Postgres role/JWT claim per query exactly as PostgREST does — a bug in
 * the real policy SQL would actually surface here, not just in a JS mock.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = {
  exec: (sql: string) => Promise<unknown>;
  query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>;
  close: () => Promise<void>;
};

const owner = "11111111-1111-4111-8111-111111111111";
const fan = "22222222-2222-4222-8222-222222222222";
const otherFan = "33333333-3333-4333-8333-333333333333";
const stranger = "44444444-4444-4444-8444-444444444444";
const projectId = "55555555-5555-4555-8555-555555555555";

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
    create table public.projects(
      id uuid primary key default gen_random_uuid(),
      owner_id uuid not null references auth.users(id) on delete cascade,
      title text not null default 'Project'
    );
    insert into auth.users(id) values ('${owner}'), ('${fan}'), ('${otherFan}'), ('${stranger}');
    insert into public.projects(id, owner_id) values ('${projectId}', '${owner}');
  `);
  await db.exec(
    readFileSync(resolve("supabase/migrations/20261103120000_site_fan_community.sql"), "utf8"),
  );
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

async function insertPost(
  db: Db,
  userId: string,
  opts: { role?: "creator" | "member"; parentId?: string | null; body?: string },
) {
  return asUser(
    db,
    userId,
    `insert into public.site_community_posts (project_id, user_id, role, display_name, body, parent_id)
     values ($1, $2, $3, $4, $5, $6) returning id, role, is_hidden`,
    [projectId, userId, opts.role ?? "member", "Name", opts.body ?? "hello", opts.parentId ?? null],
  );
}

describe.skipIf(!root)("May's World fan community — RLS (real SQL)", () => {
  it("a signed-in fan can post as a member", async () => {
    const db = await openDb();
    const res = await insertPost(db, fan, {});
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.role).toBe("member");
    await db.close();
  }, 30_000);

  it("a fan cannot post as the creator — insert is rejected by RLS", async () => {
    const db = await openDb();
    await expect(insertPost(db, fan, { role: "creator" })).rejects.toThrow(/policy/i);
    await db.close();
  }, 30_000);

  it("the project owner can post as the creator", async () => {
    const db = await openDb();
    const res = await insertPost(db, owner, { role: "creator" });
    expect(res.rows[0]!.role).toBe("creator");
    await db.close();
  }, 30_000);

  it("any signed-in user (not just a 'member' of this project) can read non-hidden posts — this is an open fan board", async () => {
    const db = await openDb();
    await insertPost(db, owner, { role: "creator", body: "welcome fans" });
    const read = await asUser(
      db,
      stranger,
      "select body from public.site_community_posts where project_id=$1",
      [projectId],
    );
    expect(read.rows).toHaveLength(1);
    expect(read.rows[0]!.body).toBe("welcome fans");
    await db.close();
  }, 30_000);

  it("a fan can edit their own post", async () => {
    const db = await openDb();
    const created = await insertPost(db, fan, { body: "first draft" });
    const id = created.rows[0]!.id as string;
    await asUser(db, fan, "update public.site_community_posts set body=$1 where id=$2", ["fixed typo", id]);
    const read = await asUser(db, fan, "select body from public.site_community_posts where id=$1", [id]);
    expect(read.rows[0]!.body).toBe("fixed typo");
    await db.close();
  }, 30_000);

  it("a fan cannot edit another fan's post", async () => {
    const db = await openDb();
    const created = await insertPost(db, fan, { body: "mine" });
    const id = created.rows[0]!.id as string;
    await asUser(db, otherFan, "update public.site_community_posts set body='hijacked' where id=$1", [id]);
    const read = await asUser(db, fan, "select body from public.site_community_posts where id=$1", [id]);
    // RLS silently affects 0 rows rather than erroring on UPDATE with no matching USING rows.
    expect(read.rows[0]!.body).toBe("mine");
    await db.close();
  }, 30_000);

  it("a fan cannot delete another fan's post", async () => {
    const db = await openDb();
    const created = await insertPost(db, fan, { body: "keep me" });
    const id = created.rows[0]!.id as string;
    await asUser(db, otherFan, "delete from public.site_community_posts where id=$1", [id]);
    const read = await asUser(db, fan, "select id from public.site_community_posts where id=$1", [id]);
    expect(read.rows).toHaveLength(1);
    await db.close();
  }, 30_000);

  it("the owner can hide any fan's post, and the hidden post disappears for everyone but the owner", async () => {
    const db = await openDb();
    const created = await insertPost(db, fan, { body: "borderline post" });
    const id = created.rows[0]!.id as string;
    await asUser(db, owner, "update public.site_community_posts set is_hidden=true where id=$1", [id]);
    const strangerRead = await asUser(
      db,
      stranger,
      "select id from public.site_community_posts where id=$1",
      [id],
    );
    expect(strangerRead.rows).toHaveLength(0);
    const authorRead = await asUser(db, fan, "select id from public.site_community_posts where id=$1", [id]);
    expect(authorRead.rows).toHaveLength(0);
    const ownerRead = await asUser(db, owner, "select id, is_hidden from public.site_community_posts where id=$1", [id]);
    expect(ownerRead.rows).toHaveLength(1);
    await db.close();
  }, 30_000);

  it("a fan cannot hide another fan's post — update is a no-op for a non-owner, non-author", async () => {
    const db = await openDb();
    const created = await insertPost(db, fan, { body: "visible post" });
    const id = created.rows[0]!.id as string;
    await asUser(db, otherFan, "update public.site_community_posts set is_hidden=true where id=$1", [id]);
    const read = await asUser(db, fan, "select is_hidden from public.site_community_posts where id=$1", [id]);
    expect(read.rows[0]!.is_hidden).toBe(false);
    await db.close();
  }, 30_000);

  it("the owner can delete any fan's post", async () => {
    const db = await openDb();
    const created = await insertPost(db, fan, { body: "remove this" });
    const id = created.rows[0]!.id as string;
    await asUser(db, owner, "delete from public.site_community_posts where id=$1", [id]);
    const read = await asUser(db, owner, "select id from public.site_community_posts where id=$1", [id]);
    expect(read.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("a fan cannot escalate their own post to 'creator' via UPDATE — the identity-lock trigger resets role", async () => {
    const db = await openDb();
    const created = await insertPost(db, fan, { body: "trying to escalate" });
    const id = created.rows[0]!.id as string;
    await asUser(db, fan, "update public.site_community_posts set role='creator' where id=$1", [id]);
    const read = await asUser(db, fan, "select role from public.site_community_posts where id=$1", [id]);
    expect(read.rows[0]!.role).toBe("member");
    await db.close();
  }, 30_000);

  it("a fan cannot reassign their own post to another project via UPDATE — the identity-lock trigger resets project_id", async () => {
    const db = await openDb();
    await asUser(
      db,
      owner,
      "insert into public.projects(id, owner_id, title) values ($1, $2, 'Other project')",
      ["66666666-6666-4666-8666-666666666666", owner],
    );
    const created = await insertPost(db, fan, { body: "staying put" });
    const id = created.rows[0]!.id as string;
    await asUser(
      db,
      fan,
      "update public.site_community_posts set project_id='66666666-6666-4666-8666-666666666666' where id=$1",
      [id],
    );
    const read = await asUser(
      db,
      fan,
      "select project_id from public.site_community_posts where id=$1",
      [id],
    );
    expect(read.rows[0]!.project_id).toBe(projectId);
    await db.close();
  }, 30_000);

  it("a reply to a top-level post is readable alongside it", async () => {
    const db = await openDb();
    const top = await insertPost(db, owner, { role: "creator", body: "new single out now!" });
    const topId = top.rows[0]!.id as string;
    await insertPost(db, fan, { parentId: topId, body: "congrats May!!" });
    const read = await asUser(
      db,
      stranger,
      "select body, parent_id from public.site_community_posts where project_id=$1 order by created_at",
      [projectId],
    );
    expect(read.rows).toHaveLength(2);
    expect(read.rows.some((r) => r.parent_id === topId)).toBe(true);
    await db.close();
  }, 30_000);
});
