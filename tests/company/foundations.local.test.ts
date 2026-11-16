import { foundationServiceSql } from "./foundation-services";
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { companyCoreDatabase, companyIds as ids } from "./database";
const migration = () =>
  readFileSync(
    "supabase/migrations/20261116060247_qa_company_foundations.sql",
    "utf8",
  );
async function fixture() {
  const { db } = await companyCoreDatabase();
  const invite = readFileSync(
    "supabase/migrations_archive/legacy/055_team_invites_demo_orders.sql",
    "utf8",
  );
  await db.exec(invite.slice(0, invite.indexOf("-- >>> Shop demo orders")));
  await db.exec(foundationServiceSql());
  return db;
}
describe.skipIf(!process.env.KEBU_LOCAL_PGLITE_ROOT)(
  "exact legacy-QA convergence batch",
  () => {
    it("rehearses all sources, preserves existing profiles, permits the real roster and project workflow, and rejects anon/TRUNCATE", async () => {
      const db = await fixture();
      try {
        const helper = (
          await db.query(
            "select pg_get_functiondef('public.set_updated_at()'::regprocedure) as definition",
          )
        ).rows[0].definition;
        const before = (
          await db.query(
            "select jsonb_agg(to_jsonb(p) order by id) as profiles from user_profiles p",
          )
        ).rows[0].profiles;
        await db.exec(migration());
        expect(
          (
            await db.query(
              "select pg_get_functiondef('public.set_updated_at()'::regprocedure) as definition",
            )
          ).rows[0].definition,
        ).toBe(helper);
        expect(
          (
            await db.query(
              "select jsonb_agg(to_jsonb(p) order by id) as profiles from user_profiles p",
            )
          ).rows[0].profiles,
        ).toEqual(before);
        await db.exec(
          `select set_config('request.jwt.claim.sub','${ids.owner}',false);set role authenticated;`,
        );
        expect(
          (
            await db.query("select company_roster($1) as roster", [
              ids.business,
            ])
          ).rows[0].roster,
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ name: "Worker", kebuId: null }),
          ]),
        );
        const project = crypto.randomUUID();
        await db.query("select company_portal_action($1,$2,$3)", [
          ids.business,
          "project_create",
          JSON.stringify({
            id: project,
            title: "Existing-data acceptance",
            description: "Real project",
          }),
        ]);
        const room = (
          await db.query("select room_id from company_projects where id=$1", [
            project,
          ])
        ).rows[0].room_id;
        const first = (
          await db.query("select room_call_join($1,2) as call", [room])
        ).rows[0].call;
        expect(
          (await db.query("select room_call_join($1,2) as call", [room]))
            .rows[0].call.id,
        ).toBe(first.id);
        await expect(
          db.exec("truncate company_pay_statements"),
        ).rejects.toThrow();
        await db.exec("reset role");
        await db.exec(migration());
        expect(
          (
            await db.query(
              "select count(*)::int as n from company_projects where id=$1",
              [project],
            )
          ).rows[0].n,
        ).toBe(1);
        await db.exec("set role anon");
        await expect(
          db.query("select * from company_projects"),
        ).rejects.toThrow();
      } finally {
        await db.close();
      }
    }, 60000);
    it("refuses a partially installed schema without silently creating the remaining tables", async () => {
      const db = await fixture();
      try {
        await db.exec("create table workspace_items(id uuid primary key)");
        await expect(db.exec(migration())).rejects.toThrow(
          /Mixed company foundation state/,
        );
        expect(
          (
            await db.query(
              "select to_regclass('public.company_projects') as table_name",
            )
          ).rows[0].table_name,
        ).toBeNull();
      } finally {
        await db.close();
      }
    }, 30000);
  },
);
