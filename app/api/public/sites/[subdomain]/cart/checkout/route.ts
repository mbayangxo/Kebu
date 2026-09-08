import { NextResponse } from "next/server";
import { shopOrderRateLimit } from "@/lib/api-guard";
import { logCreate } from "@/lib/create/auth";
import { resolveMerchantWhatsApp } from "@/lib/create/site-commerce";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import type { SiteSeo } from "@/lib/create/site-seo";
import { kebuTransferHeaders, parseDataModeHeader } from "@/lib/create/kb-budget";
import { shopOrderWhatsAppHref } from "@/lib/shop/create-order";
import { giftPublicPath } from "@/lib/shop/gift-order";
import { upsertOrderSubscriber } from "@/lib/shop/customers";
import { startShopOrderProviderCheckout } from "@/lib/shop/adapter-checkout";
import {
  railFromPaymentPreference,
  recordPaymentLedgerEvent,
} from "@/lib/shop/payment-ledger";
import { createServiceClient } from "@/lib/opportunity/admin";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import {
  cartWhatsAppMessage,
  createCartOrder,
  markCartDraftConverted,
  resolveCartLines,
  shopCartCheckoutSchema,
  upsertCartDraft,
} from "@/lib/shop/cart-order";
import { decrementCartStock, restoreProductStock } from "@/lib/shop/stock";
import { assertProjectPlanLimit } from "@/lib/billing/enforce-limits";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ subdomain: string }> };

