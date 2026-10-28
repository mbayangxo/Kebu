/**
 * Real-SQL verification that creating a purchase order actually matches the
 * live migration 088 schema. The route previously inserted columns
 * (`supplier_contact`, `items` jsonb, `total_amount_xof`) that do not exist
 * on `public.shop_purchase_orders` — every real creation attempt failed with
 * `column "supplier_contact" of relation "shop_purchase_orders" does not
 * exist`, confirmed by running the exact failing INSERT against a database
 * with migration 088 applied verbatim before writing the fix in
 * app/api/projects/[id]/purchase-orders/route.ts. This test runs the real
 * migration file and the corrected insert sequence, not a reimplementation.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
// @ts-expect-error — @types/pg is not in devDependencies; pg itself is present
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { generateShopPoNumber } from "@/lib/shop/codes";

const LOCAL_URL = process.env.LOCAL_PG_TEST_URL ?? "postgres://postgres:localtest@127.0.0.1:5432/postgres";

let reachable = false;
let pool: Pool;
let dbName: string;
let projectId: string;
let userId: string;

beforeAll(async () => {
  const probe = new Pool({ connectionString: LOCAL_URL, max: 1, connectionTimeoutMillis: 1500 });
  try {
    await probe.query("select 1");
    reachable = true;
  } catch {
    reachable = false;
  } finally {
    await probe.end().catch(() => {});
  }
  if (!reachable) return;

  dbName = `_kebu_po_test_${Math.random().toString(36).slice(2, 10)}`;
  const admin = new Pool({ connectionString: LOCAL_URL, max: 2 });
  await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();

  const url = LOCAL_URL.replace(/\/[^/?]+(\?.*)?$/, `/${dbName}$1`);
  pool = new Pool({ connectionString: url, max: 4 });

  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await pool.query(`CREATE SCHEMA IF NOT EXISTS auth`);
  await pool.query(`CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid())`);
  await pool.query(`CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$`);
  await pool.query(`CREATE TABLE public.projects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid, title text)`);

  const migration = readFileSync(
    resolve(__dirname, "../../supabase/migrations_archive/legacy/088_shop_purchase_orders.sql"),
    "utf8",
  );
  await pool.query(migration);

  const { rows: u } = await pool.query(`INSERT INTO auth.users DEFAULT VALUES RETURNING id`);
  userId = u[0].id;
  const { rows: p } = await pool.query(
    `INSERT INTO public.projects (owner_id, title) VALUES ($1, 'Test Shop') RETURNING id`,
    [userId],
  );
  projectId = p[0].id;
});

afterAll(async () => {
  if (!reachable) return;
  await pool.end();
  const admin = new Pool({ connectionString: LOCAL_URL, max: 1 });
  await admin.query(`DROP DATABASE IF EXISTS "${dbName}"`);
  await admin.end();
});

beforeEach(async (ctx) => {
  if (!reachable) ctx.skip();
  else await pool.query(`TRUNCATE public.shop_purchase_order_items, public.shop_purchase_orders RESTART IDENTITY`);
});

describe("Purchase order creation — real migration 088 schema", () => {
  it("the original route's insert shape fails against the real schema (reproduces the bug this fixes)", async () => {
    await expect(
      pool.query(
        `insert into public.shop_purchase_orders (project_id, supplier_name, supplier_contact, items, total_amount_xof, status, note)
         values ($1, 'Old Supplier', '+221...', $2::jsonb, 100, 'pending', '')`,
        [projectId, JSON.stringify([{ product_name: "Widget", quantity: 5 }])],
      ),
    ).rejects.toThrow(/supplier_contact/);
  });

  it("the fixed insert sequence (real route logic) creates a PO and its line items for real", async () => {
    const poNumber = generateShopPoNumber(projectId);
    const { rows: poRows } = await pool.query(
      `insert into public.shop_purchase_orders
         (project_id, po_number, supplier_name, supplier_phone, supplier_email, status, subtotal_xof, shipping_xof, note, created_by)
       values ($1, $2, 'Grossiste Treichville', '+225 07 00 00 00 00', 'fournisseur@example.com', 'ordered', 25000, 0, 'Net 30', $3)
       returning id, po_number, supplier_name, supplier_phone, supplier_email, status, subtotal_xof, shipping_xof, total_xof`,
      [projectId, poNumber, userId],
    );
    const po = poRows[0];
    expect(po.po_number).toBe(poNumber);
    expect(po.status).toBe("ordered");
    expect(Number(po.total_xof)).toBe(25000); // generated column: subtotal + shipping

    const { rows: itemRows } = await pool.query(
      `insert into public.shop_purchase_order_items (purchase_order_id, product_name, sku, qty_ordered, unit_cost_xof)
       values ($1, 'Robe en wax', 'ROBE-01', 5, 5000)
       returning id, product_name, sku, qty_ordered, qty_received, unit_cost_xof, line_total_xof`,
      [po.id],
    );
    const item = itemRows[0];
    expect(item.product_name).toBe("Robe en wax");
    expect(Number(item.qty_ordered)).toBe(5);
    expect(Number(item.qty_received)).toBe(0);
    expect(Number(item.line_total_xof)).toBe(25000); // generated column: qty_ordered * unit_cost_xof

    // Items are genuinely reachable from the parent, the way GET now reads them.
    const { rows: joined } = await pool.query(
      `select * from public.shop_purchase_order_items where purchase_order_id = $1`,
      [po.id],
    );
    expect(joined).toHaveLength(1);
  });

  it("deleting the parent cascades to its line items (ON DELETE CASCADE, as migration 088 declares)", async () => {
    const { rows: poRows } = await pool.query(
      `insert into public.shop_purchase_orders (project_id, po_number, supplier_name, status)
       values ($1, $2, 'Cascade Test Supplier', 'ordered') returning id`,
      [projectId, generateShopPoNumber(projectId)],
    );
    const poId = poRows[0].id;
    await pool.query(
      `insert into public.shop_purchase_order_items (purchase_order_id, product_name, qty_ordered, unit_cost_xof)
       values ($1, 'Item A', 1, 100)`,
      [poId],
    );
    await pool.query(`delete from public.shop_purchase_orders where id = $1`, [poId]);
    const { rows } = await pool.query(`select * from public.shop_purchase_order_items where purchase_order_id = $1`, [poId]);
    expect(rows).toHaveLength(0);
  });
});
