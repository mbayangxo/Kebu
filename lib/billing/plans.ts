/**
 * Kebu subscription tiers — priced for African youth affordability.
 *
 * Model: per-site pricing for paid tiers (not a flat account fee).
 * Free includes shop + 4 sites on kebu subdomain — monetised via transaction fees.
 * Upgrading adds custom domain + more features at $2/site/mo (up to 5 sites).
 * Business tier is $5/site/mo (up to 10 sites).
 * Student is a $1 flat-rate that unlocks all Kebu products.
 *
 * Revenue: transaction fees on all tiers, custom domain upsell, AI overage.
 */

export const KEBU_PLAN_IDS = ["free", "starter", "shop", "business", "pro", "student"] as const;
export type KebuPlanId = (typeof KEBU_PLAN_IDS)[number];

export type KebuPlanLimits = {
  maxWebsites: number;
  maxProducts: number;
  maxStaff: number;
  storageMb: number;
  aiGenerationsPerMonth: number;
  customDomain: boolean;
  kebuBranding: boolean;
  store: boolean;
  advancedAnalytics: boolean;
  prioritySupport: boolean;
};

export type KebuPlan = {
  id: KebuPlanId;
  name: string;
  tagline: string;
  monthlyUsd: number;
  /** Annual billed monthly-equivalent discount (full year price). */
  yearlyUsd: number;
  /**
   * For per-site tiers (starter, shop/legacy, business): price is charged per active
   * site, not as a flat account fee. monthlyUsd is the per-site rate.
   */
  perSite?: boolean;
  hero?: boolean;
  whoFor: string;
  highlights: string[];
  limits: KebuPlanLimits;
  /** Shown on pricing but may not be fully enforced yet — label honestly in UI. */
  comingSoonExtras?: string[];
};

export const KEBU_PLANS: Record<KebuPlanId, KebuPlan> = {
  free: {
    id: "free",
    name: "Kebu Free",
    tagline: "Build, sell, grow — before you pay anything.",
    monthlyUsd: 0,
    yearlyUsd: 0,
    whoFor: "Anyone starting out in Africa",
    highlights: [
      "Up to 4 sites on your Kebu subdomain",
      "Online shop included — sell from day one",
      "Visual editor, templates, Studio, Opportunity OS",
      "Kebu hosting + basic analytics",
      "Small transaction fee on shop sales",
      "Kebu branding on your sites",
    ],
    limits: {
      maxWebsites: 4,
      maxProducts: 50,
      maxStaff: 1,
      storageMb: 500,
      aiGenerationsPerMonth: 10,
      customDomain: false,
      kebuBranding: true,
      store: true,
      advancedAnalytics: false,
      prioritySupport: false,
    },
  },
  student: {
    id: "student",
    name: "Kebu Student",
    tagline: "$1/month — every Kebu product, student price.",
    monthlyUsd: 1,
    yearlyUsd: 10,
    whoFor: "Verified students & school cohorts",
    highlights: [
      "3 sites on custom domain",
      "Shop + Studio + Opportunity OS",
      "Yande Code (AI coding environment)",
      "No Kebu branding",
      "All upcoming products at no extra cost",
      "Account stays after graduation",
    ],
    limits: {
      maxWebsites: 3,
      maxProducts: 100,
      maxStaff: 1,
      storageMb: 2000,
      aiGenerationsPerMonth: 60,
      customDomain: true,
      kebuBranding: false,
      store: true,
      advancedAnalytics: false,
      prioritySupport: false,
    },
    comingSoonExtras: [
      "Yande Code access (in development)",
      "Student ID verification required for this price",
    ],
  },
  starter: {
    id: "starter",
    name: "Kebu Starter",
    tagline: "$2/site/month — your own domain, no Kebu branding.",
    monthlyUsd: 2,
    yearlyUsd: 20,
    perSite: true,
    hero: true,
    whoFor: "Creators, freelancers, small hustlers upgrading a site",
    highlights: [
      "Custom domain on each upgraded site",
      "No Kebu branding",
      "More AI generations",
      "More storage + better templates",
      "Shop included on every site",
      "Up to 5 upgraded sites total",
    ],
    limits: {
      maxWebsites: 5,
      maxProducts: 200,
      maxStaff: 2,
      storageMb: 3000,
      aiGenerationsPerMonth: 50,
      customDomain: true,
      kebuBranding: false,
      store: true,
      advancedAnalytics: false,
      prioritySupport: false,
    },
  },
  // Legacy plan — users who signed up before per-site model. Kept for backwards compat.
  shop: {
    id: "shop",
    name: "Kebu Shop (Legacy)",
    tagline: "Legacy plan — see Starter or Business.",
    monthlyUsd: 5,
    yearlyUsd: 50,
    whoFor: "Existing Kebu Shop subscribers",
    highlights: [
      "1 site + shop on a custom domain",
      "No Kebu branding",
      "AI business assistant",
      "Sales analytics + payment integrations",
    ],
    limits: {
      maxWebsites: 1,
      maxProducts: 100,
      maxStaff: 2,
      storageMb: 5000,
      aiGenerationsPerMonth: 80,
      customDomain: true,
      kebuBranding: false,
      store: true,
      advancedAnalytics: true,
      prioritySupport: false,
    },
  },
  business: {
    id: "business",
    name: "Kebu Business",
    tagline: "$5/site/month — more features, up to 10 sites.",
    monthlyUsd: 5,
    yearlyUsd: 50,
    perSite: true,
    whoFor: "Growing businesses managing multiple sites or brands",
    highlights: [
      "Up to 10 custom-domain sites",
      "Advanced analytics + marketing tools",
      "More staff seats + team management",
      "Brand DNA auto-apply across all sites",
      "Advanced AI + priority support",
      "B2B directory featured listing",
    ],
    limits: {
      maxWebsites: 10,
      maxProducts: 1000,
      maxStaff: 10,
      storageMb: 20000,
      aiGenerationsPerMonth: 200,
      customDomain: true,
      kebuBranding: false,
      store: true,
      advancedAnalytics: true,
      prioritySupport: true,
    },
    comingSoonExtras: ["Business email integration", "Customer segmentation", "API access"],
  },
  pro: {
    id: "pro",
    name: "Kebu Pro",
    tagline: "Enterprise — contact us for volume pricing.",
    monthlyUsd: 0,
    yearlyUsd: 0,
    whoFor: "Large businesses, agencies, schools, organizations",
    highlights: [
      "Unlimited sites — volume pricing",
      "White-label option",
      "Dedicated account manager",
      "SLA-backed support + onboarding",
      "API access + custom integrations",
      "For Schools & Organizations pricing available",
    ],
    limits: {
      maxWebsites: 999,
      maxProducts: 10000,
      maxStaff: 999,
      storageMb: 100000,
      aiGenerationsPerMonth: 2000,
      customDomain: true,
      kebuBranding: false,
      store: true,
      advancedAnalytics: true,
      prioritySupport: true,
    },
    comingSoonExtras: ["API access", "White-label", "Custom integrations"],
  },
};

