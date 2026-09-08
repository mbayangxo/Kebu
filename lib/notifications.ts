// Notification service for Kebu store orders
//
// Required env vars (all optional — notifications fail silently if missing):
//   AT_API_KEY + AT_USERNAME  → Africa's Talking SMS (africastalking.com — 40+ African countries)
//   RESEND_API_KEY             → Email via Resend (resend.com)
//   NOTIFY_FROM_EMAIL          → Sender address e.g. "orders@kebu.com"

export interface OrderNotificationPayload {
  businessName: string;
  customerName: string;
  customerPhone: string;
  itemsSummary: string;   // e.g. "2× Shea Butter Cream, 1× Hair Oil"
  orderId: string;
  paymentMethod: string;
  notifyPhone?: string;   // seller's SMS number
  notifyEmail?: string;   // seller's email
}

export async function sendOrderNotification(data: OrderNotificationPayload): Promise<void> {
  const smsText = [
    `🛒 New order — ${data.businessName}`,
    `Customer: ${data.customerName} (${data.customerPhone})`,
    `Order: ${data.itemsSummary}`,
    `Payment: ${data.paymentMethod}`,
    `ID: ${data.orderId}`,
    `Manage: kebu.africa/shop`,
  ].join("\n");

  const emailText = [
    `You have a new order for ${data.businessName}!`,
    ``,
    `Customer: ${data.customerName}`,
    `Phone: ${data.customerPhone}`,
    ``,
    `Order: ${data.itemsSummary}`,
    `Payment: ${data.paymentMethod}`,
    `Order ID: ${data.orderId}`,
    ``,
    `Confirm or manage this order at:`,
    `https://kebu.africa/shop`,
  ].join("\n");

  await Promise.allSettled([
    data.notifyPhone ? sendSMS(data.notifyPhone, smsText) : Promise.resolve(),
    data.notifyEmail
      ? sendEmail(data.notifyEmail, `New order — ${data.businessName}`, emailText)
      : Promise.resolve(),
  ]);
}

async function sendSMS(to: string, message: string): Promise<void> {
  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME;
  if (!apiKey || !username) return;

  const body = new URLSearchParams({ username, to, message, from: "ALKBULAN" });

  await fetch("https://api.africastalking.com/version1/messaging", {
    method: "POST",
    headers: {
      apiKey,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  }).catch(() => {});
}

async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM_EMAIL || "orders@kebu.com";
  if (!apiKey) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
  }).catch(() => {});
}
