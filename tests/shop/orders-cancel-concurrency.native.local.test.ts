/**
 * The sequential cancel-replay fix (origin/stores-payments-audit 7be9cdbb, already
 * in this branch's history via app/api/projects/[id]/orders/route.ts's
 * existing.status !== "cancelled" guard) only protects against a *retried* cancel
 * request that arrives after the first has already committed. It proves nothing
 * about two cancel requests that arrive genuinely at the same time: both the route
 * handler and lib/shop/fulfillment.ts read the order's status via a plain, unlocked
 * SELECT, so two concurrent callers can both observe "not yet cancelled" and both
 * proceed to restore stock.
 *
 * This suite reproduces that race under two independent, real PostgreSQL sessions
 * (not two sequential calls on one connection, and not mocks), then proves the real
 * fix: public.cancel_shop_order_atomic (migration 20261106070000) does the
 * "already cancelled?" check, the status transition, and the stock restoration all
 * inside one function, holding a `SELECT ... FOR UPDATE` row lock across every step.
 *
 * Scope: cancellation + stock restoration only. Does not touch payment_status,
 * refunds (create_shop_refund/complete_shop_refund are untouched and untested
 * here), or any fulfil/archive/tracking path.
 *
 * Required env var: DATABASE_URL (admin postgres:// URL). Self-skips otherwise.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
// @ts-expect-error — @types/pg not in devDependencies; pg itself is present
import { Pool, type PoolClient } from "pg";

const ADMIN_URL = process.env.DATABASE_URL;
const SKIP = !ADMIN_URL;

const DB_NAME = `_kebtest_cancel_race_${Math.random().toString(36).slice(2, 10)}`;
const REPO_ROOT = join(__dirname, "../..");
const sql = (p: string) => readFileSync(join(REPO_ROOT, p), "utf8");

function disposableDbUrl(adminUrl: string): string {
  return adminUrl.replace(/\/[^/?]+(\?.*)?$/, `/${DB_NAME}$1`);
}

let adminPool: Pool;
let pool: Pool;
let ownerId: string;
let projectId: string;

type CancelResult = { ok: boolean; found: boolean; already_cancelled: boolean; restored: boolean; order_row: Record<string, unknown> | null };

async function callCancel(c: Pool | PoolClient, orderId: string): Promise<CancelResult> {
  const res = await c.query(`SELECT * FROM public.cancel_shop_order_atomic($1, $2)`, [orderId, projectId]);
  return res.rows[0] as CancelResult;
}

async function createOrder(items: { productId: string; quantity: number }[]): Promise<string> {
  const orderId = randomUUID();
  await pool.query(
    `INSERT INTO public.shop_orders (id, project_id, product_name, customer_name, customer_phone, status)
     VALUES ($1, $2, 'Race product', 'Race buyer', '70000000', 'pending')`,
    [orderId, projectId],
  );
  for (const item of items) {
    await pool.query(
      `INSERT INTO public.shop_order_items (order_id, project_id, product_id, product_name, quantity)
       VALUES ($1, $2, $3, 'Race item', $4)`,
      [orderId, projectId, item.productId, item.quantity],
    );
  }
  return orderId;
}

async function createProduct(stockQty: number): Promise<string> {
  const res = await pool.query(
    `INSERT INTO public.project_products (project_id, track_stock, stock_qty) VALUES ($1, true, $2) RETURNING id`,
    [projectId, stockQty],
  );
  return res.rows[0].id;
}

describe.skipIf(SKIP)("Shop order cancellation — concurrent stock-restore safety (real Postgres)", () => {
  beforeAll(async () => {
    adminPool = new Pool({ connectionString: ADMIN_URL, max: 2 });
    await adminPool.query(`CREATE DATABASE "${DB_NAME}"`);
    pool = new Pool({ connectionString: disposableDbUrl(ADMIN_URL!), max: 8 });
    const c = await pool.connect();
    try {
      await c.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
      await c.query(`CREATE SCHEMA IF NOT EXISTS auth`);
      await c.query(`CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid())`);
      await c.query(`
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$
      `);
      await c.query(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
        END $$`);
      await c.query(`GRANT USAGE ON SCHEMA public, auth TO authenticated, service_role, anon`);
      await c.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, service_role`);
      await c.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated, service_role`);

      await c.query(`
        CREATE TABLE public.projects (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          title text NOT NULL DEFAULT ''
        )
      `);
      await c.query(`
        CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
      `);
      await c.query(`
        CREATE TABLE public.project_products (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      // The real stock-tracking columns (supabase/migrations_archive/legacy/047_shop_product_stock.sql).
      await c.query(sql("supabase/migrations_archive/legacy/047_shop_product_stock.sql"));
      // The real shop_orders table (cancelled already a valid status natively).
      await c.query(sql("supabase/migrations_archive/legacy/039_shop_orders.sql"));
      // The real shop_order_items table.
      await c.query(sql("supabase/migrations_archive/legacy/046_shop_cart_order_items.sql"));

      // The two migrations this fix adds, applied in the real supabase/migrations/ order.
      await c.query(sql("supabase/migrations/20261106060000_restore_product_stock_atomic_functions.sql"));
      await c.query(sql("supabase/migrations/20261106070000_cancel_shop_order_atomic.sql"));

      await c.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role`);

      const owner = await c.query(`INSERT INTO auth.users DEFAULT VALUES RETURNING id`);
      ownerId = owner.rows[0].id;
    } finally {
      c.release();
    }
  }, 30_000);

  beforeEach(async () => {
    const proj = await pool.query(`INSERT INTO public.projects (owner_id, title) VALUES ($1, 'Race Shop') RETURNING id`, [ownerId]);
    projectId = proj.rows[0].id;
  });

  afterAll(async () => {
    await pool?.end();
    await adminPool?.query(`DROP DATABASE IF EXISTS "${DB_NAME}"`).catch(() => {});
    await adminPool?.end();
  });

  it("two genuinely concurrent cancel requests restore stock exactly once, deterministically", async () => {
    const productId = await createProduct(5);
    const orderId = await createOrder([{ productId, quantity: 3 }]);

    // Session A: hold the order row locked inside an explicit, uncommitted
    // transaction on its own dedicated connection -- not the pool's implicit
    // per-query transactions.
    const sessionA = await pool.connect();
    await sessionA.query("BEGIN");
    const aResultPromise = callCancel(sessionA, orderId);

    // Session B: a second, fully independent connection, fires the exact same
    // real RPC concurrently. It must block behind A's row lock, not race past it.
    const sessionB = await pool.connect();
    let bSettled = false;
    const bResultPromise = callCancel(sessionB, orderId).then((r) => {
      bSettled = true;
      return r;
    });

    // Give B a real chance to have reached and blocked on the lock before A
    // commits -- if the fix were absent (no row lock), B would already have
    // raced past and returned by now instead of waiting.
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(bSettled).toBe(false);

    const aResult = await aResultPromise;
    await sessionA.query("COMMIT");
    sessionA.release();

    const bResult = await bResultPromise;
    sessionB.release();

    // Exactly one of the two genuinely concurrent callers performed the real
    // transition and restored stock; the other, once unblocked, saw the order
    // already cancelled and did nothing.
    const results = [aResult, bResult];
    const restorers = results.filter((r) => r.restored === true);
    const noops = results.filter((r) => r.already_cancelled === true && r.restored === false);
    expect(restorers).toHaveLength(1);
    expect(noops).toHaveLength(1);

    const product = await pool.query(`SELECT stock_qty FROM public.project_products WHERE id = $1`, [productId]);
    expect(product.rows[0].stock_qty).toBe(8); // 5 + 3, not 5 + 3 + 3.

    const order = await pool.query(`SELECT status FROM public.shop_orders WHERE id = $1`, [orderId]);
    expect(order.rows[0].status).toBe("cancelled");
  });

  it("an ordinary sequential retry does nothing (complements the existing mocked replay test)", async () => {
    const productId = await createProduct(10);
    const orderId = await createOrder([{ productId, quantity: 4 }]);

    const first = await callCancel(pool, orderId);
    expect(first.restored).toBe(true);
    expect(first.already_cancelled).toBe(false);

    const second = await callCancel(pool, orderId);
    expect(second.restored).toBe(false);
    expect(second.already_cancelled).toBe(true);

    const third = await callCancel(pool, orderId);
    expect(third.restored).toBe(false);
    expect(third.already_cancelled).toBe(true);

    const product = await pool.query(`SELECT stock_qty FROM public.project_products WHERE id = $1`, [productId]);
    expect(product.rows[0].stock_qty).toBe(14); // 10 + 4, exactly once across three calls.
  });

  it("a failed restoration leaves no partial state: not cancelled, and no stock changed at all", async () => {
    const normalProduct = await createProduct(5);
    // integer overflow on the UPDATE's stock_qty + quantity forces a real,
    // unhandled Postgres error partway through the function's restoration loop.
    const overflowProduct = await createProduct(2147483647);
    const orderId = await createOrder([
      { productId: normalProduct, quantity: 3 },
      { productId: overflowProduct, quantity: 1 },
    ]);

    await expect(callCancel(pool, orderId)).rejects.toThrow(/out of range/i);

    // The whole function ran as one transaction -- the status update and the
    // first item's already-applied stock increment both rolled back together
    // with the second item's failure, not just the failing statement alone.
    const order = await pool.query(`SELECT status FROM public.shop_orders WHERE id = $1`, [orderId]);
    expect(order.rows[0].status).toBe("pending");

    const normal = await pool.query(`SELECT stock_qty FROM public.project_products WHERE id = $1`, [normalProduct]);
    expect(normal.rows[0].stock_qty).toBe(5); // unchanged -- not 8.

    // A retry after fixing the underlying data problem succeeds normally and
    // restores both items correctly -- the earlier failure didn't corrupt state
    // in a way that blocks a legitimate later cancellation.
    await pool.query(`UPDATE public.project_products SET stock_qty = 0 WHERE id = $1`, [overflowProduct]);
    const retried = await callCancel(pool, orderId);
    expect(retried.ok).toBe(true);
    expect(retried.restored).toBe(true);
    const normalAfter = await pool.query(`SELECT stock_qty FROM public.project_products WHERE id = $1`, [normalProduct]);
    expect(normalAfter.rows[0].stock_qty).toBe(8);
  });

  it("cancelling an order with no line items falls back to the order's own product_id/quantity", async () => {
    const productId = await createProduct(1);
    const orderId = randomUUID();
    await pool.query(
      `INSERT INTO public.shop_orders (id, project_id, product_id, product_name, quantity, customer_name, customer_phone, status)
       VALUES ($1, $2, $3, 'Legacy product', 2, 'Legacy buyer', '70000001', 'pending')`,
      [orderId, projectId, productId],
    );

    const result = await callCancel(pool, orderId);
    expect(result.restored).toBe(true);

    const product = await pool.query(`SELECT stock_qty FROM public.project_products WHERE id = $1`, [productId]);
    expect(product.rows[0].stock_qty).toBe(3); // 1 + 2.
  });

  it("cancelling a not-found order returns found: false rather than throwing", async () => {
    const result = await callCancel(pool, randomUUID());
    expect(result.found).toBe(false);
    expect(result.ok).toBe(false);
  });
});
