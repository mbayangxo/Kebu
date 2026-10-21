/**
 * Wave Business checkout (Senegal / supported markets).
 * Paid only after Wave webhook — never from the browser.
 * Docs: https://docs.wave.com/
 */

import type { PaymentAdapter, PaymentAdapterCheckoutInput, PaymentAdapterCheckoutResult } from "./adapters";

export function waveConfigured(): boolean {
  return Boolean(process.env.WAVE_API_KEY?.trim());
}

function waveBase(): string {
  return (process.env.WAVE_API_BASE_URL ?? "https://api.wave.com").replace(/\/$/, "");
}

export function quoteWaveCharge(input: Pick<PaymentAdapterCheckoutInput, "amountMinor" | "currency">):
  { ok: true; amountMinor: number; currency: "XOF" } | { ok: false; error: string } {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) return {ok:false,error:"Payment amount must be a positive integer in its declared currency."};
  const currency=input.currency.trim().toUpperCase();
  if (currency==="XOF") return {ok:true,amountMinor:input.amountMinor,currency:"XOF"};
  if (currency!=="USD") return {ok:false,error:"Wave does not support this currency. Choose another payment method."};
  const raw=process.env.WAVE_XOF_PER_USD?.trim(), rate=raw ? Number(raw) : NaN;
  if (!raw || !Number.isFinite(rate) || rate<=0) return {ok:false,error:"Wave currency conversion is unavailable. Choose another payment method."};
  const amountMinor=Math.round(input.amountMinor*rate/100);
  if (!Number.isSafeInteger(amountMinor) || amountMinor<=0) return {ok:false,error:"This amount cannot be represented safely by Wave."};
  return {ok:true,amountMinor,currency:"XOF"};
}

export const waveAdapter: PaymentAdapter = {
  id:"wave", isConfigured:waveConfigured,
  async createCheckout(input) {
    const quote=quoteWaveCharge(input);
    if (!quote.ok) return {...quote,configured:true};
    if (!input.reference || input.reference!==input.reference.trim() || input.reference.length>255) return {ok:false,configured:true,error:"Invalid payment reference."};
    const key=process.env.WAVE_API_KEY?.trim();
    if (!key) return {ok:false,configured:false,error:"Wave is not configured."};
    let base:URL;
    try { base=new URL(waveBase()); } catch { return {ok:false,configured:true,error:"Wave connection configuration is invalid."}; }
    if (base.protocol!=="https:" || base.username || base.password) return {ok:false,configured:true,error:"Wave requires a secure connection."};
    try {
      const response=await fetch(waveBase()+"/v1/checkout/sessions",{
        method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},
        body:JSON.stringify({amount:String(quote.amountMinor),currency:quote.currency,error_url:input.cancelUrl,success_url:input.returnUrl,client_reference:input.reference}),
      });
      const data=await response.json().catch(()=>null) as {id?:unknown;wave_launch_url?:unknown;message?:unknown}|null;
      if (!response.ok) return {ok:false,configured:true,error:typeof data?.message==="string" ? data.message.slice(0,300) : "Wave checkout could not be started."};
      if (typeof data?.id!=="string" || !data.id.trim() || data.id.length>255 || typeof data.wave_launch_url!=="string") return {ok:false,configured:true,error:"Wave did not return a complete checkout."};
      let launch:URL;
      try { launch=new URL(data.wave_launch_url); } catch { return {ok:false,configured:true,error:"Wave returned an invalid checkout link."}; }
      if (launch.protocol!=="https:" || launch.username || launch.password) return {ok:false,configured:true,error:"Wave returned an insecure checkout link."};
      return {ok:true,checkoutUrl:data.wave_launch_url,providerPaymentId:data.id,settlement:{amountMinor:quote.amountMinor,currency:quote.currency}};
    } catch { return {ok:false,configured:true,error:"Wave could not be reached. Please try again."}; }
  },
};

/** Orange Money — configured only when partner API keys exist; otherwise honest not-configured. */
export function orangeMoneyConfigured(): boolean {
  return Boolean(
    process.env.ORANGE_MONEY_API_KEY?.trim() && process.env.ORANGE_MONEY_MERCHANT_ID?.trim(),
  );
}

export const orangeMoneyAdapter: PaymentAdapter = {
  id: "orange_money",
  isConfigured: orangeMoneyConfigured,
  async createCheckout(input: PaymentAdapterCheckoutInput): Promise<PaymentAdapterCheckoutResult> {
    if (!orangeMoneyConfigured()) {
      return {
        ok: false,
        configured: false,
        error:
          "Orange Money API not configured. Use mobile money instructions or Wave/JOKO until partner keys are set.",
      };
    }
    const base = (process.env.ORANGE_MONEY_API_BASE_URL ?? "").replace(/\/$/, "");
    const key = process.env.ORANGE_MONEY_API_KEY!.trim();
    const merchant = process.env.ORANGE_MONEY_MERCHANT_ID!.trim();
    if (!base) {
      return { ok: false, configured: true, error: "ORANGE_MONEY_API_BASE_URL missing." };
    }
    const res = await fetch(`${base}/checkout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        merchant_id: merchant,
        amount: Math.max(1, Math.round(input.amountMinor)),
        currency: "XOF",
        reference: input.reference,
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
        customer_phone: input.customerPhone,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      checkout_url?: string;
      payment_id?: string;
      message?: string;
    };
    if (!res.ok || !data.checkout_url) {
      return {
        ok: false,
        configured: true,
        error: data.message || "Orange Money checkout failed.",
      };
    }
    return {
      ok: true,
      checkoutUrl: data.checkout_url,
      providerPaymentId: data.payment_id || input.reference,
    };
  },
};
