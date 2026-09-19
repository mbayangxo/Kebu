import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";

// ── IP-based rate limiter ─────────────────────────────────────────────────────
// Each serverless instance has its own map. This stops casual abuse and script
// kiddies running up the AI bill. Upgrade to Upstash Redis for distributed
// enforcement across all instances once traffic grows.

const buckets = new Map<string, { count: number; resetAt: number }>();

const AI_LIMIT = 30; // requests per IP per window
const BUILDER_LIMIT = 120; // saves / publish / settings per IP per window
const PUBLIC_LIMIT = 180; // public site reads per IP per window
const AUTH_LIMIT = 20; // login / admin login attempts per IP per window
const WINDOW_MS = 60_000; // 1 minute
const MAX_LOCAL_BUCKETS = 10_000;

// Local fallback only. Keep memory bounded even if a warm server instance sees many IPs.
function pruneExpiredBuckets(now: number): void {
  if (buckets.size < MAX_LOCAL_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
  // Fail safe for memory: if traffic is extremely high, evict oldest insertion-order
  // entries. Distributed enforcement belongs at the edge/shared store, not this map.
  while (buckets.size >= MAX_LOCAL_BUCKETS) {
    const oldest = buckets.keys().next().value as string | undefined;
    if (!oldest) break;
    buckets.delete(oldest);
  }
}

function clientKey(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// Returns a 429 Response if the IP is over limit, null if allowed.
function rateLimit(req: NextRequest, limit: number, bucketSuffix: string): Response | null {
  const key = `${clientKey(req)}:${bucketSuffix}`;
  const now = Date.now();
  pruneExpiredBuckets(now);
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  if (bucket.count >= limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  bucket.count++;
  return null;
}

export function aiRateLimit(req: NextRequest): Response | null {
  return rateLimit(req, AI_LIMIT, "ai");
}

export function builderRateLimit(req: Request | NextRequest): Response | null {
  return rateLimit(req as NextRequest, BUILDER_LIMIT, "builder");
}

export function publicSiteRateLimit(req: Request | NextRequest): Response | null {
  return rateLimit(req as NextRequest, PUBLIC_LIMIT, "public");
}

const SHOP_ORDER_LIMIT = 20;

/** Customer order posts from live sites. */
export function shopOrderRateLimit(req: Request | NextRequest): Response | null {
  return rateLimit(req as NextRequest, SHOP_ORDER_LIMIT, "shop-order");
}

/** Login / admin login — stops password guessing from one IP. */
export function authRateLimit(req: Request | NextRequest): Response | null {
  return rateLimit(req as NextRequest, AUTH_LIMIT, "auth");
}

// Returns a 401 Response if the Authorization header doesn't match CRON_SECRET.
// Production fails closed when the secret is missing. Local dev may run without it.
export function requireCronSecret(req: NextRequest): Response | null {
  const secret = process.env.CRON_SECRET?.trim();
  const invalidProductionSecret =
    process.env.NODE_ENV === "production" &&
    (!secret || secret.length < 32 || /^(change_me|replace_|your_|example)/i.test(secret));
  if (!secret || invalidProductionSecret) {
    if (process.env.NODE_ENV !== "production") return null;
    console.error("CRON_SECRET is missing, weak, or placeholder in production; refusing privileged cron request.");
    return new Response(JSON.stringify({ error: "Cron authentication is not configured." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const authDigest = createHash("sha256").update(auth).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  if (!timingSafeEqual(authDigest, expectedDigest)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

// Clamp a string to max length to prevent oversized prompt injections.
export function clamp(value: unknown, max: number): string {
  return String(value ?? "").slice(0, max);
}
