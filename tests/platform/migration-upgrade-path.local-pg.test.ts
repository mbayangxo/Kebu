/**
 * Codex point 2 (migration verification), refined by the coordinator: don't just
 * apply this consolidation's migrations to an empty database — seed a database
 * with representative PRE-EXISTING records first (modeling what the real
 * production "Kebu" project already looks like — confirmed via a direct,
 * read-only Supabase MCP check: help_requests and platform_cron_runs already
 * exist live, platform_cron_runs has 836 real rows), THEN apply this
 * consolidation's new/restored migrations on top. The real risk migrations
 * break on is data that already exists, not an empty table — a fresh-DB-only
 * test can't catch that.
 *
 * This does NOT touch the real hosted "Kebu" Supabase project in any way —
 * everything here runs against a disposable local Postgres database. It does
 * not touch, substitute for, or claim anything about the separate hosted QA
 * project (ref skqnxyaeimvbyrmdfzvk), which this environment cannot reach.
 *
 * Required env var: DATABASE_URL (admin postgres:// URL). Self-skips otherwise.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
// @ts-expect-error — @types/pg not in devDependencies; pg itself is present
import { Pool } from "pg";

const ADMIN_URL = process.env.DATABASE_URL;
const SKIP = !ADMIN_URL;

const DB_NAME = `_kebtest_migration_upgrade_${Math.random().toString(36).slice(2, 10)}`;
const REPO_ROOT = join(__dirname, "../..");
const sql = (p: string) => readFileSync(join(REPO_ROOT, p), "utf8");

function disposableDbUrl(adminUrl: string): string {
  return adminUrl.replace(/\/[^/?]+(\?.*)?$/, `/${DB_NAME}$1`);
}

let adminPool: Pool;
let pool: Pool;

describe.skipIf(SKIP)("Migration upgrade path: new migrations applied on top of pre-existing production-shaped data", () => {
  let ownerId: string;
  let projectId: string;
  let preExistingHelpRequestId: string;

  beforeAll(async () => {
    adminPool = new Pool({ connectionString: ADMIN_URL, max: 2 });
    await adminPool.query(`CREATE DATABASE "${DB_NAME}"`);
    pool = new Pool({ connectionString: disposableDbUrl(ADMIN_URL!), max: 4 });
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
          project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE
        )
      `);
      // Minimal stand-in — shop_affiliate_codes.business_id FK target only, not under test here.
      await c.query(`
        CREATE TABLE public.businesses (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid()
        )
      `);

      // ---- "Baseline": what the real production database already has today,
      // per the direct read-only schema check (help_requests, platform_cron_runs,
      // shop_orders/shop_payment_ledger_events/complete_shop_payment already live). ----
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
      await c.query(sql("supabase/migrations/20260920012000_complete_shop_payment_atomically.sql"));
      // help_requests + platform_cron_runs — confirmed already live in production
      // (platform_cron_runs: 836 real rows) — this IS the baseline, applied once here.
      await c.query(sql("supabase/migrations/20261103140000_help_requests_cron_runs.sql"));
      await c.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role`);
      await c.query(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated`);

      const o = await c.query(`INSERT INTO auth.users DEFAULT VALUES RETURNING id`);
      ownerId = o.rows[0].id;
      const p = await c.query(`INSERT INTO public.projects (owner_id, title) VALUES ($1, 'Pre-existing Shop') RETURNING id`, [ownerId]);
      projectId = p.rows[0].id;

      // ---- Seed representative PRE-EXISTING data, as if this were real production. ----
      const req1 = await c.query(
        `INSERT INTO public.help_requests (name, email, subject, body, source, status)
         VALUES ('Pre-existing Customer 1', 'preexisting1@example.com', 'Cannot publish my site', 'It has been stuck for two days.', 'contact', 'open')
         RETURNING id`,
      );
      preExistingHelpRequestId = req1.rows[0].id;
      await c.query(
        `INSERT INTO public.help_requests (name, email, subject, body, source, status, helped_at, helped_by)
         VALUES ('Pre-existing Customer 2', 'preexisting2@example.com', 'Billing question', 'Why was I charged twice?', 'help', 'closed', now(), 'ops-team-member-1')`,
      );
      await c.query(
        `INSERT INTO public.platform_cron_runs (job_name, status, summary, started_at, finished_at)
         VALUES ('billing-monthly', 'ok', '{"invoicesSent": 42, "failures": 0}'::jsonb, now() - interval '1 day', now() - interval '1 day' + interval '3 minutes')`,
      );
      await c.query(
        `INSERT INTO public.platform_cron_runs (job_name, status, summary, error_message, started_at, finished_at)
         VALUES ('site-health', 'error', '{"checked": 310, "failed": 4}'::jsonb, 'timeout contacting 2 subdomains', now() - interval '2 hours', now() - interval '2 hours' + interval '5 minutes')`,
      );
      const order = await c.query(
        `INSERT INTO public.shop_orders (project_id, product_name, customer_name, customer_phone, payment_status, payment_provider, provider_reference, amount_xof)
         VALUES ($1, 'Pre-existing product', 'Pre-existing buyer', '70000001', 'paid', 'paystack', 'pre-existing-ref-1', 7500)
         RETURNING id`,
        [projectId],
      );
      await c.query(
        `INSERT INTO public.shop_payment_ledger_events (project_id, order_id, rail, event_type, amount_xof, provider, provider_reference)
         VALUES ($1, $2, 'paystack', 'paid', 7500, 'paystack', 'pre-existing-ref-1')`,
        [projectId, order.rows[0].id],
      );
    } finally {
      c.release();
    }
  }, 30_000);

  afterAll(async () => {
    await pool?.end();
    await adminPool?.query(`DROP DATABASE IF EXISTS "${DB_NAME}"`).catch(() => {});
    await adminPool?.end();
  });

  it("applies every new/restored migration from this consolidation on top of the pre-existing production-shaped data without error", async () => {
    const c = await pool.connect();
    try {
      // Every genuinely NEW migration this consolidation introduces, applied in the
      // same order supabase/migrations/ would run them, on top of the seeded data above.
      await c.query(sql("supabase/migrations/20261103010000_shop_affiliate_codes.sql"));
      await c.query(sql("supabase/migrations/20261103120000_site_fan_community.sql"));
      await c.query(sql("supabase/migrations/20261103130000_security_events_log.sql"));
      await c.query(sql("supabase/migrations/20261103130000_shop_shipping_options.sql"));
      await c.query(sql("supabase/migrations/20261103150000_help_request_replies.sql"));
      await c.query(sql("supabase/migrations/20261103180000_shop_seller_balance_and_payouts.sql"));
      await c.query(sql("supabase/migrations/20261103181000_complete_shop_payment_joko_atomic.sql"));
      await c.query(sql("supabase/migrations/20261104020000_shop_joko_fulfillment.sql"));
      await c.query(sql("supabase/migrations/20261104030000_shop_seller_balance_fulfillment_deduction.sql"));
      await c.query(sql("supabase/migrations/20261104040000_shop_refunds_and_fulfillment_outcomes.sql"));
    } finally {
      c.release();
    }
  });

  it("no data loss: both pre-existing help_requests rows survive, unchanged", async () => {
    const res = await pool.query(`SELECT id, name, email, status, helped_by FROM public.help_requests ORDER BY created_at`);
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].id).toBe(preExistingHelpRequestId);
    expect(res.rows[0].name).toBe("Pre-existing Customer 1");
    expect(res.rows[0].status).toBe("open");
    expect(res.rows[1].status).toBe("closed");
    expect(res.rows[1].helped_by).toBe("ops-team-member-1");
  });

  it("no data loss: both pre-existing platform_cron_runs rows survive, unchanged", async () => {
    const res = await pool.query(`SELECT job_name, status, summary, error_message FROM public.platform_cron_runs ORDER BY started_at`);
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].job_name).toBe("billing-monthly");
    expect(res.rows[0].summary).toEqual({ invoicesSent: 42, failures: 0 });
    expect(res.rows[1].job_name).toBe("site-health");
    expect(res.rows[1].status).toBe("error");
    expect(res.rows[1].error_message).toBe("timeout contacting 2 subdomains");
  });

  it("no data loss: the pre-existing paid Shop order and its ledger event survive", async () => {
    const order = await pool.query(`SELECT payment_status, amount_xof FROM public.shop_orders WHERE project_id = $1`, [projectId]);
    expect(order.rows).toHaveLength(1);
    expect(order.rows[0].payment_status).toBe("paid");
    expect(Number(order.rows[0].amount_xof)).toBe(7500);
    const ledger = await pool.query(`SELECT amount_xof, rail FROM public.shop_payment_ledger_events WHERE project_id = $1`, [projectId]);
    expect(ledger.rows).toHaveLength(1);
    expect(Number(ledger.rows[0].amount_xof)).toBe(7500);
  });

  it("new functionality (shop_seller_balance) correctly includes the pre-existing ledger row after the upgrade", async () => {
    // Proves the new balance function isn't blind to data that existed before it was
    // introduced — the real-world case that matters, not an empty-table fresh install.
    const balance = await pool.query(`SELECT * FROM public.shop_seller_balance($1)`, [projectId]);
    expect(Number(balance.rows[0].collected_xof)).toBe(7_500);
    expect(Number(balance.rows[0].refunded_xof)).toBe(0);
    expect(Number(balance.rows[0].fulfillment_commission_xof)).toBe(0);
    expect(Number(balance.rows[0].available_xof)).toBe(7_500);
  });

  it("refunding the pre-existing order (via record_shop_refund) correctly zeroes its contribution to the balance", async () => {
    const refund = await pool.query(`SELECT * FROM public.record_shop_refund($1, 'customer requested cancellation')`, [
      (await pool.query(`SELECT id FROM public.shop_orders WHERE project_id = $1`, [projectId])).rows[0].id,
    ]);
    expect(refund.rows[0].ok).toBe(true);
    expect(Number(refund.rows[0].refunded_xof)).toBe(7_500);

    const balance = await pool.query(`SELECT * FROM public.shop_seller_balance($1)`, [projectId]);
    expect(Number(balance.rows[0].collected_xof)).toBe(7_500);
    expect(Number(balance.rows[0].refunded_xof)).toBe(7_500);
    expect(Number(balance.rows[0].available_xof)).toBe(0);

    const order = await pool.query(`SELECT payment_status FROM public.shop_orders WHERE project_id = $1`, [projectId]);
    expect(order.rows[0].payment_status).toBe("refunded");

    // Cannot double-refund the same order.
    const second = await pool.query(`SELECT * FROM public.record_shop_refund($1)`, [
      (await pool.query(`SELECT id FROM public.shop_orders WHERE project_id = $1`, [projectId])).rows[0].id,
    ]);
    expect(second.rows[0].ok).toBe(false);
  });

  it("re-applying each individually-idempotent migration a second time is a safe no-op", async () => {
    // Real finding, documented rather than papered over: a genuine Supabase migration
    // runner tracks applied files and never re-executes one — so "re-run the whole
    // ordered set a second time" (including 20261103180000, whose `create or replace
    // function` can no longer apply once 20261104030000 has widened
    // shop_seller_balance's return columns — Postgres cannot narrow a function's
    // return table shape back down) is not a real deployment scenario and was removed
    // from this test. What IS real and tested here: every migration written with
    // `create table/policy if not exists` / `drop ... if exists; create ...` is safe
    // to re-apply on its own, including this consolidation's own final balance
    // migration (20261104030000), which legitimately is idempotent since it always
    // drops-then-creates rather than replacing in place.
    const c = await pool.connect();
    try {
      await c.query(sql("supabase/migrations/20261103010000_shop_affiliate_codes.sql"));
      await c.query(sql("supabase/migrations/20261103120000_site_fan_community.sql"));
      await c.query(sql("supabase/migrations/20261103130000_security_events_log.sql"));
      await c.query(sql("supabase/migrations/20261103130000_shop_shipping_options.sql"));
      await c.query(sql("supabase/migrations/20261103150000_help_request_replies.sql"));
      await c.query(sql("supabase/migrations/20261103181000_complete_shop_payment_joko_atomic.sql"));
      await c.query(sql("supabase/migrations/20261104020000_shop_joko_fulfillment.sql"));
      await c.query(sql("supabase/migrations/20261104030000_shop_seller_balance_fulfillment_deduction.sql"));
      await c.query(sql("supabase/migrations/20261104040000_shop_refunds_and_fulfillment_outcomes.sql"));
    } finally {
      c.release();
    }
    const res = await pool.query(`SELECT count(*)::int AS n FROM public.help_requests`);
    expect(res.rows[0].n).toBe(2);
    // The prior test already refunded this project's one order — balance correctly
    // stays at 0 after re-applying every idempotent migration again, proving the
    // re-apply didn't resurrect or double-count anything.
    const balance = await pool.query(`SELECT * FROM public.shop_seller_balance($1)`, [projectId]);
    expect(Number(balance.rows[0].available_xof)).toBe(0);
  });
});
