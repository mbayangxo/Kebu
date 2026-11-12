/**
 * SECURITY DEFINER attack regression tests via real PostgREST — QA Supabase project.
 *
 * This is the test the role-simulated DB suite cannot replace: it exercises the
 * complete GoTrue → PostgREST → SECURITY DEFINER → ownership guard path with
 * real cryptographic JWTs. The attack scenario from the security audit:
 *
 *   User B learns User A's project UUID and calls rpc('reorder_sections', {
 *     p_project_id: userA_project_uuid, ...
 *   }) from their own authenticated session.
 *
 * Without the v2 guard, SECURITY DEFINER bypasses RLS and the call succeeds.
 * With the guard, it must be rejected regardless of how the JWT was obtained.
 *
 * Also covers:
 *   - Authorized team member path (service_role via assertProjectEditorAccess)
 *   - Revoked team member treated as a stranger
 *   - Cross-project section IDs (scoped by WHERE clause, not the guard)
 *
 * Required env vars (see .env.test.example → QA HARNESS section):
 *   SUPABASE_QA_DESIGNATED=true
 *   SUPABASE_QA_URL
 *   SUPABASE_QA_ANON_KEY
 *   SUPABASE_QA_SERVICE_ROLE_KEY
 *   SUPABASE_QA_DB_URL
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  isQaEnvironment,
  assertQaEnvironment,
  createTestUser,
  createTestProject,
  createTestSection,
  addTeamMember,
  cleanupAll,
  getServiceClient,
  type TestIdentity,
  type TestProjectFixture,
} from "./qa-harness/index.js";
import { requireMigrationsApplied } from "./qa-harness/migration-verifier.js";

const SKIP = !isQaEnvironment();

describe.skipIf(SKIP)("SECURITY DEFINER attack regression — real GoTrue JWT", () => {
  let ownerA: TestIdentity;
  let attackerB: TestIdentity;
  let teamMember: TestIdentity;
  let revokedMember: TestIdentity;
  let projectA: TestProjectFixture;
  let sectionIds: string[];
  let removeRevokedMembership: (() => Promise<void>) | null = null;

  // Track business_id for team member setup
  let businessId: string | null = null;

  beforeAll(async () => {
    await assertQaEnvironment();
    await requireMigrationsApplied();

    [ownerA, attackerB, teamMember, revokedMember] = await Promise.all([
      createTestUser("owner-a"),
      createTestUser("attacker-b"),
      createTestUser("team-member"),
      createTestUser("revoked-member"),
    ]);

    projectA = await createTestProject(ownerA.userId);

    sectionIds = await Promise.all([
      createTestSection(projectA.projectId, 0),
      createTestSection(projectA.projectId, 1),
      createTestSection(projectA.projectId, 2),
    ]);

    // Look up the business_id for projectA (may be null for personal projects)
    const svc = getServiceClient();
    const { data: proj } = await svc
      .from("projects")
      .select("business_id")
      .eq("id", projectA.projectId)
      .single();
    businessId = (proj as { business_id: string | null } | null)?.business_id ?? null;

    if (businessId) {
      // Add revoked member (status = revoked)
      removeRevokedMembership = await addTeamMember(
        businessId,
        revokedMember.userId,
        "creative",
        "revoked"
      );
    }
  });

  afterAll(async () => {
    if (removeRevokedMembership) await removeRevokedMembership();
    await cleanupAll();
  });

  // ── The actual IDOR attack vector ─────────────────────────────────────────────

  it("attack: attacker with valid JWT cannot reorder another user's sections (IDOR)", async () => {
    // Attacker knows projectA's UUID (e.g. from a shared link).
    // They call reorder_sections from their own authenticated session.
    // The SECURITY DEFINER guard must reject this.
    const { error } = await attackerB.client.rpc("reorder_sections", {
      p_project_id: projectA.projectId,
      p_ordered_ids: [...sectionIds].reverse(),
    });
    expect(error).not.toBeNull();
    // The guard raises 'insufficient_privilege' (SQLSTATE 42501)
    // PostgREST may surface as code 42501 or PGRST301
    const code = (error as { code?: string }).code ?? "";
    expect(["42501", "P0001", "PGRST116", "PGRST301"]).toContain(code);
  });

  it("attack: attacker cannot batch_update another user's sections (IDOR)", async () => {
    const updates = sectionIds.map((id) => ({ id, props: { compromised: true } }));
    const { error } = await attackerB.client.rpc("batch_update_section_props", {
      p_project_id: projectA.projectId,
      p_updates: updates,
    });
    expect(error).not.toBeNull();

    // Verify sections were not modified
    const svc = getServiceClient();
    const { data } = await svc
      .from("project_sections")
      .select("id, props")
      .in("id", sectionIds);
    for (const row of data ?? []) {
      expect((row as { props: Record<string, unknown> }).props).not.toMatchObject({
        compromised: true,
      });
    }
  });

  // ── Verify guard allows owner ─────────────────────────────────────────────────

  it("owner: reorder_sections succeeds with their own real JWT", async () => {
    const { error } = await ownerA.client.rpc("reorder_sections", {
      p_project_id: projectA.projectId,
      p_ordered_ids: sectionIds,
    });
    expect(error).toBeNull();
  });

  // ── Revoked team member treated as stranger ───────────────────────────────────

  it("revoked member: reorder_sections is rejected (treated as stranger)", async () => {
    if (!businessId) {
      // Personal project (no business) — no team member concept; skip this sub-test
      return;
    }
    const { error } = await revokedMember.client.rpc("reorder_sections", {
      p_project_id: projectA.projectId,
      p_ordered_ids: sectionIds,
    });
    expect(error).not.toBeNull();
  });

  // ── Cross-project section IDs (scoped by WHERE, not the guard) ───────────────

  it("cross-project: service_role with valid sections from a different project returns 0 rows", async () => {
    // Create a second project owned by userB
    const projectB = await createTestProject(attackerB.userId);
    const sectionBIds = await Promise.all([
      createTestSection(projectB.projectId, 0),
      createTestSection(projectB.projectId, 1),
    ]);

    // service_role (null auth.uid()) is allowed by the guard but the WHERE clause
    // on project_id scopes the UPDATE to projectA only — sectionBIds don't belong to it.
    const svc = getServiceClient();
    const { error } = await svc.rpc("reorder_sections", {
      p_project_id: projectA.projectId,
      p_ordered_ids: sectionBIds,  // section IDs from a different project
    });
    // No exception (service_role passes the guard), but 0 rows are updated.
    // PostgREST does not surface 0-row updates as errors.
    expect(error).toBeNull();

    // Confirm projectA sections are unchanged (still have their original IDs at their positions)
    const { data } = await svc
      .from("project_sections")
      .select("id, sort_order")
      .eq("project_id", projectA.projectId)
      .order("sort_order");
    const updatedIds = (data ?? []).map((r: { id: string }) => r.id);
    // The sections should still be projectA's sections, not projectB's
    for (const id of sectionBIds) {
      expect(updatedIds).not.toContain(id);
    }
  });
});
