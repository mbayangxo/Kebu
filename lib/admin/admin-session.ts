import { createHmac, timingSafeEqual } from "crypto";

/** Cookie name for internal admin portal session (never stores ADMIN_PASSWORD). */
export const ADMIN_SESSION_COOKIE = "alkebulan-admin";

const TTL_MS = 8 * 60 * 60 * 1000;

function sessionSecret(): string {
  // Prefer dedicated secret; fall back to ADMIN_PASSWORD so existing env still works.
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    ""
  );
}

/** Signed, expiring session token — stealing the cookie does not reveal ADMIN_PASSWORD. */
export function createAdminSessionToken(now = Date.now()): string {
  const secret = sessionSecret();
  if (!secret) throw new Error("ADMIN_PASSWORD or ADMIN_SESSION_SECRET required");
  const exp = now + TTL_MS;
  const payload = `v1.${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyAdminSessionToken(token: string | undefined | null, now = Date.now()): boolean {
  if (!token) return false;
  const secret = sessionSecret();
  if (!secret) return false;

  // Reject legacy cookies that stored the raw password (force re-login).
  if (token === process.env.ADMIN_PASSWORD) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, expStr, sig] = parts;
  if (version !== "v1" || !expStr || !sig) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || now > exp) return false;

  const payload = `${version}.${expStr}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function adminSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: Math.floor(TTL_MS / 1000),
    path: "/",
  };
}
