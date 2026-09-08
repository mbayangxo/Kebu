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

export const productVariantSchema = z.object({
  name: z.string().trim().min(1).max(120),
  option1: z.string().trim().max(60).default(""),
  option2: z.string().trim().max(60).default(""),
  option3: z.string().trim().max(60).default(""),
  priceLabel: z.string().trim().max(60).default(""),
  priceXof: z.number().int().min(0).max(50_000_000).nullable().optional(),
  sku: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? null : v),
      z.string().trim().max(40).nullable().optional(),
    )
    .optional(),
  imageUrl: imageUrl.default(""),
  stockQty: z.number().int().min(0).max(1_000_000).nullable().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional().default(true),
});

export type ProductVariantInput = z.infer<typeof productVariantSchema>;

export type ProductVariantRow = {
  id: string;
  product_id: string;
  project_id: string;
  name: string;
  option1: string;
  option2: string;
  option3: string;
  price_label: string;
  price_xof: number | null;
  sku: string | null;
  image_url: string;
  stock_qty: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const VARIANT_SELECT =
  "id, product_id, project_id, name, option1, option2, option3, price_label, price_xof, sku, image_url, stock_qty, sort_order, is_active, created_at, updated_at";

export function variantDisplayName(row: ProductVariantRow): string {
  const parts = [row.option1, row.option2, row.option3].filter((p) => p.trim());
  return parts.length ? parts.join(" / ") : row.name;
}

export function variantToCartMeta(row: ProductVariantRow) {
  return {
    variantId: row.id,
    variantName: variantDisplayName(row),
    priceLabel: row.price_label,
    priceXof: row.price_xof,
    sku: row.sku,
    imageUrl: row.image_url,
  };
}
