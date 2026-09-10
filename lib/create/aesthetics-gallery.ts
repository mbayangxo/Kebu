import { AESTHETIC_THEME_PRICE_LABEL, AESTHETIC_THEME_PRICE_USD_CENTS } from "@/lib/create/aesthetic-pricing";
import { USER_AESTHETICS_BY_TYPE } from "@/lib/create/user-aesthetics-catalog";
import { TEMPLATE_CARD_VISUALS, type TemplateCardVisual } from "@/lib/create/template-visuals";
import { getGalleryTemplates } from "@/lib/create/template-gallery";

export type AestheticGalleryItem = {
  slug: string;
  name: string;
  tagline: string;
  type: string;
  typeLabel: string;
  accent: string;
  previewImage?: string;
  previewGradient: string;
  wordmark?: string;
  badge?: string;
  cardVisual: TemplateCardVisual;
  detailPath: string;
  demoPath: string;
  usePath: string;
  priceCents: number;
  priceLabel: string;
};

export type AestheticGalleryGroup = {
  type: string;
  label: string;
  items: AestheticGalleryItem[];
};

/** Aesthetic Gallery: curated pairs with distinct layout chrome per look. */
export function getAestheticGalleryGroups(): AestheticGalleryGroup[] {
  const bySlug = new Map(getGalleryTemplates().map((t) => [t.slug, t]));

  return USER_AESTHETICS_BY_TYPE.map((group) => ({
    type: group.type,
    label: group.label,
    items: group.pair.map((p) => {
      const visual = TEMPLATE_CARD_VISUALS[p.slug];
      const gallery = bySlug.get(p.slug);
      const gradient =
        visual?.previewGradient ??
        `linear-gradient(145deg, ${p.accent}33 0%, ${p.accent} 55%, #0A0A0A 100%)`;
      const cardVisual: TemplateCardVisual = visual ?? {
        previewGradient: gradient,
        badge: group.label,
        keywords: [group.type],
        layout: "generic",
        wordmark: p.name.split(" ")[0]?.toUpperCase(),
      };
      return {
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        type: group.type,
        typeLabel: group.label,
        accent: p.accent,
        previewImage: cardVisual.previewImage,
        previewGradient: gradient,
        wordmark: cardVisual.wordmark ?? p.name.split(" ")[0]?.toUpperCase(),
        badge: cardVisual.badge ?? group.label,
        cardVisual,
        detailPath: `/create/aesthetics/${encodeURIComponent(p.slug)}`,
        demoPath: gallery?.demoPath ?? `/create/demo/${encodeURIComponent(p.slug)}`,
        usePath: gallery?.usePath ?? `/create/new?aesthetic=${encodeURIComponent(p.slug)}`,
        priceCents: AESTHETIC_THEME_PRICE_USD_CENTS,
        priceLabel: AESTHETIC_THEME_PRICE_LABEL,
      };
    }),
  }));
}

export function getAestheticGalleryItem(slug: string): AestheticGalleryItem | null {
  for (const group of getAestheticGalleryGroups()) {
    const hit = group.items.find((i) => i.slug === slug);
    if (hit) return hit;
  }
  return null;
}

export function listAestheticGallerySlugs(): string[] {
  return getAestheticGalleryGroups().flatMap((g) => g.items.map((i) => i.slug));
}
