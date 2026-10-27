/**
 * Reproduces a real duplicate-webhook race against real independent
 * PostgreSQL backend sessions (PGlite is single-connection and cannot
 * race). markShopOrderPaid (JOKO, lib/shop/joko-order.ts) and
 * markShopOrderPaidByProviderRef (PayPal / any provider routed through
 * lib/shop/adapter-checkout.ts) check shop_orders.payment_status === 'paid'
 * and separately insert a 'paid' row into shop_payment_ledger_events — a
 * plain SELECT-then-INSERT, not one atomic transaction, unlike Paystack's
 * complete_shop_payment() and Wave's complete_verified_wave_payment() RPCs
 * (already proven race-safe in wave-settlement.native.local.test.ts).
 * supabase/migrations/20261027010000_shop_payment_ledger_paid_once_per_order.sql
 * closes it with a partial unique index — this proves that holds under a
 * real race, and that it doesn't over-restrict unrelated rows.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
// @ts-expect-error pg is installed without an @types/pg project dependency
import { Pool } from "pg";
import { assertLocalPublishDatabase } from "../creative-core/publish-db-setup";
import { dropNativeFixtureDatabase } from "../creative-core/native-postgres-cleanup";
import { setupWaveDatabase, type WaveDb } from "../payments/fixtures/wave-database";

type Connection = { query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<{ rows: T[] }>; release: () => void };
type DbPool = { query: Connection["query"]; connect: () => Promise<Connection>; end: () => Promise<void> };

const url = process.env.KEBU_PUBLISH_CONCURRENCY_DATABASE_URL;
const database = "_kebutest_payments_" + randomUUID().replaceAll("-", "");
let admin: DbPool | undefined;
let pool: DbPool | undefined;
let created = false;

const wrap = (c: Connection): WaveDb => ({ exec: (sql) => c.query(sql), query: (sql, args) => c.query(sql, args) });
const settle = <T>(promise: Promise<T>) =>
  promise.then((value) => ({ ok: true as const, value }), (error) => ({ ok: false as const, error }));

describe.skipIf(!url)("shop_payment_ledger_events — paid-once-per-order under real concurrency", () => {
  beforeAll(async () => {
    const source = assertLocalPublishDatabase(url!);
    admin = new Pool({ connectionString: source.href, max: 1 }) as DbPool;
    await admin.query('create database "' + database + '"');
    created = true;
    source.pathname = "/" + database;
    pool = new Pool({ connectionString: source.href, max: 6 }) as DbPool;
    const c = await pool.connect();
    try {
      await setupWaveDatabase(wrap(c));
      // The fix migration under test — additive, safe to apply on top of the fixture's table.
      await c.query(
        readFileSync(
          resolve("supabase/migrations/20261027010000_shop_payment_ledger_paid_once_per_order.sql"),
          "utf8",
        ),
      );
    } finally {
      c.release();
    }
  }, 60000);

  afterAll(async () => {
    try {
      if (pool) await pool.end();
    } finally {
      try {
        if (created) await dropNativeFixtureDatabase(admin!, database);
      } finally {
        if (admin) await admin.end();
      }
    }
  });

  it("reproduces the race: two concurrent 'paid' ledger inserts for the same order — exactly one survives", async () => {
    const holder = await pool!.connect();
    const a = await pool!.connect();
    const b = await pool!.connect();
    try {
      const orderId = (
        await holder.query<{ id: string }>("insert into shop_orders(project_id,amount_xof) values($1,2000) returning id", [
          "44444444-4444-4444-8444-444444444444",
        ])
      ).rows[0]!.id;

      const insertPaid = (c: Connection) =>
        c.query(
          "insert into shop_payment_ledger_events(project_id,order_id,rail,event_type,amount_xof,currency,provider,provider_reference) values($1,$2,'joko','paid',2000,'CAURIS','joko','dup-webhook-ref')",
          ["44444444-4444-4444-8444-444444444444", orderId],
        );

      // Real overlap: both statements issued before either completes — this is
      // what two near-simultaneous webhook deliveries for the same order produce.
      const [first, second] = await Promise.all([settle(insertPaid(a)), settle(insertPaid(b))]);
      const outcomes = [first, second];

      expect(outcomes.filter((r) => r.ok)).toHaveLength(1);
      const failure = outcomes.find((r) => !r.ok) as { ok: false; error: { code?: string } } | undefined;
      expect(failure?.error.code).toBe("23505"); // unique_violation — not a generic/ambiguous failure

      const count = (
        await holder.query<{ count: number }>(
          "select count(*)::int as count from shop_payment_ledger_events where order_id=$1 and event_type='paid'",
          [orderId],
        )
      ).rows[0]!.count;
      expect(count).toBe(1);
    } finally {
      await a.query("rollback").catch(() => {});
      await b.query("rollback").catch(() => {});
      a.release();
      b.release();
      holder.release();
    }
  }, 30000);

  it("does not restrict a second 'paid' row for a different order, or non-'paid' rows for the same order", async () => {
    const holder = await pool!.connect();
    try {
      const orderOne = (
        await holder.query<{ id: string }>("insert into shop_orders(project_id,amount_xof) values($1,2000) returning id", [
          "44444444-4444-4444-8444-444444444444",
        ])
      ).rows[0]!.id;
      const orderTwo = (
        await holder.query<{ id: string }>("insert into shop_orders(project_id,amount_xof) values($1,2000) returning id", [
          "44444444-4444-4444-8444-444444444444",
        ])
      ).rows[0]!.id;

      await holder.query(
        "insert into shop_payment_ledger_events(project_id,order_id,rail,event_type) values($1,$2,'joko','paid'),($1,$3,'joko','paid')",
        ["44444444-4444-4444-8444-444444444444", orderOne, orderTwo],
      );
      await holder.query(
        "insert into shop_payment_ledger_events(project_id,order_id,rail,event_type) values($1,$2,'joko','checkout_started'),($1,$2,'joko','awaiting')",
        ["44444444-4444-4444-8444-444444444444", orderOne],
      );

      const paidCount = (
        await holder.query<{ count: number }>(
          "select count(*)::int as count from shop_payment_ledger_events where event_type='paid' and order_id=any($1::uuid[])",
          [[orderOne, orderTwo]],
        )
      ).rows[0]!.count;
      expect(paidCount).toBe(2); // one per order — index is per-order, not global
    } finally {
      holder.release();
    }
  }, 30000);
});
