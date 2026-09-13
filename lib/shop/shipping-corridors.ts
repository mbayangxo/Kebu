/**
 * Cross-border shipping quotes — ECOWAS corridor table v2.
 * Static estimates, not a live carrier API, not legal advice on duties.
 * Rates in XOF; all ETA ranges are business days.
 */

export type ShippingTrustLabel = "estimate" | "partner_rate";

export type ShippingQuote = {
  fromCountry: string;
  toCountry: string;
  corridor: string;
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
  summary: string;
};

export const SHIPPING_QUOTE_VERSION = "corridor-v2-ecowas-2026-09";

// All countries with at least one supported outbound corridor
const COUNTRY_LABELS: Record<string, string> = {
  BF: "Burkina Faso",
  BJ: "Bénin",
  CI: "Côte d'Ivoire",
  GH: "Ghana",
  GM: "Gambie",
  GN: "Guinée",
  ML: "Mali",
  MR: "Mauritanie",
  NG: "Nigeria",
  SN: "Sénégal",
  TG: "Togo",
};

type CorridorDef = {
  amountXof: number;
  etaMinDays: number;
  etaMaxDays: number;
  methodLabel: string;
  carrierHint: string;
  customsHint: string;
};

// Domestic same-country entries
const DOMESTIC: Record<string, CorridorDef> = {
  SN: {
    amountXof: 2_500,
    etaMinDays: 1,
    etaMaxDays: 3,
    methodLabel: "Livraison locale (Dakar / Sénégal)",
    carrierHint: "Yango / coursier local / remise en main propre",
    customsHint: "Domestique — aucune douane.",
  },
  CI: {
    amountXof: 2_000,
    etaMinDays: 1,
    etaMaxDays: 3,
    methodLabel: "Livraison locale (Abidjan / Côte d'Ivoire)",
    carrierHint: "Glovo / coursier local / remise en main propre",
    customsHint: "Domestique — aucune douane.",
  },
  GH: {
    amountXof: 2_200,
    etaMinDays: 1,
    etaMaxDays: 3,
    methodLabel: "Local delivery (Accra / Ghana)",
    carrierHint: "Jumia Express / local courier / pickup",
    customsHint: "Domestic — no cross-border customs.",
  },
  NG: {
    amountXof: 2_800,
    etaMinDays: 1,
    etaMaxDays: 3,
    methodLabel: "Local delivery (Lagos / Nigeria)",
    carrierHint: "Gokada / Kwik / local courier",
    customsHint: "Domestic — no cross-border customs.",
  },
  ML: {
    amountXof: 2_000,
    etaMinDays: 1,
    etaMaxDays: 4,
    methodLabel: "Livraison locale (Bamako / Mali)",
    carrierHint: "Coursier local / remise en main propre",
    customsHint: "Domestique — aucune douane.",
  },
};

