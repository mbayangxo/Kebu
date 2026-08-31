/** Kebu website hosting — billed via JOKO mobile money. */
export const SITE_HOSTING_MONTHLY_USD = 4;

export const SITE_HOSTING_MONTHLY_USD_CENTS = SITE_HOSTING_MONTHLY_USD * 100;

export const SITE_HOSTING_BILLING_LABEL = `$${SITE_HOSTING_MONTHLY_USD}/month`;

export const SITE_HOSTING_DESCRIPTION =
  "Keep your site live on Kebu. Pay with JOKO mobile money (Orange Money, Wave, and other supported wallets).";

export function formatUsdFromCents(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
