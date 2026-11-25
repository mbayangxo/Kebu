import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { effectiveSiteVisibility, type SiteVisibilityFields } from "./site-visibility";

export type SiteVisibilityRecord = SiteVisibilityFields & {
  site_password_hash: string | null;
  site_visibility_message: string | null;
  title: string;
  published_at: string | null;
  status: string;
};

export async function loadSiteVisibility(slug: string): Promise<SiteVisibilityRecord | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Site visibility unavailable");
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  const { data, error } = await db.from("projects")
    .select("title,status,published_at,site_visibility,site_launch_at,site_visibility_message,site_password_enabled,site_password_hash")
    .eq("subdomain", slug).maybeSingle();
  if (error) throw new Error("Site visibility unavailable");
  return data;
}

/** Same signature as the auth route. Bind access to the current password so a reset revokes old grants. */
export async function hasSiteAccess(request: NextRequest, slug: string, hash: string | null) {
  const token = request.cookies.get(`kebu_site_pw_${slug}`)?.value;
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret || secret.length < 32 || !hash || !token) return false;
  const [host, expiration, signature, ...rest] = token.split(":");
  if (rest.length || host !== slug || !/^\d{13}$/.test(expiration ?? "") || Number(expiration) <= Date.now() ||
      !/^[a-f0-9]{64}$/.test(signature ?? "")) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const bytes = Uint8Array.from(signature.match(/.{2}/g) ?? [], (hex) => parseInt(hex, 16));
  return crypto.subtle.verify("HMAC", key, bytes, encoder.encode(`${slug}:${expiration}:${hash}`));
}

export async function isPublicSite(slug: string) {
  try {
    const site = await loadSiteVisibility(slug);
    return site?.status === "published" && effectiveSiteVisibility(site) === "public";
  } catch {
    return false;
  }
}
