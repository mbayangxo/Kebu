import { describe, expect, it } from "vitest";
import { studioAccessFromRole, studioRoleLabel } from "@/lib/studio/design-access";

describe("Studio design access (share & roles)", () => {
  it("owner can edit, share, and delete", () => {
    const a = studioAccessFromRole("d1", "u1", "owner");
    expect(a.canEdit).toBe(true);
    expect(a.canShare).toBe(true);
    expect(a.canDelete).toBe(true);
    expect(studioRoleLabel(a.role)).toBe("Owner");
  });

  it("editor can edit but not share or delete", () => {
    const a = studioAccessFromRole("d1", "u1", "editor");
    expect(a.canEdit).toBe(true);
    expect(a.canShare).toBe(false);
    expect(a.canDelete).toBe(false);
    expect(studioRoleLabel(a.role)).toBe("Can edit");
  });

  it("viewer is read-only", () => {
    const a = studioAccessFromRole("d1", "u1", "viewer");
    expect(a.canEdit).toBe(false);
    expect(a.canShare).toBe(false);
    expect(a.canDelete).toBe(false);
    expect(studioRoleLabel(a.role)).toBe("View only");
  });
});
