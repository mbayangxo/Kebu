import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { companyDatabase, companyIds as ids } from "./database";
describe.skipIf(!process.env.KEBU_LOCAL_PGLITE_ROOT)(
  "four editor/cloud migrations on existing data",
  () => {
    it("is repeatable, preserves content, strictly advances revisions and rejects cross-deployment ownership", async () => {
      const f = await companyDatabase();
      try {
        await f.db
          .exec(`create table sheet_bodies(id uuid primary key,cells jsonb,updated_at timestamptz default now());create table slide_bodies(id uuid primary key,slides jsonb,updated_at timestamptz default now());
 create table cloud_deployments(id uuid primary key,live_version_id uuid);create table cloud_deployment_versions(id uuid primary key,deployment_id uuid references cloud_deployments(id),storage_prefix text not null);
 alter table cloud_deployments add constraint cloud_deployments_live_version_fkey foreign key(live_version_id) references cloud_deployment_versions(id);
 insert into sheet_bodies values('${ids.business}','{"A1":"Original"}',now());insert into slide_bodies values('${ids.second}','[{"title":"Original"}]',now());`);
        for (let n = 0; n < 2; n++)
          for (const file of [
            "20261112075207_editor_revision_guards.sql",
            "20261112075718_document_collaboration_state.sql",
            "20261112075919_cloud_deployment_version_ownership.sql",
            "20261112081206_private_room_call_signaling.sql",
          ])
            await f.db.exec(
              readFileSync("supabase/migrations/" + file, "utf8"),
            );
        await f.db.exec(
          `do $$declare a timestamptz;b timestamptz;begin update sheet_bodies set cells=cells returning updated_at into a;update sheet_bodies set cells=cells returning updated_at into b;if b<=a then raise exception 'Revision did not advance';end if;end$$;`,
        );
        expect(
          (await f.db.query("select cells from sheet_bodies")).rows[0].cells,
        ).toEqual({ A1: "Original" });
        expect(
          (await f.db.query("select slides from slide_bodies")).rows[0].slides,
        ).toEqual([{ title: "Original" }]);
        const a = crypto.randomUUID(),
          b = crypto.randomUUID(),
          v = crypto.randomUUID();
        await f.db.query("insert into cloud_deployments(id) values($1),($2)", [
          a,
          b,
        ]);
        await f.db.query(
          "insert into cloud_deployment_versions values($1,$2,$3)",
          [v, a, `${a}/${v}`],
        );
        await expect(
          f.db.query(
            "update cloud_deployments set live_version_id=$1 where id=$2",
            [v, b],
          ),
        ).rejects.toThrow();
        await f.db.query(
          "update cloud_deployments set live_version_id=$1 where id=$2",
          [v, a],
        );
        await f.db.query("delete from cloud_deployment_versions where id=$1", [
          v,
        ]);
        expect(
          (
            await f.db.query(
              "select live_version_id from cloud_deployments where id=$1",
              [a],
            )
          ).rows[0].live_version_id,
        ).toBeNull();
      } finally {
        await f.db.close();
      }
    }, 30000);
  },
);
