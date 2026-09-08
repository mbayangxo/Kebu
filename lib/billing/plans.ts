/**
 * Kebu subscription tiers — priced for African youth affordability.
 * Shop ($5) is the hero plan: website + store + hosting vs Shopify/Wix ~$29+.
 *
 * Capability grows with tier (not punishment for success).
 * Extra revenue later: transaction fees, domains, email, AI overage, templates.
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
    tagline: "Build before you pay.",
    monthlyUsd: 0,
    yearlyUsd: 0,
    whoFor: "Students, beginners, trying Kebu",
    highlights: [
      "1 website on a Kebu subdomain",
      "Visual editor + basic templates",
      "Limited AI website help",
      "Basic hosting + basic analytics",
      "Limited storage",
      "Kebu branding on your site",
    ],
    limits: {
      maxWebsites: 1,
      maxProducts: 0,
      maxStaff: 1,
      storageMb: 200,
      aiGenerationsPerMonth: 5,
      customDomain: false,
      kebuBranding: true,
      store: false,
      advancedAnalytics: false,
      prioritySupport: false,
    },
  },
  student: {
    id: "student",
    name: "Kebu Student",
    tagline: "$1/month to learn by building.",
    monthlyUsd: 1,
    yearlyUsd: 10,
    whoFor: "Verified students",
    highlights: [
      "Everything in Starter, student price",
      "More AI + learning-by-building",
      "Custom domain connection",
      "No Kebu branding",
      "Basic forms + analytics",
    ],
    limits: {
      maxWebsites: 1,
      maxProducts: 0,
      maxStaff: 1,
      storageMb: 1000,
      aiGenerationsPerMonth: 40,
      customDomain: true,
      kebuBranding: false,
      store: false,
      advancedAnalytics: false,
      prioritySupport: false,
    },
    comingSoonExtras: ["Student ID verification required before this price applies"],
  },
  starter: {
    id: "starter",
    name: "Kebu Starter",
    tagline: "Personal sites & creators.",
    monthlyUsd: 2,
    yearlyUsd: 20,
    whoFor: "Personal sites, creators, students",
    highlights: [
      "Custom domain connection",
      "No Kebu branding",
      "More AI generations",
      "Better templates + more storage",
      "1 website, basic forms",
      "Basic analytics + Kebu hosting",
    ],
    limits: {
      maxWebsites: 1,
      maxProducts: 0,
      maxStaff: 1,
      storageMb: 2000,
      aiGenerationsPerMonth: 30,
      customDomain: true,
      kebuBranding: false,
      store: false,
      advancedAnalytics: false,
      prioritySupport: false,
    },
  },
  shop: {
    id: "shop",
    name: "Kebu Shop",
    tagline: "Website + store + hosting + AI for $5.",
    monthlyUsd: 5,
    yearlyUsd: 50,
    hero: true,
    whoFor: "Small businesses actually selling",
    highlights: [
      "Everything in Starter, plus:",
      "Online store, products, inventory, orders",
      "Customers, coupons, sales analytics",
      "Payment integrations",
      "AI business assistant",
      "1–2 staff accounts",
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
    comingSoonExtras: [
      "Abandoned-cart + conversion analytics rolling out",
      "At maturity: Search presence · Reach · Opportunity OS · Cloud · Kebu ID bundle",
      "Small transparent transaction fee on sales (separate from subscription)",
    ],
  },
  business: {
    id: "business",
    name: "Kebu Business",
    tagline: "Growing businesses — more sites & team.",
    monthlyUsd: 10,
    yearlyUsd: 100,
    whoFor: "Growing businesses",
    highlights: [
      "Multiple websites",
      "Larger store + more products",
      "More staff seats",
      "Advanced analytics + marketing tools",
      "Advanced AI",
      "Domain management + better storage",
      "Priority support",
    ],
    limits: {
      maxWebsites: 5,
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
    comingSoonExtras: ["Business email integration", "Customer segmentation"],
  },
  pro: {
    id: "pro",
    name: "Kebu Pro",
    tagline: "For businesses that are making money.",
    monthlyUsd: 20,
    yearlyUsd: 200,
    whoFor: "Serious businesses / teams",
    highlights: [
      "Teams + multiple stores",
      "Advanced analytics + automation",
      "Highest AI limits",
      "API access",
      "Advanced commerce",
      "Highest storage + limits",
    ],
    limits: {
      maxWebsites: 20,
      maxProducts: 10000,
      maxStaff: 50,
      storageMb: 100000,
      aiGenerationsPerMonth: 1000,
      customDomain: true,
      kebuBranding: false,
      store: true,
      advancedAnalytics: true,
      prioritySupport: true,
    },
    comingSoonExtras: ["API access", "Advanced Cloud integration", "Automation"],
  },
};

/** Competitor e-commerce entry (marketing reference — Shopify/Wix ~$29+/mo). */
export const KEBU_COMPETITOR_ECOMMERCE_USD_MONTHLY = 29;

/** Marketing headline — not “cheaper than Shopify” alone. */
export const KEBU_PRICING_HEADLINE = "Everything you need to build your business.";

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

/** Marketing order on /pricing (student called out separately). */
export const KEBU_PRICING_PAGE_ORDER: KebuPlanId[] = ["free", "starter", "shop", "business", "pro"];

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
