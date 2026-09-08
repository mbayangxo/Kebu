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
  | "legacy-alkebulan-store";

export type MiddlewareRewrite = {
  kind: MiddlewareRewriteKind;
  /** Site slug when rewrite applies. */
  slug: string | null;
  /** Path after rewrite (e.g. `/sites/maylecor/about`). */
  pathname: string;
};

export function resolveMiddlewareRewrite(opts: {
  host: string;
  pathname: string;
  customDomainSlug?: string | null;
}): MiddlewareRewrite {
  const host = hostOnly(opts.host);
  const pathname = opts.pathname || "/";

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
