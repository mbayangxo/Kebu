import type { SupabaseClient } from "@supabase/supabase-js";
import { productRowToSectionItem, type ProjectProductRow } from "@/lib/create/project-products";

/**
 * Push active catalog rows into any `products` section on the project (draft preview).
 * Publish also merges via mergeCatalogProductsIntoSnapshot.
 */
export async function syncCatalogToProductsSections(
  supabase: SupabaseClient,
  projectId: string,
): Promise<void> {
  const { data: pages } = await supabase
    .from("project_pages")
    .select("id")
    .eq("project_id", projectId);
  const pageIds = (pages ?? []).map((p) => p.id);
  if (pageIds.length === 0) return;

  let { data: productRows } = await supabase
    .from("project_products")
    .select(
      "id, project_id, business_id, name, description, price_label, image_url, whatsapp_order_message, sort_order, is_active, has_variants, created_at, updated_at",
    )
    .eq("project_id", projectId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (!productRows) {
    const fallback = await supabase
      .from("project_products")
      .select(
        "id, project_id, business_id, name, description, price_label, image_url, whatsapp_order_message, sort_order, is_active, created_at, updated_at",
      )
      .eq("project_id", projectId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    productRows = (fallback.data ?? []).map((r) => ({ ...r, has_variants: false }));
  }

  const productIds = (productRows ?? []).map((p) => p.id);
  let variantsByProduct = new Map<string, NonNullable<Parameters<typeof productRowToSectionItem>[1]>>();
  if (productIds.length) {
    const { data: variantRows } = await supabase
      .from("project_product_variants")
      .select("id, product_id, name, option1, option2, option3, price_label, image_url, is_active, sort_order")
      .eq("project_id", projectId)
      .in("product_id", productIds)
      .order("sort_order", { ascending: true });
    for (const v of variantRows ?? []) {
      const list = variantsByProduct.get(v.product_id) ?? [];
      list.push(v);
      variantsByProduct.set(v.product_id, list);
    }
  }

  const freshItems = (productRows ?? []).map((row) =>
    productRowToSectionItem(row as ProjectProductRow, variantsByProduct.get(row.id)),
  );

  const { data: sections } = await supabase
    .from("project_sections")
    .select("id, props")
    .in("page_id", pageIds)
    .eq("section_type", "products");

  for (const section of sections ?? []) {
    const props =
      typeof section.props === "object" && section.props ? (section.props as Record<string, unknown>) : {};

    /* Preserve relatedProductIds set by the builder — keyed on productId */
    const existingItems = Array.isArray(props.items)
      ? (props.items as { productId?: string; relatedProductIds?: string[] }[])
      : [];
    const relatedMap = new Map<string, string[]>();
    for (const item of existingItems) {
      if (item.productId && Array.isArray(item.relatedProductIds) && item.relatedProductIds.length > 0) {
        relatedMap.set(item.productId, item.relatedProductIds);
      }
    }
    const items = freshItems.map((item) => {
      const pid = (item as { productId?: string }).productId;
      return pid && relatedMap.has(pid)
        ? { ...item, relatedProductIds: relatedMap.get(pid) }
        : item;
    });

    await supabase
      .from("project_sections")
      .update({
        props: {
          ...props,
          heading: typeof props.heading === "string" && props.heading.trim() ? props.heading : "Shop",
          items,
        },
      })
      .eq("id", section.id);
  }

  await supabase.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId);
}
