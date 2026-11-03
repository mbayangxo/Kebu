/**
 * Behavioral proof for the real seller-earnings balance added to
 * lib/create/developer-payouts.ts (getDeveloperEarningsSummary +
 * requestDeveloperPayout's balance check).
 *
 * Before this, a developer could type any amountCents into
 * requestDeveloperPayout with no connection to what they'd actually sold —
 * the "balance" shown anywhere was zero real computation. This test proves
 * the balance is computed from real completed-sale rows (owned
 * aesthetic_library / creative_asset_library entries tied to the
 * developer's own listings, 80% seller share, pending/failed/other-
 * developer rows excluded) and that a payout request is rejected once it
 * would exceed that real balance — not just whatever the caller asks for.
 *
 * Uses a minimal in-memory fake of the supabase-js query-builder surface
 * this module actually calls (.from().select().eq().in().maybeSingle()/
 * .single()/.insert()) rather than a real Postgres/PostgREST stack, which
 * this sandbox cannot run (see tests/search/db/local-pg.ts's own note on
 * the same limitation). This proves the arithmetic and control flow in
 * developer-payouts.ts itself, not Postgres/RLS semantics — those are
 * covered separately by tests/studio/developer-payouts.local.test.ts.
 */
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDeveloperEarningsSummary, requestDeveloperPayout } from "@/lib/create/developer-payouts";

type Row = Record<string, unknown>;

function makeMockSupabase(seed: Record<string, Row[]>) {
  const tables: Record<string, Row[]> = Object.fromEntries(
    Object.entries(seed).map(([k, v]) => [k, v.map((r) => ({ ...r }))]),
  );

  function builder(table: string) {
    let filtered: Row[] = [...(tables[table] ?? [])];
    let singleMode: "none" | "maybe" | "single" = "none";
    let pendingInsert: Row | null = null;

    const api = {
      select(_cols?: string) {
        return api;
      },
      eq(col: string, val: unknown) {
        filtered = filtered.filter((r) => r[col] === val);
        return api;
      },
      in(col: string, vals: unknown[]) {
        filtered = filtered.filter((r) => vals.includes(r[col]));
        return api;
      },
      maybeSingle() {
        singleMode = "maybe";
        return api;
      },
      single() {
        singleMode = "single";
        return api;
      },
      insert(row: Row) {
        pendingInsert = row;
        return api;
      },
      update(_row: Row) {
        return api;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      then(resolve: any) {
        if (pendingInsert) {
          const created: Row = { id: `generated-${Math.random().toString(36).slice(2)}`, ...pendingInsert };
          tables[table] = [...(tables[table] ?? []), created];
          filtered = [created];
        }
        const result = singleMode === "maybe" ? filtered[0] ?? null : singleMode === "single" ? filtered[0] : filtered;
        resolve({ data: result, error: null });
        return Promise.resolve();
      },
    };
    return api;
  }

  return { from: builder } as unknown as SupabaseClient;
}

const USER = "user-1";

function seedFixture() {
  return {
    developer_profiles: [
      { id: "dev-1", user_id: USER, payout_method: "wave", payout_phone: "+221700000000", payout_account_name: "Dev One" },
    ],
    marketplace_templates: [
      { id: "t1", developer_id: "dev-1" },
      { id: "t-other", developer_id: "dev-other" },
    ],
    aesthetic_library: [
      { marketplace_id: "t1", status: "owned", amount_usd_cents: 500 },
      { marketplace_id: "t1", status: "owned", amount_usd_cents: 300 },
      { marketplace_id: "t1", status: "pending", amount_usd_cents: 1000 }, // not completed — excluded
      { marketplace_id: "t-other", status: "owned", amount_usd_cents: 9999 }, // another developer's sale — excluded
    ],
    marketplace_creative_assets: [{ id: "a1", developer_id: "dev-1" }],
    creative_asset_library: [{ asset_id: "a1", status: "owned", amount_cents: 200 }],
    developer_payouts: [
      { id: "p1", developer_id: "dev-1", amount_cents: 100, currency: "USD", status: "paid" },
      { id: "p2", developer_id: "dev-1", amount_cents: 9999, currency: "USD", status: "failed" }, // failed — not reserved
    ],
  };
}

describe("developer seller-earnings balance (real computation, not a typed-in number)", () => {
  it("computes gross sales, 80% seller share, already-claimed, and available from real completed-sale rows only", async () => {
    const supabase = makeMockSupabase(seedFixture());
    const result = await getDeveloperEarningsSummary(supabase, USER);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // gross = 500 + 300 (owned, this developer's template) + 200 (owned, this developer's asset) = 1000
    // pending (1000) and the other developer's sale (9999) are excluded.
    expect(result.summary.grossSalesUsdCents).toBe(1000);
    expect(result.summary.sellerShareUsdCents).toBe(800); // 80% of 1000
    expect(result.summary.claimedUsdCents).toBe(100); // only the 'paid' row; 'failed' excluded
    expect(result.summary.availableUsdCents).toBe(700); // 800 - 100
  });

  it("allows a payout request exactly at the available balance", async () => {
    const supabase = makeMockSupabase(seedFixture());
    const result = await requestDeveloperPayout(supabase, USER, { amountCents: 700, currency: "USD" });
    expect(result.ok).toBe(true);
  });

  it("rejects a payout request that exceeds the real available balance, even by a cent", async () => {
    const supabase = makeMockSupabase(seedFixture());
    const result = await requestDeveloperPayout(supabase, USER, { amountCents: 701, currency: "USD" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/\$7\.00/);
  });

  it("returns a zero balance for a developer with no completed sales", async () => {
    const fixture = seedFixture();
    fixture.aesthetic_library = fixture.aesthetic_library.filter((r) => r.marketplace_id !== "t1");
    fixture.creative_asset_library = [];
    const supabase = makeMockSupabase(fixture);
    const result = await getDeveloperEarningsSummary(supabase, USER);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary.availableUsdCents).toBe(0);
  });
});
