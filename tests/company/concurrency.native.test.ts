import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
// @ts-expect-error pg is installed without its optional declarations; the narrow adapter below is typed.
import { Pool } from "pg";
import { companyCoreSql, companyIds as ids } from "./database";
import { foundationServiceSql } from "./foundation-services";
import { assertLocalPublishDatabase } from "../creative-core/publish-db-setup";
import { dropNativeFixtureDatabase } from "../creative-core/native-postgres-cleanup";
const url = process.env.KEBU_PUBLISH_CONCURRENCY_DATABASE_URL;
const database = "_kebutest_payments_" + randomUUID().replaceAll("-", "");
type Result = { rows: Record<string, unknown>[] };
type Client = {
  query: (sql: string, args?: unknown[]) => Promise<Result>;
  release: () => void;
  processID: number;
};
type NativePool = {
  query: (sql: string, args?: unknown[]) => Promise<Result>;
  connect: () => Promise<Client>;
  end: () => Promise<void>;
};
let admin: NativePool,
  pool: NativePool,
  created = false;
async function connection(actor?: string) {
  const c = (await pool.connect()) as Client;
  await c.query("set statement_timeout='12s'");
  if (actor) {
    await c.query("select set_config('request.jwt.claim.sub',$1,false)", [
      actor,
    ]);
    await c.query("set role authenticated");
  }
  return c;
}
const settle = <T>(p: Promise<T>) =>
  p.then(
    (value) => ({ ok: true as const, value }),
    (error) => ({ ok: false as const, error }),
  );
