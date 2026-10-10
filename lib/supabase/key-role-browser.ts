/** Browser-safe key type check, including legacy JWTs; not key authentication. */
export function supabaseKeyRole(key: string | undefined): "anon" | "service_role" | "missing" | "invalid" {
  if (!key || key === "placeholder") return "missing";
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return "anon";
  if (/^sb_secret_[A-Za-z0-9_-]+$/.test(key)) return "service_role";
  const parts = key.split(".");
  if (parts.length < 2) return "invalid";
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64)) as { role?: string };
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
      "Wrong key in Vercel: NEXT_PUBLIC_SUPABASE_ANON_KEY must be a publishable or legacy anon key, never a secret or service-role key. " +
      "Fix it in Supabase → Settings → API Keys, then Redeploy and clear build cache."
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
