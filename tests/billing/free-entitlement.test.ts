import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { freeHostingEntitlementInsert } from "@/lib/billing/subscriptions";

describe("free hosting entitlement", () => {
  it("builds an active Free ($0) insert that publish can use without JOKO", () => {
    const projectId = "11111111-2222-3333-4444-555555555555";
    const ownerId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const now = new Date("2026-09-03T12:00:00.000Z");
    const row = freeHostingEntitlementInsert(projectId, ownerId, now);

    expect(row).toMatchObject({
      project_id: projectId,
      owner_id: ownerId,
      status: "active",
      tier: "free",
      amount_usd_cents: 0,
      autopay_enabled: false,
      billing_interval: "monthly",
    });
    expect(String(row.period_end)).toContain("2036");
    expect(String(row.joko_reference)).toBe("kebu-free-11111111");
  });

  it("ships migration 038 allowing active free inserts under RLS", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/038_free_hosting_entitlement_rls.sql"),
      "utf8",
    );
    expect(sql).toContain("Owners insert site subscriptions");
    expect(sql).toContain("status = 'active'");
    expect(sql).toContain("amount_usd_cents = 0");
    expect(sql).toContain("coalesce(tier, 'free') = 'free'");
  });

  it("keeps Free publish safe in APPLY_ALL_PHASE_ONE and FIX_free_publish", () => {
    const phaseOne = readFileSync(
      join(process.cwd(), "supabase/migrations/APPLY_ALL_PHASE_ONE.sql"),
      "utf8",
    );
    const fix = readFileSync(
      join(process.cwd(), "supabase/migrations/FIX_free_publish.sql"),
      "utf8",
    );
    for (const sql of [phaseOne, fix]) {
      expect(sql).toContain("Owners insert site subscriptions");
      expect(sql).toContain("amount_usd_cents >= 0");
      expect(sql).toContain("coalesce(tier, 'free') = 'free'");
    }
    // Re-run must not leave pending-only as the sole insert policy without Free.
    expect(phaseOne).toContain('drop policy if exists "Owners insert pending site subscriptions"');
  });
});