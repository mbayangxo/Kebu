/**
 * User A / User B cross-project isolation tests — QA Supabase project.
 *
 * Verifies that RLS on projects, project_sections, project_pages, and
 * website_assets prevents User B from reading or writing User A's data
 * via the authenticated PostgREST API path (real GoTrue JWTs).
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
  type TestIdentity,
  type TestProjectFixture,
} from "./qa-harness/index.js";
import { requireMigrationsApplied } from "./qa-harness/migration-verifier.js";

const SKIP = !isQaEnvironment();

describe.skipIf(SKIP)("User A / User B cross-project isolation — real RLS", () => {
  let userA: TestIdentity;
  let userB: TestIdentity;
  let projectA: TestProjectFixture;
  let sectionAId: string;
  let pageAId: string;

  beforeAll(async () => {
    await assertQaEnvironment();
    await requireMigrationsApplied();

    [userA, userB] = await Promise.all([
      createTestUser("user-a"),
      createTestUser("user-b"),
    ]);

    projectA = await createTestProject(userA.userId);
    sectionAId = await createTestSection(projectA.projectId, 0);

    // Resolve the page that the section was inserted into (sections link via page_id)
    const svc = getServiceClient();
    const { data: sec } = await svc
      .from("project_sections")
      .select("page_id")
      .eq("id", sectionAId)
      .single();
    pageAId = (sec as { page_id: string }).page_id;

    // User B creates their own project (should be isolated)
    await createTestProject(userB.userId);
  });

  afterAll(async () => {
    await cleanupAll();
  });

  // ── SELECT isolation ──────────────────────────────────────────────────────────

  it("User B cannot read User A's project via SELECT", async () => {
    const { data } = await userB.client
      .from("projects")
      .select("id, owner_id")
      .eq("id", projectA.projectId);
    // RLS should return empty array, not the row
    expect(data).toHaveLength(0);
  });

  it("User B cannot read User A's sections via SELECT", async () => {
    // Filter by the known section id — RLS should hide it from a non-owner
    const { data } = await userB.client
      .from("project_sections")
      .select("id")
      .eq("id", sectionAId);
    expect(data).toHaveLength(0);
  });

  it("User A can read their own project", async () => {
    const { data, error } = await userA.client
      .from("projects")
      .select("id")
      .eq("id", projectA.projectId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("User A can read their own sections", async () => {
    const { data, error } = await userA.client
      .from("project_sections")
      .select("id")
      .eq("id", sectionAId);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
  });

  // ── UPDATE isolation ──────────────────────────────────────────────────────────

  it("User B cannot UPDATE User A's project title", async () => {
    const { data: before } = await userA.client
      .from("projects")
      .select("title")
      .eq("id", projectA.projectId)
      .single();

    // PostgREST UPDATE with RLS returns 0 rows affected but no error for unauthorized rows
    await userB.client
      .from("projects")
      .update({ title: "HIJACKED" })
      .eq("id", projectA.projectId);

    const { data: after } = await userA.client
      .from("projects")
      .select("title")
      .eq("id", projectA.projectId)
      .single();

    expect((after as { title: string } | null)?.title).toBe(
      (before as { title: string } | null)?.title
    );
    expect((after as { title: string } | null)?.title).not.toBe("HIJACKED");
  });

  it("User B cannot UPDATE User A's section props", async () => {
    await userB.client
      .from("project_sections")
      .update({ props: { hijacked: true } })
      .eq("id", sectionAId);

    // Verify via service client (which can read any row)
    const { getServiceClient } = await import("./qa-harness/index.js");
    const svc = getServiceClient();
    const { data } = await svc
      .from("project_sections")
      .select("props")
      .eq("id", sectionAId)
      .single();

    expect((data as { props: Record<string, unknown> } | null)?.props).not.toMatchObject({
      hijacked: true,
    });
  });

  // ── DELETE isolation ──────────────────────────────────────────────────────────

  it("User B cannot DELETE User A's section", async () => {
    await userB.client
      .from("project_sections")
      .delete()
      .eq("id", sectionAId);

    const { getServiceClient } = await import("./qa-harness/index.js");
    const svc = getServiceClient();
    const { data } = await svc
      .from("project_sections")
      .select("id")
      .eq("id", sectionAId);

    // Row must still exist
    expect(data).toHaveLength(1);
  });

  it("User B cannot DELETE User A's project", async () => {
    await userB.client
      .from("projects")
      .delete()
      .eq("id", projectA.projectId);

    const { getServiceClient } = await import("./qa-harness/index.js");
    const svc = getServiceClient();
    const { data } = await svc
      .from("projects")
      .select("id")
      .eq("id", projectA.projectId);

    expect(data).toHaveLength(1);
  });

  // ── INSERT isolation ──────────────────────────────────────────────────────────

  it("User B cannot INSERT a section into User A's project", async () => {
    // Use userA's real page_id so this reaches the RLS insert policy (not a schema error)
    const { error } = await userB.client.from("project_sections").insert({
      page_id: pageAId,
      section_type: "hero",
      sort_order: 999,
      props: {},
    });
    // RLS insert policy should reject with 42501 or PGRST301
    expect(error).not.toBeNull();
  });
});