async function blocked(waiter: Client, holder: Client) {
  const until = Date.now() + 5000;
  while (Date.now() < until) {
    const r = await pool.query(
      `with recursive blockers(pid,path)as(select pid,array[$1::int,pid]from unnest(pg_blocking_pids($1))pid union all select next_pid,path||next_pid from blockers cross join lateral unnest(pg_blocking_pids(blockers.pid))next_pid where not next_pid=any(path))select exists(select 1 from blockers where pid=$2)as blocked`,
      [waiter.processID, holder.processID],
    );
    if (r.rows[0].blocked) {
      expect(waiter.processID).not.toBe(holder.processID);
      console.info("Observed PostgreSQL lock barrier", {
        waiter: waiter.processID,
        holder: holder.processID,
      });
      return;
    }
    await new Promise((r) => setTimeout(r, 20));
  }
  throw Error(
    "The expected independent PostgreSQL lock barrier was not observed",
  );
}
async function release(...clients: Client[]) {
  for (const c of clients) {
    try {
      await c.query("rollback;reset role");
    } finally {
      c.release();
    }
  }
}
async function invite() {
  const token = randomUUID();
  await pool.query(
    "insert into business_invites(business_id,email,role,token,invited_by)values($1,'other@test.test','employee',$2,$3)",
    [ids.business, token, ids.owner],
  );
  return token;
}
describe.skipIf(!url)(
  "native company locks with independent backend PIDs",
  () => {
    beforeAll(async () => {
      const parsed = assertLocalPublishDatabase(url!);
      admin = new Pool({ connectionString: parsed.href, max: 1 }) as NativePool;
      await admin.query(`create database "${database}"`);
      created = true;
      parsed.pathname = "/" + database;
      pool = new Pool({ connectionString: parsed.href, max: 8 }) as NativePool;
      await pool.query(companyCoreSql());
      const archived = readFileSync(
        "supabase/migrations_archive/legacy/055_team_invites_demo_orders.sql",
        "utf8",
      );
      await pool.query(
        archived.slice(0, archived.indexOf("-- >>> Shop demo orders")),
      );
      await pool.query(foundationServiceSql());
      await pool.query(
        readFileSync(
          "supabase/migrations/20261116060247_qa_company_foundations.sql",
          "utf8",
        ),
      );
      await pool.query(
        "insert into kebu_builtin_app_installs(user_id,app_key)values($1,'liguey'),($2,'liguey')",
        [ids.owner, ids.worker],
      );
      console.info(
        "Native company database:",
        (await pool.query("show server_version")).rows[0].server_version,
      );
    }, 60000);
    beforeEach(async () => {
      await pool.query(
        "truncate rooms,business_invites,business_audit_logs,liguey_interviews,company_shifts cascade",
      );
      await pool.query(
        "delete from business_members where business_id=$1 and user_id=$2",
        [ids.business, ids.other],
      );
      await pool.query(
        "update business_members set status='active',role='founder'where business_id=$1 and user_id=$2",
        [ids.business, ids.owner],
      );
    });
    afterAll(async () => {
      try {
        if (pool) await pool.end();
      } finally {
        try {
          if (created) await dropNativeFixtureDatabase(admin, database);
        } finally {
          if (admin) await admin.end();
        }
      }
    });
    it("double acceptance produces one membership and one audit event", async () => {
      const token = await invite(),
        holder = await connection(),
        a = await connection(ids.other),
        b = await connection(ids.other);
      try {
        expect(new Set([holder.processID, a.processID, b.processID]).size).toBe(
          3,
        );
        await holder.query("begin");
        await holder.query(
          "select id from business_invites where token=$1 for update",
          [token],
        );
        const first = settle(
          a.query("select accept_business_invite($1)as result", [token]),
        );
        await blocked(a, holder);
        const second = settle(
          b.query("select accept_business_invite($1)as result", [token]),
        );
        await blocked(b, holder);
        await holder.query("commit");
        const results = await Promise.all([first, second]);
        for (const r of results) {
          expect(r.ok).toBe(true);
          if (r.ok) expect(r.value.rows[0].result).toMatchObject({ ok: true });
        }
        expect(
          (
            await pool.query(
              "select count(*)::int as n from business_members where business_id=$1 and user_id=$2",
              [ids.business, ids.other],
            )
          ).rows[0].n,
        ).toBe(1);
        expect(
          (
            await pool.query(
              "select count(*)::int as n from business_audit_logs where action='team.invite_accepted'",
            )
          ).rows[0].n,
        ).toBe(1);
      } finally {
        await release(holder, a, b);
      }
    }, 20000);
    it("an accept waiting on a revocation cannot grant access", async () => {
      const token = await invite(),
        holder = await connection(),
        a = await connection(ids.other);
      try {
        await holder.query("begin");
        await holder.query(
          "update business_invites set status='revoked'where token=$1",
          [token],
        );
        const acceptance = settle(
          a.query("select accept_business_invite($1)as result", [token]),
        );
        await blocked(a, holder);
        await holder.query("commit");
        const r = await acceptance;
        expect(r.ok).toBe(true);
        if (r.ok)
          expect(r.value.rows[0].result).toMatchObject({
            ok: false,
            status: 410,
          });
        expect(
          (
            await pool.query(
              "select count(*)::int as n from business_members where business_id=$1 and user_id=$2",
              [ids.business, ids.other],
            )
          ).rows[0].n,
        ).toBe(0);
      } finally {
        await release(holder, a);
      }
    }, 20000);
    it("removing the inviter while acceptance waits prevents a stale grant", async () => {
      const token = await invite(),
        holder = await connection(),
        a = await connection(ids.other);
      try {
        await holder.query("begin");
        await holder.query(
          "update business_members set status='removed' where business_id=$1 and user_id=$2",
          [ids.business, ids.owner],
        );
        const acceptance = settle(
          a.query("select accept_business_invite($1)as result", [token]),
        );
        await blocked(a, holder);
        await holder.query("commit");
        const r = await acceptance;
        expect(r.ok).toBe(true);
        if (r.ok)
          expect(r.value.rows[0].result).toMatchObject({
            ok: false,
            status: 403,
          });
        expect(
          (
            await pool.query(
              "select count(*)::int as n from business_members where business_id=$1 and user_id=$2",
              [ids.business, ids.other],
            )
          ).rows[0].n,
        ).toBe(0);
      } finally {
        await release(holder, a);
      }
    }, 20000);
    it("simultaneous first callers join one active call", async () => {
      const room = randomUUID();
      await pool.query(
        "insert into rooms(id,created_by,business_id,name)values($1,$2,$3,'Concurrent meeting')",
        [room, ids.owner, ids.business],
      );
      await pool.query(
        "insert into room_members(room_id,user_id,role)values($1,$2,'owner'),($1,$3,'member')",
        [room, ids.owner, ids.worker],
      );
      const holder = await connection(),
        a = await connection(ids.owner),
        b = await connection(ids.worker);
      try {
        await holder.query("begin");
        await holder.query("select id from rooms where id=$1 for update", [
          room,
        ]);
        const first = settle(
          a.query("select room_call_join($1,2)as result", [room]),
        );
        await blocked(a, holder);
        const second = settle(
          b.query("select room_call_join($1,2)as result", [room]),
        );
        await blocked(b, holder);
        await holder.query("commit");
        const results = await Promise.all([first, second]);
        expect(results.every((r) => r.ok)).toBe(true);
        if (results[0].ok && results[1].ok)
          expect((results[0].value.rows[0].result as { id: string }).id).toBe(
            (results[1].value.rows[0].result as { id: string }).id,
          );
        expect(
          (
            await pool.query(
              "select count(*)::int as n from room_calls where room_id=$1 and ended_at is null",
              [room],
            )
          ).rows[0].n,
        ).toBe(1);
        expect(
          (
            await pool.query(
              "select count(*)::int as n from room_call_participants where left_at is null",
            )
          ).rows[0].n,
        ).toBe(2);
      } finally {
        await release(holder, a, b);
      }
    }, 20000);
    it("an interview and a shift cannot concurrently reserve the same participant time", async () => {
      const holder = await connection(),
        a = await connection(ids.owner),
        b = await connection(ids.owner);
      const application = randomUUID();
      let listing: string;
      try {
        await pool.query(
          "insert into business_employer_verifications(business_id,country_code,registry_authority,registration_number,registry_url,recruiter_name,status,registry_checked,recruiter_checked,reviewed_at,expires_at)values($1,'SN','Fixture registry','TEST','https://registry.example.test','Fixture reviewer','approved',true,true,now(),now()+interval '2 days')on conflict(business_id)do update set status='approved',expires_at=excluded.expires_at",
          [ids.business],
        );
        listing = (
          await a.query(
            "insert into job_listings(business_id,public_id,title,employment_type,status,created_by)values($1,$2,'Fixture interview','contract','published',$3)returning id",
            [
              ids.business,
              "job_" + randomUUID().replaceAll("-", ""),
              ids.owner,
            ],
          )
        ).rows[0].id as string;
        await pool.query(
          "insert into job_applications(id,listing_id,business_id,applicant_user_id,status)values($1,$2,$3,$4,'reviewed')",
          [application, listing, ids.business, ids.worker],
        );
        const start = new Date(Date.now() + 86400000).toISOString(),
          end = new Date(Date.now() + 90000000).toISOString();
        await holder.query("begin");
        await holder.query(
          "select pg_advisory_xact_lock(hashtextextended('liguey-interview:'||$1::text,0))",
          [ids.worker],
        );
        const interview = settle(
          a.query("select liguey_propose_interview($1,$2,$3,$4,'online')", [
            randomUUID(),
            application,
            start,
            end,
          ]),
        );
        await blocked(a, holder);
        const shift = settle(
          b.query("select company_portal_action($1,$2,$3)", [
            ids.business,
            "shift_create",
            JSON.stringify({
              id: randomUUID(),
              userId: ids.worker,
              startsAt: start,
              endsAt: end,
              location: "Fixture office",
            }),
          ]),
        );
        await blocked(b, holder);
        await holder.query("commit");
        const results = await Promise.all([interview, shift]);
        expect(results.filter((r) => r.ok)).toHaveLength(1);
        expect(
          (
            await pool.query(
              "select (select count(*)from liguey_interviews where status in ('proposed','accepted'))+(select count(*)from company_shifts where status='scheduled')as n",
            )
          ).rows[0].n,
        ).toBe("1");
      } finally {
        await release(holder, a, b);
      }
    }, 20000);
  },
);
