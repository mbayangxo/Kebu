import { NextResponse } from "next/server";
import { supabaseKeyRole } from "@/lib/supabase/key-role";

export const dynamic = "force-dynamic";

/** Safe deploy check — never returns key values, only role labels. */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonRole = supabaseKeyRole(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRole = supabaseKeyRole(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const ok =
    Boolean(url && !url.includes("placeholder")) &&
    anonRole === "anon" &&
    serviceRole === "service_role";

  return NextResponse.json({
    ok,
    urlConfigured: Boolean(url && !url.includes("placeholder")),
    anonKeyRole: anonRole,
    serviceKeyRole: serviceRole,
    signupHint:
      anonRole !== "anon"
        ? "Fix NEXT_PUBLIC_SUPABASE_ANON_KEY (must be anon public, not service_role), then Redeploy — signup uses build-time env."
        : "Server env looks correct. If signup still fails, redeploy with cleared cache (browser bundle may be stale).",
  });
}
