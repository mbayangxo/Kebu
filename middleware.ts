import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveSubdomainForCustomHost } from "@/lib/create/resolve-custom-domain";
import { hostOnly, MAIN_HOSTS, resolveMiddlewareRewrite } from "@/lib/create/middleware-routing";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin/admin-session";

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'self'; base-uri 'self'; form-action 'self' https:;",
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

export async function middleware(request: NextRequest) {
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

  if (rewrite.kind === "kebu-subdomain" || rewrite.kind === "custom-domain") {
    const url = request.nextUrl.clone();
    url.pathname = rewrite.pathname;
    return withDataModeCookie(request, withSecurityHeaders(NextResponse.rewrite(url)));
  }

  if (rewrite.kind === "legacy-alkebulan-store") {
    const url = request.nextUrl.clone();
    url.pathname = rewrite.pathname;
    return withDataModeCookie(request, withSecurityHeaders(NextResponse.rewrite(url)));
  }

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const cookie = request.cookies.get(ADMIN_SESSION_COOKIE);
    if (!verifyAdminSessionToken(cookie?.value)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return withDataModeCookie(request, withSecurityHeaders(NextResponse.redirect(url)));
    }
  }

  return withDataModeCookie(request, withSecurityHeaders(await updateSession(request)));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|ico)$).*)",
  ],
};
