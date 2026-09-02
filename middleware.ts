import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveSubdomainForCustomHost } from "@/lib/create/resolve-custom-domain";

const ADMIN_COOKIE = "alkebulan-admin";

const MAIN_HOSTS = new Set([
  "alkebulan.com",
  "www.alkebulan.com",
  "alkebulan.co",
  "www.alkebulan.co",
  "kebu.africa",
  "www.kebu.africa",
]);

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'self'; base-uri 'self'; form-action 'self' https:;",
  );
  // HTML / app navigations through middleware — never browser-cache pages.
  response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
  return response;
}

function hostOnly(raw: string): string {
  return raw.split(":")[0]?.toLowerCase() ?? "";
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const host = hostOnly(hostname);
  const proto = request.headers.get("x-forwarded-proto");
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && proto === "http" && !hostname.includes("localhost")) {
    const secure = request.nextUrl.clone();
    secure.protocol = "https:";
    return withSecurityHeaders(NextResponse.redirect(secure, 308));
  }

  const isKebuSubdomain =
    !MAIN_HOSTS.has(host) &&
    host.endsWith(".kebu.africa") &&
    !host.startsWith("localhost");

  if (isKebuSubdomain) {
    const slug = host.split(".")[0];
    const url = request.nextUrl.clone();
    if (url.pathname === "/" || url.pathname.startsWith("/sites/")) {
      if (url.pathname === "/") {
        url.pathname = `/sites/${slug}`;
      }
      return withSecurityHeaders(NextResponse.rewrite(url));
    }
    url.pathname = `/sites/${slug}${url.pathname}`;
    return withSecurityHeaders(NextResponse.rewrite(url));
  }

  const isCustomDomain =
    !MAIN_HOSTS.has(host) &&
    !host.endsWith(".kebu.africa") &&
    !host.endsWith(".vercel.app") &&
    !host.includes("localhost") &&
    !host.endsWith(".alkebulan.com") &&
    !host.endsWith(".alkebulan.co");

  if (isCustomDomain) {
    const slug = await resolveSubdomainForCustomHost(host);
    if (slug) {
      const url = request.nextUrl.clone();
      if (url.pathname === "/" || url.pathname.startsWith("/sites/")) {
        if (url.pathname === "/") {
          url.pathname = `/sites/${slug}`;
        }
        return withSecurityHeaders(NextResponse.rewrite(url));
      }
      url.pathname = `/sites/${slug}${url.pathname}`;
      return withSecurityHeaders(NextResponse.rewrite(url));
    }
  }

  const isSubdomain =
    !MAIN_HOSTS.has(host) &&
    (host.endsWith(".alkebulan.com") || host.endsWith(".alkebulan.co")) &&
    !host.startsWith("localhost");

  if (isSubdomain) {
    const slug = host.split(".")[0];
    const url = request.nextUrl.clone();
    if (url.pathname === "/") {
      url.pathname = `/store/${slug}`;
      return withSecurityHeaders(NextResponse.rewrite(url));
    }
  }

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const adminPassword = process.env.ADMIN_PASSWORD;
    const cookie = request.cookies.get(ADMIN_COOKIE);
    if (!adminPassword || !cookie || cookie.value !== adminPassword) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return withSecurityHeaders(NextResponse.redirect(url));
    }
  }

  return withSecurityHeaders(await updateSession(request));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|ico)$).*)",
  ],
};
