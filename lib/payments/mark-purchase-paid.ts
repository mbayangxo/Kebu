/**
 * Shared "a provider confirmed this reference was paid" dispatcher for
 * every first-party purchase — tried by reference across creative asset
 * purchases, aesthetics/template purchases, and (last, unchanged) Shop
 * orders. Lets Wave/Paystack/PayPal's webhooks — which only ever knew how
 * to mark a Shop order paid — also confirm a marketplace purchase, without
 * touching how they confirm a Shop order (that call is wrapped exactly as
 * it was, as the final fallback).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { markShopOrderPaidByProviderRef } from "@/lib/shop/adapter-checkout";

export type KebuPurchasePaidResult =
  | { ok: true; kind: "creative_asset_purchase"; libraryId: string; assetId: string | null }
  | { ok: true; kind: "aesthetic_purchase"; libraryId: string; marketplaceId: string | null }
  | { ok: true; kind: "shop_order"; orderId: string; projectId: string }
  | { ok: false; error: string };

export async function markKebuPurchasePaid(
  admin: SupabaseClient,
  opts: { reference: string; paymentId?: string | null; provider?: string | null },
): Promise<KebuPurchasePaidResult> {
  const { data: asset } = await admin
    .from("creative_asset_library")
    .select("id")
    .eq("provider_reference", opts.reference)
    .maybeSingle();
  if (asset) {
    const { markCreativeAssetPurchasePaid } = await import("@/lib/studio/creative-assets-marketplace");
    const paid = await markCreativeAssetPurchasePaid(admin, opts.reference, opts.paymentId ?? null, opts.provider ?? null);
    if (!paid.ok) return paid;
    return { ok: true, kind: "creative_asset_purchase", libraryId: paid.libraryId, assetId: paid.assetId };
  }

  const { data: aesthetic } = await admin
    .from("aesthetic_library")
    .select("id")
    .eq("provider_reference", opts.reference)
    .maybeSingle();
  if (aesthetic) {
    const { markAestheticPurchasePaid } = await import("@/lib/create/aesthetics-marketplace");
    const paid = await markAestheticPurchasePaid(admin, opts.reference, opts.paymentId ?? null, opts.provider ?? null);
    if (!paid.ok) return paid;
    return { ok: true, kind: "aesthetic_purchase", libraryId: paid.libraryId, marketplaceId: paid.marketplaceId };
  }

  const shop = await markShopOrderPaidByProviderRef(admin, opts);
  if (!shop.ok) return shop;
  return { ok: true, kind: "shop_order", orderId: shop.orderId, projectId: shop.projectId };
}
