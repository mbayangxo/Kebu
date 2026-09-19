import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260920005500_prevent_afrique_id_self_verification.sql"),
  "utf8",
);

const readPolicyMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260920011000_restrict_afrique_id_reads_to_owner.sql"),
  "utf8",
);

describe("Afrique ID insert policy", () => {
  it("binds new records to the authenticated owner", () => {
    expect(migration).toContain("(select auth.uid()) = user_id");
  });

  it("does not allow a user to create a pre-verified ID", () => {
    expect(migration).toContain("eligibility_status = 'unverified'");
    expect(migration).toContain("verified_at is null");
    expect(migration).not.toContain("eligibility_status in (");
  });
});

describe("Afrique ID read policy", () => {
  it("removes direct cross-user access to verified ID rows", () => {
    expect(readPolicyMigration).toContain('drop policy if exists "Public read verified Afrique ID cards"');
  });

  it("allows authenticated users to read only their own row", () => {
    expect(readPolicyMigration).toContain("to authenticated");
    expect(readPolicyMigration).toContain("(select auth.uid()) = user_id");
  });
});
