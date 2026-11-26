import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SecurityEventType = "csrf_rejected" | "auth_rate_limited" | "admin_login_failed";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedClient: SupabaseClient<any> | null | undefined;

/** Lazily built service-role client, reused across calls in the same warm instance. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function securityEventsClient(): SupabaseClient<any> | null {
  if (cachedClient !== undefined) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  cachedClient =
    url && key
      ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
      : null;
  return cachedClient;
}

/**
 * Fire-and-forget log of a real security signal (CSRF rejection, auth
 * rate-limit trip, admin login failure) into `security_events`, read by the
 * Kebu Record admin portal and the security-check cron. Never awaited by
 * callers and never throws — logging failure must never break the request
 * it's observing (same durability contract as recordPaymentLedgerEvent).
 */
export function recordSecurityEvent(opts: {
  eventType: SecurityEventType;
  source: string;
  detail?: Record<string, unknown>;
}): void {
  const client = securityEventsClient();
  if (!client) return;
  void client
    .from("security_events")
    .insert({
      event_type: opts.eventType,
      source: opts.source.slice(0, 200),
      detail: opts.detail ?? {},
    })
    .then(
      () => undefined,
      () => undefined,
    );
}
