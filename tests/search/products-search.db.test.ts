import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createSearchTestDb, dropSearchTestDb, isLocalPgReachable, type Db } from "./db/local-pg";

let db: Db | null = null;
let userId: string;

async function insertProject(id: string, status: string) {
  await db!.pool.query(
    `insert into public.projects (id, owner_id, title, project_type, status, subdomain) values ($1,$2,$3,'store',$4,$5)`,
    [id, userId, "Test Store " + id.slice(-4), status, "store-" + id.slice(-6)],
  );
}

async function insertShopProduct(id: string, projectId: string, overrides: Partial<{ name: string; is_active: boolean; price_label: string; updated_at: string }> = {}) {
  const o = { name: "Product " + id.slice(-4), is_active: true, price_label: "5,000 FCFA", updated_at: new Date().toISOString(), ...overrides };
  await db!.pool.query(
    `insert into public.project_products (id, project_id, name, is_active, price_label, updated_at) values ($1,$2,$3,$4,$5,$6)`,
    [id, projectId, o.name, o.is_active, o.price_label, o.updated_at],
  );
}

async function insertDeveloper(id: string) {
  await db!.pool.query(
    `insert into public.developer_profiles (id, user_id, display_name, status) values ($1,$2,'Test Dev','approved')`,
    [id, userId],
  );
}

async function insertTemplate(id: string, developerId: string, overrides: Partial<{ name: string; status: string; price_cents: number; updated_at: string }> = {}) {
  const o = { name: "Template " + id.slice(-4), status: "published", price_cents: 1999, updated_at: new Date().toISOString(), ...overrides };
  await db!.pool.query(
    `insert into public.marketplace_templates (id, developer_id, slug, name, status, price_cents, definition, updated_at)
     values ($1,$2,$3,$4,$5,$6,'{}'::jsonb,$7)`,
    [id, developerId, "slug-" + id.slice(-6), o.name, o.status, o.price_cents, o.updated_at],
  );
}

async function indexSearchDoc(entityId: string, entityType: "shop_product" | "marketplace_template", overrides: Partial<{ title: string; updated_at: string }> = {}) {
  const o = { title: "Doc " + entityId.slice(-4), updated_at: new Date().toISOString(), ...overrides };
  await db!.pool.query(
    `insert into public.search_documents (source_key, mode, entity_type, entity_id, title, access_scope, updated_at)
     values ($1,'products',$2,$3,$4,'public',$5)`,
    [`${entityType}:${entityId}`, entityType, entityId, o.title, o.updated_at],
  );
}

async function searchProducts(query: string | null, limit = 20, offset = 0) {
  const { rows } = await db!.pool.query(`select * from public.search_products($1, $2, $3)`, [query, limit, offset]);
  return rows as Array<{ entity_id: string; entity_type: string; title: string; rank: number; price_label: string; total_count: string }>;
}

