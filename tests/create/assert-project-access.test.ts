import { describe, expect, it, vi, type MockedFunction } from "vitest";
import { assertProjectProductAccess } from "@/lib/create/assert-project-access";
import type { SupabaseClient } from "@supabase/supabase-js";

// Minimal builder for the chained Supabase query pattern
function makeSupabase(projectRow: unknown, membershipRow?: unknown): SupabaseClient {
  const membershipQuery: Record<string, unknown> = {};
  membershipQuery.select = vi.fn().mockReturnValue(membershipQuery);
  membershipQuery.eq = vi.fn().mockReturnValue(membershipQuery);
  membershipQuery.maybeSingle = vi.fn().mockResolvedValue({ data: membershipRow ?? null, error: null });

  const projectQuery: Record<string, unknown> = {};
  projectQuery.select = vi.fn().mockReturnValue(projectQuery);
  projectQuery.eq = vi.fn().mockReturnValue(projectQuery);
  projectQuery.maybeSingle = vi.fn().mockResolvedValue({ data: projectRow, error: null });

  const fromMap: Record<string, unknown> = {
    projects: projectQuery,
    business_members: membershipQuery,
  };

  return {
    from: vi.fn((table: string) => fromMap[table]),
  } as unknown as SupabaseClient;
}

describe("assertProjectProductAccess", () => {
  const OWNER_ID = "user-owner";
  const MEMBER_ID = "user-member";
  const PROJECT_ID = "proj-1";
  const BUSINESS_ID = "biz-1";

  it("returns ok via owner when user is project owner", async () => {
    const supabase = makeSupabase({ id: PROJECT_ID, owner_id: OWNER_ID, business_id: null });
    const result = await assertProjectProductAccess(supabase, PROJECT_ID, OWNER_ID);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.via).toBe("owner");
  });

  it("returns ok via business_member for active founder", async () => {
    const supabase = makeSupabase(
      { id: PROJECT_ID, owner_id: OWNER_ID, business_id: BUSINESS_ID },
      { role: "founder" },
    );
    const result = await assertProjectProductAccess(supabase, PROJECT_ID, MEMBER_ID);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.via).toBe("business_member");
  });

  it("returns ok via business_member for active administrator", async () => {
    const supabase = makeSupabase(
      { id: PROJECT_ID, owner_id: OWNER_ID, business_id: BUSINESS_ID },
      { role: "administrator" },
    );
    const result = await assertProjectProductAccess(supabase, PROJECT_ID, MEMBER_ID);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.via).toBe("business_member");
  });

  it("denies a store_manager (not in PRODUCT_ROLES)", async () => {
    const supabase = makeSupabase(
      { id: PROJECT_ID, owner_id: OWNER_ID, business_id: BUSINESS_ID },
      { role: "store_manager" },
    );
    const result = await assertProjectProductAccess(supabase, PROJECT_ID, MEMBER_ID);
    expect(result.ok).toBe(false);
  });

  it("denies when project has no business and user is not owner", async () => {
    const supabase = makeSupabase({ id: PROJECT_ID, owner_id: OWNER_ID, business_id: null });
    const result = await assertProjectProductAccess(supabase, PROJECT_ID, MEMBER_ID);
    expect(result.ok).toBe(false);
  });

  it("returns 404 when project does not exist", async () => {
    const supabase = makeSupabase(null);
    const result = await assertProjectProductAccess(supabase, "nonexistent", MEMBER_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("denies when user has no membership record", async () => {
    const supabase = makeSupabase(
      { id: PROJECT_ID, owner_id: OWNER_ID, business_id: BUSINESS_ID },
      null, // no membership
    );
    const result = await assertProjectProductAccess(supabase, PROJECT_ID, MEMBER_ID);
    expect(result.ok).toBe(false);
  });
});
