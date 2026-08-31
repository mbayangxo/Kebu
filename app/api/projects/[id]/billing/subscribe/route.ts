import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireUser, logCreate } from "@/lib/create/auth";
import {
  defaultHostingAmountCents,
  getActiveSiteSubscription,
  subscriptionPeriodEnd,
} from "@/lib/billing/subscriptions";
import { SITE_HOSTING_BILLING_LABEL, SITE_HOSTING_DESCRIPTION } from "@/lib/billing/pricing";
import { createJokoCheckout } from "@/lib/joko/payments";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Start JOKO mobile-money checkout for $4/month site hosting. */
export async function POST(_req: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, title, subdomain")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const existing = await getActiveSiteSubscription(supabase, id, user.id);
  if (existing) {
    return NextResponse.json({
      ok: true,
      alreadyActive: true,
      periodEnd: existing.period_end,
      message: "This site already has active hosting.",
    });
  }

  const reference = `kebu-site-${id.slice(0, 8)}-${randomUUID().slice(0, 8)}`;
  const amountUsdCents = defaultHostingAmountCents();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "");

  const { data: pending, error: insertErr } = await supabase
    .from("site_subscriptions")
    .insert({
      project_id: id,
      owner_id: user.id,
      status: "pending",
      amount_usd_cents: amountUsdCents,
      joko_reference: reference,
    })
    .select("id")
    .single();

  if (insertErr || !pending) {
    const missing = insertErr?.message?.includes("does not exist");
    return NextResponse.json(
      {
        error: missing
          ? "Billing tables missing. Apply migration 010_site_billing_joko.sql."
          : "Could not start subscription checkout.",
        detail: insertErr?.message,
      },
      { status: 500 },
    );
  }

  const checkout = await createJokoCheckout({
    reference,
    amountUsdCents,
    description: `${SITE_HOSTING_BILLING_LABEL} — ${project.title} on Kebu`,
    customerEmail: user.email,
    returnUrl: `${appUrl}/create/${id}?billing=success`,
    cancelUrl: `${appUrl}/create/${id}?billing=cancelled`,
    webhookUrl: `${appUrl}/api/webhooks/joko`,
    metadata: {
      kind: "site_subscription",
      project_id: id,
      subscription_id: pending.id,
      owner_id: user.id,
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
    .update({ joko_payment_id: checkout.paymentId, updated_at: new Date().toISOString() })
    .eq("id", pending.id);

  logCreate("billing.joko_checkout_started", {
    userId: user.id,
    projectId: id,
    reference,
    amountUsdCents,
  });

  return NextResponse.json({
    ok: true,
    paymentUrl: checkout.paymentUrl,
    reference,
    label: SITE_HOSTING_BILLING_LABEL,
    description: SITE_HOSTING_DESCRIPTION,
    periodEndPreview: subscriptionPeriodEnd(),
  });
}
