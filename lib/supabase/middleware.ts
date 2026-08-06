import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/map",
  "/dashboard",
  "/assistant",
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/map/")) return true;
  if (pathname.startsWith("/opportunity/")) return true;
  if (pathname.startsWith("/store/")) return true;
  if (pathname.startsWith("/matches")) return true;
  if (pathname.startsWith("/opportunities/")) return true;
  if (pathname.startsWith("/grants/")) return true;
  if (pathname.startsWith("/programs")) return true;
  if (pathname.startsWith("/newsroom")) return true;
  if (pathname.startsWith("/agents")) return true;
  if (pathname.startsWith("/capital-stack")) return true;
  if (pathname.startsWith("/afcfta")) return true;
  if (pathname.startsWith("/bankability")) return true;
  if (pathname.startsWith("/budget-intel")) return true;
  if (pathname.startsWith("/regulatory")) return true;
  if (pathname.startsWith("/remittance")) return true;
  if (pathname.startsWith("/collective")) return true;
  if (pathname.startsWith("/succession")) return true;
  if (pathname.startsWith("/build")) return true;
  if (pathname.startsWith("/path")) return true;
  if (pathname.startsWith("/success")) return true;
  if (pathname.startsWith("/procurement")) return true;
  if (pathname.startsWith("/feed")) return true;
  if (pathname.startsWith("/sovereignty")) return true;
  if (/\.[a-z0-9]+$/i.test(pathname)) return true;
  return false;
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect authenticated users away from login/signup
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Protect onboarding + Create Mode UI — requires auth
  if (!user && (pathname === "/onboarding" || pathname.startsWith("/create"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isPublicPath(pathname)) {
    return supabaseResponse;
  }

  return supabaseResponse;
}
