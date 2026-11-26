import { describe, expect, it } from "vitest";
import { resolveAccountContext } from "@/lib/account/workspace-context";

const business = {
  id: "11111111-1111-4111-8111-111111111111",
  publicKebuId: "KEBU-SN-26-ABC123",
  name: "Ndao Studio",
  role: "founder",
};

describe("workspace context", () => {
  it("keeps Personal Kebu explicit even when the user has one business", () => {
    const context = resolveAccountContext({ activeBusinessId: null, businesses: [business] });
    expect(context.mode).toBe("personal");
    expect(context.activeBusinessId).toBeNull();
    expect(context.activeBusiness).toBeNull();
  });

  it("enters only an explicitly active accessible business", () => {
    const context = resolveAccountContext({ activeBusinessId: business.id, businesses: [business] });
    expect(context.mode).toBe("business");
    expect(context.activeBusinessId).toBe(business.id);
  });

  it("falls back to personal when the stored business is no longer accessible", () => {
    const context = resolveAccountContext({
      activeBusinessId: "22222222-2222-4222-8222-222222222222",
      businesses: [business],
    });
    expect(context.mode).toBe("personal");
    expect(context.activeBusinessId).toBeNull();
  });
});