// Cross-border corridors: from→to → CorridorDef
const CROSS_BORDER: Record<string, CorridorDef> = {
  // ── Sénégal outbound ──────────────────────────────────────────────────
  "SN→GM": {
    amountXof: 7_500,
    etaMinDays: 2,
    etaMaxDays: 5,
    methodLabel: "Sénégal → Gambie",
    carrierHint: "Transport terrestre / courrier routier",
    customsHint:
      "La Gambie est une enclave dans le Sénégal. Faibles droits de douane habituellement, mais les règles CEDEAO s'appliquent selon les marchandises. Pas de conseil juridique.",
  },
  "SN→ML": {
    amountXof: 14_000,
    etaMinDays: 5,
    etaMaxDays: 10,
    methodLabel: "Sénégal → Mali",
    carrierHint: "DHL / Chronopost / fret terrestre",
    customsHint:
      "Corridor terrestre Dakar–Bamako. Des droits d'entrée peuvent s'appliquer selon la valeur et la nature des biens. Les règles de l'UEMOA peuvent alléger les droits pour certains produits d'origine. Pas de conseil juridique.",
  },
  "SN→GN": {
    amountXof: 17_500,
    etaMinDays: 6,
    etaMaxDays: 12,
    methodLabel: "Sénégal → Guinée",
    carrierHint: "DHL / fret aérien / route transfrontalière",
    customsHint:
      "Frontière terrestre. Des droits d'importation peuvent s'appliquer. Vérifiez les règles de la CEDEAO auprès d'un courtier en douane. Pas de conseil juridique.",
  },
  "SN→MR": {
    amountXof: 15_000,
    etaMinDays: 4,
    etaMaxDays: 9,
    methodLabel: "Sénégal → Mauritanie",
    carrierHint: "Fret routier / coursier régional",
    customsHint:
      "La Mauritanie n'est pas membre de la CEDEAO — des droits s'appliquent généralement. Vérifiez les tarifs douaniers mauritaniens. Pas de conseil juridique.",
  },
  "SN→CI": {
    amountXof: 21_000,
    etaMinDays: 7,
    etaMaxDays: 14,
    methodLabel: "Sénégal → Côte d'Ivoire",
    carrierHint: "DHL / Aramex / fret aérien (le marchand effectue la réservation)",
    customsHint:
      "Transit CEDEAO: une exonération de droits peut s'appliquer aux produits originaires de l'espace UEMOA. Confirmez avec la Douane ivoirienne. Pas de conseil juridique.",
  },
  "SN→BF": {
    amountXof: 19_500,
    etaMinDays: 7,
    etaMaxDays: 14,
    methodLabel: "Sénégal → Burkina Faso",
    carrierHint: "DHL / fret terrestre via Mali",
    customsHint:
      "Pays enclavé — transit par Mali ou Côte d'Ivoire possible. Droits UEMOA selon les marchandises. Pas de conseil juridique.",
  },
  "SN→TG": {
    amountXof: 23_000,
    etaMinDays: 8,
    etaMaxDays: 15,
    methodLabel: "Sénégal → Togo",
    carrierHint: "DHL / fret aérien Dakar–Lomé",
    customsHint:
      "CEDEAO: droits réduits possibles pour les biens originaires. Confirmez avec les Douanes du Togo. Pas de conseil juridique.",
  },
  "SN→BJ": {
    amountXof: 25_000,
    etaMinDays: 9,
    etaMaxDays: 16,
    methodLabel: "Sénégal → Bénin",
    carrierHint: "DHL / fret aérien Dakar–Cotonou",
    customsHint:
      "CEDEAO. Des droits d'entrée peuvent s'appliquer selon la valeur des marchandises. Pas de conseil juridique.",
  },
  "SN→GH": {
    amountXof: 18_500,
    etaMinDays: 5,
    etaMaxDays: 12,
    methodLabel: "Sénégal → Ghana",
    carrierHint: "DHL / Aramex / fret régional (le marchand effectue la réservation)",
    customsHint:
      "Entrée au Ghana: droits d'importation/TVA selon les marchandises et la valeur. Les règles CEDEAO peuvent réduire les droits pour certains biens originaires. Confirmez avec un commissionnaire ou la Douane ghanéenne. Pas de conseil juridique.",
  },

  // ── Côte d'Ivoire outbound ───────────────────────────────────────────
  "CI→SN": {
    amountXof: 21_000,
    etaMinDays: 7,
    etaMaxDays: 14,
    methodLabel: "Côte d'Ivoire → Sénégal",
    carrierHint: "DHL / Aramex / fret aérien",
    customsHint:
      "Transit CEDEAO. Droits réduits possibles pour les produits UEMOA. Confirmez avec la Douane sénégalaise. Pas de conseil juridique.",
  },
  "CI→GH": {
    amountXof: 17_000,
    etaMinDays: 3,
    etaMaxDays: 7,
    methodLabel: "Côte d'Ivoire → Ghana",
    carrierHint: "DHL / Maersk / fret terrestre Abidjan–Accra",
    customsHint:
      "Frontière terrestre. Des droits d'importation ghanéens peuvent s'appliquer selon les marchandises. Pas de conseil juridique.",
  },
  "CI→ML": {
    amountXof: 13_500,
    etaMinDays: 3,
    etaMaxDays: 7,
    methodLabel: "Côte d'Ivoire → Mali",
    carrierHint: "Fret terrestre Abidjan–Bamako (corridor principal)",
    customsHint:
      "Corridor UEMOA. Préférence tarifaire possible pour les biens originaires. Confirmez avec les Douanes maliennes. Pas de conseil juridique.",
  },
  "CI→BF": {
    amountXof: 12_000,
    etaMinDays: 3,
    etaMaxDays: 7,
    methodLabel: "Côte d'Ivoire → Burkina Faso",
    carrierHint: "Fret terrestre Abidjan–Ouagadougou",
    customsHint:
      "Corridor UEMOA. Droits réduits selon l'origine. Pas de conseil juridique.",
  },
  "CI→NG": {
    amountXof: 26_000,
    etaMinDays: 5,
    etaMaxDays: 11,
    methodLabel: "Côte d'Ivoire → Nigeria",
    carrierHint: "DHL / fret maritime / aérien Abidjan–Lagos",
    customsHint:
      "Le Nigeria est hors zone UEMOA. Des droits d'importation et la TVA nigériane s'appliquent selon les marchandises. Pas de conseil juridique.",
  },

  // ── Ghana outbound ───────────────────────────────────────────────────
  "GH→SN": {
    amountXof: 18_500,
    etaMinDays: 5,
    etaMaxDays: 12,
    methodLabel: "Ghana → Sénégal",
    carrierHint: "DHL / Aramex / fret aérien",
    customsHint:
      "ECOWAS transit. Reduced duties may apply for qualifying origin goods. Confirm with Senegal Customs. Not legal advice.",
  },
  "GH→CI": {
    amountXof: 17_000,
    etaMinDays: 3,
    etaMaxDays: 7,
    methodLabel: "Ghana → Côte d'Ivoire",
    carrierHint: "DHL / road freight Accra–Abidjan",
    customsHint:
      "ECOWAS corridor. Import duties may apply on entry into Côte d'Ivoire. Not legal advice.",
  },
  "GH→NG": {
    amountXof: 21_500,
    etaMinDays: 4,
    etaMaxDays: 8,
    methodLabel: "Ghana → Nigeria",
    carrierHint: "DHL / GIG Logistics / road freight Accra–Lagos",
    customsHint:
      "ECOWAS. Nigeria import duties/VAT may apply depending on goods category. Not legal advice.",
  },
  "GH→TG": {
    amountXof: 9_500,
    etaMinDays: 2,
    etaMaxDays: 5,
    methodLabel: "Ghana → Togo",
    carrierHint: "Road freight Accra–Lomé (land border)",
    customsHint:
      "Short land corridor. Togo customs duties may apply. ECOWAS rules can reduce some duties. Not legal advice.",
  },
  "GH→BJ": {
    amountXof: 14_000,
    etaMinDays: 3,
    etaMaxDays: 7,
    methodLabel: "Ghana → Bénin",
    carrierHint: "Road freight / DHL Accra–Cotonou",
    customsHint:
      "ECOWAS. Benin import duties may apply. Not legal advice.",
  },

  // ── Nigeria outbound ─────────────────────────────────────────────────
  "NG→GH": {
    amountXof: 21_500,
    etaMinDays: 4,
    etaMaxDays: 8,
    methodLabel: "Nigeria → Ghana",
    carrierHint: "GIG Logistics / DHL / road freight Lagos–Accra",
    customsHint:
      "ECOWAS. Ghana import duties/VAT may apply. Confirm with Ghana Customs. Not legal advice.",
  },
  "NG→CI": {
    amountXof: 26_000,
    etaMinDays: 5,
    etaMaxDays: 11,
    methodLabel: "Nigeria → Côte d'Ivoire",
    carrierHint: "DHL / air freight Lagos–Abidjan",
    customsHint:
      "Not in the UEMOA zone — standard ECOWAS rules apply; duties vary by goods. Not legal advice.",
  },
  "NG→BJ": {
    amountXof: 11_000,
    etaMinDays: 2,
    etaMaxDays: 5,
    methodLabel: "Nigeria → Bénin",
    carrierHint: "Road freight Lagos–Cotonou (land border)",
    customsHint:
      "High-volume land corridor. Benin import duties may apply; informal trade common. Confirm with broker. Not legal advice.",
  },
  "NG→TG": {
    amountXof: 13_000,
    etaMinDays: 3,
    etaMaxDays: 6,
    methodLabel: "Nigeria → Togo",
    carrierHint: "Road freight Lagos–Lomé",
    customsHint:
      "ECOWAS. Togo import duties may apply. Not legal advice.",
  },

  // ── Mali outbound ────────────────────────────────────────────────────
  "ML→SN": {
    amountXof: 14_000,
    etaMinDays: 5,
    etaMaxDays: 10,
    methodLabel: "Mali → Sénégal",
    carrierHint: "Fret terrestre Bamako–Dakar",
    customsHint:
      "Corridor UEMOA. Droits réduits possibles. Confirmez avec la Douane sénégalaise. Pas de conseil juridique.",
  },
  "ML→CI": {
    amountXof: 13_500,
    etaMinDays: 3,
    etaMaxDays: 7,
    methodLabel: "Mali → Côte d'Ivoire",
    carrierHint: "Fret terrestre Bamako–Abidjan",
    customsHint:
      "Corridor UEMOA principal. Droits réduits selon l'origine. Pas de conseil juridique.",
  },
  "ML→BF": {
    amountXof: 9_000,
    etaMinDays: 2,
    etaMaxDays: 5,
    methodLabel: "Mali → Burkina Faso",
    carrierHint: "Fret terrestre Bamako–Ouagadougou",
    customsHint:
      "Pays voisins UEMOA. Droits faibles pour les biens originaires. Pas de conseil juridique.",
  },
};

