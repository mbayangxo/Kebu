import { randomUUID } from "node:crypto";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { KcdDocument, Op, Transaction } from "@/lib/creative-core";
import { productRowToSectionItem, type ProjectProductRow } from "@/lib/create/project-products";
import { builderOperationsEnabled } from "@/lib/create/kcd-render-flag";
import { loadKcdDocument } from "@/lib/create/kcd-project-document";
import type { ProjectRow } from "@/lib/create/kcd-adapter";
import { prepareBuilderTransaction, normalizeBuilderNode } from "@/lib/create/kcd-write-boundary";
import { CATALOG_SYNC_PENDING, type CatalogSyncState } from "@/lib/create/catalog-sync-state";
import { canonicalJson } from "@/lib/create/device-overrides";

type CatalogItem = ReturnType<typeof productRowToSectionItem>;
const commitSchema = z.object({ status: z.literal("committed"), versions: z.record(z.string(), z.number().int().positive()) });

export function catalogSectionProps(props: Record<string, unknown>, freshItems: CatalogItem[]) {
  const related = new Map<string, string[]>();
  for (const item of Array.isArray(props.items) ? props.items : []) {
    if (item && typeof item === "object" && typeof item.productId === "string" &&
        Array.isArray(item.relatedProductIds) && item.relatedProductIds.every((id: unknown) => typeof id === "string")) {
      if (item.relatedProductIds.length) related.set(item.productId, item.relatedProductIds);
    }
  }
  return {
    ...props,
    heading: typeof props.heading === "string" && props.heading.trim() ? props.heading : "Shop",
    items: freshItems.map((item) => related.has(item.productId)
      ? { ...item, relatedProductIds: related.get(item.productId) } : item),
  };
}

/** External catalog edits share the node authority; open editor history detects their version changes. */
export function catalogTransaction(doc: KcdDocument, freshItems: CatalogItem[], txId = randomUUID()): Transaction {
  const ops: Op[] = [];
  const expect: Record<string, number> = {};
  for (const node of Object.values(doc.nodes)) {
    if (node.type !== "legacy-section:products" || node.parentId !== null) continue;
    const next = normalizeBuilderNode({ ...node, props: catalogSectionProps(node.props, freshItems) });
    for (const path of ["heading", "items"] as const) {
      if (canonicalJson(next.props[path]) === canonicalJson(node.props[path])) continue;
      ops.push({ op: "setProp", id: node.id, path, value: next.props[path] });
      expect[node.id] = node.version;
    }
  }
  return { txId, origin: "system", label: "Sync catalog products", ops, expect };
}

/** A catalog mutation has already committed when this runs; sync failure must never invite re-creating the product. */
export async function syncCatalogToProductsSections(
  supabase: SupabaseClient,
  projectId: string,
  inspectOnly = false,
): Promise<CatalogSyncState> {
  try {
    const projectResult = await supabase.from("projects")
      .select("id,title,theme,seo,site_chrome,document_schema_version").eq("id", projectId).maybeSingle();
    if (projectResult.error || !projectResult.data) throw new Error("Editing mode unavailable");
    const project = projectResult.data as ProjectRow;
    const kcd = project.document_schema_version === "kcd-1";
    const pagesResult = await supabase.from("project_pages").select("id").eq("project_id", projectId);
    if (pagesResult.error) throw new Error("Pages unavailable");
    const pageIds = (pagesResult.data ?? []).map((p) => p.id);
    if (!pageIds.length) return { status: "synced" };
    const sectionsResult = await supabase.from("project_sections").select("id,props")
      .is("parent_id", null).in("page_id", pageIds).eq("section_type", "products");
    if (sectionsResult.error) throw new Error("Sections unavailable");
    const sections = sectionsResult.data ?? [];
    if (!sections.length) return { status: "synced" };

    // Capture section versions BEFORE reading the catalog: an older catalog snapshot
    // must not overwrite a newer sync that commits while these reads are in flight.
    const addressed: Op[] = sections.map((section) => ({ op: "setProp", id: section.id, path: "items", value: [] }));
    const doc = kcd ? await loadKcdDocument(supabase, project, addressed) : null;
    let productResult: { data: ProjectProductRow[] | null; error: PostgrestError | null } = await supabase.from("project_products").select(
      "id,project_id,business_id,name,description,price_label,image_url,whatsapp_order_message,sort_order,is_active,has_variants,is_subscription,subscription_interval,created_at,updated_at",
    ).eq("project_id", projectId).eq("is_active", true).order("sort_order", { ascending: true });
    if (productResult.error && /has_variants|is_subscription|subscription_interval/.test(productResult.error.message ?? "") &&
        (productResult.error.code === "42703" || productResult.error.code === "PGRST204")) {
      productResult = await supabase.from("project_products").select(
        "id,project_id,business_id,name,description,price_label,image_url,whatsapp_order_message,sort_order,is_active,created_at,updated_at",
      ).eq("project_id", projectId).eq("is_active", true).order("sort_order", { ascending: true });
    }
    if (productResult.error || productResult.data === null) throw new Error("Catalog unavailable");
    const products = productResult.data as ProjectProductRow[];
    const variants = new Map<string, NonNullable<Parameters<typeof productRowToSectionItem>[1]>>();
    if (products.length) {
      const result = await supabase.from("project_product_variants")
        .select("id,product_id,name,option1,option2,option3,price_label,image_url,is_active,sort_order")
        .eq("project_id", projectId).in("product_id", products.map((p) => p.id)).order("sort_order", { ascending: true });
      if (result.error || result.data === null) throw new Error("Variants unavailable");
      for (const variant of result.data) {
        const list = variants.get(variant.product_id) ?? [];
        list.push(variant); variants.set(variant.product_id, list);
      }
    }
    const freshItems = products.map((row) => productRowToSectionItem(row, variants.get(row.id)));
    if (doc) {
      const tx = catalogTransaction(doc, freshItems);
      if (!tx.ops.length) return { status: "synced" };
      if (inspectOnly || !builderOperationsEnabled(projectId)) return CATALOG_SYNC_PENDING;
      const protocol = await supabase.rpc("kcd_operation_protocol");
      if (protocol.error || ![3, 4].includes(protocol.data)) return CATALOG_SYNC_PENDING;
      const prepared = prepareBuilderTransaction(doc, tx);
      if (!prepared.ok) return CATALOG_SYNC_PENDING;
      const result = await supabase.rpc("apply_node_ops", { p_project_id: projectId, p_tx: prepared.transaction });
      if (result.error) return CATALOG_SYNC_PENDING;
      const committed = commitSchema.safeParse(result.data);
      if (!committed.success || Object.entries(tx.expect).some(([id, version]) => committed.data.versions[id] !== version + 1)) {
        return CATALOG_SYNC_PENDING;
      }
      return { status: "synced" };
    }

    let changed = false;
    for (const section of sections) {
      const props = section.props && typeof section.props === "object" ? section.props as Record<string, unknown> : {};
      const next = catalogSectionProps(props, freshItems);
      if (canonicalJson(next) === canonicalJson(props)) continue;
      if (inspectOnly) return CATALOG_SYNC_PENDING;
      const result = await supabase.from("project_sections").update({ props: next }).eq("id", section.id).in("page_id", pageIds);
      if (result.error) return CATALOG_SYNC_PENDING;
      changed = true;
    }
    if (changed) {
      const result = await supabase.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId);
      if (result.error) return CATALOG_SYNC_PENDING;
    }
    return { status: "synced" };
  } catch {
    return CATALOG_SYNC_PENDING;
  }
}
