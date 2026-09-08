import type { SupabaseClient } from "@supabase/supabase-js";
import { sendCampaignEmail } from "@/lib/email/send-campaign";
import { whatsAppOrderHref, normalizeWhatsAppPhone } from "@/lib/create/site-commerce";

export type CartDraftRow = {
  id: string;
  subdomain: string;
  session_key: string;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  items: { productId?: string; quantity?: number }[];
  discount_code: string | null;
  status: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};

/** Open carts with contact info older than `minAgeMinutes` (default 30). */
export async function listAbandonedCartDrafts(
  supabase: SupabaseClient,
  projectId: string,
  opts?: { minAgeMinutes?: number; limit?: number },
): Promise<{ ok: true; drafts: CartDraftRow[] } | { ok: false; error: string }> {
  const minAge = opts?.minAgeMinutes ?? 30;
  const cutoff = new Date(Date.now() - minAge * 60_000).toISOString();
  const { data, error } = await supabase
    .from("shop_cart_drafts")
    .select(
      "id, subdomain, session_key, customer_email, customer_name, customer_phone, items, discount_code, status, last_seen_at, created_at, updated_at",
    )
    .eq("project_id", projectId)
    .eq("status", "open")
    .lt("last_seen_at", cutoff)
    .order("last_seen_at", { ascending: false })
    .limit(opts?.limit ?? 50);

  if (error) {
    return {
      ok: false,
      error: error.message?.includes("does not exist")
        ? "Cart drafts missing. Apply APPLY_SHOP_ORDERS.sql (046)."
        : "Could not load abandoned carts.",
    };
  }

  return {
    ok: true,
    drafts: (data ?? []).map((d) => ({
      ...d,
      items: Array.isArray(d.items) ? d.items : [],
    })) as CartDraftRow[],
  };
}

export function cartDraftItemCount(items: unknown): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((s, it) => {
    const q = typeof it?.quantity === "number" ? it.quantity : 0;
    return s + q;
  }, 0);
}

export function recoveryWhatsAppMessage(opts: {
  shopName: string;
  siteUrl: string;
  discountCode?: string | null;
  customerName?: string | null;
}): string {
  const name = opts.customerName?.trim() || "there";
  const disc = opts.discountCode?.trim()
    ? `\nUse code ${opts.discountCode.trim()} at checkout if offered.`
    : "";
  return `Hi ${name} — you left items in your cart at ${opts.shopName}. Finish here: ${opts.siteUrl}${disc}`;
}

export function recoveryWhatsAppHref(phone: string, message: string): string | null {
  const n = normalizeWhatsAppPhone(phone);
  if (!n) return null;
  return whatsAppOrderHref(n, message);
}

export async function markCartDraftRecovered(
  supabase: SupabaseClient,
  projectId: string,
  draftId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase
    .from("shop_cart_drafts")
    .update({ status: "recovered", updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("project_id", projectId)
    .eq("status", "open");
  if (error) return { ok: false, error: "Could not update draft." };
  return { ok: true };
}

/** Best-effort Resend recovery email. Returns sent=false when Resend is not configured. */
export async function sendCartRecoveryEmail(opts: {
  to: string;
  shopName: string;
  siteUrl: string;
  discountCode?: string | null;
}): Promise<{ sent: boolean; reason?: string }> {
  const from = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;
  if (!process.env.RESEND_API_KEY || !from) {
    return { sent: false, reason: "Email not configured (RESEND_API_KEY / from address)." };
  }
  const disc = opts.discountCode?.trim()
    ? `<p>If we offered a code, use <strong>${opts.discountCode.trim()}</strong> at checkout.</p>`
    : "";
  const text = `You left items in your cart at ${opts.shopName}. Finish here: ${opts.siteUrl}${
    opts.discountCode ? ` Code: ${opts.discountCode}` : ""
  }`;
  const html = `<p>You left items in your cart at <strong>${opts.shopName}</strong>.</p><p><a href="${opts.siteUrl}">Finish your order</a></p>${disc}<p style="font-size:12px;opacity:0.7">This is not a payment receipt.</p>`;
  const ok = await sendCampaignEmail({
    to: opts.to,
    from,
    fromName: opts.shopName,
    subject: `Finish your cart — ${opts.shopName}`,
    html,
    text,
  });
  return ok ? { sent: true } : { sent: false, reason: "Email provider rejected the send." };
}
