import { describe, expect, it } from "vitest";
import * as server from "@/lib/supabase/key-role";
import * as browser from "@/lib/supabase/key-role-browser";

const legacyKey = (role: string) => `header.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;

for (const [name, helpers] of Object.entries({ server, browser })) {
  describe(`${name} Supabase configuration`, () => {
    it("accepts a publishable key for signup", () => {
      expect(helpers.supabaseKeyRole("sb_publishable_test_only_123")).toBe("anon");
      expect(helpers.browserSupabaseMisconfigMessage(helpers.supabaseKeyRole("sb_publishable_test_only_123"))).toBeNull();
    });
    it("identifies secret keys and rejects them in public configuration", () => {
      const role = helpers.supabaseKeyRole("sb_secret_test_only_123");
      expect(role).toBe("service_role");
      expect(helpers.browserSupabaseMisconfigMessage(role)).toBeTruthy();
    });
    it("retains legacy key compatibility", () => {
      expect(helpers.supabaseKeyRole(legacyKey("anon"))).toBe("anon");
      expect(helpers.supabaseKeyRole(legacyKey("service_role"))).toBe("service_role");
      expect(helpers.supabaseKeyRole(legacyKey("authenticated"))).toBe("invalid");
    });
    it("fails closed for missing and malformed keys", () => {
      expect(helpers.supabaseKeyRole(undefined)).toBe("missing");
      expect(helpers.supabaseKeyRole("placeholder")).toBe("missing");
      for (const key of ["sb_publishable_", "sb_secret_", "sb_publishable_bad key", "random", "a.b.c"]) {
        expect(helpers.supabaseKeyRole(key)).toBe("invalid");
      }
    });
  });
}
