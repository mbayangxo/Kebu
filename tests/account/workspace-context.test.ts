import { describe, expect, it } from "vitest";
import {
  businessScopedHref,
  resolveAccountContext,
  workspacePatchSchema,
} from "@/lib/account/workspace-context";

describe("Account workspace context", () => {
  const businesses = [
    { id: "b1", publicKebuId: "KEBU-SN-01-ABC123", name: "May Lecor", role: "founder" },
    { id: "b2", publicKebuId: "KEBU-SN-01-XYZ789", name: "Second Co", role: "viewer" },
  ];

  it("defaults to personal when no active business", () => {
    const ctx = resolveAccountContext({ activeBusinessId: null, businesses });
    expect(ctx.mode).toBe("personal");
    expect(ctx.activeBusiness).toBeNull();
  });

  it("auto-selects sole business membership", () => {
    const ctx = resolveAccountContext({
      activeBusinessId: null,
      businesses: [businesses[0]!],
    });
    expect(ctx.mode).toBe("business");
    expect(ctx.activeBusinessId).toBe("b1");
  });

  it("clears invalid active business id", () => {
    const ctx = resolveAccountContext({ activeBusinessId: "unknown", businesses });
    expect(ctx.mode).toBe("personal");
  });

  it("scopes business home href", () => {
    expect(businessScopedHref("/business", "b1")).toBe("/business/b1");
    expect(businessScopedHref("/business/register", "b1")).toBe("/business/register");
  });

  it("validates workspace patch", () => {
    expect(workspacePatchSchema.parse({ mode: "personal" }).mode).toBe("personal");
    expect(
      workspacePatchSchema.parse({ mode: "business", businessId: "550e8400-e29b-41d4-a716-446655440000" })
        .mode,
    ).toBe("business");
  });
});
