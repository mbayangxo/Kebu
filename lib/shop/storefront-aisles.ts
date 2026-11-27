import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { productRowToSectionItem, type ProjectProductRow } from "@/lib/create/project-products";

export const storefrontAisleSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  name: z.string().min(1).max(120),
  description: z.string().max(1000),
  productIds: z.array(z.string().uuid()).max(48),
});

type Aisle = z.infer<typeof storefrontAisleSchema>;
type Item = ReturnType<typeof productRowToSectionItem>;

export function assembleStorefrontAisles(
  collections: Array<Pick<Aisle, "slug" | "name" | "description"> & {
    items: Array<{ product_id: string; sort_order: number }>;
  }>,
  productIds: ReadonlySet<string>,
): Aisle[] {
  return collections.flatMap(({ items, ...collection }) => {
    const selected = items
      .filter((item) => productIds.has(item.product_id))
      .sort((left, right) => left.sort_order - right.sort_order || left.product_id.localeCompare(right.product_id))
      .map((item) => item.product_id);
    return selected.length ? [{ ...collection, productIds: selected }] : [];
  });
}

/** Read owner-scoped catalog data for publication. Only the projected payload enters the snapshot. */
export async function readStorefrontAisles(db: SupabaseClient, projectId: string): Promise<{
  aisles: Aisle[];
  items: Item[];
} | null> {
  const { data: collections, error } = await db.from("project_product_collections")
    .select("slug, name, description, items:project_collection_items(product_id, sort_order)")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .order("sort_order")
    .order("slug")
    .limit(100);
  if (error) return null;

  const selected = [...new Set((collections ?? []).flatMap((collection) =>
    collection.items.map((item) => item.product_id),
  ))];
  const items: Item[] = [];
  for (let index = 0; index < selected.length; index += 50) {
    const ids = selected.slice(index, index + 50);
    const [products, variants] = await Promise.all([
      db.from("project_products")
        .select("id, name, description, price_label, image_url, whatsapp_order_message, is_subscription, subscription_interval, has_variants")
        .eq("project_id", projectId)
        .eq("is_active", true)
        .in("id", ids),
      db.from("project_product_variants")
        .select("id, product_id, name, option1, option2, option3, price_label, image_url, is_active")
        .eq("project_id", projectId)
        .eq("is_active", true)
        .in("product_id", ids)
        .order("sort_order"),
    ]);
    if (products.error || variants.error) return null;

    const byProduct = new Map<string, NonNullable<Parameters<typeof productRowToSectionItem>[1]>>();
    for (const variant of variants.data ?? []) {
      const entries = byProduct.get(variant.product_id) ?? [];
      entries.push(variant);
      byProduct.set(variant.product_id, entries);
    }
    for (const product of products.data ?? []) {
      items.push(productRowToSectionItem({
        ...product,
        description: product.description.slice(0, 500),
      } as ProjectProductRow, byProduct.get(product.id)));
    }
  }
  return {
    aisles: assembleStorefrontAisles(collections ?? [], new Set(items.map((item) => item.productId))),
    items,
  };
}

function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(/\p{Mark}/gu, "").toLowerCase();
}

export function filterStorefrontProducts<T extends { name: string; description?: string }>(
  products: T[],
  query: string,
): T[] {
  const terms = normalizeSearchText(query).trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return products;
  return products.filter((product) => {
    const searchable = normalizeSearchText(`${product.name} ${product.description ?? ""}`);
    return terms.every((term) => searchable.includes(term));
  });
}
