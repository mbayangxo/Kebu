import type { SupabaseClient } from "@supabase/supabase-js";
import { productRowToSectionItem } from "@/lib/create/project-products";

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

  const { data: productRows } = await supabase
    .from("project_products")
    .select(
      "id, project_id, business_id, name, description, price_label, image_url, whatsapp_order_message, sort_order, is_active, created_at, updated_at",
    )
    .eq("project_id", projectId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const items = (productRows ?? []).map(productRowToSectionItem);

  const { data: sections } = await supabase
    .from("project_sections")
    .select("id, props")
    .in("page_id", pageIds)
    .eq("section_type", "products");

  for (const section of sections ?? []) {
    const props =
      typeof section.props === "object" && section.props ? (section.props as Record<string, unknown>) : {};
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
