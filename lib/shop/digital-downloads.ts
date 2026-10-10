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

/** Resolve and validate a download token. Returns null if expired / exhausted / not found. */
export async function resolveDownloadToken(
  supabase: SupabaseClient,
  token: string,
): Promise<DownloadRow | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;

  const { data, error } = await supabase.rpc("resolve_paid_shop_download", { p_token: token });
  if (error) throw new Error("Download verification unavailable.");
  if (!data) return null;

  return data as DownloadRow;
}

/** Await a successful atomic payment/expiry/quota check before redirecting. */
export async function consumeDownloadToken(
  supabase: SupabaseClient,
  token: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("consume_paid_shop_download", { p_token: token });
  if (error) throw new Error("Download verification unavailable.");
  return data === true;
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
  idempotencyKey?: string;
}): Promise<boolean> {
  const expiryDate = new Date(opts.expiresAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

  const html = `
<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px 16px;color:#0a0a0a">
  <p style="font-size:15px;font-weight:700;margin:0 0 8px">${escape(opts.shopName)}</p>
  <h1 style="font-size:22px;font-weight:800;margin:0 0 16px">Votre téléchargement est prêt</h1>
  <p style="font-size:14px;margin:0 0 24px">Merci pour votre achat de <strong>${escape(opts.productName)}</strong>.</p>
  <a href="${escape(opts.downloadUrl)}"
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
