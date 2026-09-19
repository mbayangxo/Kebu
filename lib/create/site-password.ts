import { createHash, createHmac, scryptSync, timingSafeEqual } from "crypto";

const HASH_PREFIX = "scrypt$v1$";

export function sitePasswordSecret(): string | null {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : null;
}

function subdomainSalt(secret: string, subdomain: string): Buffer {
  return createHmac("sha256", secret).update(`kebu-site:${subdomain}`).digest();
}

/** Memory-hard password hash for newly created or upgraded site passwords. */
export function hashSitePassword(subdomain: string, password: string, secret: string): string {
  const derived = scryptSync(password, subdomainSalt(secret, subdomain), 32);
  return `${HASH_PREFIX}${derived.toString("hex")}`;
}

function legacySitePasswordHash(subdomain: string, password: string, secret: string): string {
  const salt = createHmac("sha256", secret).update(subdomain).digest("hex").slice(0, 32);
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

function equalHex(left: string, right: string): boolean {
  if (!/^[0-9a-f]+$/i.test(left) || !/^[0-9a-f]+$/i.test(right)) return false;
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifySitePassword(opts: {
  subdomain: string;
  password: string;
  storedHash: string;
  secret: string;
}): { ok: boolean; needsUpgrade: boolean } {
  const { subdomain, password, storedHash, secret } = opts;
  if (storedHash.startsWith(HASH_PREFIX)) {
    const expected = hashSitePassword(subdomain, password, secret).slice(HASH_PREFIX.length);
    return { ok: equalHex(storedHash.slice(HASH_PREFIX.length), expected), needsUpgrade: false };
  }

  const expectedLegacy = legacySitePasswordHash(subdomain, password, secret);
  const ok = equalHex(storedHash, expectedLegacy);
  return { ok, needsUpgrade: ok };
}

export function signSitePasswordSession(subdomain: string, expiresAt: number, secret: string): string {
  const payload = `${subdomain}:${expiresAt}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}:${signature}`;
}

export function verifySitePasswordSession(
  subdomain: string,
  token: string,
  secret: string,
  now = Date.now(),
): boolean {
  const parts = token.split(":");
  if (parts.length !== 3) return false;
  const [tokenSubdomain, expiresRaw, signature] = parts;
  const expiresAt = Number(expiresRaw);
  if (tokenSubdomain !== subdomain || !Number.isFinite(expiresAt) || now > expiresAt) return false;
  const expected = createHmac("sha256", secret)
    .update(`${tokenSubdomain}:${expiresRaw}`)
    .digest("hex");
  return equalHex(signature ?? "", expected);
}
