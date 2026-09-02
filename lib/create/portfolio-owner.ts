/**
 * May Lecor + K-Direction are personal portfolio sites — not shared public templates.
 * Env `KEBU_PORTFOLIO_OWNER_EMAILS` (comma-separated) overrides the built-in founder list.
 */
export const FOUNDER_PORTFOLIO_OWNER_EMAILS = ["goldendaffodilxo@gmail.com"] as const;

export function portfolioOwnerEmails(): string[] {
  const fromEnv = (process.env.KEBU_PORTFOLIO_OWNER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (fromEnv.length > 0) return fromEnv;
  return [...FOUNDER_PORTFOLIO_OWNER_EMAILS];
}

export function isPortfolioOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return portfolioOwnerEmails().includes(email.trim().toLowerCase());
}
