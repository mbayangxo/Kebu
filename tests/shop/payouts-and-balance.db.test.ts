/**
 * Real local-Postgres regression tests for the Shop seller balance ledger and payout
 * requests (migrations 20261103180000_shop_seller_balance_and_payouts.sql and
 * 20261103181000_complete_shop_payment_joko_atomic.sql), plus the replay/idempotency
 * and atomicity guarantees of complete_shop_payment itself.
 *
 * Mirrors the harness convention in tests/create/builder-rpc-authz.db.test.ts:
 * disposable database per run, real unmodified migration SQL applied, auth.uid()/role
 * simulated via request.jwt.claim.sub + SET LOCAL ROLE. commit_shop_checkout is stubbed
 * to `select true` — its own stock-reservation logic belongs to a separate subsystem
 * (migrations_archive/legacy/101_security_remediation_atomic_commerce.sql) and is out of
 * scope here; everything this file tests is the payment-completion/ledger/balance/payout
 * path, which calls it but does not depend on its internals.
 *
 * Required env var: DATABASE_URL (admin postgres:// URL). Self-skips otherwise.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
// @ts-expect-error — @types/pg not in devDependencies; pg itself is present
import { Pool, type PoolClient } from "pg";

const ADMIN_URL = process.env.DATABASE_URL;
const SKIP = !ADMIN_URL;

const DB_NAME = `_kebtest_shop_payouts_${Math.random().toString(36).slice(2, 10)}`;
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

describe.skipIf(SKIP)("Shop seller balance + payout requests (real Postgres)", () => {
  let ownerA: string;
  let ownerB: string;
  let projectA: string;
  let projectB: string;

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

      // Minimal real projects table (owner_id is all shop_orders RLS needs).
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

      // Minimal stand-in — shop_orders.product_id FK target only, not under test here.
      await c.query(`
        CREATE TABLE public.project_products (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE
        )
      `);

      // Real shop_orders DDL: base (039) + provider columns (051), trimmed of unrelated
      // commerce columns (gift/shipping/discount) this test never touches.
      await c.query(sql("supabase/migrations_archive/legacy/039_shop_orders.sql"));
      await c.query(`ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS amount_xof integer`);
      await c.query(`ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS joko_reference text`);
      await c.query(`ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS joko_payment_id text`);
      await c.query(sql("supabase/migrations_archive/legacy/051_shop_payment_providers.sql"));
      await c.query(`
        ALTER TABLE public.shop_orders
          ALTER COLUMN status DROP DEFAULT,
          ALTER COLUMN status SET DEFAULT 'pending'
      `);
      await c.query(`
        ALTER TABLE public.shop_orders DROP CONSTRAINT IF EXISTS shop_orders_status_check
      `);
      await c.query(`
        ALTER TABLE public.shop_orders ADD CONSTRAINT shop_orders_status_check
          CHECK (status IN ('pending', 'contacted', 'fulfilled', 'cancelled'))
      `);
      await c.query(`ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid'`);
      await c.query(`
        ALTER TABLE public.shop_orders ADD CONSTRAINT shop_orders_payment_status_check
          CHECK (payment_status IS NULL OR payment_status IN ('unpaid', 'awaiting_payment', 'paid', 'failed'))
      `);

      // Real ledger table (068).
      await c.query(sql("docs/migrations-to-apply/068_shop_payment_ledger.sql"));

      // Stub — out of scope for this file (see header comment).
      await c.query(`
        CREATE OR REPLACE FUNCTION public.commit_shop_checkout(p_order_id uuid)
        RETURNS boolean LANGUAGE sql AS $$ SELECT true $$
      `);
      await c.query(`REVOKE ALL ON FUNCTION public.commit_shop_checkout(uuid) FROM PUBLIC, anon, authenticated`);
      await c.query(`GRANT EXECUTE ON FUNCTION public.commit_shop_checkout(uuid) TO service_role`);

      // Real complete_shop_payment (atomic), then the Joko-atomic amendment, then the new
      // balance/payout migration — applied in the same order as supabase/migrations/.
      await c.query(sql("supabase/migrations/20260920012000_complete_shop_payment_atomically.sql"));
      await c.query(sql("supabase/migrations/20261103180000_shop_seller_balance_and_payouts.sql"));
      await c.query(sql("supabase/migrations/20261103181000_complete_shop_payment_joko_atomic.sql"));

      await c.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role`);
      // Belt-and-suspenders beyond ALTER DEFAULT PRIVILEGES (which only covers objects
      // created after it by the same role) — grant explicitly on everything that exists now.
      await c.query(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated`);

      const a = await c.query(`INSERT INTO auth.users DEFAULT VALUES RETURNING id`);
      const b = await c.query(`INSERT INTO auth.users DEFAULT VALUES RETURNING id`);
      ownerA = a.rows[0].id;
      ownerB = b.rows[0].id;
      const pA = await c.query(`INSERT INTO public.projects (owner_id, title) VALUES ($1, 'Shop A') RETURNING id`, [ownerA]);
      const pB = await c.query(`INSERT INTO public.projects (owner_id, title) VALUES ($1, 'Shop B') RETURNING id`, [ownerB]);
      projectA = pA.rows[0].id;
      projectB = pB.rows[0].id;
    } finally {
      c.release();
    }
  }, 30_000);

  afterAll(async () => {
    await pool?.end();
    await adminPool?.query(`DROP DATABASE IF EXISTS "${DB_NAME}"`).catch(() => {});
    await adminPool?.end();
  });

  async function insertOrder(projectId: string, opts: { reference: string; provider: string; amountXof: number; joko?: boolean }) {
    const col = opts.joko ? "joko_reference" : "provider_reference";
    const r = await pool.query(
      `INSERT INTO public.shop_orders
         (project_id, product_name, customer_name, customer_phone, payment_status, payment_provider, ${col}, amount_xof)
       VALUES ($1, 'Test product', 'Buyer', '70000000', 'awaiting_payment', $2, $3, $4)
       RETURNING id`,
      [projectId, opts.provider, opts.reference, opts.amountXof],
    );
    return r.rows[0].id as string;
  }

  it("completes a Paystack payment, writes exactly one paid ledger row, and is idempotent on replay", async () => {
    const ref = `pay_${Math.random().toString(36).slice(2)}`;
    const orderId = await insertOrder(projectA, { reference: ref, provider: "paystack", amountXof: 5000 });

    const first = await pool.query(
      `SELECT * FROM public.complete_shop_payment($1, 'paystack', 'ptid_1', NULL, NULL, 5000)`,
      [ref],
    );
    expect(first.rows[0].already_paid).toBe(false);
    expect(first.rows[0].order_id).toBe(orderId);

    const ledgerAfterFirst = await pool.query(
      `SELECT * FROM public.shop_payment_ledger_events WHERE order_id = $1 AND event_type = 'paid'`,
      [orderId],
    );
    expect(ledgerAfterFirst.rows).toHaveLength(1);
    expect(ledgerAfterFirst.rows[0].rail).toBe("paystack");
    expect(ledgerAfterFirst.rows[0].amount_xof).toBe(5000);

    // Replay the exact same webhook event — must not double-credit or double-insert.
    const second = await pool.query(
      `SELECT * FROM public.complete_shop_payment($1, 'paystack', 'ptid_1', NULL, NULL, 5000)`,
      [ref],
    );
    expect(second.rows[0].already_paid).toBe(true);

    const ledgerAfterSecond = await pool.query(
      `SELECT * FROM public.shop_payment_ledger_events WHERE order_id = $1 AND event_type = 'paid'`,
      [orderId],
    );
    expect(ledgerAfterSecond.rows).toHaveLength(1);
  });

  it("rejects a webhook whose reported amount does not match the saved order", async () => {
    const ref = `pay_${Math.random().toString(36).slice(2)}`;
    await insertOrder(projectA, { reference: ref, provider: "paystack", amountXof: 5000 });

    await expect(
      pool.query(`SELECT * FROM public.complete_shop_payment($1, 'paystack', 'ptid_x', NULL, NULL, 999)`, [ref]),
    ).rejects.toThrow(/amount metadata mismatch/i);

    const order = await pool.query(`SELECT payment_status FROM public.shop_orders WHERE provider_reference = $1`, [ref]);
    expect(order.rows[0].payment_status).toBe("awaiting_payment");
  });

  it("completes a JOKO payment via the same atomic path, tagged with CAURIS currency", async () => {
    const ref = `shop_order_joko_${Math.random().toString(36).slice(2)}`;
    const orderId = await insertOrder(projectA, { reference: ref, provider: "joko", amountXof: 3000, joko: true });

    const result = await pool.query(`SELECT * FROM public.complete_shop_payment($1, 'joko', 'jpid_1')`, [ref]);
    expect(result.rows[0].already_paid).toBe(false);
    expect(result.rows[0].order_id).toBe(orderId);

    const ledger = await pool.query(
      `SELECT * FROM public.shop_payment_ledger_events WHERE order_id = $1 AND event_type = 'paid'`,
      [orderId],
    );
    expect(ledger.rows).toHaveLength(1);
    expect(ledger.rows[0].rail).toBe("joko");
    expect(ledger.rows[0].currency).toBe("CAURIS");
  });

  it("serializes two concurrent JOKO webhook deliveries for the same payment into exactly one paid event", async () => {
    const ref = `shop_order_joko_${Math.random().toString(36).slice(2)}`;
    const orderId = await insertOrder(projectA, { reference: ref, provider: "joko", amountXof: 1200, joko: true });

    const [r1, r2] = await Promise.all([
      pool.query(`SELECT * FROM public.complete_shop_payment($1, 'joko', 'jpid_race')`, [ref]),
      pool.query(`SELECT * FROM public.complete_shop_payment($1, 'joko', 'jpid_race')`, [ref]),
    ]);
    const alreadyPaidFlags = [r1.rows[0].already_paid, r2.rows[0].already_paid].sort();
    // Exactly one call did the real work (already_paid=false); the other saw it already done.
    expect(alreadyPaidFlags).toEqual([false, true]);

    const ledger = await pool.query(
      `SELECT * FROM public.shop_payment_ledger_events WHERE order_id = $1 AND event_type = 'paid'`,
      [orderId],
    );
    expect(ledger.rows).toHaveLength(1);
  });

  it("computes seller balance from Kebu-controlled rails only, excluding WhatsApp/COD", async () => {
    const paidPaystack = await insertOrder(projectB, { reference: `b1_${Math.random()}`, provider: "paystack", amountXof: 10_000 });
    await pool.query(
      `UPDATE public.shop_orders SET payment_status = 'paid' WHERE id = $1`,
      [paidPaystack],
    );
    await pool.query(
      `INSERT INTO public.shop_payment_ledger_events (project_id, order_id, rail, event_type, amount_xof, provider, provider_reference)
       VALUES ($1, $2, 'paystack', 'paid', 10000, 'paystack', 'ref-b1')`,
      [projectB, paidPaystack],
    );
    // A WhatsApp order never touches Kebu's account — must not count toward balance,
    // even if someone inserted a ledger row for it by mistake.
    await pool.query(
      `INSERT INTO public.shop_payment_ledger_events (project_id, rail, event_type, amount_xof, provider, provider_reference)
       VALUES ($1, 'whatsapp', 'paid', 50000, 'whatsapp', 'ref-whatsapp')`,
      [projectB],
    );

    const balance = await pool.query(`SELECT * FROM public.shop_seller_balance($1)`, [projectB]);
    expect(Number(balance.rows[0].collected_xof)).toBe(10_000);
    expect(Number(balance.rows[0].available_xof)).toBe(10_000);
  });

  it("request_shop_payout rejects an amount exceeding available balance, and succeeds within it", async () => {
    const paid = await insertOrder(projectB, { reference: `b2_${Math.random()}`, provider: "wave", amountXof: 8_000 });
    await pool.query(`UPDATE public.shop_orders SET payment_status = 'paid' WHERE id = $1`, [paid]);
    await pool.query(
      `INSERT INTO public.shop_payment_ledger_events (project_id, order_id, rail, event_type, amount_xof, provider, provider_reference)
       VALUES ($1, $2, 'wave', 'paid', 8000, 'wave', 'ref-b2')`,
      [projectB, paid],
    );

    const before = await pool.query(`SELECT * FROM public.shop_seller_balance($1)`, [projectB]);
    const availableBefore = Number(before.rows[0].available_xof);

    await expect(
      pool.query(
        `SELECT * FROM public.request_shop_payout($1, $2, $3, 'wave', '771234567', 'Seller B')`,
        [projectB, ownerB, availableBefore + 1],
      ),
    ).rejects.toThrow(/exceeds available balance/i);

    const ok = await pool.query(
      `SELECT * FROM public.request_shop_payout($1, $2, $3, 'wave', '771234567', 'Seller B')`,
      [projectB, ownerB, availableBefore],
    );
    expect(ok.rows[0].status).toBe("requested");
    expect(Number(ok.rows[0].amount_xof)).toBe(availableBefore);

    const balanceAfter = await pool.query(`SELECT * FROM public.shop_seller_balance($1)`, [projectB]);
    expect(Number(balanceAfter.rows[0].available_xof)).toBe(0);
  });

  it("never lets two concurrent payout requests together double-spend the same balance", async () => {
    const paid = await insertOrder(projectA, { reference: `race_${Math.random()}`, provider: "paystack", amountXof: 10_000 });
    await pool.query(`UPDATE public.shop_orders SET payment_status = 'paid' WHERE id = $1`, [paid]);
    await pool.query(
      `INSERT INTO public.shop_payment_ledger_events (project_id, order_id, rail, event_type, amount_xof, provider, provider_reference)
       VALUES ($1, $2, 'paystack', 'paid', 10000, 'paystack', 'ref-race')`,
      [projectA, paid],
    );
    const beforeBalance = await pool.query(`SELECT * FROM public.shop_seller_balance($1)`, [projectA]);
    const availableBeforeRace = Number(beforeBalance.rows[0].available_xof);

    const attempt = (amount: number) =>
      pool
        .query(`SELECT * FROM public.request_shop_payout($1, $2, $3, 'wave', '771234567', 'Owner A')`, [projectA, ownerA, amount])
        .then(() => true)
        .catch(() => false);

    // Two requests, each individually within balance but together exceeding it — at most
    // one may succeed. The advisory lock inside request_shop_payout must serialize them
    // rather than let both read the same stale "available" snapshot.
    const halfPlus = Math.ceil(availableBeforeRace * 0.6);
    const [ok1, ok2] = await Promise.all([attempt(halfPlus), attempt(halfPlus)]);
    expect([ok1, ok2].filter(Boolean)).toHaveLength(1);

    const balance = await pool.query(`SELECT * FROM public.shop_seller_balance($1)`, [projectA]);
    expect(Number(balance.rows[0].available_xof)).toBe(availableBeforeRace - halfPlus);
  });

  it("RLS: a seller can read their own payout requests but never another seller's", async () => {
    const asA = (c: PoolClient) => c.query(`SELECT * FROM public.shop_payout_requests WHERE project_id = $1`, [projectA]);
    const asB = (c: PoolClient) => c.query(`SELECT * FROM public.shop_payout_requests WHERE project_id = $1`, [projectA]);

    const ownRows = (await asRole(pool, { userId: ownerA, role: "authenticated" }, asA)) as { rows: unknown[] };
    expect(ownRows.rows.length).toBeGreaterThan(0);

    const strangerRows = (await asRole(pool, { userId: ownerB, role: "authenticated" }, asB)) as { rows: unknown[] };
    expect(strangerRows.rows).toHaveLength(0);
  });

  it("a signed-in user cannot call request_shop_payout directly (service-role only)", async () => {
    await expect(
      asRole(pool, { userId: ownerA, role: "authenticated" }, (c) =>
        c.query(`SELECT * FROM public.request_shop_payout($1, $2, 1, 'wave', '771234567', 'Owner A')`, [projectA, ownerA]),
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it("a signed-in user cannot read another seller's balance via shop_seller_balance directly", async () => {
    await expect(
      asRole(pool, { userId: ownerA, role: "authenticated" }, (c) =>
        c.query(`SELECT * FROM public.shop_seller_balance($1)`, [projectB]),
      ),
    ).rejects.toThrow(/permission denied/i);
  });
});
