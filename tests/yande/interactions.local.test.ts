/**
 * Real-SQL verification of 20261020000000_yande_shared_gateway.sql
 * (yande_interactions table + RLS), applied verbatim against a locally
 * reconstructed auth fixture — not a hosted-schema verification (same
 * caveat as every other .local.test.ts file in this repo).
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
    do $$begin
      if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
      if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
      if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
    end$$;
    alter default privileges in schema public grant all on tables to authenticated,anon,service_role;
    grant usage on schema public, auth to authenticated, anon, service_role;
    grant execute on all functions in schema auth to authenticated, anon, service_role;
    insert into auth.users(id) values ('${owner}'),('${stranger}');
  `);
  await db.exec(readFileSync(resolve("supabase/migrations/20261020000000_yande_shared_gateway.sql"), "utf8"));
  return db;
}

async function asUser(db: Db, userId: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${userId}'; set role authenticated;`);
  return db.query(sql, params);
}

describe.skipIf(!root)("Yande shared gateway — yande_interactions (real RLS)", () => {
  it("a user can read their own recorded interactions; a stranger cannot", async () => {
    const db = await openDb();
    await db.exec("set role service_role;");
    await db.query(
      "insert into yande_interactions(feature, mode, user_id, model, outcome, input_tokens, output_tokens) values ($1,'chat',$2,'test-model','ok',10,20)",
      ["chat_assistant", owner],
    );

    const ownRead = await asUser(db, owner, "select feature, outcome from yande_interactions where user_id=$1", [owner]);
    expect(ownRead.rows).toHaveLength(1);
    expect(ownRead.rows[0]).toMatchObject({ feature: "chat_assistant", outcome: "ok" });

    const strangerRead = await asUser(db, stranger, "select id from yande_interactions where user_id=$1", [owner]);
    expect(strangerRead.rows).toHaveLength(0);
    await db.close();
  }, 30_000);

  it("an ordinary authenticated session cannot insert, update, or delete usage records", async () => {
    const db = await openDb();
    await expect(
      asUser(db, owner, "insert into yande_interactions(feature, mode, user_id, model, outcome) values ('chat_assistant','chat',$1,'m','ok')", [owner]),
    ).rejects.toThrow(/permission denied/i);

    await db.exec("set role service_role;");
    const row = await db.query(
      "insert into yande_interactions(feature, mode, user_id, model, outcome) values ('chat_assistant','chat',$1,'m','ok') returning id",
      [owner],
    );
    await expect(
      asUser(db, owner, "update yande_interactions set outcome='error' where id=$1", [row.rows[0].id]),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      asUser(db, owner, "delete from yande_interactions where id=$1", [row.rows[0].id]),
    ).rejects.toThrow(/permission denied/i);
    await db.close();
  }, 30_000);

  it("rejects a malformed feature tag and an invalid mode/outcome at the schema level", async () => {
    const db = await openDb();
    await db.exec("set role service_role;");
    await expect(
      db.query("insert into yande_interactions(feature, mode, model, outcome) values ('Not Valid!','chat','m','ok')"),
    ).rejects.toThrow(/check/i);
    await expect(
      db.query("insert into yande_interactions(feature, mode, model, outcome) values ('chat_assistant','not_a_mode','m','ok')"),
    ).rejects.toThrow(/check/i);
    await expect(
      db.query("insert into yande_interactions(feature, mode, model, outcome) values ('chat_assistant','chat','m','not_an_outcome')"),
    ).rejects.toThrow(/check/i);
    await db.close();
  }, 30_000);

  it("accepts a system-level interaction with no associated user (user_id null)", async () => {
    const db = await openDb();
    await db.exec("set role service_role;");
    const row = await db.query(
      "insert into yande_interactions(feature, mode, model, outcome) values ('liguey_applicant_insight','structured','m','ok') returning user_id",
    );
    expect(row.rows[0].user_id).toBeNull();
    await db.close();
  }, 30_000);
});
