/**
 * Real PostgreSQL backends proving public.charge_board_click_cpc() (migration
 * 20261027020000_reach_board_click_cpc_atomic.sql) is actually atomic under
 * concurrent board_click events for the same campaign — the exact scenario
 * the old application-level read-then-write version of chargeBoardClickCpc
 * got wrong (see that migration's header for the failure mode). Requires a
 * real local Postgres; skipped automatically when LOCAL_PG_TEST_URL is unset.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
// @ts-expect-error — @types/pg is not a devDependency; pg itself is present
import { Pool } from "pg";

const LOCAL_URL = process.env.LOCAL_PG_TEST_URL;
const MIGRATION = readFileSync(
  join(__dirname, "../../supabase/migrations/20261027020000_reach_board_click_cpc_atomic.sql"),
  "utf8",
);

let adminPool: Pool | undefined;
let pool: Pool | undefined;
let dbName: string | undefined;
let ownerId: string;
let campaignId: string;

describe.skipIf(!LOCAL_URL)("charge_board_click_cpc — real concurrent Postgres backends", () => {
  beforeAll(async () => {
    dbName = `_kebu_reach_race_${randomUUID().replaceAll("-", "")}`;
    adminPool = new Pool({ connectionString: LOCAL_URL, max: 2 });
    await adminPool.query(`CREATE DATABASE "${dbName}"`);
    const url = new URL(LOCAL_URL!);
    url.pathname = `/${dbName}`;
    pool = new Pool({ connectionString: url.href, max: 6 });

    await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await pool.query(`CREATE SCHEMA IF NOT EXISTS auth`);
    await pool.query(`CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid())`);
    await pool.query(`
      CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
      LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
    `);
    await pool.query(`
      CREATE TABLE public.reach_campaigns (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        title text NOT NULL DEFAULT 'Test campaign',
        status text NOT NULL DEFAULT 'active',
        public_slug text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
        destination_url text NOT NULL DEFAULT 'https://example.com',
        board_enabled boolean NOT NULL DEFAULT true,
        bid_cpc_cauris numeric(12,2) NOT NULL DEFAULT 0,
        budget_cap_cauris numeric(12,2) NOT NULL DEFAULT 0,
        spent_cauris numeric(12,2) NOT NULL DEFAULT 0 CHECK (spent_cauris >= 0),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE TABLE public.reach_wallets (
        owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        balance_cauris numeric(12,2) NOT NULL DEFAULT 0 CHECK (balance_cauris >= 0),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE TABLE public.reach_wallet_ledger (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        amount_cauris numeric(12,2) NOT NULL,
        reason text NOT NULL,
        campaign_id uuid REFERENCES public.reach_campaigns(id) ON DELETE SET NULL,
        meta jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await pool.query(MIGRATION);

    const { rows } = await pool.query(`INSERT INTO auth.users DEFAULT VALUES RETURNING id`);
    ownerId = rows[0].id;
    await pool.query(`INSERT INTO public.reach_wallets (owner_id, balance_cauris) VALUES ($1, 1000)`, [ownerId]);
  }, 60000);

  afterAll(async () => {
    try {
      if (pool) await pool.end();
    } finally {
      if (adminPool) {
        await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
        await adminPool.end();
      }
    }
  });

  it("two concurrent board_click charges for a near-exhausted budget never exceed the cap or clobber each other", async () => {
    const { rows } = await pool!.query(
      `INSERT INTO public.reach_campaigns (owner_id, bid_cpc_cauris, budget_cap_cauris, spent_cauris)
       VALUES ($1, 10, 15, 0) RETURNING id`,
      [ownerId],
    );
    campaignId = rows[0].id;

    // Two concurrent bid-10 clicks against a budget cap of 15: the old
    // read-then-write code would let both succeed at the full bid (both
    // reading spent_cauris=0), overspending to 20/15. The atomic function
    // must serialize them: the first takes 10 (0->10), the second is capped
    // to the remaining 5 (10->15) — total charged must be exactly 15, split
    // either as [10,5] or [5,10] depending on arrival order, never [10,10].
    const charge = () =>
      pool!.query(`SELECT * FROM public.charge_board_click_cpc($1, $2, $3)`, [ownerId, campaignId, 10]);

    const [a, b] = await Promise.all([charge(), charge()]);
    const charged = [Number(a.rows[0].charged), Number(b.rows[0].charged)].sort((x, y) => x - y);
    expect(charged).toEqual([5, 10]);

    const campaign = await pool!.query(`SELECT spent_cauris FROM public.reach_campaigns WHERE id = $1`, [campaignId]);
    expect(Number(campaign.rows[0].spent_cauris)).toBe(15);

    const wallet = await pool!.query(`SELECT balance_cauris FROM public.reach_wallets WHERE owner_id = $1`, [ownerId]);
    expect(Number(wallet.rows[0].balance_cauris)).toBe(1000 - 15);

    const ledger = await pool!.query(
      `SELECT amount_cauris FROM public.reach_wallet_ledger WHERE campaign_id = $1 ORDER BY created_at`,
      [campaignId],
    );
    expect(
      ledger.rows
        .map((r: { amount_cauris: string }) => Number(r.amount_cauris))
        .sort((x: number, y: number) => x - y),
    ).toEqual([-10, -5]);
  }, 20000);

  it("a third click after the budget is exhausted charges nothing and leaves state untouched", async () => {
    const result = await pool!.query(`SELECT * FROM public.charge_board_click_cpc($1, $2, $3)`, [
      ownerId,
      campaignId,
      10,
    ]).catch((err: Error) => err);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toMatch(/budget_exhausted/);

    const campaign = await pool!.query(`SELECT spent_cauris FROM public.reach_campaigns WHERE id = $1`, [campaignId]);
    expect(Number(campaign.rows[0].spent_cauris)).toBe(15);
  }, 20000);

  it("insufficient wallet balance fails the whole charge, never partially decrementing", async () => {
    const { rows: userRows } = await pool!.query(`INSERT INTO auth.users DEFAULT VALUES RETURNING id`);
    const poorOwnerId = userRows[0].id;
    await pool!.query(`INSERT INTO public.reach_wallets (owner_id, balance_cauris) VALUES ($1, 2)`, [poorOwnerId]);
    const { rows: campRows } = await pool!.query(
      `INSERT INTO public.reach_campaigns (owner_id, bid_cpc_cauris, budget_cap_cauris, spent_cauris)
       VALUES ($1, 10, 100, 0) RETURNING id`,
      [poorOwnerId],
    );
    const poorCampaignId = campRows[0].id;

    const result = await pool!
      .query(`SELECT * FROM public.charge_board_click_cpc($1, $2, $3)`, [poorOwnerId, poorCampaignId, 10])
      .catch((err: Error) => err);
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toMatch(/insufficient_balance/);

    const wallet = await pool!.query(`SELECT balance_cauris FROM public.reach_wallets WHERE owner_id = $1`, [
      poorOwnerId,
    ]);
    expect(Number(wallet.rows[0].balance_cauris)).toBe(2);
    const campaign = await pool!.query(`SELECT spent_cauris FROM public.reach_campaigns WHERE id = $1`, [
      poorCampaignId,
    ]);
    expect(Number(campaign.rows[0].spent_cauris)).toBe(0);
  }, 20000);
});
