/** Pure routing helpers for `middleware.ts` — unit tested without Next.js request mocks. */

export const MAIN_HOSTS = new Set([
  "alkebulan.com",
  "www.alkebulan.com",
  "alkebulan.co",
  "www.alkebulan.co",
  "kebu.africa",
  "www.kebu.africa",
]);

export function hostOnly(raw: string): string {
  return raw.split(":")[0]?.toLowerCase() ?? "";
}

export type MiddlewareRewriteKind =
  | "none"
  | "kebu-subdomain"
  | "custom-domain"
  | "legacy-alkebulan-store"
  | "cloud-deployment";

export type MiddlewareRewrite = {
  kind: MiddlewareRewriteKind;
  /** Site slug when rewrite applies. */
  slug: string | null;
  /** Path after rewrite (e.g. `/sites/maylecor/about`). */
  pathname: string;
};

/**
 * Kebu Cloud static deployments live on a distinct `<slug>.cloud.kebu.africa`
 * subdomain — a different origin from both the main app and `<slug>.kebu.africa`
 * Builder sites, so an uploaded deployment's HTML/JS can never read the main
 * app's cookies/session or a Builder site's. Checked before the generic
 * `.kebu.africa` suffix since every cloud-deployment host also matches that.
 */
const CLOUD_DEPLOYMENT_SUFFIX = ".cloud.kebu.africa";

export function resolveMiddlewareRewrite(opts: {
  host: string;
  pathname: string;
  customDomainSlug?: string | null;
}): MiddlewareRewrite {
  const host = hostOnly(opts.host);
  const pathname = opts.pathname || "/";

  const cloudSlug = !MAIN_HOSTS.has(host) && host.endsWith(CLOUD_DEPLOYMENT_SUFFIX)
    ? host.slice(0, -CLOUD_DEPLOYMENT_SUFFIX.length)
    : "";
  if (cloudSlug) {
    return {
      kind: "cloud-deployment",
      slug: cloudSlug,
      pathname: rewriteCloudSitePath(cloudSlug, pathname),
    };
  }

  const isKebuSubdomain =
    !MAIN_HOSTS.has(host) && host.endsWith(".kebu.africa") && !host.startsWith("localhost");

  if (isKebuSubdomain) {
    const slug = host.split(".")[0] ?? null;
    return {
      kind: "kebu-subdomain",
      slug,
      pathname: rewriteSitePath(slug, pathname),
    };
  }

  const isCustomDomain =
    !MAIN_HOSTS.has(host) &&
    !host.endsWith(".kebu.africa") &&
    !host.endsWith(".vercel.app") &&
    !host.includes("localhost") &&
    !host.endsWith(".alkebulan.com") &&
    !host.endsWith(".alkebulan.co");

  if (isCustomDomain && opts.customDomainSlug) {
    return {
      kind: "custom-domain",
      slug: opts.customDomainSlug,
      pathname: rewriteSitePath(opts.customDomainSlug, pathname),
    };
  }

  if (isCustomDomain) {
    return { kind: "none", slug: null, pathname };
  }

  const isLegacyStore =
    !MAIN_HOSTS.has(host) &&
    (host.endsWith(".alkebulan.com") || host.endsWith(".alkebulan.co")) &&
    !host.startsWith("localhost");

  if (isLegacyStore && pathname === "/") {
    const slug = host.split(".")[0] ?? null;
    return { kind: "legacy-alkebulan-store", slug, pathname: `/store/${slug}` };
  }

  return { kind: "none", slug: null, pathname };
}

/** Map public host request path → internal `/sites/{slug}` path. */
export function rewriteSitePath(slug: string | null, pathname: string): string {
  if (!slug) return pathname;
  if (pathname === "/" || pathname.startsWith("/sites/")) {
    return pathname === "/" ? `/sites/${slug}` : pathname;
  }
  return `/sites/${slug}${pathname}`;
}

/** Map a `<slug>.cloud.kebu.africa` request path → internal cloud-sites serving route. */
export function rewriteCloudSitePath(slug: string | null, pathname: string): string {
  if (!slug) return pathname;
  const rest = pathname === "/" ? "/index.html" : pathname;
  if (rest.startsWith(`/cloud-sites/${slug}/`)) return rest;
  return `/cloud-sites/${slug}${rest}`;
}