// Derived: all supported destination codes per origin (domestic same-country + cross-border)
function supportedDestinations(from: string): string[] {
  const dests = new Set<string>();
  if (from in DOMESTIC) dests.add(from);
  for (const key of Object.keys(CROSS_BORDER)) {
    const [f, t] = key.split("→");
    if (f === from && t) dests.add(t);
  }
  return [...dests];
}

/** Destination options for a given origin — only corridors with a real quote. */
export function shippingDestinationOptions(fromCountry: string): { code: string; label: string }[] {
  const from = fromCountry.trim().toUpperCase() || "SN";
  const codes = supportedDestinations(from);
  if (codes.length === 0) {
    // Unknown origin — return known countries as candidates
    return Object.entries(COUNTRY_LABELS)
      .map(([code, label]) => ({ code, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }
  return codes
    .map((code) => ({ code, label: COUNTRY_LABELS[code] ?? code }))
    .sort((a, b) => {
      // Same country first, then alphabetical
      if (a.code === from) return -1;
      if (b.code === from) return 1;
      return a.label.localeCompare(b.label);
    });
}

/**
 * Quote shipping for a corridor.
 * Returns null when no corridor is defined — honest, not invented.
 */
export function quoteShippingCorridor(opts: {
  fromCountry: string;
  toCountry: string;
  /** Optional merchandise value for duty messaging only — does not change rates. */
  goodsValueXof?: number | null;
}): ShippingQuote | null {
  const from = opts.fromCountry.trim().toUpperCase();
  const to = opts.toCountry.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(from) || !/^[A-Z]{2}$/.test(to)) return null;

  const corridor = `${from}→${to}`;

  // Same-country domestic
  if (from === to) {
    const d = DOMESTIC[from];
    if (!d) return null;
    const amtFmt = d.amountXof.toLocaleString("fr-FR");
    return {
      fromCountry: from,
      toCountry: to,
      corridor,
      crossBorder: false,
      currency: "XOF",
      quoteVersion: SHIPPING_QUOTE_VERSION,
      trustLabel: "estimate" as const,
      ...d,
      summary: `Livraison locale ${COUNTRY_LABELS[from] ?? from} · ~${amtFmt} XOF · ${d.etaMinDays}–${d.etaMaxDays} jours (estimation)`,
    };
  }

  // Cross-border
  const cb = CROSS_BORDER[corridor];
  if (!cb) return null;

  const amtFmt = cb.amountXof.toLocaleString("fr-FR");
  const fromLabel = COUNTRY_LABELS[from] ?? from;
  const toLabel = COUNTRY_LABELS[to] ?? to;
  return {
    fromCountry: from,
    toCountry: to,
    corridor,
    crossBorder: true,
    currency: "XOF",
    quoteVersion: SHIPPING_QUOTE_VERSION,
    trustLabel: "estimate" as const,
    ...cb,
    summary: `${fromLabel} → ${toLabel} · ~${amtFmt} XOF · ${cb.etaMinDays}–${cb.etaMaxDays} jours (estimation)`,
  };
}

export function formatShippingXof(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} XOF`;
}

/** All corridor keys this build supports — for merchant display. */
export function supportedCorridorPairs(): { from: string; to: string; label: string }[] {
  const pairs: { from: string; to: string; label: string }[] = [];
  for (const from of Object.keys(DOMESTIC)) {
    pairs.push({
      from,
      to: from,
      label: `${COUNTRY_LABELS[from] ?? from} (local)`,
    });
  }
  for (const key of Object.keys(CROSS_BORDER)) {
    const [f, t] = key.split("→");
    if (f && t) {
      pairs.push({
        from: f,
        to: t,
        label: `${COUNTRY_LABELS[f] ?? f} → ${COUNTRY_LABELS[t] ?? t}`,
      });
    }
  }
  return pairs;
}
