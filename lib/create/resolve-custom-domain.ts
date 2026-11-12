import { createClient } from "@supabase/supabase-js";

type CacheEntry = { value: string | null; expiresAt: number };
const domainCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;
const NEGATIVE_CACHE_TTL_MS = 15_000;
const MAX_CACHE_ENTRIES = 5_000;

function normalizeHost(hostname: string): string | null {
  const raw = hostname.split(":")[0]?.trim().toLowerCase() ?? "";
  if (!raw || raw.includes("localhost")) return null;
  return raw.replace(/^www\./, "");
}

function pruneCache(now: number): void {
  if (domainCache.size < MAX_CACHE_ENTRIES) return;
  for (const [key, entry] of domainCache) {
    if (entry.expiresAt <= now) domainCache.delete(key);
  }
  while (domainCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = domainCache.keys().next().value as string | undefined;
    if (!oldest) break;
    domainCache.delete(oldest);
  }
}

/**
 * Map a verified custom hostname → Kebu site subdomain.
 *
 * The hot path is cached per runtime instance so repeated page/assets requests do
 * not hit Supabase twice. Database constraints remain the source of truth.
 * A distributed edge cache can replace this adapter later without changing callers.
 */
export async function resolveSubdomainForCustomHost(hostname: string): Promise<string | null> {
  const host = normalizeHost(hostname);
  if (!host) return null;

  const now = Date.now();
  const cached = domainCache.get(host);
  if (cached && cached.expiresAt > now) return cached.value;
  if (cached) domainCache.delete(host);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  const supabase = createClient(url, serviceKey);
  const { data, error } = await supabase
    .from("site_domains")
    .select("hostname, status, projects!inner(subdomain)")
    .eq("hostname", host)
    .eq("status", "verified")
    .maybeSingle();

  let value: string | null = null;
  if (!error && data) {
    const joined = data.projects as unknown as { subdomain?: unknown } | Array<{ subdomain?: unknown }> | null;
    const project = Array.isArray(joined) ? joined[0] : joined;
    if (typeof project?.subdomain === "string" && project.subdomain.trim()) value = project.subdomain;
  }

  pruneCache(now);
  domainCache.set(host, {
    value,
    expiresAt: now + (value ? CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS),
  });
  return value;
}

/** Tests and domain lifecycle code can evict stale runtime cache entries. */
export function invalidateCustomDomainCache(hostname?: string): void {
  if (!hostname) {
    domainCache.clear();
    return;
  }
  const host = normalizeHost(hostname);
  if (host) domainCache.delete(host);
}
