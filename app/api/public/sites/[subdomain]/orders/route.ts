import { NextResponse } from "next/server";
import { shopOrderRateLimit } from "@/lib/api-guard";
import { logCreate } from "@/lib/create/auth";
import { resolveMerchantWhatsApp } from "@/lib/create/site-commerce";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import type { SiteSeo } from "@/lib/create/site-seo";
import { kebuTransferHeaders, parseDataModeHeader } from "@/lib/create/kb-budget";
import {
  shopOrderInputSchema,
  shopOrderMboloHref,
  shopOrderWhatsAppHref,
  shopOrderWhatsAppMessage,
} from "@/lib/shop/create-order";
import { giftColumnsForInsert, giftPublicPath } from "@/lib/shop/gift-order";
import { upsertOrderSubscriber } from "@/lib/shop/customers";
import {
  applyPercentOff,
  incrementDiscountUse,
  resolveActiveDiscount,
} from "@/lib/shop/discounts";
import { parseXofFromLabel } from "@/lib/shop/joko-order";
import { startShopOrderProviderCheckout } from "@/lib/shop/adapter-checkout";
import { allocateShopOrderNumber } from "@/lib/shop/codes";
import { decrementProductStock, restoreProductStock } from "@/lib/shop/stock";
import { createServiceClient } from "@/lib/opportunity/admin";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { notifyShopOwnerOfOrder, resolveOrderChannel } from "@/lib/shop/notify-owner";
import {
  railFromPaymentPreference,
  recordPaymentLedgerEvent,
} from "@/lib/shop/payment-ledger";
import { quoteShippingCorridor } from "@/lib/shop/shipping-corridors";
import { enrollInFlows } from "@/lib/email/automation-flows";
import { createDigitalDownload, emailDownloadLink } from "@/lib/shop/digital-downloads";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ subdomain: string }> };

