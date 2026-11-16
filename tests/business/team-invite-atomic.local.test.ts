import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
const ids = Array.from(
  { length: 7 },
  (_, i) => `10000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
);
const [owner, manager, worker, other, business, second, unconfirmed] = ids;
async function fixture() {
  const { PGlite } = await import(
    pathToFileURL(resolve(root!, "dist/index.js")).href
  );
  const db = new PGlite();
  await db.exec(`create schema auth; create role authenticated; create role anon;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.actor',true),'')::uuid$$;
 create table businesses(id uuid primary key);
 create table business_members(id uuid primary key default gen_random_uuid(),business_id uuid,user_id uuid,role text,status text default 'active',created_at timestamptz default now(),updated_at timestamptz default now(),unique(business_id,user_id));
 create table business_invites(id uuid primary key default gen_random_uuid(),business_id uuid,email text,role text,token text unique,status text default 'pending',invited_by uuid,message text default '',expires_at timestamptz default now()+interval '1 day',accepted_at timestamptz,accepted_user_id uuid,created_at timestamptz default now(),updated_at timestamptz default now());
 create table business_audit_logs(id uuid default gen_random_uuid(),business_id uuid,actor_user_id uuid,action text,metadata jsonb);
 alter table business_invites enable row level security;
 grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
 grant select,insert,update on business_invites to authenticated;
 insert into auth.users values('${owner}','owner@test.test',now()),('${manager}','manager@test.test',now()),('${worker}','worker@test.test',now()),('${other}','other@test.test',now()),('${unconfirmed}','new@test.test',null);
 insert into businesses values('${business}'),('${second}');
 insert into business_members(business_id,user_id,role) values('${business}','${owner}','founder'),('${business}','${manager}','manager');`);
  await db.exec(
    readFileSync(
      "supabase/migrations/20261116015115_company_team_invite_atomic.sql",
      "utf8",
    ),
  );
  async function actor(id: string) {
    await db.exec(
      `reset role;select set_config('test.actor','${id}',false);set role authenticated;`,
    );
  }
  async function invite(
    token: string,
    opts: {
      email?: string;
      role?: string;
      status?: string;
      inviter?: string;
    } = {},
  ) {
    await db.exec("reset role");
    await db.query(
      "insert into business_invites(business_id,email,role,token,status,invited_by)values($1,$2,$3,$4,$5,$6)",
      [
        business,
        opts.email ?? "worker@test.test",
        opts.role ?? "employee",
        token,
        opts.status ?? "pending",
        opts.inviter ?? owner,
      ],
    );
  }
  async function accept(token: string) {
    return (
      await db.query("select public.accept_business_invite($1) as result", [
        token,
      ])
    ).rows[0].result;
  }
  return { db, actor, invite, accept };
}
describe.skipIf(!root)("atomic invitation SQL/access", () => {
  it("commits once, preserves active roles, and retries without duplicate audit rows", async () => {
    const f = await fixture();
    try {
      await f.invite("one");
      await f.actor(worker);
      expect(await f.accept("one")).toMatchObject({
        ok: true,
        role: "employee",
      });
      expect(await f.accept("one")).toMatchObject({
        ok: true,
        role: "employee",
      });
      await f.db.exec("reset role");
      expect(
        (await f.db.query("select * from business_audit_logs")).rows,
      ).toHaveLength(1);
      await f.invite("two", { role: "administrator" });
      await f.actor(worker);
      expect(await f.accept("two")).toMatchObject({
        ok: true,
        role: "employee",
      });
    } finally {
      await f.db.close();
    }
  }, 30000);
  it("denies wrong email, unconfirmed accounts, revoked/expired invites and removed inviters", async () => {
    const f = await fixture();
    try {
      await f.invite("wrong");
      await f.actor(other);
      expect(await f.accept("wrong")).toMatchObject({ ok: false, status: 404 });
      await f.actor(unconfirmed);
      expect(await f.accept("wrong")).toMatchObject({ ok: false, status: 403 });
      await f.invite("revoked", { status: "revoked" });
      await f.actor(worker);
      expect(await f.accept("revoked")).toMatchObject({
        ok: false,
        status: 410,
      });
      await f.invite("expired");
      await f.db.exec(
        "reset role;update business_invites set created_at=now()-interval '2 days' where token='expired'",
      );
      // Expiry is immutable after creation; create a separately expired record as the schema owner.
      await f.db.query(
        "insert into business_invites(business_id,email,role,token,invited_by,expires_at) values($1,'worker@test.test','employee','old',$2,now()-interval '1 day')",
        [business, owner],
      );
      await f.actor(worker);
      expect(await f.accept("old")).toMatchObject({ ok: false, status: 410 });
      await f.invite("removed");
      await f.db.exec(
        `reset role;update business_members set status='removed' where user_id='${owner}'`,
      );
      await f.actor(worker);
      expect(await f.accept("removed")).toMatchObject({
        ok: false,
        status: 403,
      });
    } finally {
      await f.db.close();
    }
  }, 30000);
  it("rolls back membership and invitation consumption if audit persistence fails", async () => {
    const f = await fixture();
    try {
      await f.invite("one");
      await f.db.exec(
        "alter table business_audit_logs add constraint reject_test_audit check (false)",
      );
      await f.actor(worker);
      await expect(f.accept("one")).rejects.toThrow();
      await f.db.exec("reset role");
      expect(
        (
          await f.db.query(
            "select status from business_invites where token='one'",
          )
        ).rows[0].status,
      ).toBe("pending");
      expect(
        (
          await f.db.query("select * from business_members where user_id=$1", [
            worker,
          ])
        ).rows,
      ).toHaveLength(0);
    } finally {
      await f.db.close();
    }
  }, 30000);
  it("prevents manager role escalation and direct consumption; revoke wins before acceptance", async () => {
    const f = await fixture();
    try {
      await f.actor(manager);
      await expect(
        f.db.query(
          "insert into business_invites(business_id,email,role,token,invited_by)values($1,'worker@test.test','administrator','bad',$2)",
          [business, manager],
        ),
      ).rejects.toThrow();
      await f.invite("one", { inviter: manager });
      await f.actor(manager);
      await expect(
        f.db.query(
          "update business_invites set status='accepted' where token='one'",
        ),
      ).rejects.toThrow();
      await f.db.query(
        "update business_invites set status='revoked' where token='one'",
      );
      await f.actor(worker);
      expect(await f.accept("one")).toMatchObject({ ok: false, status: 410 });
      await f.actor(other);
      expect(
        (await f.db.query("select * from business_invites")).rows,
      ).toHaveLength(0);
    } finally {
      await f.db.close();
    }
  }, 30000);
});
