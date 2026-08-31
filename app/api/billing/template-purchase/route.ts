import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/create/auth";
import { templateRequiresPurchase, userOwnsTemplate } from "@/lib/billing/subscriptions";
import { createJokoCheckout } from "@/lib/joko/payments";
import { formatUsdFromCents } from "@/lib/billing/pricing";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  templateSlug: z.string().trim().min(1).max(80),
});

/** Unlock a paid template via JOKO mobile money. */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { templateSlug } = parsed.data;
  const { required, priceUsdCents } = await templateRequiresPurchase(supabase, templateSlug);

  if (!required) {
    return NextResponse.json({ ok: true, alreadyUnlocked: true, message: "This template is free." });
  }

  if (await userOwnsTemplate(supabase, user.id, templateSlug)) {
    return NextResponse.json({ ok: true, alreadyUnlocked: true });
  }

  const reference = `kebu-tpl-${templateSlug.slice(0, 12)}-${randomUUID().slice(0, 8)}`;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "");

  const { data: pending, error: insertErr } = await supabase
    .from("template_purchases")
    .insert({
      owner_id: user.id,
      template_slug: templateSlug,
      status: "pending",
      amount_usd_cents: priceUsdCents,
      joko_reference: reference,
    })
    .select("id")
    .single();

  if (insertErr || !pending) {
    return NextResponse.json(
      {
        error: insertErr?.message?.includes("does not exist")
          ? "Billing tables missing. Apply migration 010_site_billing_joko.sql."
          : "Could not start template checkout.",
      },
      { status: 500 },
    );
  }

  const checkout = await createJokoCheckout({
    reference,
    amountUsdCents: priceUsdCents,
    description: `Kebu template — ${templateSlug}`,
    customerEmail: user.email,
    returnUrl: `${appUrl}/create/new?template=${encodeURIComponent(templateSlug)}&billing=success`,
    cancelUrl: `${appUrl}/create/new?billing=cancelled`,
    webhookUrl: `${appUrl}/api/webhooks/joko`,
    metadata: {
      kind: "template_purchase",
      template_slug: templateSlug,
      purchase_id: pending.id,
      owner_id: user.id,
    },
  });

  if (!checkout.ok) {
    await supabase.from("template_purchases").update({ status: "failed" }).eq("id", pending.id);
    return NextResponse.json({ error: checkout.error, configured: checkout.configured }, { status: 503 });
  }

  await supabase.from("template_purchases").update({ joko_payment_id: checkout.paymentId }).eq("id", pending.id);

  return NextResponse.json({
    ok: true,
    paymentUrl: checkout.paymentUrl,
    templateSlug,
    priceLabel: formatUsdFromCents(priceUsdCents),
    provider: "joko",
  });
}
