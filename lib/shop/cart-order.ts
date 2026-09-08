import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { allocateShopOrderNumber } from "@/lib/shop/codes";
import { applyPercentOff, resolveActiveDiscount, incrementDiscountUse } from "@/lib/shop/discounts";
import {
  giftCardApplyAmount,
  redeemGiftCardBalance,
  resolveActiveGiftCard,
} from "@/lib/shop/gift-cards";
import { parseXofFromLabel } from "@/lib/shop/joko-order";
import { SHOP_PAYMENT_PREFERENCES } from "@/lib/create/site-commerce";
import { quoteShippingCorridor } from "@/lib/shop/shipping-corridors";
import {
  giftColumnsForInsert,
  giftWhatsAppSuffix,
  shopGiftFieldsSchema,
  type ShopGiftFields,
} from "@/lib/shop/gift-order";

export const cartLineSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
});

export const shopCartCheckoutSchema = z
  .object({
    items: z.array(cartLineSchema).min(1).max(24),
    customerName: z.string().trim().min(1).max(80),
    customerPhone: z.string().trim().min(8).max(24),
    customerNote: z.string().trim().max(400).default(""),
    customerEmail: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().trim().email().max(254).optional(),
    ),
    paymentPreference: z.enum(SHOP_PAYMENT_PREFERENCES).optional().default("whatsapp"),
    discountCode: z
      .preprocess(
        (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
        z.string().trim().max(32).optional(),
      )
      .optional(),
    giftCardCode: z
      .preprocess(
        (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
        z.string().trim().max(32).optional(),
      )
      .optional(),
    sessionKey: z.string().trim().min(8).max(80).optional(),
    buyerCountry: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/)
      .optional(),
  })
  .and(shopGiftFieldsSchema);

export type ShopCartCheckoutInput = z.infer<typeof shopCartCheckoutSchema>;

export type ResolvedCartLine = {
  productId: string;
  variantId: string | null;
  variantName: string | null;
  productName: string;
  priceLabel: string;
  priceXof: number | null;
  upc: string | null;
  sku: string | null;
  quantity: number;
  lineAmountXof: number | null;
};

type CartLineInput = { productId: string; variantId?: string | null; quantity: number };

function cartMergeKey(it: CartLineInput): string {
  return `${it.productId}:${it.variantId ?? ""}`;
}

