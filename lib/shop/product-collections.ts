import { z } from "zod";

const imageUrl = z.union([
  z.literal(""),
  z.string().trim().url().max(500),
  z
    .string()
    .trim()
    .max(500)
    .regex(/^\/[a-zA-Z0-9._\-/]+$/),
]);

const collectionFields = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, hyphens")
    .max(80)
    .optional(),
  description: z.string().trim().max(1000),
  imageUrl,
  sortOrder: z.number().int().min(0).max(999).optional(),
  isActive: z.boolean(),
  productIds: z.array(z.string().uuid()).max(48).optional(),
});

export const collectionPatchSchema = collectionFields.partial();
export const collectionSchema = collectionFields.extend({
  description: collectionFields.shape.description.default(""),
  imageUrl: imageUrl.default(""),
  isActive: z.boolean().default(true),
});

export type CollectionInput = z.infer<typeof collectionSchema>;

export type CollectionRow = {
  id: string;
  project_id: string;
  business_id: string | null;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CollectionItemRow = {
  id: string;
  collection_id: string;
  product_id: string;
  sort_order: number;
};

export const COLLECTION_SELECT =
  "id, project_id, business_id, name, slug, description, image_url, sort_order, is_active, created_at, updated_at";

export function slugifyCollectionName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
