import { describe, it, expect } from "vitest";
import { companyActionSchema } from "@/lib/company/model";
import { payMinor, formatPay } from "@/lib/company/pay";
import { readCompanyJson } from "@/lib/company/read-request";
import { businessNamePattern } from "@/lib/business/name-research";
import { currentEmployerReview } from "@/lib/liguey/employer-safety";
describe("company input boundaries", () => {
  it("uses exact minor amounts for XOF/USD and rejects extra fractions or negative pay", () => {
    expect(payMinor("100000", "XOF")).toBe(100000);
    expect(payMinor("12.34", "USD")).toBe(1234);
    expect(() => payMinor("1.5", "XOF")).toThrow();
    expect(() => payMinor("-1", "USD")).toThrow();
    expect(() => payMinor("1.001", "USD")).toThrow();
    expect(formatPay(95000, "XOF")).toContain("95");
    expect(formatPay(100, "ZZZ")).toContain("minor units");
  });
  it("rejects a forged payroll total and invalid questions", () => {
    const common = {
      id: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      action: "statement_create",
      periodStart: "2026-11-01",
      periodEnd: "2026-11-15",
      currency: "XOF",
      grossMinor: 100,
      deductionsMinor: 10,
      netMinor: 1000,
    };
    expect(companyActionSchema.safeParse(common).success).toBe(false);
    expect(
      companyActionSchema.safeParse({
        action: "module_create",
        id: crypto.randomUUID(),
        title: "Safety",
        lesson: "Read this",
        passPercent: 80,
        quiz: [{ prompt: "Q", options: ["A", "B"], correctIndex: 5 }],
      }).success,
    ).toBe(false);
  });
  it("bounds JSON input and refuses malformed input", async () => {
    expect(
      await readCompanyJson(
        new Request("https://kebu.test", {
          method: "POST",
          body: '{"ok":true}',
        }),
      ),
    ).toEqual({ ok: true });
    expect(
      await readCompanyJson(
        new Request("https://kebu.test", {
          method: "POST",
          body: "X".repeat(100),
        }),
        20,
      ),
    ).toBeNull();
  });
  it("escapes wildcard name searches and never treats an expired review as approved", () => {
    expect(businessNamePattern("  100%_Co  ")).toBe("%100\\%\\_Co%");
    expect(
      currentEmployerReview({
        status: "approved",
        registry_checked: true,
        recruiter_checked: true,
        expires_at: "2020-01-01T00:00:00Z",
      }),
    ).toBe(false);
    expect(
      currentEmployerReview({
        status: "pending",
        registry_checked: true,
        recruiter_checked: true,
        expires_at: "2099-01-01T00:00:00Z",
      }),
    ).toBe(false);
  });
});
