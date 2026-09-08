import type { SupabaseClient } from "@supabase/supabase-js";

export type PaymentLedgerRail =
  | "joko"
  | "wave"
  | "paystack"
  | "paypal"
  | "orange_money"
  | "whatsapp"
  | "cod"
  | "mobile_money"
  | "card"
  | "manual"
  | "unknown";

export type PaymentLedgerEventType =
  | "intent"
  | "checkout_started"
  | "awaiting"
  | "paid"
  | "failed"
  | "refunded"
  | "cancelled";

/** Map shop payment preference / provider → ledger rail. */
export function railFromPaymentPreference(pref: string | null | undefined): PaymentLedgerRail {
  const p = (pref ?? "").trim().toLowerCase();
  if (p === "joko") return "joko";
  if (p === "paypal") return "paypal";
  if (p === "card") return "card";
  if (p === "mobile_money") return "mobile_money";
  if (p === "cod") return "cod";
  if (p === "whatsapp") return "whatsapp";
  if (p === "wave") return "wave";
  if (p === "paystack") return "paystack";
  if (p === "orange_money" || p === "orange") return "orange_money";
  return "unknown";
}

export function railFromProvider(provider: string | null | undefined): PaymentLedgerRail {
  const p = (provider ?? "").trim().toLowerCase();
  if (
    p === "joko" ||
    p === "paypal" ||
    p === "paystack" ||
    p === "wave" ||
    p === "orange_money" ||
    p === "manual"
  ) {
    return p;
  }
  return railFromPaymentPreference(p);
}

/**
 * Append a payment ledger event. Never throws — order path must stay durable.
 * Table may be missing until migration 068.
 */
export async function recordPaymentLedgerEvent(
  svc: SupabaseClient,
  opts: {
    projectId: string;
    orderId?: string | null;
    rail: PaymentLedgerRail;
    eventType: PaymentLedgerEventType;
    amountXof?: number | null;
    /** Catalog amount often XOF; Joko ledger rows use currency CAURIS (pay unit). */
    currency?: string;
    provider?: string | null;
    providerReference?: string | null;
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const { error } = await svc.from("shop_payment_ledger_events").insert({
      project_id: opts.projectId,
      order_id: opts.orderId ?? null,
      rail: opts.rail,
      event_type: opts.eventType,
      amount_xof: opts.amountXof ?? null,
      currency: (opts.currency ?? "XOF").toUpperCase().slice(0, 12),
      provider: (opts.provider ?? opts.rail).slice(0, 40),
      provider_reference: (opts.providerReference ?? "").slice(0, 200),
      meta: opts.meta ?? {},
    });
    if (error && !/does not exist|shop_payment_ledger/i.test(error.message ?? "")) {
      /* swallow — logged by caller if needed */
    }
  } catch {
    /* table missing until 068 */
  }
}
