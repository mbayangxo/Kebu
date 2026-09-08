/** Featured user aesthetics — 2 per business type. Owner brands live elsewhere. */
import { userFeaturedAesthetics } from "@/lib/create/user-aesthetics-catalog";

export const FEATURED_TEMPLATES = userFeaturedAesthetics().map((a) => ({
  slug: a.slug,
  name: a.name,
  category: a.category,
  tagline: a.tagline,
  accent: a.accent,
  pages: ["home"] as string[],
}));

export type FeaturedTemplateSlug = (typeof FEATURED_TEMPLATES)[number]["slug"];
