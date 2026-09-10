/** Catalog / gallery themes — sold at this price unless a row overrides higher. */
export const AESTHETIC_THEME_PRICE_USD_CENTS = 500;

export const AESTHETIC_THEME_PRICE_LABEL = "$5";

export function formatAestheticThemePrice(cents = AESTHETIC_THEME_PRICE_USD_CENTS): string {
  if (cents <= 0) return "Free";
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}
