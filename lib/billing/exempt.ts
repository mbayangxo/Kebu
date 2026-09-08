import { isPortfolioOwnerEmail, portfolioOwnerEmails } from "@/lib/create/portfolio-owner";

/**
 * Accounts that never pay for Kebu site hosting (founder / ops).
 * Includes portfolio owners plus optional KEBU_BILLING_EXEMPT_EMAILS.
 */
export function billingExemptEmails(): string[] {
  const fromEnv = (process.env.KEBU_BILLING_EXEMPT_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const merged = new Set<string>([...portfolioOwnerEmails(), ...fromEnv]);
  return [...merged];
}

export function isBillingExemptEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (isPortfolioOwnerEmail(normalized)) return true;
  return billingExemptEmails().includes(normalized);
}
