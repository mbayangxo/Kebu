/** Comprehensive list of African currencies + diaspora destinations for Kebu shops. */
export type AfricanCurrency = {
  code: string;
  name: string;
  symbol: string;
  countries: string[]; // ISO-3166 alpha-2
};

export const AFRICAN_CURRENCIES: AfricanCurrency[] = [
  // ── West Africa (XOF zone) ──────────────────────────────────────────────
  { code: "XOF", name: "Franc CFA (UEMOA)", symbol: "F CFA", countries: ["SN", "CI", "ML", "BF", "TG", "BJ", "NE", "GW"] },
  // ── Central Africa (XAF zone) ───────────────────────────────────────────
  { code: "XAF", name: "Franc CFA (CEMAC)", symbol: "FCFA", countries: ["CM", "CF", "TD", "CG", "GQ", "GA"] },
  // ── West Africa (individual) ─────────────────────────────────────────────
  { code: "NGN", name: "Naira nigérian", symbol: "₦", countries: ["NG"] },
  { code: "GHS", name: "Cedi ghanéen", symbol: "GH₵", countries: ["GH"] },
  { code: "GNF", name: "Franc guinéen", symbol: "FG", countries: ["GN"] },
  { code: "SLL", name: "Leone sierra-léonais", symbol: "Le", countries: ["SL"] },
  { code: "LRD", name: "Dollar libérien", symbol: "L$", countries: ["LR"] },
  { code: "GMD", name: "Dalasi gambien", symbol: "D", countries: ["GM"] },
  { code: "CVE", name: "Escudo cap-verdien", symbol: "Esc", countries: ["CV"] },
  { code: "MRU", name: "Ouguiya mauritanien", symbol: "UM", countries: ["MR"] },
  // ── East Africa ──────────────────────────────────────────────────────────
  { code: "KES", name: "Shilling kényan", symbol: "KSh", countries: ["KE"] },
  { code: "TZS", name: "Shilling tanzanien", symbol: "TSh", countries: ["TZ"] },
  { code: "UGX", name: "Shilling ougandais", symbol: "USh", countries: ["UG"] },
  { code: "RWF", name: "Franc rwandais", symbol: "FRw", countries: ["RW"] },
  { code: "BIF", name: "Franc burundais", symbol: "FBu", countries: ["BI"] },
  { code: "ETB", name: "Birr éthiopien", symbol: "Br", countries: ["ET"] },
  { code: "SSP", name: "Livre sud-soudanaise", symbol: "SS£", countries: ["SS"] },
  { code: "DJF", name: "Franc djiboutien", symbol: "Fdj", countries: ["DJ"] },
  { code: "SOS", name: "Shilling somalien", symbol: "Sh.So", countries: ["SO"] },
  { code: "ERN", name: "Nakfa érythréen", symbol: "Nfk", countries: ["ER"] },
  // ── North Africa ─────────────────────────────────────────────────────────
  { code: "MAD", name: "Dirham marocain", symbol: "DH", countries: ["MA"] },
  { code: "DZD", name: "Dinar algérien", symbol: "DA", countries: ["DZ"] },
  { code: "TND", name: "Dinar tunisien", symbol: "DT", countries: ["TN"] },
  { code: "EGP", name: "Livre égyptienne", symbol: "E£", countries: ["EG"] },
  { code: "LYD", name: "Dinar libyen", symbol: "LD", countries: ["LY"] },
  { code: "SDG", name: "Livre soudanaise", symbol: "SDG", countries: ["SD"] },
  // ── Southern Africa ──────────────────────────────────────────────────────
  { code: "ZAR", name: "Rand sud-africain", symbol: "R", countries: ["ZA"] },
  { code: "ZMW", name: "Kwacha zambien", symbol: "ZK", countries: ["ZM"] },
  { code: "MZN", name: "Metical mozambicain", symbol: "MT", countries: ["MZ"] },
  { code: "MWK", name: "Kwacha malawite", symbol: "MK", countries: ["MW"] },
  { code: "BWP", name: "Pula botswanais", symbol: "P", countries: ["BW"] },
  { code: "NAD", name: "Dollar namibien", symbol: "N$", countries: ["NA"] },
  { code: "LSL", name: "Loti lesothan", symbol: "L", countries: ["LS"] },
  { code: "SZL", name: "Lilangeni swazi", symbol: "L", countries: ["SZ"] },
  { code: "AOA", name: "Kwanza angolais", symbol: "Kz", countries: ["AO"] },
  { code: "CDF", name: "Franc congolais", symbol: "FC", countries: ["CD"] },
  { code: "MGA", name: "Ariary malgache", symbol: "Ar", countries: ["MG"] },
  { code: "ZWL", name: "Dollar zimbabwéen", symbol: "Z$", countries: ["ZW"] },
  // ── Islands ──────────────────────────────────────────────────────────────
  { code: "MUR", name: "Roupie mauricienne", symbol: "Rs", countries: ["MU"] },
  { code: "SCR", name: "Roupie seychelloise", symbol: "SR", countries: ["SC"] },
  { code: "KMF", name: "Franc comorien", symbol: "CF", countries: ["KM"] },
  { code: "STN", name: "Dobra santoméen", symbol: "Db", countries: ["ST"] },
  // ── Diaspora ─────────────────────────────────────────────────────────────
  { code: "EUR", name: "Euro (diaspora)", symbol: "€", countries: ["FR", "BE", "PT", "ES", "IT", "DE"] },
  { code: "USD", name: "Dollar américain", symbol: "$", countries: ["US"] },
  { code: "GBP", name: "Livre sterling", symbol: "£", countries: ["GB"] },
  { code: "CAD", name: "Dollar canadien", symbol: "CA$", countries: ["CA"] },
];

/** Flat unique currency list (for select dropdowns). */
export const CURRENCY_CODES = AFRICAN_CURRENCIES.map((c) => c.code);

export function currencyByCode(code: string): AfricanCurrency | undefined {
  return AFRICAN_CURRENCIES.find((c) => c.code === code);
}

export function symbolForCurrency(code: string): string {
  return currencyByCode(code)?.symbol ?? code;
}

/** Default currency for a given ISO-3166 country code. */
export function defaultCurrencyForCountry(countryCode: string): string {
  const upper = countryCode.toUpperCase();
  const found = AFRICAN_CURRENCIES.find((c) => c.countries.includes(upper));
  return found?.code ?? "XOF";
}
