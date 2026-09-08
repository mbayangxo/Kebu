import { describe, expect, it } from "vitest";
import {
  createContractSchema,
  createInvoiceSchema,
  sumInvoiceLines,
  defaultAgencyLaunchChecklist,
} from "@/lib/business/ops-docs";
import { portalModulesForCategory } from "@/lib/business/portal-modules";

describe("business ops docs", () => {
  it("sums invoice lines", () => {
    expect(
      sumInvoiceLines([
        { quantity: 2, unitAmountXof: 1000 },
        { quantity: 1, unitAmountXof: 500 },
      ]),
    ).toBe(2500);
  });

  it("validates invoice + contract create", () => {
    expect(
      createInvoiceSchema.safeParse({
        clientName: "Brand Co",
        lines: [{ description: "Campaign", quantity: 1, unitAmountXof: 200000 }],
      }).success,
    ).toBe(true);
    expect(
      createContractSchema.safeParse({
        title: "Talent agreement",
        counterpartyName: "Artist",
        bodyText: "Terms…",
      }).success,
    ).toBe(true);
  });

  it("has launch checklist defaults", () => {
    expect(defaultAgencyLaunchChecklist().length).toBeGreaterThan(3);
  });
});

describe("portal modules by category", () => {
  it("emphasizes shop for retail", () => {
    const ids = portalModulesForCategory("retail").map((m) => m.id);
    expect(ids).toContain("shop");
    expect(ids).toContain("launch");
  });

  it("emphasizes agency tools for services", () => {
    const ids = portalModulesForCategory("services").map((m) => m.id);
    expect(ids).toContain("events");
    expect(ids).toContain("invoices");
    expect(ids).toContain("contracts");
  });
});