/** Customer places an order on a live published site. Does not mark payment complete. */
export async function POST(req: Request, { params }: Params) {
  const limited = shopOrderRateLimit(req);
  if (limited) return limited;

  const { subdomain: raw } = await params;
  const subdomain = raw.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(subdomain) || subdomain.length < 3) {
    return NextResponse.json({ error: "Invalid site address." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = shopOrderInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const { data: live } = await admin
    .from("deployments")
    .select("id, project_id, snapshot, status")
    .eq("subdomain", subdomain)
    .eq("status", "live")
    .maybeSingle();

  if (!live?.project_id) {
    return NextResponse.json({ error: "Site is not live." }, { status: 404 });
  }

  let { data: product, error: productError } = await admin
    .from("project_products")
    .select("id, project_id, name, price_label, price_xof, upc, sku, track_stock, stock_qty, is_active")
    .eq("id", parsed.data.productId)
    .eq("project_id", live.project_id)
    .eq("is_active", true)
    .maybeSingle();
  if (productError && /track_stock|stock_qty/i.test(productError.message ?? "")) {
    const midStock = await admin
      .from("project_products")
      .select("id, project_id, name, price_label, price_xof, upc, sku, is_active")
      .eq("id", parsed.data.productId)
      .eq("project_id", live.project_id)
      .eq("is_active", true)
      .maybeSingle();
    product = midStock.data
      ? { ...midStock.data, track_stock: false, stock_qty: null }
      : null;
    productError = midStock.error;
  }
  if (productError && /upc|sku/i.test(productError.message ?? "")) {
    const mid = await admin
      .from("project_products")
      .select("id, project_id, name, price_label, price_xof, is_active")
      .eq("id", parsed.data.productId)
      .eq("project_id", live.project_id)
      .eq("is_active", true)
      .maybeSingle();
    product = mid.data
      ? { ...mid.data, upc: null, sku: null, track_stock: false, stock_qty: null }
      : null;
    productError = mid.error;
  }
  if (productError && /price_xof/i.test(productError.message ?? "")) {
    const fallback = await admin
      .from("project_products")
      .select("id, project_id, name, price_label, is_active")
      .eq("id", parsed.data.productId)
      .eq("project_id", live.project_id)
      .eq("is_active", true)
      .maybeSingle();
    product = fallback.data
      ? {
          ...fallback.data,
          price_xof: null,
          upc: null,
          sku: null,
          track_stock: false,
          stock_qty: null,
        }
      : null;
    productError = fallback.error;
  }

  if (productError || !product) {
    return NextResponse.json({ error: "That product is not for sale on this site." }, { status: 404 });
  }

  let soldName = product.name;
  let soldPriceLabel = product.price_label ?? "";
  let soldPriceXof = typeof product.price_xof === "number" ? product.price_xof : parseXofFromLabel(product.price_label);
  let soldSku = typeof product.sku === "string" ? product.sku : null;
  let variantId: string | null = parsed.data.variantId ?? null;

  if (variantId) {
    const { data: variant } = await admin
      .from("project_product_variants")
      .select("id, product_id, name, option1, option2, option3, price_label, price_xof, sku, is_active")
      .eq("id", variantId)
      .eq("product_id", product.id)
      .eq("is_active", true)
      .maybeSingle();
    if (!variant) {
      return NextResponse.json({ error: "That variant is not available." }, { status: 404 });
    }
    const vLabel = [variant.option1, variant.option2, variant.option3].filter(Boolean).join(" / ") || variant.name;
    soldName = `${product.name} (${vLabel})`;
    soldPriceLabel = variant.price_label || soldPriceLabel;
    soldPriceXof =
      typeof variant.price_xof === "number" ? variant.price_xof : parseXofFromLabel(soldPriceLabel);
    soldSku = typeof variant.sku === "string" ? variant.sku : soldSku;
  }

  if (!admin || !live?.project_id) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const svc = admin;
  const dep = live;
  const sold = product;
  const input = parsed.data;

  let customerUserId: string | null = null;
  try {
    const browser = await createServerSupabase();
    const {
      data: { user: shopper },
    } = await browser.auth.getUser();
    if (shopper?.id) customerUserId = shopper.id;
  } catch {
    /* guest checkout OK */
  }

  const customerEmail = input.customerEmail?.trim().toLowerCase() || null;

  const stockCheck = await decrementProductStock(svc, sold.id, input.quantity);
  if (!stockCheck.ok) {
    return NextResponse.json({ error: stockCheck.error }, { status: 409 });
  }

  const { data: projectRow } = await svc
    .from("projects")
    .select("id, country_code, title, owner_id, business_id")
    .eq("id", dep.project_id)
    .maybeSingle();

  const discountResult = await resolveActiveDiscount(
    svc,
    dep.project_id,
    input.discountCode,
  );
  if (!discountResult.ok) {
    return NextResponse.json({ error: discountResult.error }, { status: 400 });
  }
  const discount = discountResult.discount;

  const productUpc =
    typeof (sold as { upc?: string | null }).upc === "string"
      ? (sold as { upc: string }).upc
      : null;
  const productSku = soldSku;

  const orderNumber = await allocateShopOrderNumber(svc, dep.project_id);

  const orderChannel = resolveOrderChannel({
    paymentPreference: input.paymentPreference,
    clientChannel: input.clientChannel,
  });

  const sellerCountry =
    typeof projectRow?.country_code === "string" && projectRow.country_code.trim()
      ? projectRow.country_code.trim().toUpperCase()
      : "SN";
  const shippingQuote =
    input.buyerCountry
      ? quoteShippingCorridor({
          fromCountry: sellerCountry,
          toCountry: input.buyerCountry,
          goodsValueXof:
            soldPriceXof != null ? soldPriceXof * input.quantity : null,
        })
      : null;

  const insertBase: Record<string, unknown> = {
    project_id: dep.project_id,
    product_id: sold.id,
    product_name: soldName,
    price_label: soldPriceLabel,
    quantity: input.quantity,
    customer_name: input.customerName,
    customer_phone: input.customerPhone,
    customer_note: [
      input.customerNote ?? "",
      shippingQuote
        ? `Shipping: ${shippingQuote.summary} [${shippingQuote.trustLabel}]`
        : input.buyerCountry
          ? `Ship to: ${input.buyerCountry} (no corridor quote yet)`
          : "",
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 400),
    payment_preference: input.paymentPreference ?? "whatsapp",
    status: "pending" as const,
    channel: orderChannel,
    order_number: orderNumber,
    ...giftColumnsForInsert(input),
  };
  if (customerUserId) insertBase.customer_user_id = customerUserId;
  if (customerEmail) insertBase.customer_email = customerEmail;
  if (productUpc) insertBase.product_upc = productUpc;
  if (productSku) insertBase.product_sku = productSku;
  if (discount) {
    insertBase.discount_code = discount.code;
    insertBase.discount_percent = discount.percent_off;
  }
  if (input.buyerCountry) insertBase.buyer_country_code = input.buyerCountry;
  if (shippingQuote) {
    insertBase.shipping_amount_xof = shippingQuote.amountXof;
    insertBase.shipping_eta_min_days = shippingQuote.etaMinDays;
    insertBase.shipping_eta_max_days = shippingQuote.etaMaxDays;
    insertBase.shipping_corridor = shippingQuote.corridor;
    insertBase.shipping_trust_label = shippingQuote.trustLabel;
    insertBase.shipping_quote_version = shippingQuote.quoteVersion;
  }

  const { data: order, error } = await svc
    .from("shop_orders")
    .insert(insertBase)
    .select("id, order_number, gift_public_id")
    .single();

  async function afterOrderSaved(
    orderId: string,
    savedOrderNumber: string | null,
    giftPublicId: string | null = null,
  ) {
    const unitXof = soldPriceXof;
    const { error: itemErr } = await svc.from("shop_order_items").insert({
      order_id: orderId,
      project_id: dep.project_id,
      product_id: sold.id,
      variant_id: variantId,
      variant_name: variantId && product ? soldName.slice(product.name.length + 2, -1) : null,
      product_name: soldName,
      product_upc: productUpc,
      product_sku: productSku,
      price_label: soldPriceLabel,
      price_xof: unitXof,
      quantity: input.quantity,
      line_amount_xof: unitXof != null ? unitXof * input.quantity : null,
      sort_order: 0,
    });
    if (itemErr && !/does not exist|shop_order_items/i.test(itemErr.message ?? "")) {
      logCreate("shop.order_item_failed", { orderId, message: itemErr.message });
    }

    if (discount) {
      try {
        await incrementDiscountUse(svc, discount.id);
      } catch {
        /* best-effort */
      }
    }
    if (customerEmail && projectRow?.business_id) {
      try {
        await upsertOrderSubscriber(svc, {
          businessId: projectRow.business_id as string,
          projectId: dep.project_id,
          email: customerEmail,
          name: input.customerName,
        });
      } catch {
        /* list is best-effort — order already saved */
      }
      // Enroll in order_placed flows (fire-and-forget)
      void enrollInFlows(svc, {
        businessId: projectRow.business_id as string,
        trigger: "order_placed",
        email: customerEmail,
        context: {
          subscriberName: input.customerName,
          productName: soldName,
          orderTotal: soldPriceLabel,
        },
      });
    }

    // Digital product: create download token + send email
    try {
      const { data: digitalProduct } = await svc
        .from("project_products")
        .select("id, is_digital, digital_file_path, digital_file_name, digital_dl_limit, digital_expires_hours")
        .eq("id", sold.id)
        .maybeSingle();

      if (digitalProduct?.is_digital && digitalProduct.digital_file_path && customerEmail) {
        const dlResult = await createDigitalDownload(svc, {
          orderId,
          projectId: dep.project_id,
          product: digitalProduct as Parameters<typeof createDigitalDownload>[1]["product"],
        });
        if (dlResult.ok) {
          const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://kebu.app"}/api/dl/${dlResult.token}`;
          const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;
          if (fromEmail) {
            void emailDownloadLink({
              to: customerEmail,
              shopName: (projectRow as { title?: string | null })?.title ?? "Kebu",
              productName: soldName,
              downloadUrl,
              expiresAt: new Date(Date.now() + digitalProduct.digital_expires_hours * 60 * 60 * 1000).toISOString(),
              maxDownloads: digitalProduct.digital_dl_limit,
              from: fromEmail,
            });
          }
          logCreate("shop.digital_download_created", { orderId, productId: sold.id });
        }
      }
    } catch {
      /* digital delivery is best-effort — physical order still succeeds */
    }
    try {
      const { upsertShopCustomerAfterOrder } = await import("@/lib/shop/customer-profiles");
      await upsertShopCustomerAfterOrder(svc, {
        projectId: dep.project_id,
        phone: input.customerPhone,
        email: customerEmail ?? null,
      });
    } catch {
      /* profile best-effort */
    }
    const snapshot = dep.snapshot as WebsiteDefinition | null;
    const merchantPhone = snapshot
      ? resolveMerchantWhatsApp(snapshot, snapshot.seo as SiteSeo | undefined)
      : "";
    const snapshotCommerce =
      snapshot?.seo && typeof snapshot.seo === "object"
        ? (snapshot.seo as SiteSeo).commerce
        : null;
    const merchantMboloNumber = snapshotCommerce?.mboloNumber?.trim() || merchantPhone;
    const message = shopOrderWhatsAppMessage({
      orderId,
      orderNumber: savedOrderNumber,
      productName: soldName,
      productUpc,
      quantity: input.quantity,
      priceLabel: sold.price_label ?? "",
      customerName: input.customerName,
      customerNote: input.customerNote ?? "",
      paymentPreference: input.paymentPreference,
      discountCode: discount?.code,
      discountPercent: discount?.percent_off,
      isGift: input.isGift,
      recipientName: input.recipientName,
      recipientPhone: input.recipientPhone,
      giftMessage: input.giftMessage,
    });
    logCreate("shop.order_created", {
      projectId: dep.project_id,
      orderId,
      orderNumber: savedOrderNumber,
      productId: sold.id,
      discountCode: discount?.code,
      isGift: Boolean(input.isGift),
      channel: orderChannel,
    });

    try {
      const { data: projectOwner } = await svc
        .from("projects")
        .select("id, owner_id, title")
        .eq("id", dep.project_id)
        .maybeSingle();
      if (projectOwner?.owner_id) {
        let ownerEmail: string | null = null;
        try {
          const { data: authUser } = await svc.auth.admin.getUserById(projectOwner.owner_id);
          ownerEmail = authUser.user?.email ?? null;
        } catch {
          /* admin API may be unavailable */
        }
        const seoCommerce =
          snapshot?.seo && typeof snapshot.seo === "object"
            ? (snapshot.seo as SiteSeo).commerce
            : null;
        await notifyShopOwnerOfOrder(svc, {
          projectId: dep.project_id,
          ownerId: projectOwner.owner_id,
          orderId,
          orderNumber: savedOrderNumber,
          businessName: String(projectOwner.title || subdomain),
          productName: soldName,
          quantity: input.quantity,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          paymentPreference: input.paymentPreference ?? "whatsapp",
          channel: orderChannel,
          ownerEmail,
          ownerNotifyPhone: seoCommerce?.merchantWhatsApp || merchantPhone || null,
        });
      }
    } catch {
      /* notify best-effort */
    }

    await recordPaymentLedgerEvent(svc, {
      projectId: dep.project_id,
      orderId,
      rail: railFromPaymentPreference(input.paymentPreference),
      eventType: "intent",
      amountXof: unitXof != null ? unitXof * input.quantity : null,
      currency: input.paymentPreference === "joko" ? "CAURIS" : "XOF",
      provider: input.paymentPreference ?? "whatsapp",
      meta: { channel: orderChannel, quantity: input.quantity },
    });

    let paymentUrl: string | undefined;
    let paymentMessage: string | undefined;
    const livePref = ["joko", "paypal", "card", "mobile_money"].includes(
      input.paymentPreference ?? "",
    );
    if (livePref) {
      let amountXof = unitXof != null ? unitXof * input.quantity : null;
      if (amountXof != null && discount) {
        const before = amountXof;
        amountXof = applyPercentOff(amountXof, discount.percent_off);
        await svc
          .from("shop_orders")
          .update({
            amount_xof_before_discount: before,
            amount_xof: amountXof,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);
      }
      if (amountXof == null || amountXof <= 0) {
        paymentMessage =
          "Order saved. Add a numeric XOF price on the product for live checkout — or confirm on WhatsApp.";
      } else {
        const base =
          process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
        const started = await startShopOrderProviderCheckout({
          admin: svc,
          orderId,
          projectId: dep.project_id,
          amountXof,
          productName: soldName,
          customerEmail,
          customerPhone: input.customerPhone,
          paymentPreference: input.paymentPreference ?? "whatsapp",
          appUrl: base,
        });
        if (started.ok) {
          paymentUrl = started.paymentUrl;
          paymentMessage = discount
            ? `Order saved with ${discount.percent_off}% off. Complete ${started.provider} payment — paid only after webhook.`
            : `Order saved. Complete ${started.provider} payment — paid only after the webhook confirms.`;
        } else if (started.fallbackInstructions) {
          paymentMessage = `Order saved. ${started.error}`;
        } else {
          paymentMessage = `Order saved. Checkout failed: ${started.error}`;
        }
      }
    }

    const giftPath = giftPublicId ? giftPublicPath(giftPublicId) : null;
    const giftHint = giftPath
      ? ` Gift link for recipient: ${giftPath}`
      : "";
    const body = {
      orderId,
      orderNumber: savedOrderNumber,
      status: "pending" as const,
      paid: false as const,
      paymentPreference: input.paymentPreference ?? "whatsapp",
      discountCode: discount?.code,
      discountPercent: discount?.percent_off,
      productUpc,
      paymentUrl,
      whatsappHref: shopOrderWhatsAppHref(merchantPhone, message),
      mboloHref: input.paymentPreference === "mbolo"
        ? shopOrderMboloHref(merchantMboloNumber, message)
        : undefined,
      giftPublicId,
      giftPath,
      isGift: Boolean(input.isGift),
      message:
        (paymentMessage ??
          (discount
            ? `Order ${savedOrderNumber ?? "saved"} with ${discount.percent_off}% off (${discount.code}). Confirm on WhatsApp — not paid yet.`
            : `Order ${savedOrderNumber ?? "saved"}. Chat on WhatsApp to confirm — this is not a paid checkout yet.`)) +
        giftHint,
      emailCaptured: Boolean(customerEmail && projectRow?.business_id),
    };
    const bodyBytes = Buffer.byteLength(JSON.stringify(body), "utf8");
    const dataMode = parseDataModeHeader(req);
    return NextResponse.json(body, {
      headers: kebuTransferHeaders(bodyBytes, "place_order", dataMode),
    });
  }

  if (error || !order) {
    // Channel constraint / column may predate 067 — retry with legacy channel or without.
    if (
      error?.message &&
      /channel|source_detail/i.test(error.message) &&
      orderChannel !== "whatsapp"
    ) {
      const legacyChannel = ["whatsapp", "demo", "web"].includes(orderChannel)
        ? orderChannel
        : "web";
      const retryChannel = await svc
        .from("shop_orders")
        .insert({ ...insertBase, channel: legacyChannel })
        .select("id, order_number, gift_public_id")
        .single();
      if (!retryChannel.error && retryChannel.data) {
        return afterOrderSaved(
          retryChannel.data.id,
          (retryChannel.data as { order_number?: string }).order_number ?? orderNumber,
          typeof (retryChannel.data as { gift_public_id?: string }).gift_public_id === "string"
            ? (retryChannel.data as { gift_public_id: string }).gift_public_id
            : null,
        );
      }
      const { channel: _drop, ...withoutChannel } = insertBase;
      void _drop;
      const retryNoChannel = await svc
        .from("shop_orders")
        .insert(withoutChannel)
        .select("id, order_number, gift_public_id")
        .single();
      if (!retryNoChannel.error && retryNoChannel.data) {
        return afterOrderSaved(
          retryNoChannel.data.id,
          (retryNoChannel.data as { order_number?: string }).order_number ?? orderNumber,
          typeof (retryNoChannel.data as { gift_public_id?: string }).gift_public_id === "string"
            ? (retryNoChannel.data as { gift_public_id: string }).gift_public_id
            : null,
        );
      }
    }
    // Pre-041/042/044/045/048/059 DBs may lack newer columns — retry without them.
    if (
      error?.message &&
      /payment_preference|customer_email|discount_|order_number|product_upc|product_sku|customer_user_id|is_gift|recipient_|gift_|buyer_country|shipping_/i.test(
        error.message,
      )
    ) {
      const retry = await svc
        .from("shop_orders")
        .insert({
          project_id: dep.project_id,
          product_id: sold.id,
          product_name: soldName,
          price_label: sold.price_label ?? "",
          quantity: input.quantity,
          customer_name: input.customerName,
          customer_phone: input.customerPhone,
          customer_note: [
            input.customerNote ?? "",
            input.paymentPreference ? `Pay preference: ${input.paymentPreference}` : "",
            customerEmail ? `Email: ${customerEmail}` : "",
            discount ? `Discount: ${discount.code} (−${discount.percent_off}%)` : "",
            productUpc ? `UPC: ${productUpc}` : "",
            input.isGift
              ? `Gift for: ${input.recipientName} (${input.recipientPhone})${input.giftMessage ? ` — ${input.giftMessage}` : ""}`
              : "",
            orderChannel ? `Channel: ${orderChannel}` : "",
            `Ref: ${orderNumber}`,
          ]
            .filter(Boolean)
            .join("\n")
            .slice(0, 400),
          status: "pending",
          channel: "whatsapp",
        })
        .select("id")
        .single();
      if (!retry.error && retry.data) {
        return afterOrderSaved(retry.data.id, orderNumber, null);
      }
    }
    await restoreProductStock(svc, sold.id, input.quantity);
    logCreate("shop.order_failed", { subdomain, message: error?.message });
    return NextResponse.json(
      {
        error: error?.message?.includes("does not exist")
          ? "Orders table missing. Apply APPLY_SHOP_ORDERS.sql in Supabase."
          : error?.message?.includes("is_gift") || error?.message?.includes("recipient_")
            ? "Gift columns missing. Apply 059_shop_gift_orders.sql."
            : "Could not save order.",
        detail: error?.message,
      },
      { status: 500 },
    );
  }

  return afterOrderSaved(
    order.id,
    (order as { order_number?: string }).order_number ?? orderNumber,
    typeof (order as { gift_public_id?: string }).gift_public_id === "string"
      ? (order as { gift_public_id: string }).gift_public_id
      : null,
  );
}
