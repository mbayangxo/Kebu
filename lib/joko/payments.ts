import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Joko Partner API client (see keit/docs/JOKO-PARTNER-API.md).
 *
 * Kebu env:
 *   JOKO_API_BASE_URL=https://<joko-host>/api
 *   JOKO_API_SECRET=<same as Joko JOKO_API_KEY>
 *   JOKO_WEBHOOK_SECRET=<same as Joko>
 */

export type JokoCheckoutInput = {
  reference: string;
  /** Preferred — integer XOF for African shop checkout. */
  amountXof?: number;
  /** Legacy bridge — USD cents; Joko converts via JOKO_XOF_PER_USD. */
  amountUsdCents?: number;
  description: string;
  customerPhone?: string;
  customerEmail?: string;
  method?: "wave" | "orange_money" | "free_money" | "auto" | string;
  returnUrl: string;
  cancelUrl: string;
  webhookUrl: string;
  metadata?: Record<string, string>;
};

export type JokoCheckoutResult =
  | { ok: true; paymentUrl: string; paymentId: string; amountXof?: number; mode?: string }
  | { ok: false; error: string; configured: boolean };

function jokoConfigured(): boolean {
  return Boolean(process.env.JOKO_API_BASE_URL?.trim() && process.env.JOKO_API_SECRET?.trim());
}

export function jokoApiBase(): string | null {
  const base = process.env.JOKO_API_BASE_URL?.trim().replace(/\/$/, "");
  return base || null;
}

/** Build Partner checkout body — prefer amount_xof + phone. */
export function buildJokoCheckoutBody(input: JokoCheckoutInput): Record<string, unknown> {
  const customer: Record<string, string> = {};
  if (input.customerPhone?.trim()) customer.phone = input.customerPhone.trim();
  if (input.customerEmail?.trim()) customer.email = input.customerEmail.trim();

  const body: Record<string, unknown> = {
    reference: input.reference,
    description: input.description,
    return_url: input.returnUrl,
    cancel_url: input.cancelUrl,
    webhook_url: input.webhookUrl,
    metadata: {
      partner: "kebu",
      ...(input.metadata ?? {}),
    },
  };

  if (input.amountXof != null && input.amountXof > 0) {
    body.amount_xof = Math.round(input.amountXof);
    body.currency = "XOF";
  } else if (input.amountUsdCents != null && input.amountUsdCents > 0) {
    body.amount = input.amountUsdCents;
    body.currency = "USD";
  }

  if (Object.keys(customer).length) body.customer = customer;
  if (input.method) body.method = input.method;

  return body;
}

/** Start a Joko Partner checkout session (hosted payment_url). */
export async function createJokoCheckout(input: JokoCheckoutInput): Promise<JokoCheckoutResult> {
  const base = jokoApiBase();
  const secret = process.env.JOKO_API_SECRET?.trim();

  if (!base || !secret) {
    return {
      ok: false,
      configured: false,
      error:
        "JOKO payments are not configured on this server. Set JOKO_API_BASE_URL and JOKO_API_SECRET.",
    };
  }

  if (
    (input.amountXof == null || input.amountXof <= 0) &&
    (input.amountUsdCents == null || input.amountUsdCents <= 0)
  ) {
    return { ok: false, configured: true, error: "amount_xof or amountUsdCents required." };
  }

  const res = await fetch(`${base}/v1/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildJokoCheckoutBody(input)),
  });

  const data = (await res.json().catch(() => ({}))) as {
    payment_url?: string;
    checkout_url?: string;
    url?: string;
    id?: string;
    payment_id?: string;
    amount_xof?: number;
    mode?: string;
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

  return {
    ok: true,
    paymentUrl,
    paymentId,
    amountXof: data.amount_xof,
    mode: data.mode,
  };
}

/**
 * Attempt a server-side recurring charge (saved payment method).
 * Falls back to interactive checkout when mandate charge is unavailable.
 */
export async function createJokoAutopayCharge(input: {
  reference: string;
  amountUsdCents: number;
  description: string;
  customerEmail?: string;
  previousPaymentId?: string | null;
  returnUrl: string;
  cancelUrl: string;
  webhookUrl: string;
  metadata?: Record<string, string>;
}): Promise<
  | { ok: true; mode: "charged"; paymentId: string }
  | { ok: true; mode: "checkout"; paymentUrl: string; paymentId: string }
  | { ok: false; error: string; configured: boolean }
> {
  const base = jokoApiBase();
  const secret = process.env.JOKO_API_SECRET?.trim();

  if (!base || !secret) {
    return {
      ok: false,
      configured: false,
      error: "JOKO payments are not configured on this server.",
    };
  }

  if (input.previousPaymentId) {
    const res = await fetch(`${base}/v1/payments/charge`, {
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
        source_payment_id: input.previousPaymentId,
        customer: input.customerEmail ? { email: input.customerEmail } : undefined,
        webhook_url: input.webhookUrl,
        metadata: { partner: "kebu", ...(input.metadata ?? {}), autopay: "true" },
      }),
    });

    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        payment_id?: string;
        status?: string;
      };
      const paymentId = data.payment_id || data.id;
      if (paymentId && (data.status === "paid" || data.status === "completed" || data.status === "success")) {
        return { ok: true, mode: "charged", paymentId };
      }
      if (paymentId) {
        return { ok: true, mode: "charged", paymentId };
      }
    }
  }

  const checkout = await createJokoCheckout({
    reference: input.reference,
    amountUsdCents: input.amountUsdCents,
    description: input.description,
    customerEmail: input.customerEmail,
    returnUrl: input.returnUrl,
    cancelUrl: input.cancelUrl,
    webhookUrl: input.webhookUrl,
    metadata: input.metadata,
  });
  if (!checkout.ok) return checkout;
  return {
    ok: true,
    mode: "checkout",
    paymentUrl: checkout.paymentUrl,
    paymentId: checkout.paymentId,
  };
}

/** Partner outbound message (Mbolo if user exists, else SMS / honest fail). */
export async function sendJokoPartnerMessage(opts: {
  toPhone: string;
  text: string;
  channel?: "mbolo_auto" | "mbolo" | "sms";
  metadata?: Record<string, string>;
  idempotencyKey?: string;
}): Promise<
  | { ok: true; id: string; status: string; channelUsed: string | null }
  | { ok: false; error: string; configured: boolean }
> {
  const base = jokoApiBase();
  const secret = process.env.JOKO_API_SECRET?.trim();
  if (!base || !secret) {
    return {
      ok: false,
      configured: false,
      error: "JOKO messaging is not configured (JOKO_API_BASE_URL + JOKO_API_SECRET).",
    };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  };
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey.slice(0, 120);

  const res = await fetch(`${base}/v1/messages/send`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      to_phone: opts.toPhone.trim(),
      text: opts.text.slice(0, 2000),
      channel: opts.channel ?? "mbolo_auto",
      metadata: { partner: "kebu", ...(opts.metadata ?? {}) },
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
    channel_used?: string | null;
    error?: string | null;
    message?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      configured: true,
      error: data.error || data.message || `JOKO message failed (${res.status}).`,
    };
  }

  if (data.status === "failed") {
    return {
      ok: false,
      configured: true,
      error: data.error || "JOKO could not deliver the message.",
    };
  }

  return {
    ok: true,
    id: data.id ?? "msg",
    status: data.status ?? "sent",
    channelUsed: data.channel_used ?? null,
  };
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

export { jokoConfigured };
