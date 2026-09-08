import { describe, expect, it, vi, beforeEach } from "vitest";
import { assertProjectPlanLimit } from "@/lib/billing/enforce-limits";

describe("enforce-limits (C2)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks custom domain on free tier", async () => {
    const supabase = {
      from(table: string) {
        if (table === "site_subscriptions") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    gt: () => ({
                      order: () => ({
                        limit: () => ({
                          maybeSingle: async () => ({ data: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      },
    };

    const result = await assertProjectPlanLimit(
      supabase as never,
      "11111111-1111-4111-8111-111111111111",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "customDomain",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Starter");
    }
  });

  it("allows store products on shop tier under cap", async () => {
    const supabase = {
      from(table: string) {
        if (table === "site_subscriptions") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    gt: () => ({
                      order: () => ({
                        limit: () => ({
                          maybeSingle: async () => ({
                            data: {
                              tier: "shop",
                              status: "active",
                              period_end: new Date(Date.now() + 86400000).toISOString(),
                            },
                          }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "project_products") {
          return {
            select: () => ({
              eq: () => ({ count: 5, error: null }),
            }),
          };
        }
        return {};
      },
    };

    const result = await assertProjectPlanLimit(
      supabase as never,
      "11111111-1111-4111-8111-111111111111",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "maxProducts",
    );
    expect(result.ok).toBe(true);
  });
});
