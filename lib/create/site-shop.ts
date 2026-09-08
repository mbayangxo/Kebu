import type { WebsiteDefinition } from "@/lib/create/website-schema";

/** True when the site is set up to sell — products section or shop commerce WhatsApp. */
export function definitionHasShop(definition: WebsiteDefinition): boolean {
  for (const page of definition.pages) {
    for (const section of page.sections) {
      if (section.type === "products") return true;
    }
  }
  const commerce = definition.seo && typeof definition.seo === "object"
    ? (definition.seo as { commerce?: { merchantWhatsApp?: string } }).commerce
    : undefined;
  const phone = commerce?.merchantWhatsApp?.replace(/\D/g, "") ?? "";
  return phone.length >= 8;
}
