import { describe, expect, it } from "vitest";
import { isEmailNotConfirmed } from "@/lib/auth/email-confirm";

describe("isEmailNotConfirmed", () => {
  it("detects Supabase message variants", () => {
    expect(isEmailNotConfirmed("Email not confirmed")).toBe(true);
    expect(isEmailNotConfirmed("email_not_confirmed")).toBe(true);
    expect(isEmailNotConfirmed("Invalid login credentials")).toBe(false);
  });
});
