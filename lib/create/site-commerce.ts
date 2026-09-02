import { z } from "zod";
import type { WebsiteDefinition } from "./website-schema";
import type { SiteSeo } from "./site-seo";

export const siteCommerceSchema = z.object({
  /** WhatsApp number for product orders — digits only or with + */
  merchantWhatsApp: z.string().trim().max(24).default(""),
  /** When true and JOKO is configured platform-wide, show JOKO checkout CTA (future slice). */
  preferJokoCheckout: z.boolean().optional().default(false),
});

export type SiteCommerce = z.infer<typeof siteCommerceSchema>;

export function mergeSiteCommerce(partial: unknown): SiteCommerce {
  const parsed = siteCommerceSchema.safeParse(partial);
  return parsed.success ? parsed.data : siteCommerceSchema.parse({});
}

export function normalizeWhatsAppPhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Merchant phone from site commerce settings, then whatsapp section, then contact section. */
export function resolveMerchantWhatsApp(
  definition: WebsiteDefinition,
  seo?: SiteSeo | null,
): string {
  const fromSeo = seo?.commerce ? normalizeWhatsAppPhone(seo.commerce.merchantWhatsApp) : "";
  if (fromSeo.length >= 8) return fromSeo;

  for (const page of definition.pages) {
    for (const section of page.sections) {
      if (section.type === "whatsapp") {
        const phone = normalizeWhatsAppPhone(String((section.props as { phone?: string }).phone ?? ""));
        if (phone.length >= 8) return phone;
      }
      if (section.type === "contact") {
        const phone = normalizeWhatsAppPhone(String((section.props as { phone?: string }).phone ?? ""));
        if (phone.length >= 8) return phone;
      }
    }
  }
  return "";
}

export function whatsAppOrderHref(phone: string, message: string): string {
  const digits = normalizeWhatsAppPhone(phone);
  if (!digits) return `https://wa.me/?text=${encodeURIComponent(message)}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function jokoCheckoutAvailable(): boolean {
  return Boolean(process.env.JOKO_API_BASE_URL?.trim() && process.env.JOKO_API_SECRET?.trim());
}
