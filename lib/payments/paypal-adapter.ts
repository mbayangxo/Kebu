/**
 * PayPal Orders API v2 — live checkout when PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET set.
 * Paid only after webhook (PAYMENT.CAPTURE.COMPLETED) — never from the browser.
 */

import type { PaymentAdapter, PaymentAdapterCheckoutInput, PaymentAdapterCheckoutResult } from "./adapters";

function paypalBase(): string {
  const mode = (process.env.PAYPAL_MODE ?? "sandbox").toLowerCase();
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export function paypalConfigured(): boolean {
  return Boolean(
    process.env.PAYPAL_CLIENT_ID?.trim() && process.env.PAYPAL_CLIENT_SECRET?.trim(),
  );
}

async function paypalAccessToken(): Promise<string | null> {
  const id = process.env.PAYPAL_CLIENT_ID?.trim();
  const secret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!id || !secret) return null;
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

/** Amount in major units string for PayPal (e.g. "12.50"). Input amountMinor = cents. */
function majorFromMinor(amountMinor: number, currency: string): string {
  const c = currency.toUpperCase();
  // XOF/XAF have no minor units in PayPal — send integer string
  if (c === "XOF" || c === "XAF") return String(Math.max(1, Math.round(amountMinor)));
  return (Math.max(1, amountMinor) / 100).toFixed(2);
}

export const paypalAdapter: PaymentAdapter = {
  id: "paypal",
  isConfigured: paypalConfigured,
  async createCheckout(input: PaymentAdapterCheckoutInput): Promise<PaymentAdapterCheckoutResult> {
    if (!paypalConfigured()) {
      return { ok: false, configured: false, error: "PayPal not configured (PAYPAL_CLIENT_ID + SECRET)." };
    }
    const token = await paypalAccessToken();
    if (!token) {
      return { ok: false, configured: true, error: "PayPal auth failed." };
    }
    const currencyIn = (input.currency || "USD").toUpperCase();
    // PayPal rarely supports XOF — convert to USD like JOKO when needed
    let currency = currencyIn;
    let value = majorFromMinor(input.amountMinor, currencyIn);
    if (currencyIn === "XOF" || currencyIn === "XAF") {
      const rate = Number(process.env.PAYPAL_XOF_PER_USD ?? process.env.JOKO_XOF_PER_USD ?? "600");
      const per = Number.isFinite(rate) && rate > 0 ? rate : 600;
      currency = "USD";
      value = Math.max(0.01, input.amountMinor / per).toFixed(2);
    }
    const res = await fetch(`${paypalBase()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": input.reference.slice(0, 36),
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: input.reference.slice(0, 256),
            description: input.description.slice(0, 127),
            custom_id: input.reference.slice(0, 127),
            amount: { currency_code: currency, value },
          },
        ],
        application_context: {
          return_url: input.returnUrl,
          cancel_url: input.cancelUrl,
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING",
        },
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      links?: { rel: string; href: string }[];
      message?: string;
      details?: { description?: string }[];
    };
    if (!res.ok || !data.id) {
      return {
        ok: false,
        configured: true,
        error: data.message || data.details?.[0]?.description || "PayPal create order failed.",
      };
    }
    const approve = data.links?.find((l) => l.rel === "approve")?.href;
    if (!approve) {
      return { ok: false, configured: true, error: "PayPal approve link missing." };
    }
    return { ok: true, checkoutUrl: approve, providerPaymentId: data.id, providerAmount: {value,currency} };
  },
};

export type ExpectedPayPalPayment = { reference: string; value: string; currency: string };
type PayPalOrder = { id?: string; status?: string; intent?: string; purchase_units?: {
  custom_id?: string; reference_id?: string; amount?: {value?:string;currency_code?:string};
  payments?: { captures?: {id?:string;status?:string;final_capture?:boolean;amount?:{value?:string;currency_code?:string}}[] };
}[] };
function minor(value: string | undefined): bigint | null {
  if (!value || !/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const [whole,fraction=""] = value.split(".");
  return BigInt(whole)*BigInt(100)+BigInt(fraction.padEnd(2,"0"));
}
function matchesOrder(order: PayPalOrder, id: string, expected: ExpectedPayPalPayment): boolean {
  const unit=order.purchase_units?.[0];
  const amount=minor(expected.value);
  return amount!==null && amount>BigInt(0) && /^[A-Z]{3}$/.test(expected.currency)
    && order.id===id && order.intent==="CAPTURE" && order.purchase_units?.length===1
    && unit?.custom_id===expected.reference && unit?.reference_id===expected.reference
    && unit?.amount?.currency_code===expected.currency && minor(unit?.amount?.value)===amount;
}
function fullyCaptured(order: PayPalOrder, id: string, expected: ExpectedPayPalPayment): boolean {
  const captures=order.purchase_units?.[0]?.payments?.captures;
  const capture=captures?.[0];
  return matchesOrder(order,id,expected) && order.status==="COMPLETED" && captures?.length===1
    && !!capture?.id && capture.status==="COMPLETED" && capture.final_capture===true
    && capture.amount?.currency_code===expected.currency && minor(capture.amount?.value)===minor(expected.value);
}
async function verifyPayPalOrder(orderId: string, expected: ExpectedPayPalPayment, captureApproved: boolean): Promise<boolean> {
  // Missing legacy FX evidence fails before any request or financial action.
  if (!expected.reference || minor(expected.value)===null || !/^[A-Z]{3}$/.test(expected.currency)) return false;
  const token=await paypalAccessToken(); if(!token) return false;
  const url=`${paypalBase()}/v2/checkout/orders/${encodeURIComponent(orderId)}`;
  const headers={Authorization:`Bearer ${token}`};
  const read=async():Promise<PayPalOrder|null>=>{
    const response=await fetch(url,{headers,signal:AbortSignal.timeout(15_000)});
    return response.ok ? await response.json() as PayPalOrder : null;
  };
  const initial=await read();
  if (!initial || !matchesOrder(initial,orderId,expected)) return false;
  if (fullyCaptured(initial,orderId,expected)) return true;
  if (!captureApproved || initial.status!=="APPROVED") return false;
  const response=await fetch(`${url}/capture`,{method:"POST",headers:{...headers,"Content-Type":"application/json","PayPal-Request-Id":`capture-${orderId}`.slice(0,108)},signal:AbortSignal.timeout(15_000)});
  const result=await response.json().catch(()=>null) as PayPalOrder|null;
  if (response.ok && result && fullyCaptured(result,orderId,expected)) return true;
  // Includes lost/duplicate capture responses; an error string is never proof of payment.
  const final=await read();
  return !!final && fullyCaptured(final,orderId,expected);
}
export async function paypalCaptureOrder(orderId: string, expected: ExpectedPayPalPayment): Promise<boolean> {
  try { return await verifyPayPalOrder(orderId,expected,true); } catch { return false; }
}
export async function paypalVerifyCapturedOrder(orderId: string, expected: ExpectedPayPalPayment): Promise<boolean> {
  try { return await verifyPayPalOrder(orderId,expected,false); } catch { return false; }
}
