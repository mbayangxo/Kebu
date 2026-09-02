/** Supabase returns several variants when the address is not verified yet. */
export function isEmailNotConfirmed(message: string): boolean {
  return /email not confirmed|email_not_confirmed/i.test(message);
}

export function authCallbackUrl(nextPath = "/welcome"): string {
  if (typeof window === "undefined") {
    return `/auth/callback?next=${encodeURIComponent(nextPath)}`;
  }
  const origin = window.location.origin.replace(/\/$/, "");
  return `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}
