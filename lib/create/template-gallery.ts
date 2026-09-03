import { FEATURED_TEMPLATES } from "@/lib/create/featured-templates";
import { publicTemplateSeeds } from "@/lib/create/templates-seed";
import { templateGroupId, TEMPLATE_CATEGORY_GROUPS, type TemplateCategoryGroupId } from "@/lib/create/template-catalog";
import {
  FLAGSHIP_TEMPLATE_SLUGS,
  templateCardVisual,
  type TemplateCardVisual,
} from "@/lib/create/template-visuals";

const CATEGORY_ACCENTS: Record<TemplateCategoryGroupId, string> = {
  music: "#E8D5A3",
  film: "#FF1493",
  agency: "#FF5500",
  production: "#E94560",
  beauty: "#D4A574",
  fragrance: "#C9A962",
  fashion: "#1A1A2E",
  store: "#2D6A4F",
  business: "#457B9D",
  food: "#BC6C25",
  tech: "#4361EE",
  portfolio: "#6D597A",
  public: "#F72585",
  impact: "#588157",
  other: "#8A8074",
};

export type GalleryTemplate = {
  slug: string;
  name: string;
  category: string;
  description: string;
  groupId: TemplateCategoryGroupId;
  groupLabel: string;
  accent: string;
  featured: boolean;
  flagship: boolean;
  cardVisual: TemplateCardVisual | null;
  previewPath: string;
  demoPath: string;
  usePath: string;
};

export function getTemplateAccent(slug: string, category: string): string {
  const featured = FEATURED_TEMPLATES.find((t) => t.slug === slug);
  if (featured) return featured.accent;
  return CATEGORY_ACCENTS[templateGroupId(category)] ?? "#FF5500";
}

export function getGalleryTemplates(): GalleryTemplate[] {
  const featuredSlugs = new Set<string>(FEATURED_TEMPLATES.map((t) => t.slug));

  return publicTemplateSeeds().map((t) => {
    const groupId = templateGroupId(t.category);
    const group = TEMPLATE_CATEGORY_GROUPS.find((g) => g.id === groupId);
    const cardVisual = templateCardVisual(t.slug, t.category);
    return {
      slug: t.slug,
      name: t.name,
      category: t.category,
      description: t.description,
      groupId,
      groupLabel: group?.label ?? "Templates",
      accent: getTemplateAccent(t.slug, t.category),
      featured: featuredSlugs.has(t.slug),
      flagship: FLAGSHIP_TEMPLATE_SLUGS.includes(t.slug as (typeof FLAGSHIP_TEMPLATE_SLUGS)[number]),
      cardVisual,
      previewPath: `/create/templates/preview/${t.slug}`,
      demoPath: `/create/demo/${t.slug}`,
      usePath: `/create/new?template=${encodeURIComponent(t.slug)}`,
    };
  });
}

/** The two real Kebu site layouts — May Lecor (Russian cutouts) and K-Direction (Wix). */
export function getFlagshipGalleryTemplates(): GalleryTemplate[] {
  const all = getGalleryTemplates();
  return FLAGSHIP_TEMPLATE_SLUGS.map((slug) => all.find((t) => t.slug === slug)).filter(
    (t): t is GalleryTemplate => Boolean(t),
  );
}

export function getFeaturedGalleryTemplates(): GalleryTemplate[] {
  const all = getGalleryTemplates();
  const order = FEATURED_TEMPLATES.map((f) => f.slug);
  return order
    .map((slug) => all.find((t) => t.slug === slug))
    .filter((t): t is GalleryTemplate => Boolean(t));
}

/** Gallery metadata for wizard / API template rows (optional business link on use path). */
export function galleryTemplateForSlug(slug: string, businessId?: string): GalleryTemplate | null {
  const base = getGalleryTemplates().find((t) => t.slug === slug);
  if (!base) return null;
  if (!businessId) return base;
  const q = `template=${encodeURIComponent(slug)}&businessId=${encodeURIComponent(businessId)}`;
  return {
    ...base,
    usePath: `/create/new?${q}`,
    demoPath: base.demoPath,
  };
}

export function galleryTemplatesFromSlugs(slugs: string[], businessId?: string): GalleryTemplate[] {
  return slugs
    .map((slug) => galleryTemplateForSlug(slug, businessId))
    .filter((t): t is GalleryTemplate => Boolean(t));
}
