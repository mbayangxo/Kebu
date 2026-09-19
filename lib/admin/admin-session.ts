/** Cookie name for internal admin portal session (never stores ADMIN_PASSWORD). */
export const ADMIN_SESSION_COOKIE = "alkebulan-admin";

const TTL_MS = 8 * 60 * 60 * 1000;

function sessionSecret(): string {
  const dedicated = process.env.ADMIN_SESSION_SECRET?.trim();
  if (dedicated) return dedicated;
  // Production admin cookies must use a key independent from the login password.
  if (process.env.NODE_ENV === "production") return "";
  return process.env.ADMIN_PASSWORD?.trim() || "";
}

/** Signed, expiring session token — stealing the cookie does not reveal ADMIN_PASSWORD. */
async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function createAdminSessionToken(now = Date.now()): Promise<string> {
  const secret = sessionSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is required in production");
  const exp = now + TTL_MS;
  const payload = `v1.${exp}`;
  const sig = await sign(payload, secret);
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

  const payload = `${version}.${expStr}`;
  const expected = await sign(payload, secret);
  return constantTimeEqual(sig, expected);
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
