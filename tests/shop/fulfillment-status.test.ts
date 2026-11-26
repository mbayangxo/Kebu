import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { transitionFulfillmentStatus } from "@/lib/shop/joko-fulfillment";
function db(status: string | null, updated: boolean = true) {
  const filters: [string, unknown][] = [];
  const write = vi.fn();
  let writing = false;
  const query = {
    select: () => query,
    eq: (key: string, value: unknown) => { if (writing) filters.push([key, value]); return query; },
    update: (patch: unknown) => { writing = true; write(patch); return query; },
    maybeSingle: async () => ({ data: writing ? (updated ? { id: "row" } : null) : (status ? { status } : null), error: null }),
  };
  return { admin: { from: () => query } as unknown as SupabaseClient, filters, write };
}
describe("admin fulfillment transition guards", () => {
  it("rejects backward transitions before writing", async () => {
    const fixture = db("delivered");
    expect((await transitionFulfillmentStatus(fixture.admin, { id: "row", status: "awaiting_pickup", updatedBy: null })).ok).toBe(false);
    expect(fixture.write).not.toHaveBeenCalled();
  });
  it("rejects skipping physical steps and reopening terminal outcomes", async () => {
    for (const current of ["awaiting_pickup", "cancelled", "returned", "failed_delivery"]) {
      const fixture = db(current);
      expect((await transitionFulfillmentStatus(fixture.admin, { id: "row", status: "delivered", updatedBy: null })).ok).toBe(false);
      expect(fixture.write).not.toHaveBeenCalled();
    }
  });
  it("advances with a condition on the previously observed status", async () => {
    const fixture = db("picked_up");
    expect(await transitionFulfillmentStatus(fixture.admin, { id: "row", status: "in_transit", updatedBy: null })).toEqual({ ok: true });
    expect(fixture.filters).toEqual([["id", "row"], ["status", "picked_up"]]);
  });
  it("reports a lost race instead of pretending the update happened", async () => {
    const fixture = db("picked_up", false);
    expect(await transitionFulfillmentStatus(fixture.admin, { id: "row", status: "in_transit", updatedBy: null })).toMatchObject({ ok: false, error: expect.stringContaining("changed") });
  });
  it("does not report success for a nonexistent order", async () => {
    expect(await transitionFulfillmentStatus(db(null).admin, { id: "missing", status: "picked_up", updatedBy: null })).toMatchObject({ ok: false });
  });
  it("permits an idempotent retry without resetting the row", async () => {
    const fixture = db("delivered");
    expect(await transitionFulfillmentStatus(fixture.admin, { id: "row", status: "delivered", updatedBy: null })).toEqual({ ok: true });
    expect(fixture.write).not.toHaveBeenCalled();
  });
  it("preserves the existing admin return and cancellation actions", async () => {
    expect((await transitionFulfillmentStatus(db("delivered").admin, { id: "row", status: "returned", updatedBy: null })).ok).toBe(true);
    expect((await transitionFulfillmentStatus(db("in_transit").admin, { id: "row", status: "failed_delivery", updatedBy: null })).ok).toBe(true);
    expect((await transitionFulfillmentStatus(db("delivered").admin, { id: "row", status: "cancelled", updatedBy: null })).ok).toBe(true);
  });
});
