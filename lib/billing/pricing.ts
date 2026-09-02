/** Kebu website hosting — billed via JOKO mobile money. */
export const SITE_HOSTING_MONTHLY_USD = 4;

export const SITE_HOSTING_MONTHLY_USD_CENTS = SITE_HOSTING_MONTHLY_USD * 100;

export const SITE_HOSTING_BILLING_LABEL = `$${SITE_HOSTING_MONTHLY_USD}/month`;

export const SITE_HOSTING_DESCRIPTION =
  "Keep your site live on Kebu. Pay with JOKO mobile money (Orange Money, Wave, and other supported wallets).";

/** Planned Kebu Mail add-on — not provisioned yet; UI must stay honest until backend ships. */
export const BUSINESS_EMAIL_YEARLY_USD = 12;

export const BUSINESS_EMAIL_YEARLY_LABEL = `$${BUSINESS_EMAIL_YEARLY_USD}/year`;

export const BUSINESS_EMAIL_DESCRIPTION =
  "Professional email on your domain (e.g. hello@yourbrand.com). Provisioning is not live yet — join the waitlist when we open it.";

export function formatUsdFromCents(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
