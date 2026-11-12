/**
 * One-off: build a real disposable Postgres database via the same harness
 * the .db.test.ts suite uses, seed it with a realistic mixed dataset (active
 * verified, active unverified, and three businesses that must NEVER be
 * findable — draft, suspended, deleted), and print its connection URL.
 * Does not drop the database on exit — this is for a manual/scripted
 * browser-verification session, not an automated test.
 */
import { createSearchTestDb } from "./local-pg";

async function main() {
  const db = await createSearchTestDb();
  const { rows } = await db.pool.query(`insert into auth.users default values returning id`);
  const userId = rows[0].id;

  async function insertBusiness(id: string, o: {
    legal_name: string; trading_name?: string | null; country_code: string; category: string;
    description: string; website?: string | null; lifecycle_status: string; verification_level: number;
  }) {
    const suffix = id.replace(/-/g, "").slice(-6).toUpperCase();
    await db.pool.query(
      `insert into public.businesses
         (id, public_kebu_id, legal_name, trading_name, country_code, category, description, website, lifecycle_status, verification_level, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, `KEBU-${o.country_code}-01-${suffix}`, o.legal_name, o.trading_name ?? null, o.country_code, o.category,
       o.description, o.website ?? null, o.lifecycle_status, o.verification_level, userId],
    );
  }

  async function indexBusiness(id: string, title: string, summary: string, category: string, country: string, verified: boolean) {
    await db.pool.query(
      `insert into public.search_documents
         (source_key, mode, entity_type, entity_id, title, summary, trust_label, access_scope, category, country_code, fetched_at, updated_at)
       values ($1,'businesses','business',$2,$3,$4,$5,'public',$6,$7, now(), now())`,
      [`business:${id}`, id, title, summary, verified ? "verified" : "unverified", category, country],
    );
  }

  // Active, verified — must appear and rank for "chocolate".
  const baobabId = "aaaaaaaa-1111-4111-8111-000000000001";
  await insertBusiness(baobabId, {
    legal_name: "Baobab Chocolate Manufacturing SARL",
    trading_name: "Baobab Chocolate",
    country_code: "SN",
    category: "food",
    description: "Artisanal chocolate manufacturer sourcing cacao from Casamance, Senegal.",
    website: "https://baobab-chocolate.example",
    lifecycle_status: "active",
    verification_level: 3,
  });
  await indexBusiness(baobabId, "Baobab Chocolate", "Food · SN · Artisanal chocolate manufacturer sourcing cacao from Casamance, Senegal.", "food", "SN", true);

  // Active, unverified — must also appear, labeled unverified.
  const dakarSweetsId = "aaaaaaaa-1111-4111-8111-000000000002";
  await insertBusiness(dakarSweetsId, {
    legal_name: "Dakar Sweets Co",
    country_code: "SN",
    category: "food",
    description: "Small retailer of locally made chocolate and confectionery.",
    lifecycle_status: "active",
    verification_level: 1,
  });
  await indexBusiness(dakarSweetsId, "Dakar Sweets Co", "Food · SN · Small retailer of locally made chocolate and confectionery.", "food", "SN", false);

  // Draft — indexed (stale) but must NEVER appear or be reachable by detail id.
  const draftId = "aaaaaaaa-1111-4111-8111-000000000003";
  await insertBusiness(draftId, {
    legal_name: "Still Drafting Chocolate Ltd",
    country_code: "SN",
    category: "food",
    description: "A chocolate business that never finished registration.",
    lifecycle_status: "draft",
    verification_level: 1,
  });
  await indexBusiness(draftId, "Still Drafting Chocolate Ltd", "Food · SN · A chocolate business that never finished registration.", "food", "SN", false);

  // Suspended — indexed (stale) but must NEVER appear or be reachable by detail id.
  const suspendedId = "aaaaaaaa-1111-4111-8111-000000000004";
  await insertBusiness(suspendedId, {
    legal_name: "Suspended Chocolate Traders",
    country_code: "SN",
    category: "food",
    description: "A chocolate trading business currently under suspension.",
    lifecycle_status: "suspended",
    verification_level: 2,
  });
  await indexBusiness(suspendedId, "Suspended Chocolate Traders", "Food · SN · A chocolate trading business currently under suspension.", "food", "SN", true);

  // A second country, active and verified — proves the country filter
  // narrows to exactly one country rather than just reordering results.
  const accraId = "aaaaaaaa-1111-4111-8111-000000000005";
  await insertBusiness(accraId, {
    legal_name: "Accra Textiles Ltd",
    country_code: "GH",
    category: "fashion",
    description: "Textile manufacturer and wholesaler based in Accra, Ghana.",
    lifecycle_status: "active",
    verification_level: 2,
  });
  await indexBusiness(accraId, "Accra Textiles Ltd", "Fashion · GH · Textile manufacturer and wholesaler based in Accra, Ghana.", "fashion", "GH", true);

  // 20 more active SN businesses — pushes the SN total past the 20-per-page
  // cap so "Load more" has something real to load, not just a formula to trust.
  for (let i = 1; i <= 20; i++) {
    // Offset by 100 so the derived public_kebu_id suffix (last 6 hex digits)
    // never collides with the fixed SN businesses above (...0001-...0005).
    const id = `aaaaaaaa-2222-4111-8111-${String(100 + i).padStart(12, "0")}`;
    const name = `Sahel Services Co ${i}`;
    await insertBusiness(id, {
      legal_name: name,
      country_code: "SN",
      category: "services",
      description: `General business services provider number ${i}, based in Senegal.`,
      lifecycle_status: "active",
      verification_level: i % 2 === 0 ? 2 : 1,
    });
    await indexBusiness(id, name, `Services · SN · General business services provider number ${i}, based in Senegal.`, "services", "SN", i % 2 === 0);
  }

  // --- Products mode: a published site with an active product, plus a
  // deactivated one and one on an unpublished site, all indexed (stale) ---
  const publishedProjectId = "bbbbbbbb-1111-4111-8111-000000000001";
  const unpublishedProjectId = "bbbbbbbb-1111-4111-8111-000000000002";
  await db.pool.query(
    `insert into public.projects (id, owner_id, title, project_type, status, subdomain) values ($1,$2,'Baobab Store','store','published','baobab-store')`,
    [publishedProjectId, userId],
  );
  await db.pool.query(
    `insert into public.projects (id, owner_id, title, project_type, status, subdomain) values ($1,$2,'Draft Store','store','draft','draft-store')`,
    [unpublishedProjectId, userId],
  );

  const activeProductId = "bbbbbbbb-2222-4111-8111-000000000001";
  await db.pool.query(
    `insert into public.project_products (id, project_id, name, description, price_label, is_active)
     values ($1,$2,'Baobab Honey Jar','Raw wildflower honey harvested near Casamance.','3,500 FCFA',true)`,
    [activeProductId, publishedProjectId],
  );
  await db.pool.query(
    `insert into public.search_documents (source_key, mode, entity_type, entity_id, title, summary, source_name, access_scope, price_label, fetched_at, updated_at)
     values ('shop_product:' || $1, 'products', 'shop_product', $1, 'Baobab Honey Jar', 'Raw wildflower honey harvested near Casamance. · 3,500 FCFA', 'Kebu Shop', 'public', '3,500 FCFA', now(), now())`,
    [activeProductId],
  );

  const deactivatedProductId = "bbbbbbbb-2222-4111-8111-000000000002";
  await db.pool.query(
    `insert into public.project_products (id, project_id, name, description, price_label, is_active)
     values ($1,$2,'Discontinued Candle','No longer sold.','2,000 FCFA',false)`,
    [deactivatedProductId, publishedProjectId],
  );
  await db.pool.query(
    `insert into public.search_documents (source_key, mode, entity_type, entity_id, title, summary, source_name, access_scope, price_label, fetched_at, updated_at)
     values ('shop_product:' || $1, 'products', 'shop_product', $1, 'Discontinued Candle', 'No longer sold. · 2,000 FCFA', 'Kebu Shop', 'public', '2,000 FCFA', now(), now())`,
    [deactivatedProductId],
  );

  const unpublishedSiteProductId = "bbbbbbbb-2222-4111-8111-000000000003";
  await db.pool.query(
    `insert into public.project_products (id, project_id, name, description, price_label, is_active)
     values ($1,$2,'Draft Site Product','Site never went live.','1,000 FCFA',true)`,
    [unpublishedSiteProductId, unpublishedProjectId],
  );
  await db.pool.query(
    `insert into public.search_documents (source_key, mode, entity_type, entity_id, title, summary, source_name, access_scope, price_label, fetched_at, updated_at)
     values ('shop_product:' || $1, 'products', 'shop_product', $1, 'Draft Site Product', 'Site never went live. · 1,000 FCFA', 'Kebu Shop', 'public', '1,000 FCFA', now(), now())`,
    [unpublishedSiteProductId],
  );

  // --- Products mode: Studio marketplace — one published template, one archived ---
  const developerId = "bbbbbbbb-3333-4111-8111-000000000001";
  await db.pool.query(
    `insert into public.developer_profiles (id, user_id, display_name, status) values ($1,$2,'Amina Studio','approved')`,
    [developerId, userId],
  );

  const publishedTemplateId = "bbbbbbbb-4444-4111-8111-000000000001";
  await db.pool.query(
    `insert into public.marketplace_templates (id, developer_id, slug, name, description, category, price_cents, definition, status)
     values ($1,$2,'instagram-post-pack','Instagram Post Pack','20 editable Instagram post layouts.','social',1999,'{}'::jsonb,'published')`,
    [publishedTemplateId, developerId],
  );
  await db.pool.query(
    `insert into public.search_documents (source_key, mode, entity_type, entity_id, title, summary, source_name, access_scope, category, price_label, fetched_at, updated_at)
     values ('marketplace_template:' || $1, 'products', 'marketplace_template', $1, 'Instagram Post Pack', 'Social · 20 editable Instagram post layouts. · $19.99', 'Kebu Studio Marketplace', 'public', 'social', '$19.99', now(), now())`,
    [publishedTemplateId],
  );

  const archivedTemplateId = "bbbbbbbb-4444-4111-8111-000000000002";
  await db.pool.query(
    `insert into public.marketplace_templates (id, developer_id, slug, name, description, category, price_cents, definition, status)
     values ($1,$2,'old-flyer-pack','Old Flyer Pack','No longer for sale.','flyers',999,'{}'::jsonb,'archived')`,
    [archivedTemplateId, developerId],
  );
  await db.pool.query(
    `insert into public.search_documents (source_key, mode, entity_type, entity_id, title, summary, source_name, access_scope, category, price_label, fetched_at, updated_at)
     values ('marketplace_template:' || $1, 'products', 'marketplace_template', $1, 'Old Flyer Pack', 'Flyers · No longer for sale. · $9.99', 'Kebu Studio Marketplace', 'public', 'flyers', '$9.99', now(), now())`,
    [archivedTemplateId],
  );

  console.log(JSON.stringify({
    dbUrl: db.pool.options.connectionString,
    dbName: db.name,
    businesses: {
      active_verified: baobabId,
      active_unverified: dakarSweetsId,
      draft_stale_indexed: draftId,
      suspended_stale_indexed: suspendedId,
      other_country_active: accraId,
    },
    products: {
      active_shop_product: activeProductId,
      deactivated_shop_product_stale_indexed: deactivatedProductId,
      unpublished_site_product_stale_indexed: unpublishedSiteProductId,
      published_template: publishedTemplateId,
      archived_template_stale_indexed: archivedTemplateId,
    },
  }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
