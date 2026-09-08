import { describe, expect, it } from "vitest";
import { isValidNewPassword, NEW_PASSWORD_HINT } from "@/lib/auth/password-rules";

describe("password rules", () => {
  it("requires at least 8 characters", () => {
    expect(isValidNewPassword("short")).toBe(false);
    expect(isValidNewPassword("12345678")).toBe(true);
    expect(NEW_PASSWORD_HINT.toLowerCase()).toContain("8");
  });
});
