import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { isBillingExemptEmail } from "@/lib/billing/exempt";
import {
  SITE_HOSTING_AUTOPAY_DESCRIPTION,
  SITE_HOSTING_DESCRIPTION,
  KEBU_PLANS,
  KEBU_PRICING_PAGE_ORDER,
  planLabel,
} from "@/lib/billing/pricing";
import {
  getLatestSiteSubscription,
  projectHasLiveHosting,
  subscriptionTierId,
} from "@/lib/billing/subscriptions";

export const dynamic = "force-dynamic";

/** Account-level hosting summary for all of the user's sites. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const exempt = isBillingExemptEmail(user.email);

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, title, subdomain, status, updated_at")
    .eq("owner_id", user.id)
    .eq("project_type", "website")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sites = [];
  for (const p of projects ?? []) {
    const canPublish = await projectHasLiveHosting(supabase, p.id, user.id, user.email);
    const latest = await getLatestSiteSubscription(supabase, p.id, user.id);
    const tier = subscriptionTierId(latest);
    sites.push({
      projectId: p.id,
      title: p.title,
      subdomain: p.subdomain,
      status: p.status,
      canPublish,
      subscription: latest
        ? {
            status: latest.status,
            tier,
            plan: latest.billing_interval ?? latest.plan ?? "monthly",
            periodEnd: latest.period_end,
            autopayEnabled: Boolean(latest.autopay_enabled),
            pendingCheckoutUrl: latest.pending_checkout_url,
          }
        : null,
    });
  }

  return NextResponse.json({
    billingExempt: exempt,
    heroTier: "shop",
    monthlyUsd: KEBU_PLANS.shop.monthlyUsd,
    label: planLabel("shop"),
    description: SITE_HOSTING_DESCRIPTION,
    autopayDescription: SITE_HOSTING_AUTOPAY_DESCRIPTION,
    plans: KEBU_PRICING_PAGE_ORDER.map((pid) => {
      const p = KEBU_PLANS[pid];
      return {
        id: p.id,
        name: p.name,
        monthlyUsd: p.monthlyUsd,
        yearlyUsd: p.yearlyUsd,
        hero: Boolean(p.hero),
        whoFor: p.whoFor,
        tagline: p.tagline,
      };
    }),
    studentPlan: {
      id: KEBU_PLANS.student.id,
      name: KEBU_PLANS.student.name,
      monthlyUsd: KEBU_PLANS.student.monthlyUsd,
      tagline: KEBU_PLANS.student.tagline,
    },
    message: exempt
      ? "Your account does not pay for site hosting."
      : "Start free — 4 sites + shop included. Add a custom domain for $2/site/month (Starter) or $5/site/month (Business). Autopay keeps paid sites live.",
    sites,
  });
}
