/**
 * Cross-border shipping quotes — corridor tables with honest trust labels.
 * Slice B: Senegal → Ghana first. Not a live carrier API; not legal advice on duties.
 */

export type ShippingTrustLabel = "estimate" | "partner_rate";

export type ShippingQuote = {
  fromCountry: string;
  toCountry: string;
  corridor: string;
  /** Same-country vs cross-border */
  crossBorder: boolean;
  amountXof: number;
  currency: "XOF";
  etaMinDays: number;
  etaMaxDays: number;
  methodLabel: string;
  carrierHint: string;
  trustLabel: ShippingTrustLabel;
  /** Plain-language customs note — never claim verified law. */
  customsHint: string;
  quoteVersion: string;
  /** Human summary for UI */
  summary: string;
};

export const SHIPPING_QUOTE_VERSION = "corridor-v1-sn-gh-2026-09";

const AFRICA_DESTINATIONS = [
  { code: "SN", label: "Senegal" },
  { code: "GH", label: "Ghana" },
] as const;

export function shippingDestinationOptions(fromCountry: string): { code: string; label: string }[] {
  const from = fromCountry.trim().toUpperCase() || "SN";
  const list = [...AFRICA_DESTINATIONS];
  if (!list.some((d) => d.code === from)) {
    list.unshift({ code: from, label: from });
  }
  return list;
}

/**
 * Quote shipping for a corridor.
 * Only SN→SN (local) and SN→GH (cross-border) are fully defined in v1.
 * Other pairs return null (honest — not invented).
 */
export function quoteShippingCorridor(opts: {
  fromCountry: string;
  toCountry: string;
  /** Optional merchandise value for duty messaging only — does not change v1 rates. */
  goodsValueXof?: number | null;
}): ShippingQuote | null {
  const from = opts.fromCountry.trim().toUpperCase();
  const to = opts.toCountry.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(from) || !/^[A-Z]{2}$/.test(to)) return null;

  const corridor = `${from}→${to}`;

  if (from === "SN" && to === "SN") {
    return {
      fromCountry: from,
      toCountry: to,
      corridor,
      crossBorder: false,
      amountXof: 2500,
      currency: "XOF",
      etaMinDays: 1,
      etaMaxDays: 3,
      methodLabel: "Local delivery (Dakar / Senegal)",
      carrierHint: "Yango / local courier / pickup",
      trustLabel: "estimate",
      customsHint: "Domestic — no cross-border customs.",
      quoteVersion: SHIPPING_QUOTE_VERSION,
      summary: "Local Senegal delivery · ~2 500 XOF · 1–3 days (estimate)",
    };
  }

  if (from === "SN" && to === "GH") {
    return {
      fromCountry: from,
      toCountry: to,
      corridor,
      crossBorder: true,
      amountXof: 18500,
      currency: "XOF",
      etaMinDays: 5,
      etaMaxDays: 12,
      methodLabel: "Senegal → Ghana parcel",
      carrierHint: "DHL / Aramex / regional freight (merchant books)",
      trustLabel: "estimate",
      customsHint:
        "Cross-border into Ghana: import duty/VAT may apply depending on goods and value. ECOWAS rules can reduce duties for some originating goods — confirm with a broker or Ghana Customs. This is not legal advice.",
      quoteVersion: SHIPPING_QUOTE_VERSION,
      summary: "Ship to Ghana · ~18 500 XOF · 5–12 days (estimate)",
    };
  }

  return null;
}

export function formatShippingXof(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} XOF`;
}