export async function resolveCartLines(
  admin: SupabaseClient,
  projectId: string,
  items: CartLineInput[],
): Promise<{ ok: true; lines: ResolvedCartLine[] } | { ok: false; error: string }> {
  const merged = new Map<string, CartLineInput>();
  for (const it of items) {
    const k = cartMergeKey(it);
    const prev = merged.get(k);
    merged.set(k, {
      productId: it.productId,
      variantId: it.variantId ?? null,
      quantity: (prev?.quantity ?? 0) + it.quantity,
    });
  }
  const linesIn = [...merged.values()];
  if (!linesIn.length) return { ok: false, error: "Cart is empty." };

  const ids = [...new Set(linesIn.map((l) => l.productId))];
  let { data: products, error } = await admin
    .from("project_products")
    .select("id, name, price_label, price_xof, upc, sku, is_active, has_variants")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .in("id", ids);

  if (error && /upc|sku|price_xof|has_variants/i.test(error.message ?? "")) {
    const fallback = await admin
      .from("project_products")
      .select("id, name, price_label, is_active")
      .eq("project_id", projectId)
      .eq("is_active", true)
      .in("id", ids);
    products = (fallback.data ?? []).map((p) => ({
      ...p,
      price_xof: null,
      upc: null,
      sku: null,
      has_variants: false,
    }));
    error = fallback.error;
  }

  if (error) return { ok: false, error: "Could not load cart products." };
  if (!products?.length) return { ok: false, error: "No products in cart are for sale." };

  const variantIds = linesIn.map((l) => l.variantId).filter((v): v is string => Boolean(v));
  let variants: {
    id: string;
    product_id: string;
    name: string;
    option1: string;
    option2: string;
    option3: string;
    price_label: string;
    price_xof: number | null;
    sku: string | null;
    is_active: boolean;
  }[] = [];
  if (variantIds.length) {
    const { data: variantRows } = await admin
      .from("project_product_variants")
      .select("id, product_id, name, option1, option2, option3, price_label, price_xof, sku, is_active")
      .eq("project_id", projectId)
      .in("id", variantIds)
      .eq("is_active", true);
    variants = variantRows ?? [];
  }
  const byVariant = new Map(variants.map((v) => [v.id, v]));

  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: ResolvedCartLine[] = [];
  for (const item of linesIn) {
    const p = byId.get(item.productId);
    if (!p) return { ok: false, error: "A product in your cart is no longer for sale." };
    const hasVariants = Boolean((p as { has_variants?: boolean }).has_variants);
    if (hasVariants && !item.variantId) {
      return { ok: false, error: `Choose a variant for ${p.name}.` };
    }
    const variant = item.variantId ? byVariant.get(item.variantId) : null;
    if (item.variantId && (!variant || variant.product_id !== p.id)) {
      return { ok: false, error: "A variant in your cart is no longer available." };
    }
    const variantName = variant
      ? [variant.option1, variant.option2, variant.option3].filter(Boolean).join(" / ") || variant.name
      : null;
    const priceLabel = variant?.price_label || p.price_label || "";
    const unitXof =
      typeof variant?.price_xof === "number"
        ? variant.price_xof
        : typeof p.price_xof === "number"
          ? p.price_xof
          : parseXofFromLabel(priceLabel || p.price_label);
    const qty = Math.min(20, item.quantity);
    const displayName = variantName ? `${p.name} (${variantName})` : p.name;
    lines.push({
      productId: p.id,
      variantId: variant?.id ?? null,
      variantName,
      productName: displayName,
      priceLabel,
      priceXof: unitXof,
      upc: typeof p.upc === "string" ? p.upc : null,
      sku: typeof variant?.sku === "string" ? variant.sku : typeof p.sku === "string" ? p.sku : null,
      quantity: qty,
      lineAmountXof: unitXof != null ? unitXof * qty : null,
    });
  }
  return { ok: true, lines };
}

export function cartWhatsAppMessage(opts: {
  orderNumber: string;
  lines: ResolvedCartLine[];
  customerName: string;
  customerNote: string;
  paymentPreference?: string;
  discountCode?: string | null;
  discountPercent?: number | null;
  giftCardCode?: string | null;
  giftCardAmountXof?: number | null;
  isGift?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  giftMessage?: string;
}): string {
  const lines = opts.lines
    .map((l) => {
      const price = l.priceLabel ? ` (${l.priceLabel})` : "";
      const upc = l.upc ? ` UPC ${l.upc}` : "";
      return `${l.quantity}× ${l.productName}${price}${upc}`;
    })
    .join("\n");
  const note = opts.customerNote.trim() ? `\nNote: ${opts.customerNote.trim()}` : "";
  const pay = opts.paymentPreference ? `\nPay preference: ${opts.paymentPreference}` : "";
  const disc =
    opts.discountCode && opts.discountPercent
      ? `\nDiscount: ${opts.discountCode} (−${opts.discountPercent}%)`
      : "";
  const gc =
    opts.giftCardCode && opts.giftCardAmountXof
      ? `\nGift card ${opts.giftCardCode}: −${opts.giftCardAmountXof} XOF`
      : "";
  const gift = giftWhatsAppSuffix(opts);
  return `Hi — I placed a Kebu shop order ${opts.orderNumber}.\n${lines}\nFrom: ${opts.customerName}${pay}${disc}${gc}${note}${gift}`;
}

export async function createCartOrder(opts: {
  admin: SupabaseClient;
  projectId: string;
  lines: ResolvedCartLine[];
  customerName: string;
  customerPhone: string;
  customerNote: string;
  customerEmail: string | null;
  paymentPreference: string;
  discountCode?: string | null;
  giftCardCode?: string | null;
  customerUserId?: string | null;
  gift?: ShopGiftFields;
  buyerCountry?: string | null;
  sellerCountry?: string | null;
}): Promise<
  | {
      ok: true;
      orderId: string;
      orderNumber: string;
      amountXof: number | null;
      discountPercent: number | null;
      discountCode: string | null;
      giftCardCode: string | null;
      giftCardAmountXof: number | null;
      giftPublicId: string | null;
    }
  | { ok: false; error: string }
