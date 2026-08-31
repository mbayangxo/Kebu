import { NextRequest } from "next/server";

// ── IP-based rate limiter ─────────────────────────────────────────────────────
// Each serverless instance has its own map. This stops casual abuse and script
// kiddies running up the AI bill. Upgrade to Upstash Redis for distributed
// enforcement across all instances once traffic grows.

const buckets = new Map<string, { count: number; resetAt: number }>();

const AI_LIMIT = 30;        // requests per IP per window
const BUILDER_LIMIT = 120;  // saves / publish / settings per IP per window
const PUBLIC_LIMIT = 180;   // public site reads per IP per window
const WINDOW_MS = 60_000;   // 1 minute

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

// Returns a 401 Response if the Authorization header doesn't match CRON_SECRET.
// Pass through if CRON_SECRET is not set (local dev convenience).
export function requireCronSecret(req: NextRequest): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null;
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
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
