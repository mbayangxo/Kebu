import { USER_AESTHETICS_BY_TYPE } from "@/lib/create/user-aesthetics-catalog";
import { TEMPLATE_CARD_VISUALS } from "@/lib/create/template-visuals";
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
  detailPath: string;
  demoPath: string;
  usePath: string;
};

export type AestheticGalleryGroup = {
  type: string;
  label: string;
  items: AestheticGalleryItem[];
};

/** Inspired-style gallery: curated pairs with visual chrome (not text-only cards). */
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
      return {
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        type: group.type,
        typeLabel: group.label,
        accent: p.accent,
        previewImage: visual?.previewImage,
        previewGradient: gradient,
        wordmark: visual?.wordmark ?? p.name.split(" ")[0]?.toUpperCase(),
        badge: visual?.badge ?? group.label,
        detailPath: `/create/aesthetics/${encodeURIComponent(p.slug)}`,
        demoPath: gallery?.demoPath ?? `/create/demo/${encodeURIComponent(p.slug)}`,
        usePath: gallery?.usePath ?? `/create/new?template=${encodeURIComponent(p.slug)}`,
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
