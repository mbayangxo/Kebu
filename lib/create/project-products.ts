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

export const projectProductSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).default(""),
  priceLabel: z.string().trim().max(60).default(""),
  imageUrl: imageUrl.default(""),
  whatsappOrderMessage: z.string().trim().max(300).default(""),
  sortOrder: z.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional().default(true),
});

export type ProjectProductInput = z.infer<typeof projectProductSchema>;

export type ProjectProductRow = {
  id: string;
  project_id: string;
  business_id: string | null;
  name: string;
  description: string;
  price_label: string;
  image_url: string;
  whatsapp_order_message: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function productRowToSectionItem(row: ProjectProductRow) {
  return {
    name: row.name,
    description: row.description,
    priceLabel: row.price_label,
    imageUrl: row.image_url,
    whatsappMessage: row.whatsapp_order_message,
  };
}
