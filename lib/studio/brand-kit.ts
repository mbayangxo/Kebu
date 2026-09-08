import { z } from "zod";
import { themeSchema } from "@/lib/create/website-schema";

const imageUrl = z.union([
  z.literal(""),
  z.string().trim().url().max(500),
  z
    .string()
    .trim()
    .max(500)
    .regex(/^\/[a-zA-Z0-9._\-/]+$/),
]);

export const brandKitSchema = z.object({
  name: z.string().trim().min(1).max(120).default("Brand kit"),
  businessId: z.string().uuid().nullable().optional(),
  logoUrl: imageUrl.default(""),
  primaryColor: z.string().trim().max(40).default("#0F0D33"),
  accentColor: z.string().trim().max(40).default("#E05A2B"),
  backgroundColor: z.string().trim().max(40).default("#FAFAF8"),
  textColor: z.string().trim().max(40).default("#0F0D33"),
  fontDisplay: z.string().trim().max(80).default("Fraunces"),
  fontBody: z.string().trim().max(80).default("system-ui"),
});

export type BrandKitInput = z.infer<typeof brandKitSchema>;

export type BrandKitRow = {
  id: string;
  owner_id: string;
  business_id: string | null;
  name: string;
  logo_url: string;
  primary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  font_display: string;
  font_body: string;
  created_at: string;
  updated_at: string;
};

export const BRAND_KIT_SELECT =
  "id, owner_id, business_id, name, logo_url, primary_color, accent_color, background_color, text_color, font_display, font_body, created_at, updated_at";

export function brandKitToTheme(row: BrandKitRow): z.infer<typeof themeSchema> {
  return themeSchema.parse({
    primary: row.primary_color,
    accent: row.accent_color,
    background: row.background_color,
    text: row.text_color,
    fontDisplay: row.font_display,
    fontBody: row.font_body,
  });
}

export function brandKitToSeoPatch(row: BrandKitRow): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (row.logo_url.trim()) {
    patch.faviconUrl = row.logo_url;
    patch.ogImageUrl = row.logo_url;
  }
  return patch;
}
