import { describe, expect, it } from "vitest";
import {
  isSupportAdminEmail,
  parseSupportAdminEmails,
} from "@/lib/create/support-access";

describe("support-access", () => {
  it("parses comma-separated emails", () => {
    expect(parseSupportAdminEmails("a@kebu.africa, B@Kebu.Africa ;c@x.com")).toEqual([
      "a@kebu.africa",
      "b@kebu.africa",
      "c@x.com",
    ]);
  });

  it("returns empty when unset", () => {
    expect(parseSupportAdminEmails("")).toEqual([]);
    expect(parseSupportAdminEmails(undefined)).toEqual([]);
  });

  it("matches allowlist case-insensitively", () => {
    const prev = process.env.KEBU_SUPPORT_ADMIN_EMAILS;
    process.env.KEBU_SUPPORT_ADMIN_EMAILS = "help@kebu.africa";
    expect(isSupportAdminEmail("HELP@kebu.africa")).toBe(true);
    expect(isSupportAdminEmail("random@example.com")).toBe(false);
    expect(isSupportAdminEmail(null)).toBe(false);
    process.env.KEBU_SUPPORT_ADMIN_EMAILS = prev;
  });
});
