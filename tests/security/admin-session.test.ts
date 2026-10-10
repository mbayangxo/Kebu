import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "@/lib/admin/admin-session";
import { assertAdminCookie, assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";

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

// Middleware verifies these tokens on the Edge runtime, where Node's `crypto` module
// does not exist — importing it made every authenticated /admin request fail with 500.
describe("admin session — Edge runtime compatibility", () => {
  const SECRET = "edge-compat-secret-123";
  let prevPass: string | undefined;
  let prevSecret: string | undefined;

  beforeEach(() => {
    prevPass = process.env.ADMIN_PASSWORD;
    prevSecret = process.env.ADMIN_SESSION_SECRET;
    process.env.ADMIN_SESSION_SECRET = SECRET;
  });
  afterEach(() => {
    if (prevPass === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = prevPass;
    if (prevSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = prevSecret;
  });

  it("does not import Node's crypto module", () => {
    const src = readFileSync(join(__dirname, "../../lib/admin/admin-session.ts"), "utf8");
    expect(src).not.toMatch(/from\s+["'](node:)?crypto["']/);
    expect(src).not.toMatch(/require\(\s*["'](node:)?crypto["']\s*\)/);
  });

  it("verifies tokens issued by the previous node:crypto implementation (existing sessions survive)", async () => {
    const payload = `v1.${Date.now() + 60_000}`;
    const legacy = `${payload}.${createHmac("sha256", SECRET).update(payload).digest("hex")}`;
    expect(await verifyAdminSessionToken(legacy)).toBe(true);
  });

  it("issues tokens byte-identical to the previous node:crypto format", async () => {
    const now = 1_700_000_000_000;
    const token = await createAdminSessionToken(now);
    const payload = `v1.${now + 8 * 60 * 60 * 1000}`;
    expect(token).toBe(`${payload}.${createHmac("sha256", SECRET).update(payload).digest("hex")}`);
  });

  it("rejects tampered, malformed and wrongly-keyed signatures", async () => {
    const token = await createAdminSessionToken();
    const [v, exp, sig] = token.split(".");
    const flipped = sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");
    expect(await verifyAdminSessionToken(`${v}.${exp}.${flipped}`)).toBe(false);
    expect(await verifyAdminSessionToken(`${v}.${Number(exp) + 1}.${sig}`)).toBe(false); // extended expiry
    expect(await verifyAdminSessionToken(`${v}.${exp}.${sig.slice(0, -2)}`)).toBe(false); // truncated
    expect(await verifyAdminSessionToken(`${v}.${exp}.${sig.slice(0, -1)}`)).toBe(false); // odd length
    expect(await verifyAdminSessionToken(`${v}.${exp}.${"z".repeat(sig.length)}`)).toBe(false); // non-hex
    expect(await verifyAdminSessionToken(`v2.${exp}.${sig}`)).toBe(false);
    const otherKey = createHmac("sha256", "different-secret").update(`${v}.${exp}`).digest("hex");
    expect(await verifyAdminSessionToken(`${v}.${exp}.${otherKey}`)).toBe(false);
  });

  it("fails closed when no secret is configured", async () => {
    const token = await createAdminSessionToken();
    delete process.env.ADMIN_SESSION_SECRET;
    delete process.env.ADMIN_PASSWORD;
    expect(await verifyAdminSessionToken(token)).toBe(false);
    await expect(createAdminSessionToken()).rejects.toThrow("ADMIN_PASSWORD or ADMIN_SESSION_SECRET required");
  });

  it("assertAdminCookie accepts only a validly signed session cookie", async () => {
    const token = await createAdminSessionToken();
    const withCookie = (value: string) =>
      new Request("https://kebu.africa/api/admin/record", { headers: { cookie: `other=1; ${ADMIN_SESSION_COOKIE}=${encodeURIComponent(value)}` } });
    expect(await assertAdminCookie(withCookie(token))).toBe(true);
    expect(await assertAdminCookie(withCookie(token.slice(0, -1) + (token.endsWith("0") ? "1" : "0")))).toBe(false);
    expect(await assertAdminCookie(new Request("https://kebu.africa/api/admin/record"))).toBe(false);
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
