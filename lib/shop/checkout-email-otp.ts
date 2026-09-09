import { createHash, randomBytes, randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendCampaignEmail } from "@/lib/email/send-campaign";

export const CHECKOUT_OTP_TTL_MS = 10 * 60 * 1000;
export const CHECKOUT_OTP_MAX_ATTEMPTS = 5;
export const CHECKOUT_PROOF_TTL_MS = 45 * 60 * 1000;

export function normalizeCheckoutEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashCheckoutOtp(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function notifyFromAddress(): string | null {
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.NOTIFY_FROM_EMAIL?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    "";
  return from || null;
}

/** 6-digit numeric code for buyer email verification at checkout. */
export function generateCheckoutOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function generateCheckoutProofToken(): string {
  return randomBytes(24).toString("hex");
}

export async function sendCheckoutOtpEmail(opts: {
  to: string;
  code: string;
  shopName: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const from = notifyFromAddress();
  if (!process.env.RESEND_API_KEY || !from) {
    return {
      ok: false,
      error: "Checkout email is not configured (RESEND_API_KEY / from address).",
    };
  }

  const subject = `${opts.code} — confirm your email for ${opts.shopName}`;
  const text = [
    `Your Kebu shop checkout code is ${opts.code}.`,
    ``,
    `It expires in 10 minutes. If you did not start a checkout at ${opts.shopName}, ignore this email.`,
  ].join("\n");
  const html = `<p>Your checkout code for <strong>${opts.shopName}</strong> is:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:0.2em">${opts.code}</p>
<p style="font-size:13px;opacity:0.75">Expires in 10 minutes. Not a payment receipt.</p>`;

  const sent = await sendCampaignEmail({
    to: opts.to,
    from,
    fromName: opts.shopName,
    subject,
    html,
    text,
  });

  if (!sent) {
    return { ok: false, error: "Could not send the verification email. Try again." };
  }
  return { ok: true };
}

export async function issueCheckoutEmailOtp(
  admin: SupabaseClient,
  opts: {
    projectId: string;
    email: string;
    sessionKey?: string | null;
    shopName: string;
  },
): Promise<
  | { ok: true; expiresAt: string; email: string }
  | { ok: false; error: string; status?: number }
> {
  const email = normalizeCheckoutEmail(opts.email);
  if (!email.includes("@")) {
    return { ok: false, error: "Enter a valid email.", status: 400 };
  }

  const code = generateCheckoutOtpCode();
  const codeHash = hashCheckoutOtp(code);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CHECKOUT_OTP_TTL_MS).toISOString();

  // Invalidate prior open codes for this email + project.
  await admin
    .from("shop_checkout_email_otps")
    .update({ expires_at: now.toISOString() })
    .eq("project_id", opts.projectId)
    .eq("email", email)
    .is("verified_at", null);

  const { error } = await admin.from("shop_checkout_email_otps").insert({
    project_id: opts.projectId,
    email,
    code_hash: codeHash,
    expires_at: expiresAt,
    attempts: 0,
    session_key: opts.sessionKey?.trim() || null,
  });

  if (error) {
    return { ok: false, error: "Could not start email verification.", status: 500 };
  }

  const sent = await sendCheckoutOtpEmail({
    to: email,
    code,
    shopName: opts.shopName,
  });
  if (!sent.ok) {
    return { ok: false, error: sent.error, status: 503 };
  }

  return { ok: true, expiresAt, email };
}

export async function verifyCheckoutEmailOtp(
  admin: SupabaseClient,
  opts: {
    projectId: string;
    email: string;
    code: string;
    sessionKey?: string | null;
  },
): Promise<
  | { ok: true; proofToken: string; email: string; expiresAt: string }
  | { ok: false; error: string; status?: number }
> {
  const email = normalizeCheckoutEmail(opts.email);
  const code = opts.code.trim().replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Enter the 6-digit code from your email.", status: 400 };
  }

  const now = new Date();
  const { data: row } = await admin
    .from("shop_checkout_email_otps")
    .select("id, code_hash, expires_at, attempts, verified_at")
    .eq("project_id", opts.projectId)
    .eq("email", email)
    .is("verified_at", null)
    .gt("expires_at", now.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) {
    return { ok: false, error: "Code expired or missing. Request a new one.", status: 400 };
  }

  if ((row.attempts ?? 0) >= CHECKOUT_OTP_MAX_ATTEMPTS) {
    return { ok: false, error: "Too many attempts. Request a new code.", status: 429 };
  }

  const expected = hashCheckoutOtp(code);
  if (expected !== row.code_hash) {
    await admin
      .from("shop_checkout_email_otps")
      .update({ attempts: (row.attempts ?? 0) + 1 })
      .eq("id", row.id);
    return { ok: false, error: "That code is not correct.", status: 400 };
  }

  const proofToken = generateCheckoutProofToken();
  const proofExpires = new Date(now.getTime() + CHECKOUT_PROOF_TTL_MS).toISOString();

  const { error } = await admin
    .from("shop_checkout_email_otps")
    .update({
      verified_at: now.toISOString(),
      proof_token: proofToken,
      proof_expires_at: proofExpires,
      session_key: opts.sessionKey?.trim() || null,
      attempts: (row.attempts ?? 0) + 1,
    })
    .eq("id", row.id);

  if (error) {
    return { ok: false, error: "Could not verify email.", status: 500 };
  }

  return { ok: true, proofToken, email, expiresAt: proofExpires };
}

/**
 * Require a verified email proof for checkout, unless the signed-in Kebu user
 * is placing the order with their own account email.
 */
export async function assertCheckoutEmailVerified(
  admin: SupabaseClient,
  opts: {
    projectId: string;
    email: string | null | undefined;
    proofToken: string | null | undefined;
    signedInEmail?: string | null;
  },
): Promise<{ ok: true; email: string } | { ok: false; error: string; status: number }> {
  const email = opts.email ? normalizeCheckoutEmail(opts.email) : "";
  if (!email) {
    return {
      ok: false,
      error: "Email is required. We send a code so we can confirm it is yours.",
      status: 400,
    };
  }

  const signedIn = opts.signedInEmail ? normalizeCheckoutEmail(opts.signedInEmail) : "";
  if (signedIn && signedIn === email) {
    return { ok: true, email };
  }

  const token = opts.proofToken?.trim() || "";
  if (!token) {
    return {
      ok: false,
      error: "Confirm your email with the code we sent before placing the order.",
      status: 403,
    };
  }

  const now = new Date().toISOString();
  const { data: row } = await admin
    .from("shop_checkout_email_otps")
    .select("id, email, verified_at, proof_expires_at")
    .eq("project_id", opts.projectId)
    .eq("email", email)
    .eq("proof_token", token)
    .not("verified_at", "is", null)
    .gt("proof_expires_at", now)
    .maybeSingle();

  if (!row) {
    return {
      ok: false,
      error: "Email confirmation expired. Request a new code.",
      status: 403,
    };
  }

  return { ok: true, email };
}
