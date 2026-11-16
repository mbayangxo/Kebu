import { describe, it, expect } from "vitest";
import { companyDatabase, companyIds as ids } from "./database";
const enabled = Boolean(process.env.KEBU_LOCAL_PGLITE_ROOT);
describe.skipIf(!enabled)(
  "company workplace actual SQL and permissions",
  () => {
    it("creates project → shared task → document → feedback; retries once and denies another company", async () => {
      const f = await companyDatabase();
      try {
        await f.actor(ids.owner);
        expect(
          (
            await f.db.query("select company_roster($1) as roster", [
              ids.business,
            ])
          ).rows[0].roster,
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ name: "Worker", kebuId: null }),
          ]),
        );
        const project = crypto.randomUUID();
        await f.action("project_create", {
          id: project,
          title: "Open the store",
          description: "A real launch",
        });
        const task = crypto.randomUUID();
        await f.action("task_create", {
          id: task,
          projectId: project,
          title: "Check stock",
          userId: ids.worker,
          body: "Count every box",
          dueAt: null,
        });
        await f.actor(ids.worker);
        await f.action("task_status", { taskId: task, status: "done" });
        const feedback = crypto.randomUUID();
        const data = {
          id: feedback,
          projectId: project,
          message: "Stock checked",
        };
        await f.action("feedback_create", data);
        await f.action("feedback_create", data);
        await expect(
          f.action("feedback_create", { ...data, message: "changed retry" }),
        ).rejects.toThrow();
        await f.action("doc_create", {
          projectId: project,
          title: "Opening notes",
        });
        await f.db.exec("reset role");
        expect(
          (await f.db.query("select * from company_project_feedback")).rows,
        ).toHaveLength(1);
        expect(
          (
            await f.db.query("select status from workspace_items where id=$1", [
              task,
            ])
          ).rows[0].status,
        ).toBe("done");
        await f.actor(ids.other);
        expect(
          (await f.db.query("select * from company_projects")).rows,
        ).toHaveLength(0);
        await expect(
          f.action("feedback_create", {
            projectId: project,
            message: "Intrusion",
          }),
        ).rejects.toThrow();
      } finally {
        await f.db.close();
      }
    }, 30000);
    it("hides quiz keys, grades server-side, rejects spoofed scores and preserves learning history", async () => {
      const f = await companyDatabase();
      try {
        await f.actor(ids.owner);
        const moduleId = crypto.randomUUID();
        await f.action("module_create", {
          id: moduleId,
          title: "Culture and safety",
          lesson: "Protect your colleagues",
          quiz: [
            {
              prompt: "Where do concerns go?",
              options: ["Public chat", "Private HR"],
              correctIndex: 1,
            },
          ],
          passPercent: 80,
        });
        await f.action("module_assign", { moduleId, userId: ids.worker });
        await f.actor(ids.worker);
        expect(
          (await f.db.query("select * from company_learning_modules")).rows,
        ).toHaveLength(0);
        const lessons = (
          await f.db.query("select company_learning_for_me($1) as result", [
            ids.business,
          ])
        ).rows[0].result;
        expect(JSON.stringify(lessons)).not.toContain("correctIndex");
        expect(
          await f.action("module_answer", {
            moduleId,
            answers: [0],
            acknowledged: true,
            score: 100,
          }),
        ).toMatchObject({ score: 0 });
        expect(
          await f.action("module_answer", {
            moduleId,
            answers: [1],
            acknowledged: true,
          }),
        ).toMatchObject({ score: 100 });
        await expect(
          f.action("module_answer", {
            moduleId,
            answers: [1],
            acknowledged: false,
          }),
        ).rejects.toThrow();
      } finally {
        await f.db.close();
      }
    }, 30000);
    it("keeps HR and pay private, prevents schedule overlap, and removes company room access", async () => {
      const f = await companyDatabase();
      try {
        await f.actor(ids.worker);
        await f.action("hr_create", {
          category: "workplace",
          message: "Private concern",
        });
        await f.action("pay_preference", { method: "mobile_money" });
        await f.actor(ids.owner);
        const project = crypto.randomUUID();
        await f.action("project_create", {
          id: project,
          title: "Operations",
          description: "",
        });
        await f.action("shift_create", {
          userId: ids.worker,
          startsAt: "2027-01-01T08:00:00Z",
          endsAt: "2027-01-01T16:00:00Z",
          location: "Reviewed office",
        });
        await expect(
          f.action("shift_create", {
            userId: ids.worker,
            startsAt: "2027-01-01T09:00:00Z",
            endsAt: "2027-01-01T17:00:00Z",
            location: "Reviewed office",
          }),
        ).rejects.toThrow();
        await f.action("statement_create", {
          userId: ids.worker,
          periodStart: "2026-11-01",
          periodEnd: "2026-11-15",
          currency: "XOF",
          grossMinor: 100000,
          deductionsMinor: 5000,
          netMinor: 95000,
        });
        await f.actor(ids.finance);
        expect(
          (await f.db.query("select * from company_hr_requests")).rows,
        ).toHaveLength(0);
        expect(
          (await f.db.query("select * from company_pay_preferences")).rows,
        ).toHaveLength(1);
        await f.actor(ids.other);
        expect(
          (await f.db.query("select * from company_pay_statements")).rows,
        ).toHaveLength(0);
        await f.actor(ids.worker);
        expect(
          (await f.db.query("select can_access_room($1) as allowed", [project]))
            .rows[0].allowed,
        ).toBe(true);
        await f.actor(ids.owner);
        await f.action("member_remove", { userId: ids.worker });
        await f.actor(ids.worker);
        expect(
          (await f.db.query("select can_access_room($1) as allowed", [project]))
            .rows[0].allowed,
        ).toBe(false);
        await expect(
          f.action("hr_create", {
            category: "other",
            message: "No longer a member",
          }),
        ).rejects.toThrow();
      } finally {
        await f.db.close();
      }
    }, 30000);
  },
);
