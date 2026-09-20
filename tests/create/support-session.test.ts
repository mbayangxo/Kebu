import { afterEach, describe, expect, it } from "vitest";
import { createSupportSessionToken, verifySupportSessionToken } from "@/lib/create/support-session";

const prevSecret = process.env.SUPPORT_SESSION_SECRET;

afterEach(() => {
  if (prevSecret === undefined) delete process.env.SUPPORT_SESSION_SECRET;
  else process.env.SUPPORT_SESSION_SECRET = prevSecret;
});

describe("support session", () => {
  it("binds the token to staff user and project", () => {
    process.env.SUPPORT_SESSION_SECRET = "support-session-secret-that-is-long-enough-for-tests";
    const now = Date.now();
    const token = createSupportSessionToken({
      userId: "staff-1",
      projectId: "project-1",
      sessionId: "session-1",
      role: "support",
      reason: "Customer requested help with navigation",
      now,
    });
    expect(verifySupportSessionToken(token, { userId: "staff-1", projectId: "project-1" }, now)?.reason)
      .toBe("Customer requested help with navigation");
    expect(verifySupportSessionToken(token, { userId: "staff-2", projectId: "project-1" }, now)).toBeNull();
    expect(verifySupportSessionToken(token, { userId: "staff-1", projectId: "project-2" }, now)).toBeNull();
  });

  it("expires automatically", () => {
    process.env.SUPPORT_SESSION_SECRET = "support-session-secret-that-is-long-enough-for-tests";
    const now = Date.now();
    const token = createSupportSessionToken({ userId: "staff-1", projectId: "project-1", sessionId: "session-1", role: "support", reason: "Ticket 42", now });
    expect(verifySupportSessionToken(token, { userId: "staff-1", projectId: "project-1" }, now + 31 * 60 * 1000)).toBeNull();
  });
});
