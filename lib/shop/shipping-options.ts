import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ShippingFulfillmentType = "self" | "joko_fulfillment";

export type ShippingOptionRow = {
  id: string;
  project_id: string;
  label: string;
  amount_xof: number;
  eta_min_days: number | null;
  eta_max_days: number | null;
  active: boolean;
  sort_order: number;
  fulfillment_type: ShippingFulfillmentType;
  commission_bps: number | null;
};

export const shippingOptionInputSchema = z.object({
  label: z.string().trim().min(1).max(80),
  amountXof: z.coerce.number().int().min(0).max(5_000_000),
  etaMinDays: z.coerce.number().int().min(0).max(60).optional().nullable(),
  etaMaxDays: z.coerce.number().int().min(0).max(60).optional().nullable(),
  active: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).optional().default(0),
  // "self" (seller handles their own delivery, the long-standing default) or
  // "joko_fulfillment" (Kebu picks up and delivers — see lib/shop/joko-fulfillment.ts
  // for the honest scope of what that actually means today).
  fulfillmentType: z.enum(["self", "joko_fulfillment"]).optional().default("self"),
  commissionBps: z.coerce.number().int().min(0).max(10_000).optional().nullable(),
});

export type ShippingOptionInput = z.infer<typeof shippingOptionInputSchema>;

function tableMissing(message: string | undefined): boolean {
  return Boolean(message?.includes("does not exist") || message?.includes("schema cache"));
}

/** Merchant-side: list every shipping option for a project, active or not. */
export async function listShippingOptions(
  db: SupabaseClient,
  projectId: string,
): Promise<ShippingOptionRow[]> {
  const { data, error } = await db
    .from("shop_shipping_options")
    .select(
      "id, project_id, label, amount_xof, eta_min_days, eta_max_days, active, sort_order, fulfillment_type, commission_bps",
    )
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    if (tableMissing(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as ShippingOptionRow[];
}

/** Public checkout-side: only options the seller has marked active, via the service-role client. */
export async function listActiveShippingOptions(
  admin: SupabaseClient,
  projectId: string,
): Promise<ShippingOptionRow[]> {
  const { data, error } = await admin
    .from("shop_shipping_options")
    .select(
      "id, project_id, label, amount_xof, eta_min_days, eta_max_days, active, sort_order, fulfillment_type, commission_bps",
    )
    .eq("project_id", projectId)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    if (tableMissing(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []) as ShippingOptionRow[];
}

export async function createShippingOption(
  db: SupabaseClient,
  projectId: string,
  input: ShippingOptionInput,
): Promise<{ ok: true; option: ShippingOptionRow } | { ok: false; error: string }> {
  const { data, error } = await db
    .from("shop_shipping_options")
    .insert({
      project_id: projectId,
      label: input.label,
      amount_xof: input.amountXof,
      eta_min_days: input.etaMinDays ?? null,
      eta_max_days: input.etaMaxDays ?? null,
      active: input.active,
      sort_order: input.sortOrder,
      fulfillment_type: input.fulfillmentType,
      commission_bps: input.fulfillmentType === "joko_fulfillment" ? input.commissionBps ?? null : null,
    })
    .select(
      "id, project_id, label, amount_xof, eta_min_days, eta_max_days, active, sort_order, fulfillment_type, commission_bps",
    )
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, option: data as ShippingOptionRow };
}

export async function updateShippingOption(
  db: SupabaseClient,
  projectId: string,
  optionId: string,
  input: Partial<ShippingOptionInput>,
): Promise<{ ok: true; option: ShippingOptionRow } | { ok: false; error: string }> {
  const patch: Record<string, unknown> = {};
  if (input.label !== undefined) patch.label = input.label;
  if (input.amountXof !== undefined) patch.amount_xof = input.amountXof;
  if (input.etaMinDays !== undefined) patch.eta_min_days = input.etaMinDays ?? null;
  if (input.etaMaxDays !== undefined) patch.eta_max_days = input.etaMaxDays ?? null;
  if (input.active !== undefined) patch.active = input.active;
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
  if (input.fulfillmentType !== undefined) {
    patch.fulfillment_type = input.fulfillmentType;
    if (input.fulfillmentType === "self") patch.commission_bps = null;
  }
  if (input.commissionBps !== undefined) patch.commission_bps = input.commissionBps ?? null;

  // project_id is matched in the filter, never in the patch — prevents
  // reassigning an option to a different project even if a policy were
  // ever loosened to allow writing rows outside .eq("project_id", ...).
  const { data, error } = await db
    .from("shop_shipping_options")
    .update(patch)
    .eq("id", optionId)
    .eq("project_id", projectId)
    .select(
      "id, project_id, label, amount_xof, eta_min_days, eta_max_days, active, sort_order, fulfillment_type, commission_bps",
    )
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Shipping option not found." };
  return { ok: true, option: data as ShippingOptionRow };
}

export async function deleteShippingOption(
  db: SupabaseClient,
  projectId: string,
  optionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await db
    .from("shop_shipping_options")
    .delete()
    .eq("id", optionId)
    .eq("project_id", projectId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * The one function the checkout path may call. Looks up the real row by id,
 * scoped to this project — the client only ever sends an id, never a price;
 * a tampered or mismatched id for this project yields null, which the caller
 * must treat as "no shipping charge", never as "use the client's number."
 */
export async function resolveShippingOptionForOrder(
  admin: SupabaseClient,
  projectId: string,
  shippingOptionId: string | null | undefined,
): Promise<{
  id: string;
  label: string;
  amountXof: number;
  fulfillmentType: ShippingFulfillmentType;
  commissionBps: number | null;
} | null> {
  if (!shippingOptionId) return null;
  const { data, error } = await admin
    .from("shop_shipping_options")
    .select("id, label, amount_xof, fulfillment_type, commission_bps")
    .eq("id", shippingOptionId)
    .eq("project_id", projectId)
    .eq("active", true)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id as string,
    label: data.label as string,
    amountXof: data.amount_xof as number,
    fulfillmentType: (data.fulfillment_type as ShippingFulfillmentType | null) ?? "self",
    commissionBps: (data.commission_bps as number | null) ?? null,
  };
}
