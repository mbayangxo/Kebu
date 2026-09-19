import { describe, expect, it, vi } from "vitest";
import { createSupportSessionToken, verifySupportSessionToken } from "@/lib/create/support-session";

describe("support session boundary", () => {
  it("binds a support session to both staff user and project", () => {
    const token = createSupportSessionToken({ userId: "staff-1", projectId: "project-1", reason: "Ticket 1842", now: 1000 });
    expect(verifySupportSessionToken(token, { userId: "staff-1", projectId: "project-1" }, 2000)?.reason).toBe("Ticket 1842");
    expect(verifySupportSessionToken(token, { userId: "staff-2", projectId: "project-1" }, 2000)).toBeNull();
    expect(verifySupportSessionToken(token, { userId: "staff-1", projectId: "project-2" }, 2000)).toBeNull();
  });

  it("expires after thirty minutes", () => {
    const token = createSupportSessionToken({ userId: "staff-1", projectId: "project-1", reason: "Customer requested help", now: 1000 });
    expect(verifySupportSessionToken(token, { userId: "staff-1", projectId: "project-1" }, 1000 + 30 * 60 * 1000 + 1)).toBeNull();
  });

  it("rejects tampered tokens", () => {
    const token = createSupportSessionToken({ userId: "staff-1", projectId: "project-1", reason: "Customer requested help", now: 1000 });
    expect(verifySupportSessionToken(token + "x", { userId: "staff-1", projectId: "project-1" }, 2000)).toBeNull();
  });
});
