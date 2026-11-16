import { describe, it, expect } from "vitest";
import { companyDatabase, companyIds as ids } from "./database";
const root = process.env.KEBU_LOCAL_PGLITE_ROOT;
async function hiringFixture() {
  const f = await companyDatabase();
  const listing = crypto.randomUUID(),
    application = crypto.randomUUID();
  await f.actor(ids.owner);
  await f.db.exec("reset role");
  await f.db.query(
    "insert into business_employer_verifications(business_id,country_code,registry_authority,registration_number,registry_url,recruiter_name,status,registry_checked,recruiter_checked,reviewed_at,expires_at)values($1,'SN','Official registry','TEST-1','https://registry.example.test/record','Recruiter','approved',true,true,now(),now()+interval '1 day')",
    [ids.business],
  );
  await f.db.query(
    "insert into job_listings(id,business_id,public_id,title,employment_type,status,created_by)values($1,$2,'job_test1','Store assistant','full_time','published',$3)",
    [listing, ids.business, ids.owner],
  );
  await f.db.query(
    "insert into job_applications(id,listing_id,business_id,applicant_user_id,status)values($1,$2,$3,$4,'reviewed')",
    [application, listing, ids.business, ids.worker],
  );
  return { ...f, listing, application };
}
describe.skipIf(!root)("Liguey interviews and employer review SQL", () => {
  it("records a real operator review atomically, rejects stale review writes and permits publication only afterwards", async () => {
    const f = await companyDatabase();
    try {
      await f.actor(ids.owner);
      await f.db.query(
        "select liguey_request_verification($1,'SN','Registry','REG-01','https://registry.example.test/company','Recruiter','Reviewed office address')",
        [ids.business],
      );
      const revision = (
        await f.db.query(
          "select updated_at from business_employer_verifications where business_id=$1",
          [ids.business],
        )
      ).rows[0].updated_at;
      await f.db.exec("reset role;set role service_role;");
      await expect(
        f.db.query(
          "select liguey_review_employer($1,$2,'approved',false,true,true,'Independent review recorded for acceptance test')",
          [ids.business, revision],
        ),
      ).rejects.toThrow();
      expect(
        (
          await f.db.query(
            "select liguey_review_employer($1,$2,'approved',true,true,true,'Independent review recorded for acceptance test') as ok",
            [ids.business, revision],
          )
        ).rows[0].ok,
      ).toBe(true);
      expect(
        (
          await f.db.query(
            "select liguey_review_employer($1,$2,'suspended',true,true,true,'This stale decision must not overwrite current review') as ok",
            [ids.business, revision],
          )
        ).rows[0].ok,
      ).toBe(false);
      expect(
        (await f.db.query("select * from employer_review_events")).rows,
      ).toHaveLength(1);
      await f.actor(ids.owner);
      await f.db.query(
        "insert into job_listings(business_id,public_id,title,employment_type,status,created_by) values($1,'job_approved','Reviewed employer job','contract','published',$2)",
        [ids.business, ids.owner],
      );
    } finally {
      await f.db.close();
    }
  }, 30000);

  it("requires installation and a genuine review before public recruitment; company users cannot self-approve", async () => {
    const f = await companyDatabase();
    try {
      await f.actor(ids.owner);
      await expect(
        f.db.query(
          "insert into job_listings(business_id,public_id,title,employment_type,status,created_by) values($1,'job_no','No review','gig','published',$2)",
          [ids.business, ids.owner],
        ),
      ).rejects.toThrow();
      await expect(
        f.db.query(
          "select liguey_review_employer($1,now(),'approved',true,true,false,'This is a forged approval attempt')",
          [ids.business],
        ),
      ).rejects.toThrow();
      await f.db.exec("reset role");
      await f.db.query(
        "delete from kebu_builtin_app_installs where user_id=$1",
        [ids.owner],
      );
      await f.actor(ids.owner);
      await expect(
        f.db.query(
          "insert into job_listings(business_id,public_id,title,employment_type,status,created_by) values($1,'job_no2','No install','gig','draft',$2)",
          [ids.business, ids.owner],
        ),
      ).rejects.toThrow();
    } finally {
      await f.db.close();
    }
  }, 30000);
  it("proposes online interview; candidate accepts; calendar persists, cancellation closes the room", async () => {
    const f = await hiringFixture();
    try {
      const interview = crypto.randomUUID();
      await f.actor(ids.owner);
      await f.db.query(
        "select liguey_propose_interview($1,$2,'2027-01-03T10:00:00Z','2027-01-03T11:00:00Z','online')",
        [interview, f.application],
      );
      await f.actor(ids.worker);
      expect(
        (await f.db.query("select can_access_room($1) as allowed", [interview]))
          .rows[0].allowed,
      ).toBe(false);
      expect(
        (
          await f.db.query(
            "select liguey_respond_interview($1,1,'accepted') as result",
            [interview],
          )
        ).rows[0].result,
      ).toBe(true);
      expect(
        (await f.db.query("select can_access_room($1) as allowed", [interview]))
          .rows[0].allowed,
      ).toBe(true);
      const events = await f.db.query(
        "select * from workspace_items where kind='event'",
      );
      expect(events.rows).toHaveLength(1);
      await f.actor(ids.other);
      expect(
        (await f.db.query("select * from liguey_interviews")).rows,
      ).toHaveLength(0);
      await expect(
        f.db.query("select liguey_respond_interview($1,2,'cancelled')", [
          interview,
        ]),
      ).rejects.toThrow();
      await f.actor(ids.worker);
      expect(
        (
          await f.db.query(
            "select liguey_respond_interview($1,1,'cancelled') as result",
            [interview],
          )
        ).rows[0].result,
      ).toBe(false);
      await f.db.query("select liguey_respond_interview($1,2,'cancelled')", [
        interview,
      ]);
      expect(
        (await f.db.query("select can_access_room($1) as allowed", [interview]))
          .rows[0].allowed,
      ).toBe(false);
    } finally {
      await f.db.close();
    }
  }, 30000);
  it("rejects unreviewed office meetings and duplicate time commitments; reports stay private", async () => {
    const f = await hiringFixture();
    try {
      await f.actor(ids.owner);
      await expect(
        f.db.query(
          "select liguey_propose_interview($1,$2,'2027-01-03T10:00:00Z','2027-01-03T11:00:00Z','office')",
          [crypto.randomUUID(), f.application],
        ),
      ).rejects.toThrow();
      await f.db.query(
        "select liguey_propose_interview($1,$2,'2027-01-03T10:00:00Z','2027-01-03T11:00:00Z','online')",
        [crypto.randomUUID(), f.application],
      );
      await expect(
        f.db.query(
          "select liguey_propose_interview($1,$2,'2027-01-03T10:30:00Z','2027-01-03T11:30:00Z','online')",
          [crypto.randomUUID(), f.application],
        ),
      ).rejects.toThrow();
      await f.actor(ids.worker);
      await f.db.query("select liguey_report_company($1,$2,$3)", [
        crypto.randomUUID(),
        ids.business,
        "Recruiter asked for an unreviewed meeting place.",
      ]);
      expect(
        (await f.db.query("select * from liguey_safety_reports")).rows,
      ).toHaveLength(1);
      await f.actor(ids.owner);
      expect(
        (await f.db.query("select * from liguey_safety_reports")).rows,
      ).toHaveLength(0);
    } finally {
      await f.db.close();
    }
  }, 30000);
});
