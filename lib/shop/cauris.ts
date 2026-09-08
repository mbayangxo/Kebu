/**
 * Cauris = Joko’s currency.
 * Buyers pay in Cauris; local money (XOF/CFA, NGN, …) is shown as an equivalent.
 * Rates are provisional until a live FX / ALK feed is wired — never silent.
 */

export type CaurisRateBook = {
  /** How many XOF (CFA franc) = 1 Cauris */
  xofPerCauris: number;
  /** How many NGN = 1 Cauris */
  ngnPerCauris: number;
  /** Honest: provisional table vs live feed */
  source: "provisional" | "live";
  asOf: string;
};

/** Default book — override with CAURIS_XOF_PER / CAURIS_NGN_PER env. */
export function caurisRateBook(): CaurisRateBook {
  const xof = Number(process.env.CAURIS_XOF_PER ?? process.env.NEXT_PUBLIC_CAURIS_XOF_PER ?? "600");
  const ngn = Number(process.env.CAURIS_NGN_PER ?? process.env.NEXT_PUBLIC_CAURIS_NGN_PER ?? "250");
  return {
    xofPerCauris: Number.isFinite(xof) && xof > 0 ? xof : 600,
    ngnPerCauris: Number.isFinite(ngn) && ngn > 0 ? ngn : 250,
    source: "provisional",
    asOf: "2026-09-07",
  };
}

export type CaurisAmount = {
  /** Amount to pay in Cauris (Joko) */
  cauris: number;
  /** Rounded for display, e.g. 12.5 */
  caurisLabel: string;
  /** Pay-line for UI */
  payLabel: string;
  /** Local equivalents for honesty */
  xof: number | null;
  ngn: number | null;
  equivalentsLabel: string;
  rateNote: string;
};

/** Convert a shop price in XOF → Cauris for Joko checkout. */
export function xofToCauris(amountXof: number, book: CaurisRateBook = caurisRateBook()): CaurisAmount {
  const xof = Math.max(0, Math.round(amountXof));
  const cauris = xof / book.xofPerCauris;
  const rounded = Math.round(cauris * 100) / 100;
  const ngn = Math.round(rounded * book.ngnPerCauris);
  const caurisLabel = rounded.toLocaleString("en-US", {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return {
    cauris: rounded,
    caurisLabel,
    payLabel: `Pay ${caurisLabel} Cauris`,
    xof,
    ngn,
    equivalentsLabel: `≈ ${xof.toLocaleString("fr-FR")} XOF · ≈ ${ngn.toLocaleString("en-NG")} NGN`,
    rateNote:
      book.source === "live"
        ? `1 Cauris = ${book.xofPerCauris} XOF · ${book.ngnPerCauris} NGN`
        : `1 Cauris = ${book.xofPerCauris} XOF · ${book.ngnPerCauris} NGN (provisional rates)`,
  };
}

/** Convert NGN → Cauris. */
export function ngnToCauris(amountNgn: number, book: CaurisRateBook = caurisRateBook()): CaurisAmount {
  const ngn = Math.max(0, Math.round(amountNgn));
  const cauris = ngn / book.ngnPerCauris;
  const rounded = Math.round(cauris * 100) / 100;
  const xof = Math.round(rounded * book.xofPerCauris);
  const caurisLabel = rounded.toLocaleString("en-US", {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return {
    cauris: rounded,
    caurisLabel,
    payLabel: `Pay ${caurisLabel} Cauris`,
    xof,
    ngn,
    equivalentsLabel: `≈ ${ngn.toLocaleString("en-NG")} NGN · ≈ ${xof.toLocaleString("fr-FR")} XOF`,
    rateNote:
      book.source === "live"
        ? `1 Cauris = ${book.xofPerCauris} XOF · ${book.ngnPerCauris} NGN`
        : `1 Cauris = ${book.xofPerCauris} XOF · ${book.ngnPerCauris} NGN (provisional rates)`,
  };
}

export function jokoPayHint(amountXof: number | null | undefined): string {
  if (amountXof == null || amountXof <= 0) {
    return "Pay in Cauris with Joko — order stays unpaid until the wallet confirms.";
  }
  const a = xofToCauris(amountXof);
  return `${a.payLabel} (${a.equivalentsLabel}). Unpaid until Joko confirms.`;
}
