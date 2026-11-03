/**
 * Proves resolveShippingOptionForOrder — the one function the checkout path
 * calls to turn a client-sent id into a real price — never uses anything but
 * the row's own amount_xof, scoped to the project and to active=true. A
 * mismatched project or an inactive option yields null, which createCartOrder
 * treats as "no shipping charge", never "trust the client's number."
 */
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveShippingOptionForOrder } from "@/lib/shop/shipping-options";

type Row = Record<string, unknown>;

function makeMockSupabase(rows: Row[]) {
  function builder() {
    let filtered = [...rows];
    const api = {
      select(_cols?: string) {
        return api;
      },
      eq(col: string, val: unknown) {
        filtered = filtered.filter((r) => r[col] === val);
        return api;
      },
      maybeSingle() {
        return Promise.resolve({ data: filtered[0] ?? null, error: null });
      },
    };
    return api;
  }
  return { from: () => builder() } as unknown as SupabaseClient;
}

const projectA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const projectB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const optionId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("resolveShippingOptionForOrder", () => {
  it("returns the real row's amount for a valid id scoped to the right project", async () => {
    const supabase = makeMockSupabase([
      { id: optionId, project_id: projectA, label: "Dakar delivery", amount_xof: 1500, active: true },
    ]);
    const result = await resolveShippingOptionForOrder(supabase, projectA, optionId);
    expect(result).toEqual({ id: optionId, label: "Dakar delivery", amountXof: 1500 });
  });

  it("returns null when the option belongs to a different project — never falls back to trusting a client amount", async () => {
    const supabase = makeMockSupabase([
      { id: optionId, project_id: projectB, label: "Dakar delivery", amount_xof: 1500, active: true },
    ]);
    const result = await resolveShippingOptionForOrder(supabase, projectA, optionId);
    expect(result).toBeNull();
  });

  it("returns null for an option the seller has disabled", async () => {
    const supabase = makeMockSupabase([
      { id: optionId, project_id: projectA, label: "Dakar delivery", amount_xof: 1500, active: false },
    ]);
    const result = await resolveShippingOptionForOrder(supabase, projectA, optionId);
    expect(result).toBeNull();
  });

  it("returns null when no id is given — no shipping charge is ever invented", async () => {
    const supabase = makeMockSupabase([]);
    expect(await resolveShippingOptionForOrder(supabase, projectA, null)).toBeNull();
    expect(await resolveShippingOptionForOrder(supabase, projectA, undefined)).toBeNull();
  });
});
