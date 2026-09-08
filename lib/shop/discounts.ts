import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const discountCodeInputSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(32)
    .transform((c) => c.toUpperCase().replace(/\s+/g, ""))
    .refine((c) => /^[A-Z0-9_-]+$/.test(c), "Use letters, numbers, - or _"),
  percentOff: z.number().int().min(1).max(90),
  isActive: z.boolean().optional().default(true),
  maxUses: z.number().int().min(1).max(1_000_000).nullable().optional(),
  note: z.string().trim().max(200).optional().default(""),
  campaignId: z.string().uuid().nullable().optional(),
});

export type DiscountCodeInput = z.infer<typeof discountCodeInputSchema>;

export type ShopDiscountRow = {
  id: string;
  project_id: string;
  code: string;
  percent_off: number;
  is_active: boolean;
  max_uses: number | null;
  uses_count: number;
  campaign_id: string | null;
  note: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

export function normalizeDiscountCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Apply percent off to XOF amount (whole francs). */
export function applyPercentOff(amountXof: number, percentOff: number): number {
  if (!Number.isFinite(amountXof) || amountXof <= 0) return amountXof;
  const pct = Math.min(90, Math.max(1, Math.round(percentOff)));
  return Math.max(0, Math.round(amountXof * (1 - pct / 100)));
}

export async function resolveActiveDiscount(
  admin: SupabaseClient,
  projectId: string,
  rawCode: string | undefined | null,
): Promise<
  | { ok: true; discount: ShopDiscountRow }
  | { ok: false; error: string }
  | { ok: true; discount: null }
> {
  if (!rawCode?.trim()) return { ok: true, discount: null };
  const code = normalizeDiscountCode(rawCode);
  if (!code) return { ok: true, discount: null };

  const { data, error } = await admin
    .from("shop_discount_codes")
    .select(
      "id, project_id, code, percent_off, is_active, max_uses, uses_count, campaign_id, note, starts_at, ends_at, created_at",
    )
    .eq("project_id", projectId)
    .eq("code", code)
    .maybeSingle();

  if (error) {
    if (/does not exist|shop_discount/i.test(error.message)) {
      return { ok: false, error: "Discount codes need migration 044 — apply APPLY_SHOP_ORDERS.sql." };
    }
    return { ok: false, error: "Could not check discount code." };
  }
  if (!data || !data.is_active) {
    return { ok: false, error: "That discount code is not valid." };
  }
  const now = Date.now();
  if (data.starts_at && Date.parse(data.starts_at) > now) {
    return { ok: false, error: "That discount is not active yet." };
  }
  if (data.ends_at && Date.parse(data.ends_at) < now) {
    return { ok: false, error: "That discount has expired." };
  }
  if (data.max_uses != null && data.uses_count >= data.max_uses) {
    return { ok: false, error: "That discount has reached its use limit." };
  }
  return { ok: true, discount: data as ShopDiscountRow };
}

export async function incrementDiscountUse(
  admin: SupabaseClient,
  discountId: string,
): Promise<void> {
  const { data } = await admin
    .from("shop_discount_codes")
    .select("uses_count")
    .eq("id", discountId)
    .maybeSingle();
  if (!data) return;
  await admin
    .from("shop_discount_codes")
    .update({
      uses_count: (data.uses_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", discountId);
}
