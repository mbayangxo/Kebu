import { describe, expect, it } from "vitest";
import {
  SITE_HOSTING_BILLING_LABEL,
  SITE_HOSTING_MONTHLY_USD,
  SITE_HOSTING_MONTHLY_USD_CENTS,
  SITE_HOSTING_YEARLY_BILLING_LABEL,
  SITE_HOSTING_YEARLY_USD,
  KEBU_DOMAIN_YEARLY_USD_FROM,
  formatUsdFromCents,
} from "@/lib/billing/pricing";
import { subscriptionPeriodEnd } from "@/lib/billing/subscriptions";

describe("site billing pricing", () => {
  it("uses $3/month or $27/year for live hosting", () => {
    expect(SITE_HOSTING_MONTHLY_USD).toBe(3);
    expect(SITE_HOSTING_MONTHLY_USD_CENTS).toBe(300);
    expect(SITE_HOSTING_BILLING_LABEL).toBe("$3/month");
    expect(SITE_HOSTING_YEARLY_USD).toBe(27);
    expect(SITE_HOSTING_YEARLY_BILLING_LABEL).toBe("$27/year");
    expect(KEBU_DOMAIN_YEARLY_USD_FROM).toBe(5);
  });

  it("formats USD from cents", () => {
    expect(formatUsdFromCents(300)).toBe("$3");
    expect(formatUsdFromCents(250)).toBe("$2.50");
  });

  it("adds 30-day hosting period for monthly", () => {
    const start = new Date("2026-08-30T00:00:00.000Z");
    const end = subscriptionPeriodEnd(start, "monthly");
    expect(end).toBe("2026-09-29T00:00:00.000Z");
  });

  it("adds 1-year hosting period for yearly", () => {
    const start = new Date("2026-08-30T00:00:00.000Z");
    const end = subscriptionPeriodEnd(start, "yearly");
    expect(end).toBe("2027-08-30T00:00:00.000Z");
  });
});
