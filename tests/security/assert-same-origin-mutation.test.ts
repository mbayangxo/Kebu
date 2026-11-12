/**
 * Behavioral proof that adding security-event logging to
 * assertSameOriginMutation did not change its return-value contract (100+
 * routes call `if (csrf) return csrf;` on it) and that the logging call
 * never throws, even with no Supabase env configured.
 */
import { describe, expect, it } from "vitest";
import { assertSameOriginMutation } from "@/lib/admin/assert-admin-cookie";

function req(opts: { method?: string; origin?: string | null; host?: string }): Request {
  const headers = new Headers();
  if (opts.origin !== null) headers.set("origin", opts.origin ?? "https://kebu.app");
  headers.set("host", opts.host ?? "kebu.app");
  return new Request("https://kebu.app/api/me/profile", { method: opts.method ?? "POST", headers });
}

describe("assertSameOriginMutation", () => {
  it("allows GET/HEAD/OPTIONS unconditionally", () => {
    expect(assertSameOriginMutation(req({ method: "GET" }))).toBeNull();
    expect(assertSameOriginMutation(req({ method: "HEAD" }))).toBeNull();
    expect(assertSameOriginMutation(req({ method: "OPTIONS" }))).toBeNull();
  });

  it("allows a same-origin POST", () => {
    expect(assertSameOriginMutation(req({ origin: "https://kebu.app", host: "kebu.app" }))).toBeNull();
  });

  it("allows a POST with no Origin header (non-browser / same-origin form posts)", () => {
    expect(assertSameOriginMutation(req({ origin: null }))).toBeNull();
  });

  it("rejects a cross-origin POST with 403, and does not throw while logging it", () => {
    const res = assertSameOriginMutation(req({ origin: "https://evil.example", host: "kebu.app" }));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });
});
