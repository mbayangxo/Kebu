import { describe, expect, it, vi } from "vitest";
import { acceptBusinessInvite } from "@/lib/business/team-invites";
import { invitableRoles } from "@/lib/business/team-permissions";

describe("team invitation atomic RPC boundary", () => {
  it("uses the authenticated transaction and never the admin client's separate writes", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({
        data: { ok: true, businessId: "b", role: "employee" },
        error: null,
      });
    const from = vi.fn();
    expect(
      await acceptBusinessInvite({ rpc } as never, { from } as never, {
        token: "token",
        userId: "claimed",
        userEmail: "claimed@test.test",
      }),
    ).toEqual({ ok: true, businessId: "b", role: "employee" });
    expect(rpc).toHaveBeenCalledWith("accept_business_invite", {
      p_token: "token",
    });
    expect(from).not.toHaveBeenCalled();
  });
  it("fails closed if the required transaction is not deployed", async () => {
    const db = {
      rpc: vi
        .fn()
        .mockResolvedValue({ data: null, error: { code: "PGRST202" } }),
    };
    expect(
      await acceptBusinessInvite(db as never, {} as never, {
        token: "token",
        userId: "u",
        userEmail: "u@test.test",
      }),
    ).toMatchObject({ ok: false, status: 503 });
  });
  it("preserves the transaction's denial", async () => {
    const db = {
      rpc: vi
        .fn()
        .mockResolvedValue({
          data: { ok: false, status: 410, error: "Invitation expired." },
          error: null,
        }),
    };
    expect(
      await acceptBusinessInvite(db as never, {} as never, {
        token: "token",
        userId: "u",
        userEmail: "u@test.test",
      }),
    ).toMatchObject({ ok: false, status: 410 });
  });
  it("restricts delegated invitations and excludes creative/employee escalation", () => {
    expect(invitableRoles("founder")).toContain("administrator");
    expect(invitableRoles("manager")).toContain("employee");
    expect(invitableRoles("manager")).not.toContain("administrator");
    for (const role of ["creative", "employee", "viewer", "cofounder"])
      expect(invitableRoles(role)).toEqual([]);
  });
});