/** Multi-item cart checkout → one shop_orders row + shop_order_items. Never marks paid. */
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

  const parsed = shopCartCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cart.", issues: parsed.error.flatten() }, { status: 400 });
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

  const { data: projectRow } = await admin
    .from("projects")
    .select("id, owner_id")
    .eq("id", live.project_id)
    .maybeSingle();

  if (projectRow?.owner_id) {
    const storeGate = await assertProjectPlanLimit(admin, live.project_id, projectRow.owner_id, "store");
    if (!storeGate.ok) {
      return NextResponse.json(
        { error: storeGate.error, upgradeHint: storeGate.upgradeHint },
        { status: 403 },
      );
    }
  }

  const resolved = await resolveCartLines(admin, live.project_id, parsed.data.items);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  const stock = await decrementCartStock(
    admin,
    resolved.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
  );
  if (!stock.ok) {
    return NextResponse.json({ error: stock.error }, { status: 409 });
  }

  const customerEmail = parsed.data.customerEmail ?? null;

  let customerUserId: string | null = null;
  try {
    const browser = await createServerSupabase();
    const {
      data: { user: shopper },
    } = await browser.auth.getUser();
    if (shopper?.id) customerUserId = shopper.id;
  } catch {
    /* guest OK */
  }

  if (parsed.data.sessionKey) {
    await upsertCartDraft({
      admin,
      projectId: live.project_id,
      subdomain,
      sessionKey: parsed.data.sessionKey,
      items: parsed.data.items,
      customerEmail,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      discountCode: parsed.data.discountCode,
      customerUserId,
    });
  }

  const created = await createCartOrder({
    admin,
    projectId: live.project_id,
    lines: resolved.lines,
    customerName: parsed.data.customerName,
    customerPhone: parsed.data.customerPhone,
    customerNote: parsed.data.customerNote ?? "",
    customerEmail,
    paymentPreference: parsed.data.paymentPreference ?? "whatsapp",
    discountCode: parsed.data.discountCode,
    giftCardCode: parsed.data.giftCardCode,
    customerUserId,
    gift: parsed.data,
    buyerCountry: parsed.data.buyerCountry ?? null,
    sellerCountry: "SN",
  });

  if (!created.ok) {
    for (const l of resolved.lines) {
      await restoreProductStock(admin, l.productId, l.quantity);
    }
    return NextResponse.json({ error: created.error }, { status: 500 });
  }

  const { data: projectRow } = await admin
    .from("projects")
    .select("business_id")
    .eq("id", live.project_id)
    .maybeSingle();

  if (customerEmail && projectRow?.business_id) {
    try {
      await upsertOrderSubscriber(admin, {
        businessId: projectRow.business_id as string,
        projectId: live.project_id,
        email: customerEmail,
        name: parsed.data.customerName,
      });
    } catch {
      /* best-effort */
    }
  }

  try {
    await markCartDraftConverted(admin, live.project_id, parsed.data.sessionKey, created.orderId);
  } catch {
    /* optional */
  }

  await recordPaymentLedgerEvent(admin, {
    projectId: live.project_id,
    orderId: created.orderId,
    rail: railFromPaymentPreference(parsed.data.paymentPreference),
    eventType: "intent",
    amountXof: created.amountXof ?? null,
    currency: parsed.data.paymentPreference === "joko" ? "CAURIS" : "XOF",
    provider: parsed.data.paymentPreference ?? "whatsapp",
    meta: { kind: "cart", lines: resolved.lines.length },
  });

  const snapshot = live.snapshot as WebsiteDefinition | null;
  const merchantPhone = snapshot
    ? resolveMerchantWhatsApp(snapshot, snapshot.seo as SiteSeo | undefined)
    : "";
  const message = cartWhatsAppMessage({
    orderNumber: created.orderNumber,
    lines: resolved.lines,
    customerName: parsed.data.customerName,
    customerNote: parsed.data.customerNote ?? "",
    paymentPreference: parsed.data.paymentPreference,
    discountCode: created.discountCode,
    discountPercent: created.discountPercent,
    giftCardCode: created.giftCardCode,
    giftCardAmountXof: created.giftCardAmountXof,
    isGift: parsed.data.isGift,
    recipientName: parsed.data.recipientName,
    recipientPhone: parsed.data.recipientPhone,
    giftMessage: parsed.data.giftMessage,
  });

  let paymentUrl: string | undefined;
  let paymentMessage: string | undefined;
  const livePref = ["joko", "paypal", "card", "mobile_money"].includes(
    parsed.data.paymentPreference ?? "",
  );
  if (livePref) {
    if (created.amountXof == null || created.amountXof <= 0) {
      paymentMessage =
        "Cart order saved. Add XOF prices on products for live checkout — or confirm on WhatsApp.";
    } else {
      const base =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      const started = await startShopOrderProviderCheckout({
        admin,
        orderId: created.orderId,
        projectId: live.project_id,
        amountXof: created.amountXof,
        productName:
          resolved.lines.length === 1
            ? resolved.lines[0]!.productName
            : `Cart (${resolved.lines.length} items)`,
        customerEmail,
        customerPhone: parsed.data.customerPhone,
        paymentPreference: parsed.data.paymentPreference ?? "whatsapp",
        appUrl: base,
      });
      if (started.ok) {
        paymentUrl = started.paymentUrl;
        paymentMessage = `Cart saved. Complete ${started.provider} payment — paid only after the webhook confirms.`;
      } else if (started.fallbackInstructions) {
        paymentMessage = `Cart saved. ${started.error}`;
      } else {
        paymentMessage = `Cart saved. Checkout failed: ${started.error}`;
      }
    }
  }

  logCreate("shop.cart_checkout", {
    projectId: live.project_id,
    orderId: created.orderId,
    orderNumber: created.orderNumber,
    lines: resolved.lines.length,
  });

  const giftPath = created.giftPublicId ? giftPublicPath(created.giftPublicId) : null;
  const payload = {
    orderId: created.orderId,
    orderNumber: created.orderNumber,
    status: "pending" as const,
    paid: false as const,
    itemCount: resolved.lines.length,
    discountCode: created.discountCode,
    discountPercent: created.discountPercent,
    paymentUrl,
    whatsappHref: shopOrderWhatsAppHref(merchantPhone, message),
    giftPublicId: created.giftPublicId,
    giftPath,
    isGift: Boolean(parsed.data.isGift),
    message:
      (paymentMessage ??
        `Order ${created.orderNumber} saved (${resolved.lines.length} item${resolved.lines.length === 1 ? "" : "s"}). Confirm on WhatsApp — not paid yet.`) +
      (giftPath ? ` Gift link for recipient: ${giftPath}` : ""),
  };
  const bodyBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
  return NextResponse.json(payload, {
    headers: kebuTransferHeaders(bodyBytes, "place_order", parseDataModeHeader(req)),
  });
}
