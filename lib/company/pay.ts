/** Exact decimal-to-minor conversion for employer-entered records; never floating-point rounding. */
export function supportedPayCurrency(currency: string) {
  return Intl.supportedValuesOf("currency").includes(currency);
}
function digits(currency: string) {
  if (!supportedPayCurrency(currency))
    throw Error("Choose a supported currency code.");
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits!;
}
export function payMinor(input: string, currency: string) {
  const places = digits(currency);
  const match = /^(\d+)(?:\.(\d+))?$/.exec(input.trim());
  if (!match || (match[2]?.length ?? 0) > places)
    throw Error(`Use no more than ${places} decimal places for ${currency}.`);
  const value =
    BigInt(match[1]) * BigInt(10) ** BigInt(places) +
    BigInt((match[2] ?? "").padEnd(places, "0") || "0");
  if (value > BigInt(1000000000000)) throw Error("Amount is too large.");
  return Number(value);
}
export function formatPay(value: number, currency: string) {
  if (!supportedPayCurrency(currency))
    return `${value} minor units (${currency})`;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value / 10 ** digits(currency));
}
