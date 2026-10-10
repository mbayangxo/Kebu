/**
 * Admin portal session tokens.
 *
 * Uses Web Crypto (globalThis.crypto.subtle) rather than Node's `crypto` module:
 * middleware.ts verifies these tokens and runs on the Edge runtime, where Node's
 * `crypto` is unavailable (every authenticated /admin request failed with 500).
 * Web Crypto exists in both the Edge and Node runtimes, so the same code serves
 * the middleware and the Node API routes.
 *
 * Token format (unchanged): `v1.<expiryMs>.<hex HMAC-SHA256 of "v1.<expiryMs>">`.
 */

/** Cookie name for internal admin portal session (never stores ADMIN_PASSWORD). */
export const ADMIN_SESSION_COOKIE = "alkebulan-admin";

const TTL_MS = 8 * 60 * 60 * 1000;
const encoder = new TextEncoder();

function sessionSecret(): string {
  // Prefer dedicated secret; fall back to ADMIN_PASSWORD so existing env still works.
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    ""
  );
}

function hmacKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Decodes a lowercase/uppercase hex string; null if malformed. */
function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Signed, expiring session token — stealing the cookie does not reveal ADMIN_PASSWORD. */
export async function createAdminSessionToken(now = Date.now()): Promise<string> {
  const secret = sessionSecret();
  if (!secret) throw new Error("ADMIN_PASSWORD or ADMIN_SESSION_SECRET required");
  const exp = now + TTL_MS;
  const payload = `v1.${exp}`;
  const sig = toHex(await crypto.subtle.sign("HMAC", await hmacKey(secret, "sign"), encoder.encode(payload)));
  return `${payload}.${sig}`;
}

export async function verifyAdminSessionToken(token: string | undefined | null, now = Date.now()): Promise<boolean> {
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

  const sigBytes = fromHex(sig);
  if (!sigBytes) return false;
  try {
    // subtle.verify compares the MAC in constant time.
    return await crypto.subtle.verify("HMAC", await hmacKey(secret, "verify"), sigBytes, encoder.encode(`${version}.${expStr}`));
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
