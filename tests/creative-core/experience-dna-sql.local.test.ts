import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { experienceDnaSchema, newExperienceDna } from "@/lib/create/experience-dna";
const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
type Db = { exec: (s: string) => Promise<unknown>; query: <T = Record<string, unknown>>(s: string, a?: unknown[]) => Promise<{ rows: T[] }>; close: () => Promise<void> };
let db: Db;
const owner = "11111111-1111-4111-8111-111111111111", other = "22222222-2222-4222-8222-222222222222", site = "33333333-3333-4333-8333-333333333333", foreign = "44444444-4444-4444-8444-444444444444";
const dna = () => ({ ...newExperienceDna(), goal: "Book a session", audience: "Artists in Dakar", visitorAction: "Request a booking", pages: [{ slug: "home", title: "Home", purpose: "Introduce the work" }] });
async function role(user = owner) { await db.exec(`reset role;set request.jwt.claim.sub='${user}';set role authenticated;`); }
async function save(expected = 0, payload: unknown = dna(), project = site) { return (await db.query<{ saved: { dna: unknown; revision: number; owner_id: string } }>("select public.save_project_experience_dna($1,$2,$3) as saved", [project, expected, payload])).rows[0].saved; }
describe.skipIf(!root)("Experience DNA actual PostgreSQL owner and revision authority", () => {
  beforeAll(async () => {
    const { PGlite } = await import(pathToFileURL(resolve(root!, "dist/index.js")).href);
    const { pgcrypto } = await import(pathToFileURL(resolve(root!, "dist/contrib/pgcrypto.js")).href);
    db = new PGlite({ extensions: { pgcrypto } });
    await db.exec(`create schema auth;create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create role authenticated;create role anon;grant usage on schema public,auth to authenticated,anon;
      alter default privileges in schema public grant all on tables to authenticated,anon;
      create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;`);
    await db.exec(readFileSync(resolve("supabase/migrations/004_create_projects.sql"), "utf8"));
    await db.exec(readFileSync(resolve("supabase/migrations/20261009040802_experience_dna.sql"), "utf8"));
    await db.query("insert into auth.users(id) values($1),($2)", [owner, other]);
    await db.query("insert into projects(id,owner_id,title) values($1,$2,'Owner site'),($3,$4,'Other site')", [site, owner, foreign, other]);
  }, 60000);
  beforeEach(async () => { await db.exec("reset role;delete from project_experience_dna"); await role(); });
  afterAll(async () => { if (db) await db.close(); });
  it("saves/reloads canonical intent without changing authored pages or elements", async () => {
    const saved = await save(); expect(saved.revision).toBe(1); expect(saved.owner_id).toBe(owner); expect(experienceDnaSchema.parse(saved.dna)).toEqual(dna());
    expect((await db.query("select * from project_pages")).rows).toHaveLength(0); expect((await db.query("select * from project_sections")).rows).toHaveLength(0);
    expect((await db.query("select dna from project_experience_dna")).rows[0].dna).toEqual(dna());
  });
  it("rejects stale replay and preserves the winning draft", async () => {
    await save(); const next = { ...dna(), goal: "A changed goal" }; expect((await save(1, next)).revision).toBe(2);
    await expect(save(1)).rejects.toThrow(/changed/); expect((await db.query("select dna from project_experience_dna")).rows[0].dna).toEqual(next);
  });
  it("foreign owners cannot read/update/RPC or attach to an unowned site", async () => {
    await save(); await role(other); expect((await db.query("select * from project_experience_dna")).rows).toHaveLength(0);
    expect((await db.query("update project_experience_dna set dna=$1 where project_id=$2 returning *", [dna(), site])).rows).toHaveLength(0);
    await expect(save(1)).rejects.toThrow(/Site not found/); await role(owner); await expect(save(0, dna(), foreign)).rejects.toThrow(/Site not found/);
    await expect(db.query("insert into project_experience_dna(project_id,owner_id,dna) values($1,$2,$3)", [foreign, owner, dna()])).rejects.toThrow(/foreign key/);
  });
  it("anonymous roles cannot read, insert or invoke RPC", async () => {
    await save(); await db.exec("reset role;set request.jwt.claim.sub='';set role anon;");
    await expect(db.query("select * from project_experience_dna")).rejects.toThrow(/permission denied/);
    await expect(save()).rejects.toThrow(/permission denied/);
    await expect(db.query("insert into project_experience_dna(project_id,owner_id,dna) values($1,$2,$3)", [site, owner, dna()])).rejects.toThrow(/permission denied/);
  });
  it("direct writes advance revision and immutable identity cannot be moved", async () => {
    await save(); const row = (await db.query("update project_experience_dna set dna=$1,revision=500 returning revision", [dna()])).rows[0]; expect(row.revision).toBe(2);
    await expect(save(1)).rejects.toThrow(/changed/);
    await expect(db.query("update project_experience_dna set owner_id=$1", [other])).rejects.toThrow(/immutable/);
    await expect(db.query("update project_experience_dna set project_id=$1", [foreign])).rejects.toThrow(/immutable/);
    await expect(db.query("delete from project_experience_dna")).rejects.toThrow(/permission denied/);
  });
  it("rejects invalid, oversized, future and foreign JSON through RPC and direct writes", async () => {
    for (const payload of [null, [], { ...dna(), version: 2 }, { ...dna(), extra: true }, { ...dna(), goal: "x".repeat(1501) }, { ...dna(), audience: null }, { ...dna(), pages: [] }, { ...dna(), pages: [dna().pages[0], dna().pages[0]] }, { ...dna(), references: [{ url: "javascript:bad", label: "Bad", observations: "Bad" }] }]) {
      await expect(save(0, payload)).rejects.toThrow(); expect((await db.query("select * from project_experience_dna")).rows).toHaveLength(0);
    }
    await save(); await expect(db.query("update project_experience_dna set dna=$1", [{ ...dna(), pages: [{ slug: "home", title: "", purpose: "Purpose" }] }])).rejects.toThrow(/check constraint/);
  });
  it("keeps large UTF-8 observations and desired page/reference order", async () => {
    const payload = { ...dna(), references: [{ url: "https://example.com", label: "Visual rhythm", observations: "é".repeat(1400) }], pages: [...dna().pages, { slug: "work", title: "Work", purpose: "Selected photography" }] };
    expect((await save(0, payload)).dna).toEqual(payload);
  });
  it("exhausted/invalid expectations cannot reset or overflow revisions", async () => {
    for (const expected of [-1, Number.MAX_SAFE_INTEGER]) await expect(save(expected)).rejects.toThrow(/Invalid revision/);
    expect((await db.query("select * from project_experience_dna")).rows).toHaveLength(0);
  });
});
