/** Kebu website hosting — billed via JOKO mobile money. */
export const SITE_HOSTING_MONTHLY_USD = 3;

export const SITE_HOSTING_MONTHLY_USD_CENTS = SITE_HOSTING_MONTHLY_USD * 100;

/** Pay for a year up front (cheaper than 12 × monthly). */
export const SITE_HOSTING_YEARLY_USD = 27;

export const SITE_HOSTING_YEARLY_USD_CENTS = SITE_HOSTING_YEARLY_USD * 100;

export const SITE_HOSTING_BILLING_LABEL = `$${SITE_HOSTING_MONTHLY_USD}/month`;

export const SITE_HOSTING_YEARLY_BILLING_LABEL = `$${SITE_HOSTING_YEARLY_USD}/year`;

export const SITE_HOSTING_DESCRIPTION =
  "Keep your site live on Kebu — $" +
  SITE_HOSTING_MONTHLY_USD +
  "/month or $" +
  SITE_HOSTING_YEARLY_USD +
  "/year. Pay with JOKO mobile money (Orange Money, Wave, and other supported wallets).";

/** Typical domain registration cost when buying through a registrar / Kebu Domains later. */
export const KEBU_DOMAIN_YEARLY_USD_FROM = 5;

export const KEBU_DOMAIN_YEARLY_LABEL = `from $${KEBU_DOMAIN_YEARLY_USD_FROM}/year`;

export const KEBU_DOMAIN_DESCRIPTION =
  "Buy a .com (or similar) for about $" +
  KEBU_DOMAIN_YEARLY_USD_FROM +
  "+/year depending on the name. Connecting a domain you already own is included with hosting — purchase-in-Kebu checkout is still rolling out.";

/** Planned Kebu Mail add-on — not provisioned yet; UI must stay honest until backend ships. */
export const BUSINESS_EMAIL_YEARLY_USD = 12;

export const BUSINESS_EMAIL_YEARLY_LABEL = `$${BUSINESS_EMAIL_YEARLY_USD}/year`;

export const BUSINESS_EMAIL_DESCRIPTION =
  "Professional email on your domain (e.g. hello@yourbrand.com). Provisioning is not live yet — join the waitlist when we open it.";

export function formatUsdFromCents(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
