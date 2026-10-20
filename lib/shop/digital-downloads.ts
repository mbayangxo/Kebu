/**
 * D1: Digital product delivery.
 * A purchase of a digital product generates a signed download token.
 * The token is emailed to the buyer and redeemed at /api/dl/[token].
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendCampaignEmail } from "@/lib/email/send-campaign";
import { enqueuePlatformJob } from "@/lib/platform/jobs";

export type DigitalProduct = {
  id: string;
  is_digital: boolean;
  digital_file_path: string | null;
  digital_file_name: string | null;
  digital_dl_limit: number;
  digital_expires_hours: number;
};

export type DownloadRow = {
  id: string;
  order_id: string;
  project_id: string;
  product_id: string;
  token: string;
  file_path: string;
  file_name: string;
  expires_at: string;
  download_count: number;
  max_downloads: number;
  created_at: string;
};

/** Generate a cryptographically random 64-char hex token. */
function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create a download record only after verified payment.
 * Idempotent per order/product: an existing entitlement is reused.
 */
export async function createDigitalDownload(
  supabase: SupabaseClient,
  opts: {
    orderId: string;
    projectId: string;
    product: DigitalProduct;
  },
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  if (!opts.product.is_digital || !opts.product.digital_file_path) {
    return { ok: false, error: "Product has no digital file." };
  }

  const { data: order } = await supabase
    .from("shop_orders")
    .select("id, project_id, payment_status")
    .eq("id", opts.orderId)
    .eq("project_id", opts.projectId)
    .maybeSingle();

  if (!order || order.payment_status !== "paid") {
    return { ok: false, error: "Order is not paid." };
  }

  const { data: existing } = await supabase
    .from("shop_digital_downloads")
    .select("token")
    .eq("order_id", opts.orderId)
    .eq("product_id", opts.product.id)
    .maybeSingle();
  if (existing?.token) return { ok: true, token: existing.token as string };

  const token = randomToken();
  const expiresAt = new Date(
    Date.now() + opts.product.digital_expires_hours * 60 * 60 * 1000,
  ).toISOString();

  const { error } = await supabase.from("shop_digital_downloads").insert({
    order_id: opts.orderId,
    project_id: opts.projectId,
    product_id: opts.product.id,
    token,
    file_path: opts.product.digital_file_path,
    file_name: opts.product.digital_file_name ?? "download",
    expires_at: expiresAt,
    max_downloads: opts.product.digital_dl_limit,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, token };
}

/**
 * Fulfill a paid digital order. Safe to call repeatedly after duplicate webhooks
 * or worker retries — createDigitalDownload is idempotent per order/product.
 *
 * Throws on genuine failure (DB error, email provider rejection) so a caller that
 * owns retry policy can act on it. The initial data-dependent no-ops below (order
 * not paid yet, product not digital, etc.) return normally — retrying those would
 * never help, so they are not failures.
 */
export async function fulfillPaidDigitalOrder(
  supabase: SupabaseClient,
  orderId: string,
): Promise<void> {
  const { data: order } = await supabase
    .from("shop_orders")
    .select("id, project_id, product_id, product_name, customer_email, payment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.payment_status !== "paid" || !order.product_id || !order.customer_email) return;

  const { data: product } = await supabase
    .from("project_products")
    .select("id, is_digital, digital_file_path, digital_file_name, digital_dl_limit, digital_expires_hours")
    .eq("id", order.product_id)
    .maybeSingle();
  if (!product?.is_digital || !product.digital_file_path) return;

  const created = await createDigitalDownload(supabase, {
    orderId: order.id,
    projectId: order.project_id,
    product: product as DigitalProduct,
  });
  if (!created.ok) throw new Error(created.error);

  const from = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;
  if (!from) return;
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://kebu.app";
  const sent = await emailDownloadLink({
    to: order.customer_email,
    shopName: "Kebu",
    productName: order.product_name || product.digital_file_name || "Digital product",
    downloadUrl: `${base}/api/dl/${created.token}`,
    expiresAt: new Date(Date.now() + product.digital_expires_hours * 60 * 60 * 1000).toISOString(),
    maxDownloads: product.digital_dl_limit,
    from,
    idempotencyKey: `digital-download:${order.id}:${product.id}`,
  });
  if (!sent) throw new Error("Download email was not accepted by the mail provider.");
}

/**
 * Webhook-facing entry point: attempt fulfillment now (fast path — the buyer gets
 * their email immediately in the common case); on failure, hand off to the durable
 * platform worker instead of depending on the payment provider's own webhook retry
 * policy. Resolves (does not throw) once the work is either done or durably
 * queued — a transient delivery failure never turns a successfully recorded
 * payment into a 500 back to the provider.
 *
 * If enqueueing the retry job ALSO fails, this rethrows rather than swallowing
 * the double failure: at that point nothing durable has been recorded, so the
 * caller must not report success. Letting the webhook response fail is the
 * correct fallback — the payment provider's own webhook redelivery becomes the
 * last line of defense when our own queue is unreachable.
 *
 * Do not call this from lib/platform/worker.ts's own `digital.fulfill` handler —
 * that must call fulfillPaidDigitalOrder directly so a genuine failure propagates
 * to the worker's own attempt-count/backoff/dead-letter handling (failPlatformJob)
 * instead of this function silently re-enqueueing a "successful" job forever.
 */
export async function fulfillPaidDigitalOrderDurable(
  supabase: SupabaseClient,
  orderId: string,
): Promise<void> {
  try {
    await fulfillPaidDigitalOrder(supabase, orderId);
  } catch (cause) {
    console.error(JSON.stringify({
      event: "shop.digital_fulfillment_deferred",
      orderId,
      error: cause instanceof Error ? cause.message : String(cause),
    }));
    try {
      await enqueuePlatformJob(supabase, {
        type: "digital.fulfill",
        payload: { orderId },
        idempotencyKey: `digital.fulfill:${orderId}`,
      });
    } catch (enqueueCause) {
      console.error(JSON.stringify({
        event: "shop.digital_fulfillment_unrecoverable",
        orderId,
        fulfillmentError: cause instanceof Error ? cause.message : String(cause),
        enqueueError: enqueueCause instanceof Error ? enqueueCause.message : String(enqueueCause),
      }));
      throw enqueueCause;
    }
  }
}

/** Resolve and validate a download token. Returns null if expired / exhausted / not found. */
export async function resolveDownloadToken(
  supabase: SupabaseClient,
  token: string,
): Promise<DownloadRow | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;

  const { data } = await supabase
    .from("shop_digital_downloads")
    .select(
      "id, order_id, project_id, product_id, token, file_path, file_name, expires_at, download_count, max_downloads, created_at",
    )
    .eq("token", token)
    .maybeSingle();

  if (!data) return null;
  if (new Date(data.expires_at) < new Date()) return null;
  if (data.download_count >= data.max_downloads) return null;

  return data as DownloadRow;
}

/** Increment download count. Call after the redirect to storage is issued. */
export async function incrementDownloadCount(
  supabase: SupabaseClient,
  downloadId: string,
): Promise<void> {
  await supabase.rpc("increment_digital_download_count", { dl_id: downloadId }).single();
}

/**
 * Generate a Supabase Storage signed URL for the file (60 seconds — enough for redirect).
 * Returns null if storage is not configured.
 */
export async function signedDownloadUrl(
  supabase: SupabaseClient,
  filePath: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("digital-files")
    .createSignedUrl(filePath, 60);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"\']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "\'": "&#39;" })[char] ?? char);
}

/** Email a download link to the buyer. Fire-and-forget friendly. */
export async function emailDownloadLink(opts: {
  to: string;
  shopName: string;
  productName: string;
  downloadUrl: string;
  expiresAt: string;
  maxDownloads: number;
  from: string;
  fromName?: string;
  idempotencyKey?: string;
}): Promise<boolean> {
  const expiryDate = new Date(opts.expiresAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const safeShopName = escapeHtml(opts.shopName);
  const safeProductName = escapeHtml(opts.productName);
  const safeDownloadUrl = escapeHtml(opts.downloadUrl);

  const html = `
<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px 16px;color:#0a0a0a">
  <p style="font-size:15px;font-weight:700;margin:0 0 8px">${safeShopName}</p>
  <h1 style="font-size:22px;font-weight:800;margin:0 0 16px">Votre téléchargement est prêt</h1>
  <p style="font-size:14px;margin:0 0 24px">Merci pour votre achat de <strong>${safeProductName}</strong>.</p>
  <a href="${safeDownloadUrl}"
     style="display:inline-block;background:#FF5500;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:999px;text-decoration:none">
    Télécharger maintenant →
  </a>
  <p style="font-size:12px;color:#6B7280;margin:20px 0 0">
    Lien valide jusqu'au <strong>${expiryDate}</strong> · ${opts.maxDownloads} téléchargement${opts.maxDownloads > 1 ? "s" : ""} maximum
  </p>
  <p style="font-size:11px;color:#9CA3AF;margin:6px 0 0">Ne partagez pas ce lien.</p>
</div>`;

  const text = `Merci pour votre achat de "${opts.productName}" chez ${opts.shopName}.\n\nTéléchargez ici: ${opts.downloadUrl}\n\nLien valide jusqu'au ${expiryDate}. ${opts.maxDownloads} téléchargements maximum.`;

  return sendCampaignEmail({
    to: opts.to,
    from: opts.from,
    fromName: opts.fromName || opts.shopName,
    subject: `Votre fichier — ${opts.productName}`,
    html,
    text,
    idempotencyKey: opts.idempotencyKey,
  });
}

/**
 * Backstop for the one real gap the webhook-level durability above cannot cover:
 * the request process dying (timeout, container restart, deploy) after
 * complete_shop_payment commits but *before* fulfillPaidDigitalOrderDurable is
 * ever called — in that case no platform_jobs row exists at all, so there is
 * nothing for the worker's own lease-expiry recovery (claim_platform_jobs) to
 * find. This scans recently-paid digital orders with no download row yet and
 * enqueues a digital.fulfill job for each; enqueuePlatformJob's idempotency key
 * makes re-running this sweep safe (it no-ops for orders a job already exists
 * for, whatever that job's current status).
 *
 * Intended to run from the existing platform-worker cron alongside
 * runPlatformWorker — this is a bounded backfill, not a second job queue.
 */
export async function reconcileOrphanedDigitalFulfillments(
  supabase: SupabaseClient,
  opts: { sinceHoursAgo?: number; limit?: number } = {},
): Promise<{ scanned: number; enqueued: number }> {
  const since = new Date(Date.now() - (opts.sinceHoursAgo ?? 72) * 60 * 60 * 1000).toISOString();
  const limit = opts.limit ?? 200;

  const { data: candidateOrders } = await supabase
    .from("shop_orders")
    .select("id, product_id")
    .eq("payment_status", "paid")
    .not("product_id", "is", null)
    .gte("created_at", since)
    .limit(limit);
  const orders = (candidateOrders ?? []) as { id: string; product_id: string }[];
  if (orders.length === 0) return { scanned: 0, enqueued: 0 };

  const productIds = Array.from(new Set(orders.map((o) => o.product_id)));
  const { data: digitalProducts } = await supabase
    .from("project_products")
    .select("id")
    .in("id", productIds)
    .eq("is_digital", true);
  const digitalProductIds = new Set((digitalProducts ?? []).map((p: { id: string }) => p.id));
  const digitalOrders = orders.filter((o) => digitalProductIds.has(o.product_id));
  if (digitalOrders.length === 0) return { scanned: orders.length, enqueued: 0 };

  const orderIds = digitalOrders.map((o) => o.id);
  const { data: existingDownloads } = await supabase
    .from("shop_digital_downloads")
    .select("order_id")
    .in("order_id", orderIds);
  const fulfilled = new Set((existingDownloads ?? []).map((d: { order_id: string }) => d.order_id));
  const orphaned = digitalOrders.filter((o) => !fulfilled.has(o.id));

  let enqueued = 0;
  for (const order of orphaned) {
    try {
      await enqueuePlatformJob(supabase, {
        type: "digital.fulfill",
        payload: { orderId: order.id },
        idempotencyKey: `digital.fulfill:${order.id}`,
      });
      enqueued++;
    } catch (cause) {
      console.error(JSON.stringify({
        event: "shop.digital_fulfillment_reconcile_enqueue_failed",
        orderId: order.id,
        error: cause instanceof Error ? cause.message : String(cause),
      }));
    }
  }
  return { scanned: orders.length, enqueued };
}
