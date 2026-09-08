import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { isBillingExemptEmail } from "@/lib/billing/exempt";
import {
  billingDevBypassEnabled,
  getActiveSiteSubscription,
  getLatestSiteSubscription,
  projectHasLiveHosting,
  subscriptionTierId,
} from "@/lib/billing/subscriptions";
import {
  SITE_HOSTING_AUTOPAY_DESCRIPTION,
  SITE_HOSTING_DESCRIPTION,
  KEBU_PLANS,
  KEBU_PRICING_PAGE_ORDER,
  getKebuPlan,
  planLabel,
} from "@/lib/billing/pricing";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Billing status for a website project (JOKO monthly hosting). */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, title, status, subdomain")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const exempt = isBillingExemptEmail(user.email);
  const active = await getActiveSiteSubscription(supabase, id, user.id);
  const latest = await getLatestSiteSubscription(supabase, id, user.id);
  const canPublish = await projectHasLiveHosting(supabase, id, user.id, user.email);
  const tier = subscriptionTierId(active ?? latest);
  const tierPlan = getKebuPlan(tier);

  return NextResponse.json({
    projectId: id,
    provider: "joko",
    heroTier: "shop",
    monthlyUsd: tierPlan.monthlyUsd,
    yearlyUsd: tierPlan.yearlyUsd,
    label: planLabel(tier === "free" ? "shop" : tier),
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
    devBypass: billingDevBypassEnabled(),
    billingExempt: exempt,
    canPublish,
    subscription: active
      ? {
          id: active.id,
          status: active.status,
          tier,
          plan: active.billing_interval ?? active.plan ?? "monthly",
          periodEnd: active.period_end,
          amountUsdCents: active.amount_usd_cents,
          autopayEnabled: Boolean(active.autopay_enabled),
          nextBillingAt: active.next_billing_at ?? active.period_end,
        }
      : latest
        ? {
            id: latest.id,
            status: latest.status,
            tier: subscriptionTierId(latest),
            plan: latest.billing_interval ?? latest.plan ?? "monthly",
            periodEnd: latest.period_end,
            amountUsdCents: latest.amount_usd_cents,
            autopayEnabled: Boolean(latest.autopay_enabled),
            nextBillingAt: latest.next_billing_at,
            pendingCheckoutUrl: latest.pending_checkout_url,
          }
        : null,
  });
}

/** Toggle autopay on the latest/active subscription for this site. */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  if (isBillingExemptEmail(user.email)) {
    return NextResponse.json({
      ok: true,
      billingExempt: true,
      autopayEnabled: false,
      message: "Your account does not pay for hosting — autopay is not needed.",
    });
  }

  const body = (await req.json().catch(() => ({}))) as { autopayEnabled?: boolean };
  if (typeof body.autopayEnabled !== "boolean") {
    return NextResponse.json({ error: "autopayEnabled (true/false) is required." }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const latest = await getLatestSiteSubscription(supabase, id, user.id);
  if (!latest) {
    return NextResponse.json(
      { error: "Pay for hosting once first, then you can turn on autopay." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("site_subscriptions")
    .update({
      autopay_enabled: body.autopayEnabled,
      autopay_consent_at: body.autopayEnabled ? now : null,
      updated_at: now,
    })
    .eq("id", latest.id)
    .eq("owner_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Could not update autopay. Apply migration 035 if columns are missing.", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    autopayEnabled: body.autopayEnabled,
    subscriptionId: latest.id,
  });
}
