export const categories = ["site_template","business_tool","mobile_money","ai_plugin","studio_template","logistics"] as const;
export const appFields = "id,name,tagline,category,pricing,price_xof,status,description,launch_url,privacy_url,support_url,revision,created_at,updated_at";
export type DeveloperApp = {
  id: string; name: string; tagline: string | null; category: string;
  pricing: string; price_xof: number | null; status: "draft"|"review"|"published"|"rejected"|"suspended";
  description: string; launch_url: string | null; privacy_url: string | null; support_url: string | null;
  revision: number; created_at: string; updated_at: string; installs?: number;
};
export type Install = { app_id: string; app_name: string; revision: number; installed_at: string };
export type AppReview = { id: string; revision: number; decision: string; note: string; created_at: string };
export const idPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function validAppUrl(value: unknown, kebuOrigin?: string): value is string {
  if (typeof value !== "string" || value.length > 1000) return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password && !u.port && !u.search && !u.hash
      && value === u.href.replace(/\/$/, value.endsWith("/") ? "/" : "")
      && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(u.hostname)
      && !/^[\d.]+$/.test(u.hostname) && !/(^|\.)(localhost|local|internal)$/.test(u.hostname)
      && !/%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(value)
      && (!kebuOrigin || u.origin !== new URL(kebuOrigin).origin);
  } catch { return false; }
}
export function listingInput(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const tagline = typeof b.tagline === "string" ? b.tagline.trim() : "";
  if (name.length < 2 || name.length > 60 || tagline.length > 160
    || !categories.includes(b.category as typeof categories[number])
    || !["free","paid","recurring"].includes(String(b.pricing))) return null;
  const description = typeof b.description === "string" ? b.description.trim() : "";
  if (description.length > 4000) return null;
  if (b.pricing !== "free" && (!Number.isSafeInteger(b.price_xof) || Number(b.price_xof) < 1)) return null;
  const urls: Record<string, string | null> = {};
  for (const key of ["launch_url","privacy_url","support_url"]) {
    const value = typeof b[key] === "string" ? b[key].trim() : "";
    if (value && !validAppUrl(value)) return null;
    urls[key] = value || null;
  }
  return { name, tagline: tagline || null, category: b.category, pricing: b.pricing,
    price_xof: b.pricing === "free" ? null : b.price_xof, description, ...urls };
}
