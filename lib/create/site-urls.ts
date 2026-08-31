/**
 * Public site URLs.
 *
 * Until Kebu owns kebu.africa + wildcard DNS/SSL, the only reliable public URL is
 * `{NEXT_PUBLIC_APP_URL}/sites/{subdomain}` on the real app host.
 * `*.kebu.africa` is a planned branded address — do not treat it as live.
 */

export function normalizeSubdomain(subdomain: string | null | undefined): string | null {
  const s = subdomain?.trim().toLowerCase();
  return s || null;
}

/** Path on the main app host — works today without kebu.africa. */
export function kebuSitePreviewPath(subdomain: string | null | undefined): string | null {
  const s = normalizeSubdomain(subdomain);
  if (!s) return null;
  return `/sites/${s}`;
}

/**
 * Absolute live URL on the current app host (NEXT_PUBLIC_APP_URL).
 * Falls back to relative /sites/... when env is unset (browser can still open it).
 */
export function liveSiteUrl(subdomain: string | null | undefined): string | null {
  const path = kebuSitePreviewPath(subdomain);
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  return base ? `${base}${path}` : path;
}

/** Planned branded hostname — not live until the domain is owned + DNS. */
export function plannedKebuAfricaHost(subdomain: string | null | undefined): string | null {
  const s = normalizeSubdomain(subdomain);
  if (!s) return null;
  return `${s}.kebu.africa`;
}

/** @deprecated Prefer liveSiteUrl — kebu.africa is not owned yet. */
export function kebuAfricaSiteUrl(subdomain: string | null | undefined): string | null {
  const host = plannedKebuAfricaHost(subdomain);
  return host ? `https://${host}` : null;
}

export function formatSiteAddressLabel(subdomain: string | null | undefined): string | null {
  return plannedKebuAfricaHost(subdomain);
}
