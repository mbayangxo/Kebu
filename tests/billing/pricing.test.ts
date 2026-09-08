import { describe, expect, it } from "vitest";
import {
  SITE_HOSTING_BILLING_LABEL,
  SITE_HOSTING_MONTHLY_USD,
  SITE_HOSTING_MONTHLY_USD_CENTS,
  SITE_HOSTING_YEARLY_BILLING_LABEL,
  SITE_HOSTING_YEARLY_USD,
  KEBU_COMPETITOR_ECOMMERCE_USD_MONTHLY,
  KEBU_DOMAIN_YEARLY_USD_FROM,
  KEBU_PLANS,
  KEBU_PRICING_HEADLINE,
  formatUsdFromCents,
  parseKebuPlanId,
  planLabel,
  planRequiresPayment,
} from "@/lib/billing/pricing";
import {
  extendPeriodEnd,
  isWithinAutopayWindow,
  parseHostingPlan,
  subscriptionPeriodEnd,
} from "@/lib/billing/subscriptions";
import { isBillingExemptEmail } from "@/lib/billing/exempt";
import { FOUNDER_PORTFOLIO_OWNER_EMAILS } from "@/lib/create/portfolio-owner";

describe("site billing pricing", () => {
  it("uses Shop $5/month as the hero paid plan alias", () => {
    expect(SITE_HOSTING_MONTHLY_USD).toBe(5);
    expect(SITE_HOSTING_MONTHLY_USD_CENTS).toBe(500);
    expect(SITE_HOSTING_BILLING_LABEL).toBe("$5/month");
    expect(SITE_HOSTING_YEARLY_USD).toBe(50);
    expect(SITE_HOSTING_YEARLY_BILLING_LABEL).toBe("$50/year");
    expect(KEBU_DOMAIN_YEARLY_USD_FROM).toBe(5);
  });

  it("exposes Free → Pro catalog with Shop as hero", () => {
    expect(KEBU_PLANS.free.monthlyUsd).toBe(0);
    expect(KEBU_PLANS.starter.monthlyUsd).toBe(2);
    expect(KEBU_PLANS.shop.monthlyUsd).toBe(5);
    expect(KEBU_PLANS.shop.hero).toBe(true);
    expect(KEBU_PLANS.business.monthlyUsd).toBe(10);
    expect(KEBU_PLANS.pro.monthlyUsd).toBe(20);
    expect(KEBU_PLANS.student.monthlyUsd).toBe(1);
  });

  it("exposes pricing headline and competitor reference", () => {
    expect(KEBU_PRICING_HEADLINE).toContain("build your business");
    expect(KEBU_COMPETITOR_ECOMMERCE_USD_MONTHLY).toBe(29);
  });

  it("parses plan ids and labels", () => {
    expect(parseKebuPlanId("shop")).toBe("shop");
    expect(parseKebuPlanId("nope")).toBe("free");
    expect(planLabel("free")).toBe("Free");
    expect(planLabel("starter")).toBe("$2/month");
    expect(planRequiresPayment("free")).toBe(false);
    expect(planRequiresPayment("shop")).toBe(true);
  });

  it("formats USD from cents", () => {
    expect(formatUsdFromCents(500)).toBe("$5");
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

describe("monthly renew + autopay helpers", () => {
  it("parses hosting plan", () => {
    expect(parseHostingPlan("yearly")).toBe("yearly");
    expect(parseHostingPlan("monthly")).toBe("monthly");
    expect(parseHostingPlan("nope")).toBe("monthly");
  });

  it("extends from remaining paid time when renewing early", () => {
    const currentEnd = "2026-10-15T00:00:00.000Z";
    const now = new Date("2026-10-01T00:00:00.000Z");
    expect(extendPeriodEnd(currentEnd, "monthly", now)).toBe("2026-11-14T00:00:00.000Z");
  });

  it("opens autopay window in the last 5 days", () => {
    const now = new Date("2026-10-10T00:00:00.000Z");
    expect(isWithinAutopayWindow("2026-10-12T00:00:00.000Z", now)).toBe(true);
    expect(isWithinAutopayWindow("2026-11-01T00:00:00.000Z", now)).toBe(false);
  });

  it("treats founder portfolio email as billing-exempt", () => {
    expect(isBillingExemptEmail(FOUNDER_PORTFOLIO_OWNER_EMAILS[0])).toBe(true);
    expect(isBillingExemptEmail("random-user@example.com")).toBe(false);
  });
});
