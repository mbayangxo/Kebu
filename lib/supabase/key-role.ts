/** Identify configured API key type; this does not authenticate the key. Never log its value. */
export function supabaseKeyRole(key: string | undefined): "anon" | "service_role" | "missing" | "invalid" {
  if (!key || key === "placeholder") return "missing";
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return "anon";
  if (/^sb_secret_[A-Za-z0-9_-]+$/.test(key)) return "service_role";
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
      "The public key is wrong (a secret or service-role key was used). In Vercel, set NEXT_PUBLIC_SUPABASE_ANON_KEY " +
      "to a publishable or legacy anon key from Supabase → Settings → API Keys, then Redeploy with cache cleared."
    );
  }
  if (role === "missing") {
    return "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel, then redeploy.";
  }
  if (role === "invalid") {
    return "Supabase public key looks invalid. Copy a publishable or legacy anon key from Supabase → Settings → API Keys, then redeploy.";
  }
  return null;
}
