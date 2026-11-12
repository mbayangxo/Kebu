import { describe, expect, it } from "vitest";
import { builderAuthCookies } from "./e2e-auth-cookies";
describe("actual Supabase cookies for authenticated Builder acceptance", () => {
  const origin = "https://isolated-qa.example.test";
  it("preserves actual cookie names and encoded equals signs, excluding unrelated cookies", () => {
    expect(builderAuthCookies("theme=dark; sb-fixture-auth-token=base64-fixture==", origin)).toEqual([
      { name: "sb-fixture-auth-token", value: "base64-fixture==", url: origin, secure: true, sameSite: "Lax" },
    ]);
  });
  it("retains every complete session chunk", () => {
    expect(builderAuthCookies("Cookie: sb-fixture-auth-token.1=part-two; sb-fixture-auth-token.0=part-one", origin).map(cookie => cookie.name))
      .toEqual(["sb-fixture-auth-token.1", "sb-fixture-auth-token.0"]);
  });
  it.each(["fixture-opaque-token", "session=fixture-token", "sb-fixture-auth-token=", "sb-fixture-auth-token.1=missing-first", "sb-fixture-auth-token=x; sb-fixture-auth-token.0=y", "sb-fixture-auth-token=x; sb-fixture-auth-token=y", "sb-first-auth-token=x; sb-second-auth-token=y", "sb-fixture-auth-token=x; HttpOnly", "sb-fixture-auth-token=x\r\nInjected: y"])("rejects malformed or ambiguous session input without echoing its contents", header => {
    expect(() => builderAuthCookies(header, origin)).toThrow();
    try { builderAuthCookies(header, origin); } catch (error) { expect((error as Error).message).not.toContain(header); }
  });
  it.each(["http://remote.example.test", "https://user:password@qa.example.test", "https://qa.example.test/?token=private", "file:///tmp/qa", "not-an-origin"])("rejects an unsafe QA destination %s", url => {
    expect(() => builderAuthCookies("sb-fixture-auth-token=fixture", url)).toThrow();
  });
  it("permits loopback HTTP development without marking the cookie secure", () => {
    expect(builderAuthCookies("sb-fixture-auth-token=fixture", "http://127.0.0.1:38415")[0].secure).toBe(false);
  });
});
