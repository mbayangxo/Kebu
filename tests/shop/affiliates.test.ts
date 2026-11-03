/**
 * Real behavioral proof for affiliate-code attribution (lib/shop/affiliates.ts),
 * the Part 3 Shopify-parity gap: a code table distinct from discount codes,
 * real order attribution, and a merchant view aggregated from actual paid
 * orders — never a fabricated number. Also proves the deliberate difference
 * from discount codes: an unknown/inactive/typo'd affiliate code resolves to
 * null and never blocks checkout, since it never changes price.
 */
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  affiliateCodeInputSchema,
  normalizeAffiliateCode,
  resolveAffiliateCodeForAttribution,
  getAffiliateAttribution,
} from "@/lib/shop/affiliates";

type Row = Record<string, unknown>;

function makeMockSupabase(seed: Record<string, Row[]>) {
  const tables: Record<string, Row[]> = Object.fromEntries(
    Object.entries(seed).map(([k, v]) => [k, v.map((r) => ({ ...r }))]),
  );
  function builder(table: string) {
    let filtered: Row[] = [...(tables[table] ?? [])];
    let singleMode: "none" | "maybe" = "none";
    const api = {
      select(_cols?: string) {
        return api;
      },
      eq(col: string, val: unknown) {
        filtered = filtered.filter((r) => r[col] === val);
        return api;
      },
      not(col: string, _op: string, _val: unknown) {
        filtered = filtered.filter((r) => r[col] != null);
        return api;
      },
      order() {
        return api;
      },
      maybeSingle() {
        singleMode = "maybe";
        return api;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      then(resolve: any) {
        const result = singleMode === "maybe" ? filtered[0] ?? null : filtered;
        resolve({ data: result, error: null });
        return Promise.resolve();
      },
    };
    return api;
  }
  return { from: builder } as unknown as SupabaseClient;
}

describe("shop affiliate codes (real attribution, distinct from discount codes)", () => {
  it("normalizes codes the same way discount codes do", () => {
    expect(normalizeAffiliateCode(" marie 10 ")).toBe("MARIE10");
  });

  it("validates create input", () => {
    const ok = affiliateCodeInputSchema.safeParse({ code: "marie10", affiliateName: "Marie Diop", commissionPercent: 15 });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.code).toBe("MARIE10");
    const bad = affiliateCodeInputSchema.safeParse({ code: "!!", affiliateName: "" });
    expect(bad.success).toBe(false);
  });

  it("resolves a real, active code for attribution", async () => {
    const supabase = makeMockSupabase({
      shop_affiliate_codes: [{ project_id: "p1", code: "MARIE10", is_active: true }],
    });
    const resolved = await resolveAffiliateCodeForAttribution(supabase, "p1", "marie10");
    expect(resolved).toBe("MARIE10");
  });

  it("never blocks on an unknown code — returns null, not an error", async () => {
    const supabase = makeMockSupabase({ shop_affiliate_codes: [] });
    const resolved = await resolveAffiliateCodeForAttribution(supabase, "p1", "TYPO404");
    expect(resolved).toBeNull();
  });

  it("never blocks on an inactive code — returns null", async () => {
    const supabase = makeMockSupabase({
      shop_affiliate_codes: [{ project_id: "p1", code: "RETIRED", is_active: false }],
    });
    const resolved = await resolveAffiliateCodeForAttribution(supabase, "p1", "retired");
    expect(resolved).toBeNull();
  });

  it("aggregates real attributed orders/revenue per code, counting only paid orders toward revenue and commission", async () => {
    const supabase = makeMockSupabase({
      shop_affiliate_codes: [
        { project_id: "p1", code: "MARIE10", affiliate_name: "Marie Diop", commission_percent: 10, is_active: true, created_at: "2026-01-01" },
        { project_id: "p1", code: "KOFI5", affiliate_name: "Kofi Mensah", commission_percent: null, is_active: true, created_at: "2026-01-02" },
      ],
      shop_orders: [
        { project_id: "p1", affiliate_code: "MARIE10", amount_xof: 10000, payment_status: "paid" },
        { project_id: "p1", affiliate_code: "MARIE10", amount_xof: 5000, payment_status: "unpaid" }, // attributed but not paid — excluded from revenue
        { project_id: "p1", affiliate_code: "KOFI5", amount_xof: 2000, payment_status: "paid" },
        { project_id: "p1", affiliate_code: null, amount_xof: 9999, payment_status: "paid" }, // no code — excluded entirely
      ],
    });
    const result = await getAffiliateAttribution(supabase, "p1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const marie = result.items.find((i) => i.code === "MARIE10")!;
    expect(marie.orders).toBe(2); // both attributed orders count...
    expect(marie.revenuePaidXof).toBe(10000); // ...but only the paid one counts toward revenue
    expect(marie.commissionOwedXof).toBe(1000); // 10% of 10000 — bookkeeping only, never sent automatically

    const kofi = result.items.find((i) => i.code === "KOFI5")!;
    expect(kofi.orders).toBe(1);
    expect(kofi.revenuePaidXof).toBe(2000);
    expect(kofi.commissionOwedXof).toBeNull(); // no commission_percent set — nothing invented
  });
});
