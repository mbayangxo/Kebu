/** Env vars a webhook/payout rail needs to verify real provider signatures — missing one means that rail silently accepts unverified callers (the webhook routes themselves already fail closed; this surfaces it before someone notices in production). */
export const REQUIRED_SECURITY_SECRETS = [
  "WAVE_WEBHOOK_SECRET",
  "PAYSTACK_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_PASSWORD",
  "CRON_SECRET",
] as const;

export function isWeakOrPlaceholderSecret(value: string): boolean {
  return value.length < 16 || /^(change_me|replace_|your_|example|test|password|secret)/i.test(value);
}

export type SecretAudit = { missingSecrets: string[]; weakSecrets: string[] };

/** Pure check against a given env snapshot — no process.env reach-in, so it's directly testable. */
export function auditSecuritySecrets(env: Record<string, string | undefined>): SecretAudit {
  const missingSecrets: string[] = [];
  const weakSecrets: string[] = [];
  for (const name of REQUIRED_SECURITY_SECRETS) {
    const value = env[name]?.trim();
    if (!value) {
      missingSecrets.push(name);
    } else if (isWeakOrPlaceholderSecret(value)) {
      weakSecrets.push(name);
    }
  }
  return { missingSecrets, weakSecrets };
}