/** Competitor e-commerce entry (marketing reference — Shopify/Wix ~$29+/mo). */
export const KEBU_COMPETITOR_ECOMMERCE_USD_MONTHLY = 29;

/** Marketing headline. */
export const KEBU_PRICING_HEADLINE = “Build free. Pay per site when you're ready.”;

/** Additional revenue beyond subscription (document targets; enforce per slice). */
export const KEBU_ADDITIONAL_REVENUE_STREAMS = [
  "transaction_fee",
  "domain",
  "business_email",
  "ai_overage",
  "premium_templates",
  "reach",
  "cloud_usage",
] as const;

export const KEBU_PAID_PLAN_IDS = ["student", "starter", "shop", "business", "pro"] as const;

export const KEBU_PLAN_ORDER: KebuPlanId[] = ["free", "student", "starter", "shop", "business", "pro"];

/** Marketing order on /pricing — show student in context of free to explain value. */
export const KEBU_PRICING_PAGE_ORDER: KebuPlanId[] = ["free", "student", "starter", "business", "pro"];

export function parseKebuPlanId(raw: unknown): KebuPlanId {
  if (typeof raw === "string" && (KEBU_PLAN_IDS as readonly string[]).includes(raw)) {
    return raw as KebuPlanId;
  }
  return "free";
}

export function getKebuPlan(id: KebuPlanId | string | null | undefined): KebuPlan {
  return KEBU_PLANS[parseKebuPlanId(id)];
}

export function planMonthlyCents(id: KebuPlanId): number {
  return Math.round(getKebuPlan(id).monthlyUsd * 100);
}

export function planYearlyCents(id: KebuPlanId): number {
  return Math.round(getKebuPlan(id).yearlyUsd * 100);
}

export function planLabel(id: KebuPlanId): string {
  const p = getKebuPlan(id);
  if (p.monthlyUsd === 0) return "Free";
  return `$${p.monthlyUsd}/month`;
}

export function planRequiresPayment(id: KebuPlanId): boolean {
  return getKebuPlan(id).monthlyUsd > 0;
}

/** Minimum tier that unlocks a live custom domain. */
export function tierAllowsCustomDomain(id: KebuPlanId): boolean {
  return getKebuPlan(id).limits.customDomain;
}

export function tierAllowsStore(id: KebuPlanId): boolean {
  return getKebuPlan(id).limits.store;
}

export function comparePlanRank(a: KebuPlanId, b: KebuPlanId): number {
  return KEBU_PLAN_ORDER.indexOf(a) - KEBU_PLAN_ORDER.indexOf(b);
}

export function planAtLeast(current: KebuPlanId, required: KebuPlanId): boolean {
  return comparePlanRank(current, required) >= 0;
}
