import { describe, it, expect } from "vitest";
import { companyDatabase, companyIds as ids } from "./database";
describe.skipIf(!process.env.KEBU_LOCAL_PGLITE_ROOT)(
  "Liguey → Business Kebu full SQL journey",
  () => {
    it("requires explicit hire invitation acceptance, then assigns learning and project work without merging companies", async () => {
      const f = await companyDatabase();
      try {
        await f.actor(ids.owner);
        await f.db.exec("reset role");
        await f.db.query(
          "insert into business_employer_verifications(business_id,country_code,registry_authority,registration_number,registry_url,recruiter_name,status,registry_checked,recruiter_checked,reviewed_at,expires_at)values($1,'SN','Registry','REG-1','https://registry.example.test/1','Recruiter','approved',true,true,now(),now()+interval '1 day')",
          [ids.business],
        );
        await f.actor(ids.owner);
        const listing = (
          await f.db.query(
            "insert into job_listings(business_id,public_id,title,employment_type,status,created_by)values($1,'job_e2e','Designer','contract','published',$2) returning id",
            [ids.business, ids.owner],
          )
        ).rows[0].id;
        await f.actor(ids.other);
        await f.db.query(
          "insert into kebu_builtin_app_installs(user_id,app_key)values($1,'liguey')",
          [ids.other],
        );
        const application = (
          await f.db.query(
            "insert into job_applications(listing_id,business_id,applicant_user_id,cover_note)values($1,$2,$3,'I would like to apply')returning id",
            [listing, ids.business, ids.other],
          )
        ).rows[0].id;
        await f.actor(ids.worker);
        expect(
          (await f.db.query("select * from job_applications")).rows,
        ).toHaveLength(0);
        await f.actor(ids.owner);
        await expect(
          f.db.query("select company_prepare_hire($1)", [application]),
        ).rejects.toThrow();
        await f.db.query(
          "update job_applications set status='accepted' where id=$1",
          [application],
        );
        const prepared = (
          await f.db.query("select company_prepare_hire($1) as result", [
            application,
          ])
        ).rows[0].result;
        await f.actor(ids.other);
        expect(
          (await f.db.query("select * from company_projects")).rows,
        ).toHaveLength(0);
        expect(
          (
            await f.db.query("select accept_business_invite($1) as result", [
              prepared.token,
            ])
          ).rows[0].result,
        ).toMatchObject({ ok: true, role: "employee" });
        await f.actor(ids.owner);
        const moduleId = crypto.randomUUID(),
          project = crypto.randomUUID();
        await f.action("module_create", {
          id: moduleId,
          title: "Working together",
          lesson: "Give clear feedback",
          quiz: [
            {
              prompt: "How do we improve work?",
              options: ["Give feedback", "Hide problems"],
              correctIndex: 0,
            },
          ],
          passPercent: 80,
        });
        await f.action("module_assign", { moduleId, userId: ids.other });
        await f.action("project_create", {
          id: project,
          title: "Launch campaign",
          description: "Deliver a great launch",
        });
        const task = crypto.randomUUID();
        await f.action("task_create", {
          id: task,
          projectId: project,
          title: "Prepare artwork",
          userId: ids.other,
          body: "Use the shared project document",
          dueAt: null,
        });
        await f.actor(ids.other);
        await f.action("module_answer", {
          moduleId,
          acknowledged: true,
          answers: [0],
        });
        await f.action("task_status", { taskId: task, status: "done" });
        await f.action("feedback_create", {
          projectId: project,
          message: "Artwork is ready for review.",
        });
        const portfolio = (
          await f.db.query("select company_portfolio() as result")
        ).rows[0].result;
        expect(portfolio.map((b: { id: string }) => b.id).sort()).toEqual(
          [ids.business, ids.second].sort(),
        );
        expect(
          portfolio.find((b: { id: string }) => b.id === ids.business)
            .myOpenTasks,
        ).toBe(0);
      } finally {
        await f.db.close();
      }
    }, 30000);
  },
);
