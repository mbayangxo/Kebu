import { createHmac, timingSafeEqual } from "node:crypto";

export type JokoCheckoutInput = {
  reference: string;
  amountUsdCents: number;
  description: string;
  customerEmail?: string;
  returnUrl: string;
  cancelUrl: string;
  webhookUrl: string;
  metadata?: Record<string, string>;
};

export type JokoCheckoutResult =
  | { ok: true; paymentUrl: string; paymentId: string }
  | { ok: false; error: string; configured: boolean };

function jokoConfigured(): boolean {
  return Boolean(process.env.JOKO_API_BASE_URL?.trim() && process.env.JOKO_API_SECRET?.trim());
}

/** Start a JOKO mobile-money checkout session (Pay-in). */
export async function createJokoCheckout(input: JokoCheckoutInput): Promise<JokoCheckoutResult> {
  const base = process.env.JOKO_API_BASE_URL?.replace(/\/$/, "");
  const secret = process.env.JOKO_API_SECRET?.trim();

  if (!base || !secret) {
    return {
      ok: false,
      configured: false,
      error:
        "JOKO payments are not configured on this server. Set JOKO_API_BASE_URL and JOKO_API_SECRET.",
    };
  }

  const res = await fetch(`${base}/v1/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reference: input.reference,
      amount: input.amountUsdCents,
      currency: "USD",
      description: input.description,
      customer: input.customerEmail ? { email: input.customerEmail } : undefined,
      return_url: input.returnUrl,
      cancel_url: input.cancelUrl,
      webhook_url: input.webhookUrl,
      metadata: input.metadata ?? {},
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    payment_url?: string;
    checkout_url?: string;
    url?: string;
    id?: string;
    payment_id?: string;
    error?: string;
    message?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      configured: true,
      error: data.error || data.message || `JOKO checkout failed (${res.status}).`,
    };
  }

  const paymentUrl = data.payment_url || data.checkout_url || data.url;
  const paymentId = data.payment_id || data.id;
  if (!paymentUrl || !paymentId) {
    return {
      ok: false,
      configured: true,
      error: "JOKO did not return a payment URL.",
    };
  }

  return { ok: true, paymentUrl, paymentId };
}

export function verifyJokoWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.JOKO_WEBHOOK_SECRET?.trim();
  if (!secret || !signatureHeader) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signatureHeader.replace(/^sha256=/i, "").trim();
  if (expected.length !== provided.length) return false;

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}
