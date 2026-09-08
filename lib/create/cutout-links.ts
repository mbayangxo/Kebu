/** Normalize and validate cutout link hrefs (internal page slug or external URL). */

export function normalizeCutoutHref(raw: string): string {
  return raw.trim().slice(0, 300);
}

export function isExternalCutoutHref(href: string): boolean {
  const h = normalizeCutoutHref(href);
  return (
    h.startsWith("http://") ||
    h.startsWith("https://") ||
    h.startsWith("mailto:") ||
    h.startsWith("tel:")
  );
}

/** Extract a site page slug from `/about`, `about`, or bare slug. */
export function cutoutHrefToPageSlug(href: string): string | null {
  const h = normalizeCutoutHref(href);
  if (!h || h === "#" || isExternalCutoutHref(h)) return null;
  if (h.startsWith("#")) return null;
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(h)) return h;
  if (h.startsWith("/")) {
    const slug = h.replace(/^\/+/, "").split("/").filter(Boolean)[0];
    if (slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return slug;
  }
  return null;
}

/**
 * Resolve href for public site or builder preview.
 * Bare slugs and `/slug` become `{siteBase}/{slug}` when siteBase is set.
 */
export function resolveCutoutHref(href: string, siteBase = ""): string {
  const h = normalizeCutoutHref(href);
  if (!h || h === "#") return "";
  if (isExternalCutoutHref(h) || h.startsWith("#")) return h;

  const slug = cutoutHrefToPageSlug(h);
  if (slug) {
    const base = siteBase.replace(/\/$/, "");
    return base ? `${base}/${slug}` : `/${slug}`;
  }

  if (h.startsWith("/")) return h;
  return h;
}

export function cutoutLinkTarget(href: string): "_blank" | undefined {
  return isExternalCutoutHref(href) ? "_blank" : undefined;
}

export function cutoutLinkRel(href: string): string | undefined {
  return isExternalCutoutHref(href) ? "noopener noreferrer" : undefined;
}
