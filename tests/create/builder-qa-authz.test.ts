/**
 * Real JWT authorization tests for Builder RPCs — QA Supabase project.
 *
 * Exercises the actual GoTrue → PostgREST → SECURITY DEFINER path that the
 * role-simulated DB tests (builder-rpc-authz.db.test.ts) cannot reach.
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
  cleanupAll,
  getServiceClient,
  getAnonClient,
  type TestIdentity,
  type TestProjectFixture,
} from "./qa-harness/index.js";
import { requireMigrationsApplied } from "./qa-harness/migration-verifier.js";

const SKIP = !isQaEnvironment();

describe.skipIf(SKIP)("Builder RPC authorization — real GoTrue JWT", () => {
  let ownerA: TestIdentity;
  let strangerB: TestIdentity;
  let projectA: TestProjectFixture;
  let sectionIds: string[];

  beforeAll(async () => {
    await assertQaEnvironment();
    await requireMigrationsApplied();

    [ownerA, strangerB] = await Promise.all([
      createTestUser("owner-a"),
      createTestUser("stranger-b"),
    ]);

    projectA = await createTestProject(ownerA.userId);

    sectionIds = await Promise.all([
      createTestSection(projectA.projectId, 0),
      createTestSection(projectA.projectId, 1),
      createTestSection(projectA.projectId, 2),
    ]);
  });

  afterAll(async () => {
    await cleanupAll();
  });

  // ── Owner can reorder their own sections ─────────────────────────────────────

  it("owner: reorder_sections succeeds with real JWT", async () => {
    const { error } = await ownerA.client.rpc("reorder_sections", {
      p_project_id: projectA.projectId,
      p_ordered_ids: [...sectionIds].reverse(),
    });
    expect(error).toBeNull();
  });

  it("owner: batch_update_section_props succeeds with real JWT", async () => {
    const updates = sectionIds.slice(0, 2).map((id, i) => ({
      id,
      props: { updated: true, rank: i },
    }));
    const { error } = await ownerA.client.rpc("batch_update_section_props", {
      p_project_id: projectA.projectId,
      p_updates: updates,
    });
    expect(error).toBeNull();
  });

  // ── Stranger is rejected ──────────────────────────────────────────────────────

  it("stranger: reorder_sections is rejected with real JWT (not owner)", async () => {
    const { error } = await strangerB.client.rpc("reorder_sections", {
      p_project_id: projectA.projectId,
      p_ordered_ids: sectionIds,
    });
    expect(error).not.toBeNull();
    // PostgREST surfaces RAISE EXCEPTION as 42501 (insufficient_privilege) or P0001
    expect(["42501", "P0001", "PGRST301"]).toContain(
      error!.code ?? (error as { details?: string }).details
    );
  });

  it("stranger: batch_update_section_props is rejected with real JWT (not owner)", async () => {
    const updates = [{ id: sectionIds[0], props: { hijacked: true } }];
    const { error } = await strangerB.client.rpc("batch_update_section_props", {
      p_project_id: projectA.projectId,
      p_updates: updates,
    });
    expect(error).not.toBeNull();
  });

  it("stranger: sections remain untouched after rejected batch_update", async () => {
    const svc = getServiceClient();
    const { data } = await svc
      .from("project_sections")
      .select("props")
      .eq("id", sectionIds[0])
      .single();
    expect((data as Record<string, unknown> | null)?.props).not.toMatchObject({ hijacked: true });
  });

  // ── Anon (no session) is rejected ────────────────────────────────────────────

  it("anon: reorder_sections is rejected (no session)", async () => {
    const anon = getAnonClient();
    const { error } = await anon.rpc("reorder_sections", {
      p_project_id: projectA.projectId,
      p_ordered_ids: sectionIds,
    });
    expect(error).not.toBeNull();
  });

  it("anon: batch_update_section_props is rejected (no session)", async () => {
    const anon = getAnonClient();
    const { error } = await anon.rpc("batch_update_section_props", {
      p_project_id: projectA.projectId,
      p_updates: [{ id: sectionIds[0], props: {} }],
    });
    expect(error).not.toBeNull();
  });

  // ── Nonexistent project ───────────────────────────────────────────────────────

  it("stranger: reorder against nonexistent project is rejected", async () => {
    const fakeProjectId = "00000000-0000-4000-8000-000000000001";
    const { error } = await strangerB.client.rpc("reorder_sections", {
      p_project_id: fakeProjectId,
      p_ordered_ids: sectionIds,
    });
    expect(error).not.toBeNull();
  });
});