> {
  const discountResult = await resolveActiveDiscount(
    opts.admin,
    opts.projectId,
    opts.discountCode,
  );
  if (!discountResult.ok) return { ok: false, error: discountResult.error };
  const discount = discountResult.discount;

  const giftCardResult = await resolveActiveGiftCard(
    opts.admin,
    opts.projectId,
    opts.giftCardCode,
  );
  if (!giftCardResult.ok) return { ok: false, error: giftCardResult.error };
  const giftCard = giftCardResult.card;

  const orderNumber = await allocateShopOrderNumber(opts.admin, opts.projectId);
  const primary = opts.lines[0]!;
  let totalXof: number | null = opts.lines.every((l) => l.lineAmountXof != null)
    ? opts.lines.reduce((s, l) => s + (l.lineAmountXof ?? 0), 0)
    : null;
  const beforeDiscount = totalXof;
  if (totalXof != null && discount) {
    totalXof = applyPercentOff(totalXof, discount.percent_off);
  }

  let giftCardAmount = 0;
  if (giftCard && totalXof != null) {
    giftCardAmount = giftCardApplyAmount(giftCard.balance_xof, totalXof);
    totalXof = Math.max(0, totalXof - giftCardAmount);
  } else if (giftCard && totalXof == null) {
    return {
      ok: false,
      error: "Gift cards need XOF prices on products. Add prices in Shop, then try again.",
    };
  }

  const gift = opts.gift ?? { isGift: false, recipientName: "", recipientPhone: "", giftMessage: "" };
  const giftCols = giftColumnsForInsert(gift);
  const sellerCountry = (opts.sellerCountry ?? "SN").toUpperCase();
  const shippingQuote = opts.buyerCountry
    ? quoteShippingCorridor({
        fromCountry: sellerCountry,
        toCountry: opts.buyerCountry,
        goodsValueXof: totalXof,
      })
    : null;

  const insertOrder: Record<string, unknown> = {
    project_id: opts.projectId,
    product_id: primary.productId,
    product_name:
      opts.lines.length === 1
        ? primary.productName
        : `${opts.lines.length} items (cart)`,
    price_label: primary.priceLabel,
    quantity: opts.lines.reduce((s, l) => s + l.quantity, 0),
    customer_name: opts.customerName,
    customer_phone: opts.customerPhone,
    customer_note: [
      opts.customerNote,
      shippingQuote
        ? `Shipping: ${shippingQuote.summary} [${shippingQuote.trustLabel}]`
        : opts.buyerCountry
          ? `Ship to: ${opts.buyerCountry} (no corridor quote yet)`
          : "",
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 400),
    payment_preference: opts.paymentPreference,
    status: "pending",
    channel: "whatsapp",
    order_number: orderNumber,
    ...giftCols,
  };
  if (opts.customerEmail) insertOrder.customer_email = opts.customerEmail;
  if (opts.customerUserId) insertOrder.customer_user_id = opts.customerUserId;
  if (primary.upc) insertOrder.product_upc = primary.upc;
  if (primary.sku) insertOrder.product_sku = primary.sku;
  if (discount) {
    insertOrder.discount_code = discount.code;
    insertOrder.discount_percent = discount.percent_off;
  }
  if (giftCard && giftCardAmount > 0) {
    insertOrder.gift_card_code = giftCard.code;
    insertOrder.gift_card_amount_xof = giftCardAmount;
  }
  if (beforeDiscount != null) insertOrder.amount_xof_before_discount = beforeDiscount;
  if (totalXof != null) insertOrder.amount_xof = totalXof;
  if (opts.buyerCountry) insertOrder.buyer_country_code = opts.buyerCountry.toUpperCase();
  if (shippingQuote) {
    insertOrder.shipping_amount_xof = shippingQuote.amountXof;
    insertOrder.shipping_eta_min_days = shippingQuote.etaMinDays;
    insertOrder.shipping_eta_max_days = shippingQuote.etaMaxDays;
    insertOrder.shipping_corridor = shippingQuote.corridor;
    insertOrder.shipping_trust_label = shippingQuote.trustLabel;
    insertOrder.shipping_quote_version = shippingQuote.quoteVersion;
  }

  const { data: order, error } = await opts.admin
    .from("shop_orders")
    .insert(insertOrder)
    .select("id, order_number, gift_public_id")
    .single();

  if (error || !order) {
    return {
      ok: false,
      error: error?.message?.includes("does not exist")
        ? "Orders table missing. Apply APPLY_SHOP_ORDERS.sql."
        : error?.message?.includes("is_gift") || error?.message?.includes("recipient_")
          ? "Gift columns missing. Apply 059_shop_gift_orders.sql."
          : error?.message?.includes("gift_card")
            ? "Gift card columns missing. Apply migration 066."
            : "Could not save cart order.",
    };
  }

  const itemRows = opts.lines.map((l, i) => ({
    order_id: order.id,
    project_id: opts.projectId,
    product_id: l.productId,
    variant_id: l.variantId,
    variant_name: l.variantName,
    product_name: l.productName,
    product_upc: l.upc,
    product_sku: l.sku,
    price_label: l.priceLabel,
    price_xof: l.priceXof,
    quantity: l.quantity,
    line_amount_xof: l.lineAmountXof,
    sort_order: i,
  }));

  const { error: itemsErr } = await opts.admin.from("shop_order_items").insert(itemRows);
  if (itemsErr && !/does not exist|shop_order_items/i.test(itemsErr.message ?? "")) {
    /* order header exists — items optional until migration applied */
  }

  if (giftCard && giftCardAmount > 0) {
    const redeemed = await redeemGiftCardBalance(
      opts.admin,
      giftCard.id,
      giftCard.balance_xof,
      giftCardAmount,
    );
    if (!redeemed.ok) {
      await opts.admin.from("shop_orders").delete().eq("id", order.id);
      return { ok: false, error: redeemed.error };
    }
  }

  if (discount) {
    try {
      await incrementDiscountUse(opts.admin, discount.id);
    } catch {
      /* best-effort */
    }
  }

  try {
    const { upsertShopCustomerAfterOrder } = await import("@/lib/shop/customer-profiles");
    await upsertShopCustomerAfterOrder(opts.admin, {
      projectId: opts.projectId,
      phone: opts.customerPhone,
      email: opts.customerEmail ?? null,
    });
  } catch {
    /* profile build best-effort */
  }

  return {
    ok: true,
    orderId: order.id,
    orderNumber: order.order_number ?? orderNumber,
    amountXof: totalXof,
    discountPercent: discount?.percent_off ?? null,
    discountCode: discount?.code ?? null,
    giftCardCode: giftCard && giftCardAmount > 0 ? giftCard.code : null,
    giftCardAmountXof: giftCardAmount > 0 ? giftCardAmount : null,
    giftPublicId:
      typeof order.gift_public_id === "string" ? order.gift_public_id : null,
  };
}

export async function upsertCartDraft(opts: {
  admin: SupabaseClient;
  projectId: string;
  subdomain: string;
  sessionKey: string;
  items: { productId: string; quantity: number }[];
  customerEmail?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  discountCode?: string | null;
  customerUserId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const row: Record<string, unknown> = {
    project_id: opts.projectId,
    subdomain: opts.subdomain,
    session_key: opts.sessionKey,
    items: opts.items,
    customer_email: opts.customerEmail ?? null,
    customer_name: opts.customerName ?? null,
    customer_phone: opts.customerPhone ?? null,
    discount_code: opts.discountCode ?? null,
    status: "open",
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (opts.customerUserId) row.customer_user_id = opts.customerUserId;

  const { error } = await opts.admin.from("shop_cart_drafts").upsert(row, {
    onConflict: "project_id,session_key",
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function markCartDraftConverted(
  admin: SupabaseClient,
  projectId: string,
  sessionKey: string | undefined,
  orderId: string,
): Promise<void> {
  if (!sessionKey) return;
  await admin
    .from("shop_cart_drafts")
    .update({
      status: "converted",
      converted_order_id: orderId,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .eq("session_key", sessionKey);
}
