/**
 * May Lecor + K-Direction are personal portfolio sites — not shared products.
 * Only emails listed in KEBU_PORTFOLIO_OWNER_EMAILS (comma-separated) may seed them.
 * Fail closed: if the env var is empty, nobody can seed.
 */
export function portfolioOwnerEmails(): string[] {
  return (process.env.KEBU_PORTFOLIO_OWNER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isPortfolioOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = portfolioOwnerEmails();
  if (allowed.length === 0) return false;
  return allowed.includes(email.trim().toLowerCase());
}
