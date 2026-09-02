/** May Lecor public site — nav labels per locale (matches ksendr RU | ENG pattern). */
export const MAYLECOR_LOCALES = [
  { code: "en", label: "ENG" },
  { code: "fr", label: "FR" },
  { code: "wo", label: "WO" },
] as const;

export type MaylecorLocale = (typeof MAYLECOR_LOCALES)[number]["code"];

export const MAYLECOR_NAV_SLUGS = [
  "music",
  "videos",
  "photos",
  "mays-world",
  "shop",
] as const;

export type MaylecorNavSlug = (typeof MAYLECOR_NAV_SLUGS)[number];

const NAV_KEYS: Record<MaylecorNavSlug, Record<MaylecorLocale, string>> = {
  music: { en: "Music", fr: "Musique", wo: "Musiik" },
  videos: { en: "Videos", fr: "Vidéos", wo: "Wideo yi" },
  photos: { en: "Photos", fr: "Photos", wo: "Nataal yi" },
  "mays-world": { en: "May's World", fr: "Le monde de May", wo: "Àdduna May" },
  shop: { en: "Shop", fr: "Boutique", wo: "Boutik" },
};

export function maylecorNavLabel(slug: MaylecorNavSlug, locale: MaylecorLocale): string {
  return NAV_KEYS[slug][locale] ?? NAV_KEYS[slug].en;
}

export function maylecorHomeLabel(locale: MaylecorLocale): string {
  const labels: Record<MaylecorLocale, string> = {
    en: "Home",
    fr: "Accueil",
    wo: "Kër",
  };
  return labels[locale] ?? labels.en;
}

export function parseMaylecorLocale(raw: string | null | undefined): MaylecorLocale {
  if (raw === "fr" || raw === "wo" || raw === "en") return raw;
  return "en";
}

export const MAYLECOR_LOCALE_STORAGE_KEY = "kebu-maylecor-locale";
