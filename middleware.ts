import { CLOUD_STATIC_CSP } from "@/lib/cloud/constants";
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveSubdomainForCustomHost } from "@/lib/create/resolve-custom-domain";
import { hostOnly, MAIN_HOSTS, resolveMiddlewareRewrite } from "@/lib/create/middleware-routing";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin/admin-session";

import { effectiveSiteVisibility } from "@/lib/create/site-visibility";
import { hasSiteAccess, loadSiteVisibility } from "@/lib/create/site-visibility-access";

const CAMERA_MIC_PATHS = [/^\/rooms\/[^/]+\/call\/?$/];
const GEOLOCATION_PATHS = [/^\/map\/?$/];

function withSecurityHeaders(response: NextResponse, pathname = ""): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  const cameraMic = CAMERA_MIC_PATHS.some((re) => re.test(pathname));
  const geolocation = GEOLOCATION_PATHS.some((re) => re.test(pathname));
  response.headers.set(
    "Permissions-Policy",
    `camera=${cameraMic ? "(self)" : "()"}, microphone=${cameraMic ? "(self)" : "()"}, geolocation=${geolocation ? "(self)" : "()"}`,
  );
  const scriptPolicy =
    process.env.NODE_ENV === "production"
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
  response.headers.set(
    "Content-Security-Policy",
    // worker-src needs blob: for MapLibre GL's bundler-built tile-parsing worker (Kebu Map, /map).
    "default-src 'self'; " + scriptPolicy + "; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; media-src 'self' https: blob:; font-src 'self' data: https:; connect-src 'self' https:; worker-src 'self' blob:; frame-ancestors 'self'; base-uri 'self'; form-action 'self' https:;",
  );
  response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return response;
}

/** Seed Data Saver cookie on first visit so SSR + client share Africa-first default. */
function withDataModeCookie(request: NextRequest, response: NextResponse): NextResponse {
  if (!request.cookies.get("kebu_data_mode")?.value) {
    response.cookies.set("kebu_data_mode", "data_saver", {
      path: "/",
      maxAge: 31_536_000,
      sameSite: "lax",
    });
  }
  return response;
}

const CSRF_MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/** Enforce same-origin on authenticated account/business browser mutations. */
function csrfMutationCheck(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  const protectedMutation = pathname.startsWith("/api/businesses/") || pathname.startsWith("/api/me/");
  if (!protectedMutation) return null;
  if (!CSRF_MUTATION_METHODS.has(request.method.toUpperCase())) return null;

  const origin = request.headers.get("origin");
  if (!origin) return NextResponse.json({ error: "Origin required." }, { status: 403 });

  const hostHeader = request.headers.get("host") ?? "";
  const requestHost = hostHeader.split(":")[0]?.toLowerCase() ?? "";
  let originHost = "";
  try {
    originHost = new URL(origin).hostname.toLowerCase();
  } catch {
    return NextResponse.json({ error: "Forbidden origin." }, { status: 403 });
  }

  if (originHost === requestHost) return null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      if (originHost === new URL(appUrl).hostname.toLowerCase()) return null;
    } catch { /* ignore */ }
  }

  return NextResponse.json({ error: "Forbidden origin." }, { status: 403 });
}

