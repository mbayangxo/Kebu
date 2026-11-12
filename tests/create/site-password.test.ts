import { afterEach, describe, expect, it } from "vitest";
import {
  hashSitePassword,
  signSitePasswordSession,
  sitePasswordSecret,
  verifySitePassword,
  verifySitePasswordSession,
} from "@/lib/create/site-password";

const SECRET = "test-secret-with-at-least-thirty-two-characters";

describe("site password security", () => {
  afterEach(() => {
    delete process.env.NEXTAUTH_SECRET;
  });

  it("fails closed when the signing secret is absent or weak", () => {
    expect(sitePasswordSecret()).toBeNull();
    process.env.NEXTAUTH_SECRET = "too-short";
    expect(sitePasswordSecret()).toBeNull();
  });

  it("hashes and verifies passwords with scrypt", () => {
    const storedHash = hashSitePassword("maylecor", "strong-password", SECRET);
    expect(storedHash).toMatch(/^scrypt\$v1\$/);
    expect(
      verifySitePassword({
        subdomain: "maylecor",
        password: "strong-password",
        storedHash,
        secret: SECRET,
      }),
    ).toEqual({ ok: true, needsUpgrade: false });
    expect(
      verifySitePassword({
        subdomain: "maylecor",
        password: "wrong",
        storedHash,
        secret: SECRET,
      }).ok,
    ).toBe(false);
  });

  it("signs, scopes, and expires a site session", () => {
    const expiresAt = 2_000_000;
    const token = signSitePasswordSession("maylecor", expiresAt, SECRET);
    expect(verifySitePasswordSession("maylecor", token, SECRET, expiresAt - 1)).toBe(true);
    expect(verifySitePasswordSession("other", token, SECRET, expiresAt - 1)).toBe(false);
    expect(verifySitePasswordSession("maylecor", token, SECRET, expiresAt + 1)).toBe(false);
  });
});
