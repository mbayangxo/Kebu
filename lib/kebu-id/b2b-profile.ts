import { z } from "zod";

export const b2bProfileSchema = z.object({
  headline: z.string().trim().max(160).default(""),
  about: z.string().trim().max(2000).default(""),
  logoUrl: z.string().trim().max(500).default(""),
  coverUrl: z.string().trim().max(500).default(""),
  galleryUrls: z.array(z.string().trim().max(500)).max(12).default([]),
  categories: z.array(z.string().trim().max(80)).max(8).default([]),
  minOrderNote: z.string().trim().max(200).default(""),
  contactEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional().or(z.literal("")),
  isPublished: z.boolean().optional().default(false),
});

export type B2bProfileInput = z.infer<typeof b2bProfileSchema>;

export type B2bProfileRow = {
  business_id: string;
  headline: string;
  about: string;
  logo_url: string;
  cover_url: string;
  gallery_urls: string[];
  categories: string[];
  min_order_note: string;
  contact_email: string | null;
  contact_phone: string | null;
  is_published: boolean;
  updated_at: string;
};

export function rowToB2bProfile(row: B2bProfileRow) {
  return {
    businessId: row.business_id,
    headline: row.headline,
    about: row.about,
    logoUrl: row.logo_url,
    coverUrl: row.cover_url,
    galleryUrls: row.gallery_urls ?? [],
    categories: row.categories ?? [],
    minOrderNote: row.min_order_note,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    isPublished: row.is_published,
    updatedAt: row.updated_at,
  };
}
