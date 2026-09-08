import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

/** Merchant product code — UPC-A/EAN-ish or shop-local barcode. Digits / letters / - _ */
export const productUpcSchema = z
  .string()
  .trim()
  .max(32)
  .transform((s) => s.toUpperCase().replace(/\s+/g, ""))
  .refine((s) => s === "" || /^[A-Z0-9_-]{4,32}$/.test(s), "UPC must be 4–32 letters/numbers")
  .optional()
  .nullable();

export const productSkuSchema = z
  .string()
  .trim()
  .max(40)
  .transform((s) => s.toUpperCase().replace(/\s+/g, ""))
  .refine((s) => s === "" || /^[A-Z0-9._-]{1,40}$/.test(s), "SKU invalid")
  .optional()
  .nullable();

export function normalizeProductCode(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim().toUpperCase().replace(/\s+/g, "");
  return t || null;
}

/** Format: ORD-{4 project hex}-{5 digit seq} e.g. ORD-A1B2-00042 */
export function formatShopOrderNumber(projectId: string, seq: number): string {
  const hex = projectId.replace(/-/g, "").slice(0, 4).toUpperCase() || "KEBU";
  const n = Math.max(1, Math.min(seq, 99999));
  return `ORD-${hex}-${String(n).padStart(5, "0")}`;
}

/**
 * Allocate next order number for a project (service role).
 * Falls back to timestamp-based code if counters table is missing.
 */
export async function allocateShopOrderNumber(
  admin: SupabaseClient,
  projectId: string,
): Promise<string> {
  const { data: row, error } = await admin
    .from("shop_order_counters")
    .select("next_n")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error && /does not exist|shop_order_counters/i.test(error.message ?? "")) {
    return fallbackOrderNumber(projectId);
  }

  let seq = 1;
  if (!row) {
    const { error: insErr } = await admin.from("shop_order_counters").insert({
      project_id: projectId,
      next_n: 2,
      updated_at: new Date().toISOString(),
    });
    if (insErr) {
      if (/duplicate|unique/i.test(insErr.message ?? "")) {
        return allocateShopOrderNumber(admin, projectId);
      }
      return fallbackOrderNumber(projectId);
    }
    seq = 1;
  } else {
    seq = row.next_n ?? 1;
    const { data: updated, error: upErr } = await admin
      .from("shop_order_counters")
      .update({ next_n: seq + 1, updated_at: new Date().toISOString() })
      .eq("project_id", projectId)
      .eq("next_n", seq)
      .select("next_n")
      .maybeSingle();
    if (upErr || !updated) {
      return allocateShopOrderNumber(admin, projectId);
    }
  }

  return formatShopOrderNumber(projectId, seq);
}

function fallbackOrderNumber(projectId: string): string {
  const hex = projectId.replace(/-/g, "").slice(0, 4).toUpperCase() || "KEBU";
  const t = Date.now().toString(36).toUpperCase().slice(-5);
  const r = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `ORD-${hex}-${t}${r}`.slice(0, 24);
}
