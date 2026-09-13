import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireCronSecret } from "@/lib/api-guard";
import { recordPlatformCronRun } from "@/lib/platform/cron-runs";
import { sendCampaignEmail } from "@/lib/email/send-campaign";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Cron — once per day (10:00 UTC).
 * For every project with review requests enabled and an email channel, finds
 * paid/fulfilled orders older than the configured delay with a customer email
 * that has not yet received a review request. Sends the email and logs the send.
 *
 * Settings live in projects.seo.reviewRequests (set via the Review Requests panel).
 */
export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;
  if (!fromEmail) {
    return NextResponse.json({ error: "RESEND_FROM_EMAIL not set." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const startedAt = new Date();
  let sent = 0;
  let skipped = 0;
  let errorMessage: string | undefined;

  try {
    // Fetch all projects — filter for enabled review requests in JS
    // (JSONB nested filter via PostgREST is version-sensitive; JS filter is safer)
    const { data: allProjects, error: projErr } = await supabase
      .from("projects")
      .select("id, title, seo")
      .not("seo", "is", null)
      .limit(500);

    if (projErr) throw new Error(projErr.message);

    type ReviewSettings = {
      enabled?: boolean;
      daysAfterFulfillment?: number;
      discountPercent?: number;
      channel?: string;
      messageTemplate?: string;
    };

    // Only projects with review requests enabled for email (or both)
    const enabledProjects = (allProjects ?? []).filter((p) => {
      const seo = p.seo as Record<string, unknown> | null;
      if (!seo) return false;
      const rr = seo.reviewRequests as ReviewSettings | undefined;
      if (!rr?.enabled) return false;
      const ch = rr.channel ?? "whatsapp";
      return ch === "email" || ch === "both";
    });

    if (enabledProjects.length === 0) {
      await recordPlatformCronRun(supabase, {
        jobName: "review-requests",
        status: "ok",
        startedAt,
        summary: { sent: 0, skipped: 0, reason: "no projects with email review requests enabled" },
      });
      return NextResponse.json({ ok: true, sent: 0, skipped: 0 });
    }

    const projectIds = enabledProjects.map((p) => p.id as string);

    // Orders eligible: paid/fulfilled, has email, within project set
    // We'll filter per-project for the day threshold below
    const { data: orders, error: ordersErr } = await supabase
      .from("shop_orders")
      .select("id, project_id, order_number, customer_name, customer_email, created_at, payment_status, status")
      .in("project_id", projectIds)
      .in("status", ["contacted", "fulfilled", "delivered", "paid"])
      .eq("payment_status", "paid")
      .not("customer_email", "is", null)
      .order("created_at", { ascending: false })
      .limit(500);

    if (ordersErr) throw new Error(ordersErr.message);
    if (!orders || orders.length === 0) {
      await recordPlatformCronRun(supabase, {
        jobName: "review-requests",
        status: "ok",
        startedAt,
        summary: { sent: 0, skipped: 0, reason: "no eligible paid orders" },
      });
      return NextResponse.json({ ok: true, sent: 0, skipped: 0 });
    }

    // Fetch already-sent requests for these orders to avoid duplicates
    const orderIds = orders.map((o) => o.id as string);
    const { data: existingRows } = await supabase
      .from("shop_review_requests")
      .select("order_id")
      .in("order_id", orderIds);

    const alreadySent = new Set((existingRows ?? []).map((r) => r.order_id as string));

    // Index projects by id for quick lookup
    const projectMap = new Map(
      enabledProjects.map((p) => [
        p.id as string,
        {
          title: (p.title as string | null) ?? "Notre boutique",
          rr: (p.seo as Record<string, unknown>).reviewRequests as ReviewSettings,
        },
      ]),
    );

    const insertRows: {
      project_id: string;
      order_id: string;
      customer_name: string | null;
      customer_email: string | null;
      channel: string;
      discount_code: string | null;
      discount_percent: number | null;
      status: string;
      sent_at: string;
    }[] = [];

    const now = Date.now();

    for (const order of orders) {
      if (alreadySent.has(order.id as string)) {
        skipped++;
        continue;
      }

      const proj = projectMap.get(order.project_id as string);
      if (!proj) {
        skipped++;
        continue;
      }

      const delayDays = proj.rr.daysAfterFulfillment ?? 3;
      const orderAge = (now - new Date(order.created_at as string).getTime()) / 86_400_000;
      if (orderAge < delayDays) {
        skipped++;
        continue;
      }

      const discountPercent = proj.rr.discountPercent ?? 0;
      const discountCode =
        discountPercent > 0
          ? `REVIEW${discountPercent}${(order.id as string).slice(0, 5).toUpperCase()}`
          : null;

      const customerName = (order.customer_name as string | null) ?? "cher(e) client(e)";
      const storeName = proj.title;
      const orderRef = order.order_number ? `#${order.order_number}` : "";

      const html = buildReviewEmailHtml({
        customerName,
        storeName,
        orderRef,
        discountCode,
        discountPercent,
        template: proj.rr.messageTemplate ?? "",
      });

      const subject = proj.rr.messageTemplate?.trim()
        ? `${storeName} — merci pour votre commande${orderRef ? ` ${orderRef}` : ""}`
        : `Votre avis compte — ${storeName}${orderRef ? ` ${orderRef}` : ""}`;

      const ok = await sendCampaignEmail({
        to: order.customer_email as string,
        from: fromEmail,
        fromName: storeName,
        subject,
        html,
        text: buildReviewEmailText({ customerName, storeName, discountCode, discountPercent }),
      });

      if (ok) {
        sent++;
        insertRows.push({
          project_id: order.project_id as string,
          order_id: order.id as string,
          customer_name: order.customer_name as string | null,
          customer_email: order.customer_email as string | null,
          channel: "email",
          discount_code: discountCode,
          discount_percent: discountPercent > 0 ? discountPercent : null,
          status: "sent",
          sent_at: new Date().toISOString(),
        });
      } else {
        skipped++;
      }
    }

    // Bulk-log all sent requests
    if (insertRows.length > 0) {
      await supabase.from("shop_review_requests").insert(insertRows);
    }

    await recordPlatformCronRun(supabase, {
      jobName: "review-requests",
      status: "ok",
      startedAt,
      summary: { sent, skipped },
    });
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    const supabase2 = createClient(supabaseUrl, serviceKey);
    await recordPlatformCronRun(supabase2, {
      jobName: "review-requests",
      status: "error",
      startedAt,
      errorMessage,
      summary: { sent, skipped },
    });
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sent, skipped });
}

function buildReviewEmailHtml(opts: {
  customerName: string;
  storeName: string;
  orderRef: string;
  discountCode: string | null;
  discountPercent: number;
  template: string;
}): string {
  const { customerName, storeName, orderRef, discountCode, discountPercent, template } = opts;

  if (template.trim()) {
    const text = template
      .replace(/{customer_name}/g, customerName)
      .replace(/{store_name}/g, storeName)
      .replace(/{discount_percent}/g, String(discountPercent))
      .replace(/{discount_code}/g, discountCode ?? "");
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<style>body{font-family:system-ui,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px}p{line-height:1.6}</style>
</head><body><p>${text.replace(/\n/g, "<br>")}</p><hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="font-size:12px;color:#999">Envoyé via Kebu · Vous recevez cet email car vous avez passé une commande.</p>
</body></html>`;
  }

  const discountBlock =
    discountCode && discountPercent > 0
      ? `<div style="margin:20px 0;padding:16px 20px;background:#fff7ed;border-radius:12px;border:1px solid #fed7aa;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#c2410c;">Cadeau pour vous</p>
          <p style="margin:0;font-size:13px;color:#7c2d12;">Utilisez le code <strong>${discountCode}</strong> pour obtenir <strong>${discountPercent}%&nbsp;de&nbsp;réduction</strong> sur votre prochaine commande.</p>
        </div>`
      : "";

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{margin:0;padding:0;background:#f9fafb;font-family:system-ui,sans-serif;color:#1a1a1a}
    .wrap{max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb}
    .header{background:#1a1a1a;padding:24px 32px}
    .header h1{margin:0;font-size:18px;color:#fff;font-weight:800;letter-spacing:-0.02em}
    .body{padding:32px}
    .stars{font-size:28px;letter-spacing:4px;margin:0 0 20px}
    p{margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151}
    .footer{padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb}
    .footer p{margin:0;font-size:11px;color:#9ca3af}
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>${storeName}</h1>
  </div>
  <div class="body">
    <p class="stars">⭐⭐⭐⭐⭐</p>
    <p>Bonjour <strong>${customerName}</strong>,</p>
    <p>Merci beaucoup pour votre commande${orderRef ? ` <strong>${orderRef}</strong>` : ""} chez <strong>${storeName}</strong> ! Nous espérons que vous êtes satisfait(e).</p>
    <p>Votre avis est précieux — il aide d'autres clients à nous découvrir et nous permet d'améliorer notre service. Cela ne prend qu'une minute&nbsp;!</p>
    ${discountBlock}
    <p style="margin-top:8px;font-size:13px;color:#6b7280;">Pour laisser votre avis, répondez simplement à cet email ou visitez notre boutique. Merci de votre confiance&nbsp;🙏</p>
  </div>
  <div class="footer">
    <p>Envoyé par <strong>${storeName}</strong> via Kebu · Pour ne plus recevoir ces emails, répondez "désabonnement".</p>
  </div>
</div>
</body>
</html>`;
}

function buildReviewEmailText(opts: {
  customerName: string;
  storeName: string;
  discountCode: string | null;
  discountPercent: number;
}): string {
  const { customerName, storeName, discountCode, discountPercent } = opts;
  const lines = [
    `Bonjour ${customerName},`,
    ``,
    `Merci pour votre commande chez ${storeName} !`,
    ``,
    `Votre avis est précieux — répondez à cet email pour partager votre expérience.`,
  ];
  if (discountCode && discountPercent > 0) {
    lines.push(``, `Cadeau : utilisez le code ${discountCode} pour ${discountPercent}% de réduction sur votre prochaine commande.`);
  }
  lines.push(``, `Merci de votre confiance.`, `— ${storeName}`);
  return lines.join("\n");
}
