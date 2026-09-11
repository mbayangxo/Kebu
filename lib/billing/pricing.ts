/**
 * Pricing helpers + legacy hosting aliases.
 * Source of truth for product tiers: `./plans`.
 */
import {
  getKebuPlan,
  planLabel,
  planMonthlyCents,
  planYearlyCents,
  type KebuPlanId,
} from "./plans";

export {
  KEBU_PLANS,
  KEBU_PLAN_IDS,
  KEBU_PLAN_ORDER,
  KEBU_PRICING_PAGE_ORDER,
  KEBU_PAID_PLAN_IDS,
  KEBU_COMPETITOR_ECOMMERCE_USD_MONTHLY,
  KEBU_PRICING_HEADLINE,
  KEBU_ADDITIONAL_REVENUE_STREAMS,
  getKebuPlan,
  parseKebuPlanId,
  planLabel,
  planMonthlyCents,
  planYearlyCents,
  planRequiresPayment,
  tierAllowsCustomDomain,
  tierAllowsStore,
  planAtLeast,
  type KebuPlanId,
  type KebuPlan,
} from "./plans";

/** @deprecated Prefer getKebuPlan("shop") — Shop is the hero paid plan. */
export const SITE_HOSTING_MONTHLY_USD = 5;

/** @deprecated */
export const SITE_HOSTING_MONTHLY_USD_CENTS = SITE_HOSTING_MONTHLY_USD * 100;

/** @deprecated Prefer yearly on a specific tier. */
export const SITE_HOSTING_YEARLY_USD = 50;

/** @deprecated */
export const SITE_HOSTING_YEARLY_USD_CENTS = SITE_HOSTING_YEARLY_USD * 100;

export const SITE_HOSTING_BILLING_LABEL = planLabel("shop");

export const SITE_HOSTING_YEARLY_BILLING_LABEL = `$${getKebuPlan("shop").yearlyUsd}/year`;

export const SITE_HOSTING_DESCRIPTION =
  "Start free — 4 sites + shop included. Add a custom domain for $2/site/month (Starter) or $5/site/month (Business). Pay with JOKO, Wave, or Orange Money. Far less than Shopify/Wix at ~$29+/month.";

export const SITE_HOSTING_AUTOPAY_DESCRIPTION =
  "Turn on autopay and Kebu bills your plan every month before it ends. " +
  "First payment is with JOKO; later we charge automatically when your wallet supports it, or we send a pay link so your site stays online.";

/** Typical domain registration cost when buying through a registrar / Kebu Domains later. */
export const KEBU_DOMAIN_YEARLY_USD_FROM = 5;

export const KEBU_DOMAIN_YEARLY_LABEL = `from $${KEBU_DOMAIN_YEARLY_USD_FROM}/year`;

export const KEBU_DOMAIN_DESCRIPTION =
  "Buy a .com (or similar) for about $" +
  KEBU_DOMAIN_YEARLY_USD_FROM +
  "+/year depending on the name. Connecting a domain you already own is included from Starter up — purchase-in-Kebu checkout is still rolling out.";

/** Planned Kebu Mail add-on — not provisioned yet; UI must stay honest until backend ships. */
export const BUSINESS_EMAIL_YEARLY_USD = 12;

export const BUSINESS_EMAIL_YEARLY_LABEL = `$${BUSINESS_EMAIL_YEARLY_USD}/year`;

export const BUSINESS_EMAIL_DESCRIPTION =
  "Professional email on your domain (e.g. hello@yourbrand.com). Provisioning is not live yet — join the waitlist when we open it.";

export function formatUsdFromCents(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function amountCentsForTierSubscription(
  tier: KebuPlanId,
  interval: "monthly" | "yearly" = "monthly",
): number {
  return interval === "yearly" ? planYearlyCents(tier) : planMonthlyCents(tier);
}
