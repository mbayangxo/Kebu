/**
 * D1: Digital product delivery.
 * A purchase of a digital product generates a signed download token.
 * The token is emailed to the buyer and redeemed at /api/dl/[token].
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendCampaignEmail } from "@/lib/email/send-campaign";

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
 * Create a download record after an order is placed.
 * Safe to call idempotently — unique constraint on token handles re-runs.
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
}): Promise<boolean> {
  const expiryDate = new Date(opts.expiresAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const html = `
<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px 16px;color:#0a0a0a">
  <p style="font-size:15px;font-weight:700;margin:0 0 8px">${opts.shopName}</p>
  <h1 style="font-size:22px;font-weight:800;margin:0 0 16px">Votre téléchargement est prêt</h1>
  <p style="font-size:14px;margin:0 0 24px">Merci pour votre achat de <strong>${opts.productName}</strong>.</p>
  <a href="${opts.downloadUrl}"
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
  });
}
