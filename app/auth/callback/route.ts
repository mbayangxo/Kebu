import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAuthNextPath } from "@/lib/auth/safe-next";

export const dynamic = "force-dynamic";

/** Completes email confirmation / magic-link sign-in from Supabase. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeAuthNextPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const login = new URL("/login", origin);
    login.searchParams.set("error", "confirm_failed");
    return NextResponse.redirect(login);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
