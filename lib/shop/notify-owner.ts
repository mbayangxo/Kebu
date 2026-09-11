import type { SupabaseClient } from "@supabase/supabase-js";
import { sendOrderNotification } from "@/lib/notifications";
import { SHOP_TEAM_ROLES } from "@/lib/create/project-access";
import { sendJokoPartnerMessage } from "@/lib/joko/payments";
import { normalizeWhatsAppPhone } from "@/lib/create/site-commerce";

export type ShopNotifyChannel =
  | "whatsapp"
  | "demo"
  | "web"
  | "share"
  | "social"
  | "qr"
  | "wave"
  | "joko";

/** Map payment preference + optional client hint → order acquisition channel. */
export function resolveOrderChannel(opts: {
  paymentPreference?: string | null;
  clientChannel?: string | null;
}): ShopNotifyChannel {
  const hint = (opts.clientChannel ?? "").trim().toLowerCase();
  if (hint === "share" || hint === "social" || hint === "qr") return hint;
  if (hint === "wave" || hint === "joko") return hint;
  const pay = (opts.paymentPreference ?? "").trim().toLowerCase();
  if (pay === "whatsapp") return "whatsapp";
  if (pay === "mobile_money") return "wave";
  if (pay === "joko") return "joko";
  if (hint === "web" || hint === "demo") return hint as ShopNotifyChannel;
  return "web";
}

async function recipientUserIds(
  svc: SupabaseClient,
  opts: { projectId: string; ownerId: string },
): Promise<string[]> {
  const ids = new Set<string>([opts.ownerId]);
  try {
    const { data: project } = await svc
      .from("projects")
      .select("business_id")
      .eq("id", opts.projectId)
      .maybeSingle();
    const businessId =
      project && typeof (project as { business_id?: string }).business_id === "string"
        ? (project as { business_id: string }).business_id
        : null;
    if (!businessId) return [...ids];

    const { data: members } = await svc
      .from("business_members")
      .select("user_id, role")
      .eq("business_id", businessId)
      .eq("status", "active");

    for (const m of members ?? []) {
      const role = String((m as { role?: string }).role ?? "");
      const uid = (m as { user_id?: string }).user_id;
      if (uid && (SHOP_TEAM_ROLES as readonly string[]).includes(role)) {
        ids.add(uid);
      }
    }
  } catch {
    /* team fan-out best-effort */
  }
  return [...ids];
}

/**
 * Persist in-app notification for owner + shop team + best-effort email/SMS to owner.
 * Never throws — order path must stay durable.
 */
export async function notifyShopOwnerOfOrder(
  svc: SupabaseClient,
  opts: {
    projectId: string;
    ownerId: string;
    orderId: string;
    orderNumber?: string | null;
    businessName: string;
    productName: string;
    quantity: number;
    customerName: string;
    customerPhone: string;
    paymentPreference: string;
    channel: string;
    ownerEmail?: string | null;
    ownerNotifyPhone?: string | null;
  },
): Promise<void> {
  const title = `New order · ${opts.productName}`;
  const body = `${opts.customerName} · qty ${opts.quantity} · ${opts.paymentPreference || opts.channel}`;
  const href = `/shop/${opts.projectId}?tab=orders`;

  const recipients = await recipientUserIds(svc, {
    projectId: opts.projectId,
    ownerId: opts.ownerId,
  });

  try {
    const rows = recipients.map((owner_id) => ({
      project_id: opts.projectId,
      owner_id,
      kind: "order" as const,
      title,
      body,
      href,
      order_id: opts.orderId,
    }));
    if (rows.length) {
      await svc.from("shop_owner_notifications").insert(rows);
    }
  } catch {
    /* table may be missing until 067 */
  }

  // Mbolo → merchant (Joko Partner messaging, falls back to SMS if Mbolo unavailable).
  if (opts.ownerNotifyPhone) {
    const phone = normalizeWhatsAppPhone(opts.ownerNotifyPhone);
    if (phone) {
      const mboloText = [
        `🛒 Nouvelle commande — ${opts.businessName}`,
        `Client : ${opts.customerName} (${opts.customerPhone})`,
        `Article : ${opts.quantity}× ${opts.productName}`,
        `Paiement : ${opts.paymentPreference || opts.channel}`,
        `Ref : ${opts.orderNumber || opts.orderId.slice(0, 8)}`,
        `kebu.africa/shop/${opts.projectId}`,
      ].join("\n");
      sendJokoPartnerMessage({
        toPhone: `+${phone}`,
        text: mboloText,
        channel: "mbolo_auto",
        metadata: { kind: "merchant_new_order", order_id: opts.orderId, project_id: opts.projectId },
        idempotencyKey: `new-order-merchant-${opts.orderId}`,
      }).catch(() => {/* best-effort */});
    }
  }

  try {
    await sendOrderNotification({
      businessName: opts.businessName,
      customerName: opts.customerName,
      customerPhone: opts.customerPhone,
      itemsSummary: `${opts.quantity}× ${opts.productName}`,
      orderId: opts.orderNumber || opts.orderId.slice(0, 8),
      paymentMethod: opts.paymentPreference || opts.channel,
      notifyEmail: opts.ownerEmail ?? undefined,
      notifyPhone: opts.ownerNotifyPhone ?? undefined,
    });
  } catch {
    /* email/SMS optional */
  }
}
