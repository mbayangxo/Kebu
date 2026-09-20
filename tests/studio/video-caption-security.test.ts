import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Studio video caption mutation security", () => {
  const source = readFileSync(
    join(process.cwd(), "app/api/studio/video/[id]/captions/route.ts"),
    "utf8",
  );

  it("requires same-origin mutation requests", () => {
    expect(source).toContain("assertSameOriginMutation(req)");
  });

  it("scopes reads and writes to the active Personal or Business Kebu workspace", () => {
    expect(source).toContain("loadActiveWorkspaceScope");
    expect(source).toContain('projectQuery.eq("business_id", workspace.activeBusinessId)');
    expect(source).toContain('projectQuery.is("business_id", null)');
    expect(source).toContain('updateQuery.eq("business_id", workspace.activeBusinessId)');
    expect(source).toContain('updateQuery.is("business_id", null)');
  });

  it("does not bypass business RLS with a hard-coded owner-only mutation filter", () => {
    expect(source).not.toContain('.eq("owner_id", user.id)');
  });
});
