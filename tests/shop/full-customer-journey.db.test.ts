/**
 * Codex point 5: "Run integrated checks... Verify the combined customer journey"
 * — one single, real-Postgres chained proof, not just separately-passing unit
 * tests for each piece. Drives: order created → paid (webhook, including a
 * duplicate delivery of the same event) → seller balance reflects it → Joko
 * Fulfillment pickup → delivery → seller balance nets the commission →
 * unauthorized attempts to alter fulfillment status or balance are rejected →
 * refund → balance nets to zero.
 *
 * Every migration this consolidation touches, applied in the real order.
 * Required env var: DATABASE_URL (admin postgres:// URL). Self-skips otherwise.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
// @ts-expect-error — @types/pg not in devDependencies; pg itself is present
import { Pool, type PoolClient } from "pg";

const ADMIN_URL = process.env.DATABASE_URL;
const SKIP = !ADMIN_URL;

const DB_NAME = `_kebtest_full_journey_${Math.random().toString(36).slice(2, 10)}`;
const REPO_ROOT = join(__dirname, "../..");
const sql = (p: string) => readFileSync(join(REPO_ROOT, p), "utf8");

function disposableDbUrl(adminUrl: string): string {
  return adminUrl.replace(/\/[^/?]+(\?.*)?$/, `/${DB_NAME}$1`);
}

let adminPool: Pool;
let pool: Pool;

async function asRole<T>(
  p: Pool,
  opts: { userId?: string; role: "authenticated" | "service_role" },
  fn: (c: PoolClient) => Promise<T>,
): Promise<T> {
  const c = await p.connect();
  try {
    await c.query("BEGIN");
    await c.query(`SET LOCAL ROLE ${opts.role}`);
    await c.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [opts.userId ?? ""]);
    const result = await fn(c);
    await c.query("COMMIT");
    return result;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

describe.skipIf(SKIP)("Full Shop customer journey, chained end-to-end (real Postgres)", () => {
  let seller: string;
  let projectId: string;
  let shippingOptionId: string;

  beforeAll(async () => {
    adminPool = new Pool({ connectionString: ADMIN_URL, max: 2 });
    await adminPool.query(`CREATE DATABASE "${DB_NAME}"`);
    pool = new Pool({ connectionString: disposableDbUrl(ADMIN_URL!), max: 6 });
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
      await c.query(`ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY`);
      await c.query(`
        CREATE POLICY "Owners read own projects" ON public.projects FOR SELECT
        USING (owner_id = auth.uid())
      `);
      await c.query(`GRANT SELECT ON public.projects TO authenticated`);
      await c.query(`
        CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
      `);
      await c.query(`
        CREATE TABLE public.project_products (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE
        )
      `);
      await c.query(sql("supabase/migrations_archive/legacy/039_shop_orders.sql"));
      await c.query(`ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS amount_xof integer`);
      await c.query(`ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS joko_reference text`);
      await c.query(`ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS joko_payment_id text`);
      await c.query(sql("supabase/migrations_archive/legacy/051_shop_payment_providers.sql"));
      await c.query(`ALTER TABLE public.shop_orders ALTER COLUMN status DROP DEFAULT, ALTER COLUMN status SET DEFAULT 'pending'`);
      await c.query(`ALTER TABLE public.shop_orders DROP CONSTRAINT IF EXISTS shop_orders_status_check`);
      await c.query(`ALTER TABLE public.shop_orders ADD CONSTRAINT shop_orders_status_check CHECK (status IN ('pending', 'contacted', 'fulfilled', 'cancelled'))`);
      await c.query(`ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid'`);
      await c.query(`ALTER TABLE public.shop_orders ADD CONSTRAINT shop_orders_payment_status_check CHECK (payment_status IS NULL OR payment_status IN ('unpaid', 'awaiting_payment', 'paid', 'failed'))`);
      await c.query(sql("docs/migrations-to-apply/068_shop_payment_ledger.sql"));
      await c.query(`CREATE OR REPLACE FUNCTION public.commit_shop_checkout(p_order_id uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$`);
      await c.query(`REVOKE ALL ON FUNCTION public.commit_shop_checkout(uuid) FROM PUBLIC, anon, authenticated`);
      await c.query(`GRANT EXECUTE ON FUNCTION public.commit_shop_checkout(uuid) TO service_role`);

      // Every migration this consolidation touches, in the real supabase/migrations/ order.
      await c.query(sql("supabase/migrations/20260920012000_complete_shop_payment_atomically.sql"));
      await c.query(sql("supabase/migrations/20261103135000_shop_shipping_options.sql"));
      await c.query(sql("supabase/migrations/20261103180000_shop_seller_balance_and_payouts.sql"));
      await c.query(sql("supabase/migrations/20261103181000_complete_shop_payment_joko_atomic.sql"));
      await c.query(sql("supabase/migrations/20261104020000_shop_joko_fulfillment.sql"));
      await c.query(sql("supabase/migrations/20261104030000_shop_seller_balance_fulfillment_deduction.sql"));
      await c.query(sql("supabase/migrations/20261104040000_shop_refunds_and_fulfillment_outcomes.sql"));

      await c.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role`);
      await c.query(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated`);

      const owner = await c.query(`INSERT INTO auth.users DEFAULT VALUES RETURNING id`);
      seller = owner.rows[0].id;
      const proj = await c.query(`INSERT INTO public.projects (owner_id, title) VALUES ($1, 'Journey Shop') RETURNING id`, [seller]);
      projectId = proj.rows[0].id;
      const opt = await c.query(
        `INSERT INTO public.shop_shipping_options (project_id, label, amount_xof, fulfillment_type, commission_bps)
         VALUES ($1, 'Joko pickup & deliver', 1000, 'joko_fulfillment', 1500) RETURNING id`,
        [projectId],
      );
      shippingOptionId = opt.rows[0].id;
    } finally {
      c.release();
    }
  }, 30_000);

  afterAll(async () => {
    await pool?.end();
    await adminPool?.query(`DROP DATABASE IF EXISTS "${DB_NAME}"`).catch(() => {});
    await adminPool?.end();
  });

  it("drives the whole journey: paid order (incl. duplicate webhook) → balance → Joko pickup → delivery → commission nets out → unauthorized changes rejected → refund → balance zero", async () => {
    // 1. Checkout: a real order, subtotal 10,000 + the 1,000 XOF Joko shipping option = 11,000.
    const reference = `journey_${Math.random().toString(36).slice(2)}`;
    const order = await pool.query(
      `INSERT INTO public.shop_orders (project_id, product_name, customer_name, customer_phone, payment_status, payment_provider, provider_reference, amount_xof)
       VALUES ($1, 'Journey product', 'Journey buyer', '70000099', 'awaiting_payment', 'paystack', $2, 11000)
       RETURNING id`,
      [projectId, reference],
    );
    const orderId = order.rows[0].id;
    // The seller opted this order into Joko Fulfillment at checkout time — same real
    // record the checkout path (lib/shop/cart-order.ts) creates when a buyer picks a
    // joko_fulfillment shipping option. Commission is on the 10,000 subtotal, not
    // the 1,000 shipping fee itself: 15% of 10,000 = 1,500.
    await pool.query(
      `INSERT INTO public.shop_fulfillment_orders (order_id, project_id, shipping_option_id, commission_xof, status)
       VALUES ($1, $2, $3, 1500, 'awaiting_pickup')`,
      [orderId, projectId, shippingOptionId],
    );

    // 2. Payment confirmation via the real atomic RPC — and a duplicate delivery of
    // the exact same provider event, proving the webhook-replay guarantee holds
    // inside this same chained journey, not just in isolation.
    const first = await pool.query(
      `SELECT * FROM public.complete_shop_payment($1, 'paystack', 'journey_ptid_1', NULL, NULL, 11000)`,
      [reference],
    );
    expect(first.rows[0].already_paid).toBe(false);
    const duplicate = await pool.query(
      `SELECT * FROM public.complete_shop_payment($1, 'paystack', 'journey_ptid_1', NULL, NULL, 11000)`,
      [reference],
    );
    expect(duplicate.rows[0].already_paid).toBe(true);
    const ledgerRows = await pool.query(
      `SELECT count(*)::int AS n FROM public.shop_payment_ledger_events WHERE order_id = $1 AND event_type = 'paid'`,
      [orderId],
    );
    expect(ledgerRows.rows[0].n).toBe(1); // exactly one, despite the duplicate delivery.

    // 3. Balance reflects the full gross amount — Joko hasn't performed the service yet.
    const balanceAfterPayment = await pool.query(`SELECT * FROM public.shop_seller_balance($1)`, [projectId]);
    expect(Number(balanceAfterPayment.rows[0].collected_xof)).toBe(11_000);
    expect(Number(balanceAfterPayment.rows[0].fulfillment_commission_xof)).toBe(1_500);
    expect(Number(balanceAfterPayment.rows[0].available_xof)).toBe(9_500); // 11,000 - 1,500 commission.

    // 4. Unauthorized attempt: the seller (authenticated, owns the project) tries to
    // advance fulfillment status directly instead of through the admin-only API route.
    // Must be rejected — no INSERT/UPDATE policy grants this to `authenticated` at all.
    await expect(
      asRole(pool, { userId: seller, role: "authenticated" }, (c) =>
        c.query(`UPDATE public.shop_fulfillment_orders SET status = 'delivered' WHERE order_id = $1`, [orderId]),
      ),
    ).rejects.toThrow();
    const stillAwaiting = await pool.query(`SELECT status FROM public.shop_fulfillment_orders WHERE order_id = $1`, [orderId]);
    expect(stillAwaiting.rows[0].status).toBe("awaiting_pickup");

    // 5. Real ops person advances the status by hand, through service_role (the admin
    // API's actual trust boundary) — awaiting_pickup → picked_up → in_transit → delivered.
    for (const status of ["picked_up", "in_transit", "delivered"]) {
      await pool.query(`UPDATE public.shop_fulfillment_orders SET status = $1 WHERE order_id = $2`, [status, orderId]);
    }
    const delivered = await pool.query(`SELECT status FROM public.shop_fulfillment_orders WHERE order_id = $1`, [orderId]);
    expect(delivered.rows[0].status).toBe("delivered");

    // Balance is unchanged by the status progression itself — the commission was
    // already correctly reflected the moment the order carried a non-cancelled Joko
    // Fulfillment row; status only matters for cancelled/failed_delivery exclusion.
    const balanceAfterDelivery = await pool.query(`SELECT * FROM public.shop_seller_balance($1)`, [projectId]);
    expect(Number(balanceAfterDelivery.rows[0].available_xof)).toBe(9_500);

    // 6. Unauthorized attempt on the balance/payout side: the seller tries to request
    // a payout larger than their real available balance. Must be rejected — and
    // request_shop_payout is service_role-only (same trust boundary as
    // shop_seller_balance), so a direct authenticated call is rejected outright,
    // before the amount is even checked.
    await expect(
      asRole(pool, { userId: seller, role: "authenticated" }, (c) =>
        c.query(`SELECT * FROM public.request_shop_payout($1, $2, 20000, 'wave', '70000099', 'Journey Seller')`, [projectId, seller]),
      ),
    ).rejects.toThrow();

    // 7. The customer later returns the item / the seller refunds them — a real refund,
    // admin-recorded, same bookkeeping-only shape as a payout.
    const refund = await pool.query(`SELECT * FROM public.record_shop_refund($1, 'buyer changed their mind')`, [orderId]);
    expect(refund.rows[0].ok).toBe(true);
    expect(Number(refund.rows[0].refunded_xof)).toBe(11_000);

    // A second refund attempt on the same order is rejected — no double-refund.
    const secondRefund = await pool.query(`SELECT * FROM public.record_shop_refund($1)`, [orderId]);
    expect(secondRefund.rows[0].ok).toBe(false);

    // 8. Final balance: fully refunded, nothing payable — even though the commission
    // was real and the delivery genuinely happened, the refunded gross wipes it out.
    const finalBalance = await pool.query(`SELECT * FROM public.shop_seller_balance($1)`, [projectId]);
    expect(Number(finalBalance.rows[0].collected_xof)).toBe(11_000);
    expect(Number(finalBalance.rows[0].refunded_xof)).toBe(11_000);
    expect(Number(finalBalance.rows[0].available_xof)).toBe(0);
    const finalOrder = await pool.query(`SELECT payment_status FROM public.shop_orders WHERE id = $1`, [orderId]);
    expect(finalOrder.rows[0].payment_status).toBe("refunded");
  });
});
