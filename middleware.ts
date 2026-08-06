import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const ADMIN_COOKIE = "alkebulan-admin";

// Known hostnames that serve the main Alkebulan app
const MAIN_HOSTS = new Set([
  "alkebulan.com",
  "www.alkebulan.com",
  "alkebulan.co",
  "www.alkebulan.co",
  "kebu.africa",
  "www.kebu.africa",
]);

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";

  // Published Kebu websites: slug.kebu.africa → /sites/slug
  const isKebuSubdomain =
    !MAIN_HOSTS.has(hostname) &&
    hostname.endsWith(".kebu.africa") &&
    !hostname.startsWith("localhost");

  if (isKebuSubdomain) {
    const slug = hostname.split(".")[0];
    const url = request.nextUrl.clone();
    if (url.pathname === "/") {
      url.pathname = `/sites/${slug}`;
      return NextResponse.rewrite(url);
    }
  }

  // Legacy storefronts: slug.alkebulan.com → /store/slug
  const isSubdomain =
    !MAIN_HOSTS.has(hostname) &&
    (hostname.endsWith(".alkebulan.com") || hostname.endsWith(".alkebulan.co")) &&
    !hostname.startsWith("localhost");

  if (isSubdomain) {
    const slug = hostname.split(".")[0];
    const url = request.nextUrl.clone();
    if (url.pathname === "/") {
      url.pathname = `/store/${slug}`;
      return NextResponse.rewrite(url);
    }
  }

  // Protect /admin behind a password cookie
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const adminPassword = process.env.ADMIN_PASSWORD;
    const cookie = request.cookies.get(ADMIN_COOKIE);
    if (!adminPassword || !cookie || cookie.value !== adminPassword) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|ico)$).*)",
  ],
};

