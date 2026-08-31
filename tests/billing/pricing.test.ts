import { describe, expect, it } from "vitest";
import {
  SITE_HOSTING_BILLING_LABEL,
  SITE_HOSTING_MONTHLY_USD,
  SITE_HOSTING_MONTHLY_USD_CENTS,
  formatUsdFromCents,
} from "@/lib/billing/pricing";
import { subscriptionPeriodEnd } from "@/lib/billing/subscriptions";

describe("site billing pricing", () => {
  it("uses $4 USD per month for live hosting", () => {
    expect(SITE_HOSTING_MONTHLY_USD).toBe(4);
    expect(SITE_HOSTING_MONTHLY_USD_CENTS).toBe(400);
    expect(SITE_HOSTING_BILLING_LABEL).toBe("$4/month");
  });

  it("formats USD from cents", () => {
    expect(formatUsdFromCents(400)).toBe("$4");
    expect(formatUsdFromCents(250)).toBe("$2.50");
  });

  it("adds 30-day hosting period", () => {
    const start = new Date("2026-08-30T00:00:00.000Z");
    const end = subscriptionPeriodEnd(start);
    expect(end).toBe("2026-09-29T00:00:00.000Z");
  });
});
