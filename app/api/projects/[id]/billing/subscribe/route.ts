import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireUser, logCreate } from "@/lib/create/auth";
import { isBillingExemptEmail } from "@/lib/billing/exempt";
import {
  defaultHostingAmountCents,
  describeTierForCheckout,
  ensureFreeHostingEntitlement,
  getActiveSiteSubscription,
  getLatestSiteSubscription,
  isWithinAutopayWindow,
  parseHostingPlan,
  subscriptionPeriodEnd,
  subscriptionTierId,
} from "@/lib/billing/subscriptions";
import {
  SITE_HOSTING_AUTOPAY_DESCRIPTION,
  SITE_HOSTING_DESCRIPTION,
  getKebuPlan,
  parseKebuPlanId,
  planLabel,
  planRequiresPayment,
  type KebuPlanId,
} from "@/lib/billing/pricing";
import { createJokoCheckout } from "@/lib/joko/payments";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Start or renew JOKO checkout for a Kebu plan tier. */
export async function POST(req: Request, { params }: Params) {
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
      exempt: true,
      message: "Your account does not pay for site hosting.",
    });
  }

  const body = (await req.json().catch(() => ({}))) as {
    tier?: string;
    plan?: string;
    interval?: string;
    autopay?: boolean;
    forceRenew?: boolean;
  };

  const tier = parseKebuPlanId(body.tier ?? "shop");
  const interval = parseHostingPlan(body.interval ?? body.plan);
  const wantAutopay = body.autopay === true;
  const forceRenew = body.forceRenew === true;

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, title, subdomain")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  if (!planRequiresPayment(tier)) {
    const free = await ensureFreeHostingEntitlement(supabase, id, user.id);
    if (!free) {
      return NextResponse.json(
        {
          error:
            "Could not activate Free hosting. Apply migration 038 (Free entitlement RLS), then try again.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({
      ok: true,
      tier: "free",
      alreadyActive: true,
      periodEnd: free.period_end ?? null,
      message: "You are on Kebu Free — build and publish on a Kebu subdomain.",
    });
  }

  const existing = await getActiveSiteSubscription(supabase, id, user.id);
  const latest = await getLatestSiteSubscription(supabase, id, user.id);
  const currentTier = subscriptionTierId(existing ?? latest);

  if (
    existing?.period_end &&
    !forceRenew &&
    currentTier === tier &&
    !isWithinAutopayWindow(existing.period_end)
  ) {
    return NextResponse.json({
      ok: true,
      alreadyActive: true,
      tier: currentTier,
      periodEnd: existing.period_end,
      autopayEnabled: Boolean(existing.autopay_enabled),
      message: `You already have ${getKebuPlan(currentTier).name}. Renew in the last 5 days, or upgrade to another plan.`,
    });
  }

  const reference = `kebu-${tier}-${id.slice(0, 8)}-${randomUUID().slice(0, 8)}`;
  const amountUsdCents = defaultHostingAmountCents(interval, tier);
  const appBase = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "").replace(
    /\/$/,
    "",
  );

  const renewing = Boolean(existing);
  const { data: pending, error: insertErr } = await supabase
    .from("site_subscriptions")
    .insert({
      project_id: id,
      owner_id: user.id,
      status: "pending",
      tier,
      plan: interval,
      billing_interval: interval,
      amount_usd_cents: amountUsdCents,
      joko_reference: reference,
      autopay_enabled: wantAutopay || Boolean(latest?.autopay_enabled),
      autopay_consent_at:
        wantAutopay || latest?.autopay_enabled ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (insertErr || !pending) {
    const missing = insertErr?.message?.includes("does not exist");
    return NextResponse.json(
      {
        error: missing
          ? "Billing tables missing. Apply migrations 010, 035, and 036."
          : "Could not start subscription checkout.",
        detail: insertErr?.message,
      },
      { status: 500 },
    );
  }

  const label = planLabel(tier);
  const checkout = await createJokoCheckout({
    reference,
    amountUsdCents,
    description: `${describeTierForCheckout(tier)} (${interval}) — ${project.title}`,
    customerEmail: user.email,
    returnUrl: `${appBase}/create/${id}?billing=success`,
    cancelUrl: `${appBase}/create/${id}?billing=cancelled`,
    webhookUrl: `${appBase}/api/webhooks/joko`,
    metadata: {
      kind: "site_subscription",
      project_id: id,
      subscription_id: pending.id,
      owner_id: user.id,
      plan: interval,
      tier,
      renew: renewing ? "true" : "false",
      previous_subscription_id: existing?.id ?? latest?.id ?? "",
    },
  });

  if (!checkout.ok) {
    await supabase.from("site_subscriptions").update({ status: "cancelled" }).eq("id", pending.id);
    return NextResponse.json(
      {
        error: checkout.error,
        configured: checkout.configured,
        hint: checkout.configured
          ? undefined
          : "Add JOKO_API_BASE_URL and JOKO_API_SECRET on the server, or set JOKO_BILLING_DEV_BYPASS=true in local dev only.",
      },
      { status: checkout.configured ? 502 : 503 },
    );
  }

  await supabase
    .from("site_subscriptions")
    .update({
      joko_payment_id: checkout.paymentId,
      pending_checkout_url: checkout.paymentUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pending.id);

  logCreate("billing.joko_checkout_started", {
    userId: user.id,
    projectId: id,
    reference,
    amountUsdCents,
    tier,
    interval,
    renewing,
  });

  return NextResponse.json({
    ok: true,
    paymentUrl: checkout.paymentUrl,
    reference,
    tier,
    plan: interval,
    renewing,
    label,
    description: SITE_HOSTING_DESCRIPTION,
    autopayDescription: SITE_HOSTING_AUTOPAY_DESCRIPTION,
    periodEndPreview: subscriptionPeriodEnd(new Date(), interval),
  });
}