describe("Kebu Search — Products mode, real migrated SQL", () => {
  beforeAll(async () => {
    if (!(await isLocalPgReachable())) return;
    db = await createSearchTestDb();
    const { rows } = await db.pool.query(`insert into auth.users default values returning id`);
    userId = rows[0].id;
  });

  afterAll(async () => {
    if (db) await dropSearchTestDb(db);
  });

  beforeEach(async (ctx) => {
    if (!db) ctx.skip();
    else
      await db.pool.query(
        `truncate public.search_documents, public.project_products, public.projects, public.marketplace_templates, public.developer_profiles restart identity`,
      );
  });

  it("migrations apply cleanly: mode accepts 'products', price_label is a real column", async () => {
    const { rows } = await db!.pool.query(
      `select column_name from information_schema.columns where table_name = 'search_documents' and column_name = 'price_label'`,
    );
    expect(rows).toHaveLength(1);
  });

  describe("live active-status enforcement — shop products", () => {
    const productId = "11111111-1111-4111-8111-200000000001";
    const projectId = "11111111-1111-4111-8111-200000000002";

    it("returns an active product on a published site", async () => {
      await insertProject(projectId, "published");
      await insertShopProduct(productId, projectId);
      await indexSearchDoc(productId, "shop_product");

      const results = await searchProducts(null);
      expect(results.map((r) => r.entity_id)).toContain(productId);
    });

    it("excludes a product the moment it's deactivated, even with a stale indexed row", async () => {
      await insertProject(projectId, "published");
      await insertShopProduct(productId, projectId);
      await indexSearchDoc(productId, "shop_product");
      await db!.pool.query(`update public.project_products set is_active = false where id = $1`, [productId]);

      const results = await searchProducts(null);
      expect(results.map((r) => r.entity_id)).not.toContain(productId);

      const { rows } = await db!.pool.query(`select 1 from public.search_documents where entity_id = $1`, [productId]);
      expect(rows).toHaveLength(1); // stale row still present — enforcement is at read time
    });

    it("excludes a product whose site is no longer published", async () => {
      await insertProject(projectId, "published");
      await insertShopProduct(productId, projectId);
      await indexSearchDoc(productId, "shop_product");
      await db!.pool.query(`update public.projects set status = 'archived' where id = $1`, [projectId]);

      const results = await searchProducts(null);
      expect(results.map((r) => r.entity_id)).not.toContain(productId);
    });
  });

  describe("live active-status enforcement — marketplace templates", () => {
    const templateId = "11111111-1111-4111-8111-200000000010";
    const developerId = "11111111-1111-4111-8111-200000000011";

    it("returns a published template", async () => {
      await insertDeveloper(developerId);
      await insertTemplate(templateId, developerId);
      await indexSearchDoc(templateId, "marketplace_template");

      const results = await searchProducts(null);
      expect(results.map((r) => r.entity_id)).toContain(templateId);
    });

    it("excludes a template taken off sale, even with a stale indexed row", async () => {
      await insertDeveloper(developerId);
      await insertTemplate(templateId, developerId);
      await indexSearchDoc(templateId, "marketplace_template");
      await db!.pool.query(`update public.marketplace_templates set status = 'archived' where id = $1`, [templateId]);

      const results = await searchProducts(null);
      expect(results.map((r) => r.entity_id)).not.toContain(templateId);

      const { rows } = await db!.pool.query(`select 1 from public.search_documents where entity_id = $1`, [templateId]);
      expect(rows).toHaveLength(1);
    });
  });

  describe("mixed results across both entity types", () => {
    it("returns both a shop product and a marketplace template in one call", async () => {
      const projectId = "11111111-1111-4111-8111-200000000020";
      const productId = "11111111-1111-4111-8111-200000000021";
      const developerId = "11111111-1111-4111-8111-200000000022";
      const templateId = "11111111-1111-4111-8111-200000000023";

      await insertProject(projectId, "published");
      await insertShopProduct(productId, projectId);
      await indexSearchDoc(productId, "shop_product");

      await insertDeveloper(developerId);
      await insertTemplate(templateId, developerId);
      await indexSearchDoc(templateId, "marketplace_template");

      const results = await searchProducts(null);
      const ids = results.map((r) => r.entity_id);
      expect(ids).toContain(productId);
      expect(ids).toContain(templateId);
    });
  });

  describe("pagination", () => {
    it("paginates with p_limit/p_offset and reports the true total across the full set", async () => {
      const developerId = "11111111-1111-4111-8111-200000000030";
      await insertDeveloper(developerId);
      const ids = [
        "11111111-1111-4111-8111-200000000031",
        "11111111-1111-4111-8111-200000000032",
        "11111111-1111-4111-8111-200000000033",
      ];
      for (const id of ids) {
        await insertTemplate(id, developerId, { name: "Fashion Pack " + id.slice(-2) });
        await indexSearchDoc(id, "marketplace_template", { title: "Fashion Pack " + id.slice(-2) });
      }

      const page1 = await searchProducts(null, 2, 0);
      expect(page1).toHaveLength(2);
      expect(page1.every((r) => Number(r.total_count) === 3)).toBe(true);

      const page2 = await searchProducts(null, 2, 2);
      expect(page2).toHaveLength(1);

      const pagedIds = [...page1, ...page2].map((r) => r.entity_id);
      expect(new Set(pagedIds).size).toBe(3);
    });
  });

  describe("price formatting", () => {
    it("exposes the real price_label stored at index time", async () => {
      const projectId = "11111111-1111-4111-8111-200000000040";
      const productId = "11111111-1111-4111-8111-200000000041";
      await insertProject(projectId, "published");
      await insertShopProduct(productId, projectId, { price_label: "12,500 FCFA" });
      await db!.pool.query(
        `insert into public.search_documents (source_key, mode, entity_type, entity_id, title, access_scope, price_label, updated_at)
         values ('shop_product:' || $1, 'products', 'shop_product', $1, 'Doc', 'public', '12,500 FCFA', now())`,
        [productId],
      );

      const results = await searchProducts(null);
      expect(results.find((r) => r.entity_id === productId)!.price_label).toBe("12,500 FCFA");
    });
  });
});
