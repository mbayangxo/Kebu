import type { TemplateSeed } from "./templates-seed";

/** Display groups for the template picker — every seed maps to one group id. */
export const TEMPLATE_CATEGORY_GROUPS = [
  { id: "music", label: "Music & labels", description: "Artists, streaming, press kits, rosters" },
  { id: "film", label: "Film & video", description: "Studios, production, showreels" },
  { id: "agency", label: "Agencies", description: "Creative, digital, marketing agencies" },
  { id: "production", label: "Production", description: "Events, media, commercial production" },
  { id: "beauty", label: "Beauty & salon", description: "Salons, barbers, spa, wellness" },
  { id: "fragrance", label: "Fragrance", description: "Perfume and scent brands" },
  { id: "fashion", label: "Fashion", description: "Clothing, atelier, lookbook" },
  { id: "store", label: "Store", description: "Products, catalog, WhatsApp orders" },
  { id: "business", label: "Business", description: "Company sites and services" },
  { id: "food", label: "Food & hospitality", description: "Restaurants, hotels, events" },
  { id: "tech", label: "Tech & apps", description: "Startups and app launches" },
  { id: "portfolio", label: "Portfolio", description: "Creatives, students, artists" },
  { id: "public", label: "Public figure", description: "Influencers, speakers, personalities" },
  { id: "impact", label: "Impact", description: "NGO, agriculture, construction" },
  { id: "other", label: "Other", description: "Miscellaneous layouts" },
] as const;

export type TemplateCategoryGroupId = (typeof TEMPLATE_CATEGORY_GROUPS)[number]["id"];

const CATEGORY_TO_GROUP: Record<string, TemplateCategoryGroupId> = {
  music: "music",
  film: "film",
  agency: "agency",
  production: "production",
  beauty: "beauty",
  fragrance: "fragrance",
  fashion: "fashion",
  store: "store",
  "online store preview only": "store",
  business: "business",
  restaurant: "food",
  hotel: "food",
  event: "food",
  app: "tech",
  technology: "tech",
  "technology startup": "tech",
  portfolio: "portfolio",
  "student portfolio": "portfolio",
  artist: "portfolio",
  "public figure": "public",
  agriculture: "impact",
  construction: "impact",
  ngo: "impact",
  "professional services": "business",
  services: "business",
  other: "other",
};

export function templateGroupId(category: string): TemplateCategoryGroupId {
  return CATEGORY_TO_GROUP[category] ?? "other";
}

export function groupTemplatesByCategory(templates: Pick<TemplateSeed, "slug" | "name" | "category" | "description">[]) {
  const byGroup = new Map<TemplateCategoryGroupId, typeof templates>();

  for (const group of TEMPLATE_CATEGORY_GROUPS) {
    byGroup.set(group.id, []);
  }

  for (const t of templates) {
    const gid = templateGroupId(t.category);
    byGroup.get(gid)?.push(t);
  }

  return TEMPLATE_CATEGORY_GROUPS.map((group) => ({
    ...group,
    templates: byGroup.get(group.id) ?? [],
  })).filter((g) => g.templates.length > 0);
}
