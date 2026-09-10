import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { mergeSiteCommerce } from "@/lib/create/site-commerce";
import { defaultSiteSeo, mergeSiteSeo, type SiteSeo } from "@/lib/create/site-seo";

/** True when the site is set up to sell — products section or shop commerce WhatsApp. */
export function definitionHasShop(definition: WebsiteDefinition): boolean {
  for (const page of definition.pages) {
    for (const section of page.sections) {
      if (section.type === "products") return true;
    }
  }
  const commerce =
    definition.seo && typeof definition.seo === "object"
      ? (definition.seo as { commerce?: { merchantWhatsApp?: string } }).commerce
      : undefined;
  const phone = commerce?.merchantWhatsApp?.replace(/\D/g, "") ?? "";
  return phone.length >= 8;
}

/** Merchant opted into Shop for this project (separate product from the website). */
export function projectShopOpened(seo: unknown): boolean {
  if (!seo || typeof seo !== "object") return false;
  const commerce = (seo as SiteSeo).commerce;
  if (!commerce) return false;
  return commerce.shopOpened === true;
}

/** Products section is on the website (shop linked into the site). */
export function definitionShowsProductsOnSite(definition: WebsiteDefinition): boolean {
  for (const page of definition.pages) {
    for (const section of page.sections) {
      if (section.type === "products") return true;
    }
  }
  return false;
}

export function readShopOpenedAt(seo: unknown): string | null {
  if (!seo || typeof seo !== "object") return null;
  const at = (seo as SiteSeo).commerce?.shopOpenedAt?.trim();
  return at || null;
}

export function withShopOpened(seo: unknown, title: string): SiteSeo {
  const base = mergeSiteSeo(seo, title || "My website");
  return {
    ...base,
    commerce: mergeSiteCommerce(
      { shopOpened: true, shopOpenedAt: new Date().toISOString() },
      base.commerce ?? defaultSiteSeo(title).commerce,
    ),
  };
}
