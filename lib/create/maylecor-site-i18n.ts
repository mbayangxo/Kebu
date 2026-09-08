/** May Lecor public site — top nav + May's World hub labels. */
export const MAYLECOR_LOCALES = [
  { code: "en", label: "ENG" },
  { code: "fr", label: "FR" },
  { code: "wo", label: "WO" },
] as const;

export type MaylecorLocale = (typeof MAYLECOR_LOCALES)[number]["code"];

/** Primary site chrome — no Contact; Mayjor Good = May's foundation. */
export const MAYLECOR_NAV_SLUGS = [
  "shop",
  "mays-world",
  "updates",
  "about",
  "press",
  "mayjor-good",
] as const;

export type MaylecorNavSlug = (typeof MAYLECOR_NAV_SLUGS)[number];

/** Inside May's World — moodboard rooms + May by May (cooking). */
export const MAYLECOR_WORLD_SLUGS = [
  "music",
  "videos",
  "audio",
  "photos",
  "maygazine",
  "may-by-may",
] as const;

export type MaylecorWorldSlug = (typeof MAYLECOR_WORLD_SLUGS)[number];

const NAV_KEYS: Record<MaylecorNavSlug, Record<MaylecorLocale, string>> = {
  shop: { en: "Shop", fr: "Boutique", wo: "Boutik" },
  "mays-world": { en: "May's World", fr: "Le monde de May", wo: "Àdduna May" },
  updates: { en: "Updates", fr: "Actus", wo: "Xibaar" },
  about: { en: "About May", fr: "À propos de May", wo: "Ci May" },
  press: { en: "Press", fr: "Presse", wo: "Presse" },
  "mayjor-good": { en: "Mayjor Good", fr: "Mayjor Good", wo: "Mayjor Good" },
};

const WORLD_KEYS: Record<MaylecorWorldSlug, Record<MaylecorLocale, string>> = {
  music: { en: "Music", fr: "Musique", wo: "Musiik" },
  videos: { en: "Video", fr: "Vidéo", wo: "Wideo" },
  audio: { en: "Audio", fr: "Audio", wo: "Audio" },
  photos: { en: "Photos", fr: "Photos", wo: "Nataal yi" },
  maygazine: { en: "Maygazine", fr: "Maygazine", wo: "Maygazine" },
  "may-by-may": { en: "May by May", fr: "May by May", wo: "May by May" },
};

export function maylecorNavLabel(slug: MaylecorNavSlug, locale: MaylecorLocale): string {
  return NAV_KEYS[slug][locale] ?? NAV_KEYS[slug].en;
}

export function maylecorWorldLabel(slug: MaylecorWorldSlug, locale: MaylecorLocale): string {
  return WORLD_KEYS[slug][locale] ?? WORLD_KEYS[slug].en;
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

/** Simple line icons for top nav (inline SVG paths). */
export const MAYLECOR_NAV_ICONS: Record<MaylecorNavSlug, string> = {
  shop: "M3 7h18l-1.5 11H4.5L3 7zm4-4h10l1 4H6l1-4z",
  "mays-world": "M12 2a10 10 0 100 20 10 10 0 000-20zm0 3v14m-7-7h14",
  updates: "M4 5h16v3H4V5zm0 6h10v3H4v-3zm0 6h16v3H4v-3z",
  about: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0",
  press: "M4 5h16v14H4V5zm3 3h10M7 12h10M7 15h6",
  "mayjor-good": "M12 21s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 11c0 5.5-7 10-7 10z",
};
