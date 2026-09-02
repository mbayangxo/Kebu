/** Decode Supabase JWT role without logging or returning the key. */
export function supabaseKeyRole(key: string | undefined): "anon" | "service_role" | "missing" | "invalid" {
  if (!key || key === "placeholder") return "missing";
  const parts = key.split(".");
  if (parts.length < 2) return "invalid";
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    ) as { role?: string };
    if (payload.role === "anon") return "anon";
    if (payload.role === "service_role") return "service_role";
    return "invalid";
  } catch {
    return "invalid";
  }
}

export function browserSupabaseMisconfigMessage(role: ReturnType<typeof supabaseKeyRole>): string | null {
  if (role === "service_role") {
    return (
      "The public anon key is wrong (service role key was used). In Vercel, set NEXT_PUBLIC_SUPABASE_ANON_KEY " +
      "to the anon public key from Supabase → Settings → API, then Redeploy with cache cleared."
    );
  }
  if (role === "missing") {
    return "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel, then redeploy.";
  }
  if (role === "invalid") {
    return "Supabase anon key looks invalid. Copy the anon public key again from Supabase → Settings → API, then redeploy.";
  }
  return null;
}
