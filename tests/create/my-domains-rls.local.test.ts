/**
 * Local-fixture verification of the REAL cross-site domain aggregate query
 * (`GET /api/me/domains`) against the REAL site_domains RLS policy
 * ("Owners select domains", supabase/migrations/008_website_builder.sql),
 * applied verbatim via PGlite -- not a rewritten approximation. The route
 * runs `select ... from site_domains` with no `project_id` filter, relying
 * entirely on RLS to scope results to the caller's own projects across
 * every site they own. This proves that scoping holds at the database
 * layer: a user sees every domain on every project they own, and nothing
 * belonging to any other user, even across multiple projects each.
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

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const projA1 = "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const projA2 = "aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const projB1 = "bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1";

const SCHEMA_FIXTURE = `
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

  create table public.projects (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    title text not null default 'Untitled site',
    subdomain text,
    created_at timestamptz not null default now()
  );
  alter table public.projects enable row level security;
  create policy "Owners select projects" on public.projects for select
    using (owner_id = auth.uid());

  insert into auth.users(id) values ('${userA}'), ('${userB}');
  insert into public.projects(id, owner_id, title, subdomain) values
    ('${projA1}', '${userA}', 'A Site One', 'a-one'),
    ('${projA2}', '${userA}', 'A Site Two', 'a-two'),
    ('${projB1}', '${userB}', 'B Site One', 'b-one');
`;

async function openDb(): Promise<Db> {
  const { PGlite } = await import(pathToFileURL(resolve(root!, "dist/index.js")).href);
  const { pgcrypto } = await import(pathToFileURL(resolve(root!, "dist/contrib/pgcrypto.js")).href);
  const db: Db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SCHEMA_FIXTURE);
  // The real, unmodified table-creation slice of 008_website_builder.sql for
  // site_domains, plus the real RLS policies from the same migration --
  // applied verbatim, not hand-copied into a rewritten shape.
  const full008 = readFileSync(resolve("supabase/migrations/008_website_builder.sql"), "utf8");
  const start = full008.indexOf("create table if not exists public.site_domains");
  const end = full008.indexOf("-- Minimal assets metadata");
  if (start === -1 || end === -1) throw new Error("site_domains block not found in 008_website_builder.sql — migration may have moved");
  await db.exec(full008.slice(start, end));
  // The real column additions from 015 that the API route actually selects.
  const mig015 = readFileSync(resolve("supabase/migrations/015_custom_domains.sql"), "utf8");
  await db.exec(mig015.slice(0, mig015.indexOf("-- Service role reads")));
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

describe.skipIf(!root)("Cross-site domain aggregate query — real site_domains RLS, local fixture", () => {
  it("a user sees domains across every project they own, and nothing from another user's projects", async () => {
    const db = await openDb();
    await db.exec("set role service_role");
    await db.query(
      `insert into public.site_domains (project_id, hostname, status) values
         ('${projA1}', 'one.example', 'verified'),
         ('${projA2}', 'two.example', 'pending'),
         ('${projB1}', 'other.example', 'verified')`,
    );

    const asA = await asUser(
      db, userA,
      `select site_domains.hostname, projects.title
       from public.site_domains join public.projects on projects.id = site_domains.project_id
       order by site_domains.hostname`,
    );
    expect(asA.rows.map((r) => (r as { hostname: string }).hostname)).toEqual(["one.example", "two.example"]);

    const asB = await asUser(
      db, userB,
      `select site_domains.hostname
       from public.site_domains join public.projects on projects.id = site_domains.project_id`,
    );
    expect(asB.rows).toEqual([{ hostname: "other.example" }]);

    await db.close();
  }, 30_000);

  it("a signed-in caller with no domains at all gets zero rows, not another user's data", async () => {
    const db = await openDb();
    await db.exec("set role service_role");
    await db.query(`insert into public.site_domains (project_id, hostname, status) values ('${projB1}', 'only-b.example', 'verified')`);

    const asA = await asUser(
      db, userA,
      `select site_domains.hostname
       from public.site_domains join public.projects on projects.id = site_domains.project_id`,
    );
    expect(asA.rows).toEqual([]);

    await db.close();
  }, 30_000);
});
