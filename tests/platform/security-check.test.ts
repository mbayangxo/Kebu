import { describe, expect, it } from "vitest";
import { auditSecuritySecrets, isWeakOrPlaceholderSecret } from "@/lib/platform/security-check";

describe("isWeakOrPlaceholderSecret", () => {
  it("flags short values", () => expect(isWeakOrPlaceholderSecret("abc123")).toBe(true));
  it("flags common placeholder prefixes", () => {
    expect(isWeakOrPlaceholderSecret("change_me_in_production_please")).toBe(true);
    expect(isWeakOrPlaceholderSecret("your_api_key_goes_here_123456")).toBe(true);
    expect(isWeakOrPlaceholderSecret("example_secret_value_1234567890")).toBe(true);
  });
  it("accepts a long, non-placeholder value", () => {
    expect(isWeakOrPlaceholderSecret("a-long-randomly-generated-value-9f8a7b6c5d4e3f2a1b0c")).toBe(false);
  });
});

describe("auditSecuritySecrets", () => {
  it("reports every required secret missing from an empty env", () => {
    const result = auditSecuritySecrets({});
    expect(result.missingSecrets).toContain("WAVE_WEBHOOK_SECRET");
    expect(result.missingSecrets).toContain("PAYSTACK_SECRET_KEY");
    expect(result.missingSecrets).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(result.missingSecrets).toContain("ADMIN_PASSWORD");
    expect(result.missingSecrets).toContain("CRON_SECRET");
    expect(result.weakSecrets).toEqual([]);
  });

  it("separates weak/placeholder secrets from genuinely missing ones", () => {
    const result = auditSecuritySecrets({
      WAVE_WEBHOOK_SECRET: "change_me",
      PAYSTACK_SECRET_KEY: "a-long-randomly-generated-value-for-paystack-123",
      SUPABASE_SERVICE_ROLE_KEY: "a-long-randomly-generated-value-for-supabase-456",
      ADMIN_PASSWORD: "a-genuinely-strong-admin-password-value",
      // CRON_SECRET left undefined
    });
    expect(result.missingSecrets).toEqual(["CRON_SECRET"]);
    expect(result.weakSecrets).toEqual(["WAVE_WEBHOOK_SECRET"]);
  });

  it("reports clean when every secret is present and strong", () => {
    const strong = "a-sufficiently-long-and-non-placeholder-secret-value";
    const result = auditSecuritySecrets({
      WAVE_WEBHOOK_SECRET: strong,
      PAYSTACK_SECRET_KEY: strong,
      SUPABASE_SERVICE_ROLE_KEY: strong,
      ADMIN_PASSWORD: strong,
      CRON_SECRET: strong,
    });
    expect(result.missingSecrets).toEqual([]);
    expect(result.weakSecrets).toEqual([]);
  });
});