async function siteVisibilityResponse(request: NextRequest, routedPath: string) {
  const api = routedPath.match(/^\/api\/public\/sites\/([^/]+)(?:\/|$)/i);
  const page = routedPath.match(/^\/sites\/([^/]+)(?:\/|$)/i);
  const raw = (api ?? page)?.[1];
  if (!raw || (page && /^\/sites\/order-(thanks|cancel)\/?$/.test(routedPath))) return null;
  let slug: string;
  try { slug = decodeURIComponent(raw).trim().toLowerCase(); } catch { slug = ""; }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return new NextResponse("Not found", { status: 404 });
  try {
    const site = await loadSiteVisibility(slug);
    if (!site) return new NextResponse("Not found", { status: 404 });
    const mode = effectiveSiteVisibility(site);
    if (mode === "public") return null;
    if (mode === "private" && !/\.(?:xml|txt|ico)$|\/opengraph-image(?:\/|$)/i.test(routedPath) &&
        await hasSiteAccess(request, slug, site.site_password_hash)) {
      if (!api || ["GET", "HEAD"].includes(request.method)) return null;
    }
    if (api) return NextResponse.json({ error: "This site is not accepting public requests." }, { status: 403 });
    if (/\.(?:xml|txt|ico)$|\/opengraph-image(?:\/|$)/i.test(routedPath)) {
      return new NextResponse("Not found", { status: 404 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/site-status";
    url.search = "";
    url.searchParams.set("mode", mode);
    url.searchParams.set("site", slug);
    url.searchParams.set("title", site.title);
    if (site.site_visibility_message) url.searchParams.set("message", site.site_visibility_message);
    if (site.site_launch_at) url.searchParams.set("launch", site.site_launch_at);
    return NextResponse.rewrite(url);
  } catch {
    return new NextResponse("Site temporarily unavailable.", { status: 503 });
  }
}

export async function middleware(request: NextRequest) {
  const csrfReject = csrfMutationCheck(request);
  if (csrfReject) return csrfReject;

  if (/^\/cloud-sites(?:\/|$)/.test(request.nextUrl.pathname)) return new NextResponse("Not found", { status: 404 });
  const hostname = request.headers.get("host") ?? "";
  const host = hostOnly(hostname);
  const proto = request.headers.get("x-forwarded-proto");
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && proto === "http" && !hostname.includes("localhost")) {
    const secure = request.nextUrl.clone();
    secure.protocol = "https:";
    return withDataModeCookie(request, withSecurityHeaders(NextResponse.redirect(secure, 308)));
  }

  const customSlug =
    !MAIN_HOSTS.has(host) &&
    !host.endsWith(".kebu.africa") &&
    !host.endsWith(".vercel.app") &&
    !host.includes("localhost") &&
    !host.endsWith(".alkebulan.com") &&
    !host.endsWith(".alkebulan.co")
      ? await resolveSubdomainForCustomHost(host)
      : null;

  const rewrite = resolveMiddlewareRewrite({
    host,
    pathname: request.nextUrl.pathname,
    customDomainSlug: customSlug,
  });

  if (rewrite.kind === "cloud-deployment") {
    // Served from a distinct <slug>.cloud.kebu.africa origin: never falls through to
    // updateSession() below, so an uploaded deployment's page can never see a Kebu
    // auth cookie (there isn't one on this host) or the main app's session.
    // The serving route itself requires x-kebu-cloud-site, set only here, so a
    // direct request to /cloud-sites/... on the MAIN app's own origin (which would
    // defeat the whole point of the isolation) is refused rather than served.
    const url = request.nextUrl.clone();
    url.pathname = rewrite.pathname;
    const reqHeaders = new Headers(request.headers);
    reqHeaders.delete("cookie");
    reqHeaders.delete("authorization");
    reqHeaders.set("x-kebu-cloud-site", "1");
    const response = withSecurityHeaders(NextResponse.rewrite(url, { request: { headers: reqHeaders } }));
    response.headers.set("Content-Security-Policy", CLOUD_STATIC_CSP);
    return response;
  }

  const path = request.nextUrl.pathname;
  const isSiteApi = /^\/api\/(?:public\/)?sites\//i.test(path);
  if (isSiteApi && rewrite.slug && (rewrite.kind === "kebu-subdomain" || rewrite.kind === "custom-domain")) {
    const scope = path.match(/^\/api\/(?:public\/)?sites\/([^/]+)/i)?.[1];
    if (scope !== rewrite.slug) return new NextResponse("Not found", { status: 404 });
  }
  const gated = await siteVisibilityResponse(request, isSiteApi ? path : rewrite.pathname);
  // Site-owned static paths must pass the same gate; app assets need no session refresh.
  if (!gated && rewrite.kind === "none" && !isSiteApi && !path.startsWith("/sites/") &&
      /\.(?:svg|png|jpg|jpeg|gif|webp|json|ico)$/.test(path)) return NextResponse.next();
  if (gated) {
    gated.headers.set("X-Robots-Tag", "noindex, nofollow");
    return withSecurityHeaders(gated);
  }
  if (isSiteApi && rewrite.kind !== "none") {
    return withSecurityHeaders(NextResponse.next());
  }

  if (rewrite.kind === "kebu-subdomain" || rewrite.kind === "custom-domain") {
    const url = request.nextUrl.clone();
    url.pathname = rewrite.pathname;
    const reqHeaders = new Headers(request.headers);
    reqHeaders.set("x-kebu-is-public-site", "1");
    return withDataModeCookie(
      request,
      withSecurityHeaders(NextResponse.rewrite(url, { request: { headers: reqHeaders } })),
    );
  }

  if (rewrite.kind === "legacy-alkebulan-store") {
    const url = request.nextUrl.clone();
    url.pathname = rewrite.pathname;
    return withDataModeCookie(request, withSecurityHeaders(NextResponse.rewrite(url)));
  }

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const cookie = request.cookies.get(ADMIN_SESSION_COOKIE);
    if (!(await verifyAdminSessionToken(cookie?.value))) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return withDataModeCookie(request, withSecurityHeaders(NextResponse.redirect(url)));
    }
  }

  return withDataModeCookie(request, withSecurityHeaders(await updateSession(request), pathname));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
