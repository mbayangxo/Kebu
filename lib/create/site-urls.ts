import { kebuSubdomainTarget } from "@/lib/create/custom-domains";

/** Public HTTPS URL on Kebu hosting (until a custom domain is connected). */
export function kebuAfricaSiteUrl(subdomain: string | null | undefined): string | null {
  const s = subdomain?.trim().toLowerCase();
  if (!s) return null;
  return `https://${kebuSubdomainTarget(s)}`;
}

/** Same-origin preview path while developing / before DNS. */
export function kebuSitePreviewPath(subdomain: string | null | undefined): string | null {
  const s = subdomain?.trim().toLowerCase();
  if (!s) return null;
  return `/sites/${s}`;
}

export function formatSiteAddressLabel(subdomain: string | null | undefined): string | null {
  const s = subdomain?.trim().toLowerCase();
  if (!s) return null;
  return `${s}.kebu.africa`;
}
