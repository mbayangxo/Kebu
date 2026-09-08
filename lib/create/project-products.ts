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
  /** Numeric XOF for JOKO checkout. Null/omit = parse from priceLabel when possible. */
  priceXof: z.number().int().min(0).max(50_000_000).nullable().optional(),
  /** Product UPC / barcode (unique per shop when set). */
  upc: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? null : v),
      z
        .string()
        .trim()
        .max(32)
        .transform((s) => s.toUpperCase().replace(/\s+/g, ""))
        .refine((s) => /^[A-Z0-9_-]{4,32}$/.test(s), "UPC must be 4–32 letters/numbers")
        .nullable()
        .optional(),
    )
    .optional(),
  /** Merchant SKU (unique per shop when set). */
  sku: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? null : v),
      z
        .string()
        .trim()
        .max(40)
        .transform((s) => s.toUpperCase().replace(/\s+/g, ""))
        .refine((s) => /^[A-Z0-9._-]{1,40}$/.test(s), "SKU invalid")
        .nullable()
        .optional(),
    )
    .optional(),
  /** When true, stockQty is enforced on place-order / cart checkout. */
  trackStock: z.boolean().optional().default(false),
  /** Units left when trackStock is true. Null when not tracking. */
  stockQty: z.number().int().min(0).max(1_000_000).nullable().optional(),
  /** C8: recurring product — customers subscribe instead of one-shot order. */
  isSubscription: z.boolean().optional().default(false),
  subscriptionInterval: z
    .enum(["weekly", "monthly", "quarterly", "yearly"])
    .nullable()
    .optional(),
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
  price_xof?: number | null;
  upc?: string | null;
  sku?: string | null;
  track_stock?: boolean;
  stock_qty?: number | null;
  is_subscription?: boolean;
  subscription_interval?: "weekly" | "monthly" | "quarterly" | "yearly" | null;
  has_variants?: boolean;
  image_url: string;
  whatsapp_order_message: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const PRODUCT_SELECT =
  "id, project_id, business_id, name, description, price_label, price_xof, upc, sku, track_stock, stock_qty, is_subscription, subscription_interval, image_url, whatsapp_order_message, sort_order, is_active, created_at, updated_at";

const PRODUCT_SELECT_LEGACY =
  "id, project_id, business_id, name, description, price_label, image_url, whatsapp_order_message, sort_order, is_active, created_at, updated_at";

const PRODUCT_SELECT_MID =
  "id, project_id, business_id, name, description, price_label, price_xof, image_url, whatsapp_order_message, sort_order, is_active, created_at, updated_at";

const PRODUCT_SELECT_CODES =
  "id, project_id, business_id, name, description, price_label, price_xof, upc, sku, track_stock, stock_qty, image_url, whatsapp_order_message, sort_order, is_active, created_at, updated_at";

export { PRODUCT_SELECT, PRODUCT_SELECT_LEGACY, PRODUCT_SELECT_MID, PRODUCT_SELECT_CODES };

export function productRowToSectionItem(
  row: ProjectProductRow,
  variants?: {
    id: string;
    name: string;
    option1: string;
    option2: string;
    option3: string;
    price_label: string;
    image_url: string;
    is_active: boolean;
  }[],
) {
  const activeVariants = (variants ?? []).filter((v) => v.is_active);
  return {
    name: row.name,
    description: row.description,
    priceLabel: row.price_label,
    imageUrl: row.image_url,
    whatsappMessage: row.whatsapp_order_message,
    productId: row.id,
    isSubscription: Boolean(row.is_subscription),
    subscriptionInterval: row.subscription_interval ?? undefined,
    hasVariants: Boolean(row.has_variants) || activeVariants.length > 0,
    variants: activeVariants.map((v) => ({
      id: v.id,
      name: v.name,
      option1: v.option1,
      option2: v.option2,
      option3: v.option3,
      priceLabel: v.price_label,
      imageUrl: v.image_url,
    })),
  };
}
