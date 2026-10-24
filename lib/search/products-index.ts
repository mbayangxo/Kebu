import type { SupabaseClient } from "@supabase/supabase-js";

type ProductSearchDocument = {
  source_key: string;
  mode: "products";
  entity_type: "shop_product" | "marketplace_template";
  entity_id: string;
  title: string;
  summary: string;
  source_url: string | null;
  source_name: string;
  trust_label: "verified" | "unverified";
  access_scope: "public";
  category: string | null;
  country_code: null;
  price_label: string | null;
  fetched_at: string;
  updated_at: string;
};

type ShopProductRow = {
  id: string;
  name: string;
  description: string | null;
  price_label: string | null;
  updated_at: string | null;
};

type MarketplaceTemplateRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price_cents: number;
  preview_url: string | null;
  updated_at: string | null;
};

const DEFAULT_PAGE_SIZE = 500;

function formatCents(cents: number): string {
  return "$" + (cents / 100).toFixed(2);
}

function shopProductDoc(row: ShopProductRow, now: string): ProductSearchDocument {
  return {
    source_key: "shop_product:" + row.id,
    mode: "products",
    entity_type: "shop_product",
    entity_id: row.id,
    title: row.name,
    summary: [row.description, row.price_label].filter(Boolean).join(" · ").slice(0, 400),
    source_url: null,
    source_name: "Kebu Shop",
    trust_label: "verified",
    access_scope: "public",
    category: null,
    country_code: null,
    price_label: row.price_label || null,
    fetched_at: now,
    updated_at: row.updated_at || now,
  };
}

function marketplaceTemplateDoc(row: MarketplaceTemplateRow, now: string): ProductSearchDocument {
  const priceLabel = formatCents(row.price_cents);
  return {
    source_key: "marketplace_template:" + row.id,
    mode: "products",
    entity_type: "marketplace_template",
    entity_id: row.id,
    title: row.name,
    summary: [row.category, row.description, priceLabel].filter(Boolean).join(" · ").slice(0, 400),
    source_url: row.preview_url || null,
    source_name: "Kebu Studio Marketplace",
    trust_label: "verified",
    access_scope: "public",
    category: row.category || null,
    country_code: null,
    price_label: priceLabel,
    fetched_at: now,
    updated_at: row.updated_at || now,
  };
}

/**
 * Indexes the two real, live "buyable goods" catalogs in this codebase:
 * project_products (Kebu Shop, scoped to a published site) and
 * marketplace_templates (the Studio template/creative-asset marketplace).
 * Same contract as refreshBusinessSearchIndex: full keyset-paginated scan of
 * each source, abort-before-write on any page error, reconcile (delete) stale
 * search_documents rows only after both scans complete successfully. The
 * live-join enforcement that actually keeps a de-activated product/template
 * out of results lives in public.search_products() -- this reconciliation is
 * index hygiene on top of that, not the security boundary.
 */
export async function refreshProductsSearchIndex(
  admin: SupabaseClient,
  opts: { pageSize?: number } = {},
) {
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const now = new Date().toISOString();
  const docs: ProductSearchDocument[] = [];

  // project_products, scoped to a currently-published site -- an inactive
  // product or a product on an unpublished/deleted site must never be
  // indexed, mirroring businesses' active-only indexing.
  let shopCursor: string | null = null;
  for (;;) {
    let page = admin
      .from("project_products")
      .select("id, name, description, price_label, updated_at, projects!inner(status)")
      .eq("is_active", true)
      .eq("projects.status", "published")
      .order("id", { ascending: true });
    if (shopCursor) page = page.gt("id", shopCursor);

    const { data, error } = await page.limit(pageSize);
    if (error) throw error; // abort: nothing has been written yet

    const rows = (data ?? []) as unknown as ShopProductRow[];
    if (rows.length === 0) break;
    for (const row of rows) docs.push(shopProductDoc(row, now));
    if (rows.length < pageSize) break;
    shopCursor = rows[rows.length - 1]!.id;
  }

  // marketplace_templates, scoped to published -- status lives on the table
  // itself, no parent entity to join.
  let templateCursor: string | null = null;
  for (;;) {
    let page = admin
      .from("marketplace_templates")
      .select("id, name, description, category, price_cents, preview_url, updated_at")
      .eq("status", "published")
      .order("id", { ascending: true });
    if (templateCursor) page = page.gt("id", templateCursor);

    const { data, error } = await page.limit(pageSize);
    if (error) throw error; // abort: nothing has been written yet

    const rows = (data ?? []) as MarketplaceTemplateRow[];
    if (rows.length === 0) break;
    for (const row of rows) docs.push(marketplaceTemplateDoc(row, now));
    if (rows.length < pageSize) break;
    templateCursor = rows[rows.length - 1]!.id;
  }

  // Reached only after every page of both sources loaded successfully.
  const activeIds = new Set(docs.map((d) => d.entity_id));

  if (docs.length) {
    const { error: upsertError } = await admin.from("search_documents").upsert(docs, { onConflict: "source_key" });
    if (upsertError) throw upsertError;
  }

  const { data: existingRows, error: existingError } = await admin
    .from("search_documents")
    .select("entity_id")
    .eq("mode", "products");
  if (existingError) throw existingError;

  const staleIds = ((existingRows ?? []) as Array<{ entity_id: string }>)
    .map((r) => r.entity_id)
    .filter((id) => !activeIds.has(id));

  if (staleIds.length) {
    const { error: deleteError } = await admin
      .from("search_documents")
      .delete()
      .eq("mode", "products")
      .in("entity_id", staleIds);
    if (deleteError) throw deleteError;
  }

  return {
    shop_products: docs.filter((d) => d.entity_type === "shop_product").length,
    marketplace_templates: docs.filter((d) => d.entity_type === "marketplace_template").length,
    stale_removed: staleIds.length,
  };
}
