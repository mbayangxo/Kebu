import { NextRequest } from "next/server";
import { storeDb, type StoreOrder, type StoreSite } from "@/lib/store-data";
import { sendOrderNotification } from "@/lib/notifications";

// Currency mapping for Flutterwave (based on site country)
const COUNTRY_CURRENCY: Record<string, string> = {
  Nigeria: "NGN", Ghana: "GHS", Kenya: "KES", Rwanda: "RWF",
  "South Africa": "ZAR", Uganda: "UGX", Tanzania: "TZS",
  Senegal: "XOF", "Côte d'Ivoire": "XOF", Cameroon: "XAF",
};

function calculateTotal(site: StoreSite, items: StoreOrder["items"]): number {
  return items.reduce((sum, item) => {
    const offering = site.offerings.find(o => o.id === item.offeringId);
    const price = offering?.price ? parseFloat(offering.price.replace(/[^0-9.]/g, "")) : 0;
    return sum + (isNaN(price) ? 0 : price * item.quantity);
  }, 0);
}

// Flutterwave payment initialization
// Requires FLW_SECRET_KEY env variable — get from dashboard.flutterwave.com
async function initFlutterwave(order: StoreOrder, site: StoreSite) {
  const secretKey = process.env.FLW_SECRET_KEY;
  if (!secretKey) return null;

  const amount = calculateTotal(site, order.items);
  if (amount <= 0) return null; // can't initiate payment without a calculable amount

  const currency = COUNTRY_CURRENCY[site.country] ?? "NGN";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: order.id,
      amount,
      currency,
      redirect_url: `${baseUrl}/store/order-confirmed?orderId=${order.id}&slug=${order.siteSlug}`,
      customer: {
        email: order.customerEmail || `customer@alkebulan.com`,
        phone_number: order.customerPhone,
        name: order.customerName,
      },
      customizations: {
        title: site.businessName,
        description: `Order from ${site.businessName}`,
      },
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.data?.link as string | null;
}

// Wave payment initialization
// Requires WAVE_API_KEY env variable — get from developer.wave.com
async function initWave(order: StoreOrder, site: StoreSite) {
  const apiKey = process.env.WAVE_API_KEY;
  if (!apiKey) return null;

  const amount = calculateTotal(site, order.items);
  if (amount <= 0) return null;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  const res = await fetch("https://api.wave.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: String(Math.round(amount)), // Wave expects integer string in minor units for XOF
      currency: "XOF",
      error_url: `${baseUrl}/store/${order.siteSlug}`,
      success_url: `${baseUrl}/store/order-confirmed?orderId=${order.id}&slug=${order.siteSlug}`,
      client_reference: order.id,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.wave_launch_url as string | null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const order: StoreOrder = {
    id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    siteSlug: body.siteSlug,
    customerName: body.customerName,
    customerPhone: body.customerPhone,
    customerEmail: body.customerEmail || "",
    items: body.items,
    notes: body.notes || "",
    paymentMethod: body.paymentMethod,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  storeDb.orders.save(order);

  const site = storeDb.sites.get(body.siteSlug);

  // Send notification to seller (non-blocking — fire and forget)
  if (site) {
    const itemsSummary = order.items
      .map(i => `${i.quantity}× ${i.offeringName}`)
      .join(", ");
    sendOrderNotification({
      businessName: site.businessName,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      itemsSummary,
      orderId: order.id,
      paymentMethod: order.paymentMethod,
      notifyPhone: site.notifyPhone,
      notifyEmail: site.notifyEmail,
    }).catch(() => {});
  }

  // Cash on delivery — no payment redirect needed
  if (body.paymentMethod === "cash") {
    return Response.json({ success: true, orderId: order.id, paymentUrl: null });
  }

  // Flutterwave payment
  if (body.paymentMethod === "flutterwave" && site) {
    const paymentUrl = await initFlutterwave(order, site);
    return Response.json({ success: true, orderId: order.id, paymentUrl });
  }

  // Wave payment
  if (body.paymentMethod === "wave" && site) {
    const paymentUrl = await initWave(order, site);
    return Response.json({ success: true, orderId: order.id, paymentUrl });
  }

  return Response.json({ success: true, orderId: order.id, paymentUrl: null });
}
