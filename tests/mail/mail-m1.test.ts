import { describe, expect, it } from "vitest";
import { normalizeMailboxLocalPart, personalMailboxCandidates } from "@/lib/mail/address";

describe("Kebu Mail M1", () => {
  it("normalizes a safe personal mailbox local part", () => {
    expect(normalizeMailboxLocalPart("May Lècor Diallo")).toBe("may.lecor.diallo");
  });

  it("generates deterministic mailbox candidates with a collision fallback", () => {
    const candidates = personalMailboxCandidates({
      name: "May Diallo",
      email: "may@example.com",
      userId: "12345678-abcd-ef00-1234-56789abcdef0",
    });
    expect(candidates[0]).toMatch(/^may\.diallo@/);
    expect(new Set(candidates).size).toBe(candidates.length);
  });
});
