import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const affiliateCodeInputSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(32)
    .transform((c) => c.toUpperCase().replace(/\s+/g, ""))
    .refine((c) => /^[A-Z0-9_-]+$/.test(c), "Use letters, numbers, - or _"),
  affiliateName: z.string().trim().min(1).max(80),
  commissionPercent: z.number().int().min(1).max(90).nullable().optional(),
  isActive: z.boolean().optional().default(true),
  note: z.string().trim().max(200).optional().default(""),
});

export type AffiliateCodeInput = z.infer<typeof affiliateCodeInputSchema>;

export type ShopAffiliateCodeRow = {
  id: string;
  project_id: string;
  code: string;
  affiliate_name: string;
  commission_percent: number | null;
  is_active: boolean;
  uses_count: number;
  note: string | null;
  created_at: string;
};

export function normalizeAffiliateCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Resolve an affiliate code at checkout time. Unlike resolveActiveDiscount,
 * an unknown, inactive, or malformed code never fails the order — affiliate
 * codes only attribute a sale, they never change its price, so a shopper's
 * typo or stale link must not block checkout. Returns null (not an error)
 * whenever attribution can't be established.
 */
export async function resolveAffiliateCodeForAttribution(
  admin: SupabaseClient,
  projectId: string,
  rawCode: string | undefined | null,
): Promise<string | null> {
  if (!rawCode?.trim()) return null;
  const code = normalizeAffiliateCode(rawCode);
  if (!code) return null;

  const { data } = await admin
    .from("shop_affiliate_codes")
    .select("code, is_active")
    .eq("project_id", projectId)
    .eq("code", code)
    .maybeSingle();

  if (!data || !data.is_active) return null;
  return data.code as string;
}

/** Best-effort — attribution already succeeded; a missed increment never blocks the order. */
export async function incrementAffiliateUse(admin: SupabaseClient, projectId: string, code: string): Promise<void> {
  const { data } = await admin
    .from("shop_affiliate_codes")
    .select("id, uses_count")
    .eq("project_id", projectId)
    .eq("code", code)
    .maybeSingle();
  if (!data) return;
  await admin
    .from("shop_affiliate_codes")
    .update({ uses_count: (data.uses_count as number) + 1 })
    .eq("id", data.id);
}

export type AffiliateAttribution = {
  code: string;
  affiliateName: string;
  commissionPercent: number | null;
  isActive: boolean;
  orders: number;
  revenuePaidXof: number;
  commissionOwedXof: number | null;
};

/**
 * Merchant view: real attributed orders + revenue per affiliate code, from
 * actual paid shop_orders rows — never a derived or estimated number.
 * commissionOwedXof is informational bookkeeping only; nothing here sends
 * money anywhere (see developer-payouts.ts for the same honesty standard
 * on the marketplace side).
 */
export async function getAffiliateAttribution(
  admin: SupabaseClient,
  projectId: string,
): Promise<{ ok: true; items: AffiliateAttribution[] } | { ok: false; error: string }> {
  const { data: codes, error: codesErr } = await admin
    .from("shop_affiliate_codes")
    .select("code, affiliate_name, commission_percent, is_active, uses_count")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (codesErr) return { ok: false, error: codesErr.message };

  const { data: orders, error: ordersErr } = await admin
    .from("shop_orders")
    .select("affiliate_code, amount_xof, payment_status")
    .eq("project_id", projectId)
    .not("affiliate_code", "is", null);
  if (ordersErr) return { ok: false, error: ordersErr.message };

  const byCode = new Map<string, { orders: number; revenuePaidXof: number }>();
  for (const row of orders ?? []) {
    const code = (row as { affiliate_code: string | null }).affiliate_code;
    if (!code) continue;
    const entry = byCode.get(code) ?? { orders: 0, revenuePaidXof: 0 };
    entry.orders += 1;
    if ((row as { payment_status: string | null }).payment_status === "paid") {
      entry.revenuePaidXof += Math.max(0, (row as { amount_xof: number | null }).amount_xof ?? 0);
    }
    byCode.set(code, entry);
  }

  const items: AffiliateAttribution[] = (codes ?? []).map((c) => {
    const row = c as { code: string; affiliate_name: string; commission_percent: number | null; is_active: boolean };
    const agg = byCode.get(row.code) ?? { orders: 0, revenuePaidXof: 0 };
    return {
      code: row.code,
      affiliateName: row.affiliate_name,
      commissionPercent: row.commission_percent,
      isActive: row.is_active,
      orders: agg.orders,
      revenuePaidXof: agg.revenuePaidXof,
      commissionOwedXof:
        row.commission_percent != null ? Math.round((agg.revenuePaidXof * row.commission_percent) / 100) : null,
    };
  });

  return { ok: true, items };
}
