import { describe, expect, it } from "vitest";
import {
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "@/lib/admin/admin-session";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";

describe("admin session cookie", () => {
  it("creates a verifiable token that is not the raw password", async () => {
    const prevPass = process.env.ADMIN_PASSWORD;
    const prevSecret = process.env.ADMIN_SESSION_SECRET;
    process.env.ADMIN_PASSWORD = "test-admin-password-xyz";
    delete process.env.ADMIN_SESSION_SECRET;

    const token = await createAdminSessionToken();
    expect(token).not.toBe("test-admin-password-xyz");
    expect(await verifyAdminSessionToken(token)).toBe(true);
    expect(await verifyAdminSessionToken("test-admin-password-xyz")).toBe(false);
    expect(await verifyAdminSessionToken("v1.1.deadbeef")).toBe(false);

    process.env.ADMIN_PASSWORD = prevPass;
    if (prevSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = prevSecret;
  });

  it("rejects expired tokens", async () => {
    const prevPass = process.env.ADMIN_PASSWORD;
    process.env.ADMIN_PASSWORD = "test-admin-password-xyz";
    const token = await createAdminSessionToken(Date.now() - 9 * 60 * 60 * 1000);
    expect(await verifyAdminSessionToken(token)).toBe(false);
    process.env.ADMIN_PASSWORD = prevPass;
  });
});

describe("same-origin mutation guard", () => {
  it("allows matching origin", () => {
    const req = new Request("https://kebu.africa/api/projects/x/publish", {
      method: "POST",
      headers: { origin: "https://kebu.africa", host: "kebu.africa" },
    });
    expect(assertSameOriginMutation(req)).toBeNull();
  });

  it("blocks cross-site origin", () => {
    const req = new Request("https://kebu.africa/api/projects/x/publish", {
      method: "POST",
      headers: { origin: "https://evil.example", host: "kebu.africa" },
    });
    const res = assertSameOriginMutation(req);
    expect(res?.status).toBe(403);
  });
});
