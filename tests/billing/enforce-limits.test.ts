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
        if (table === "projects") {
          // Not every shop project is linked to a Kebu ID business — the
          // plain tier-based cap applies unchanged when it isn't.
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
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

  it("caps products below verification level 2 even on a plan that allows far more", async () => {
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
                            data: { tier: "business", status: "active", period_end: new Date(Date.now() + 86400000).toISOString() },
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
          return { select: () => ({ eq: () => ({ count: 3, error: null }) }) };
        }
        if (table === "projects") {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { business_id: "biz-1" } }) }) }) };
        }
        if (table === "businesses") {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { verification_level: 1 } }) }) }) };
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
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("verification level 2");
    }
  });

  it("does not cap below the informal soft-limit once verification level 2 is reached", async () => {
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
                            data: { tier: "business", status: "active", period_end: new Date(Date.now() + 86400000).toISOString() },
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
          return { select: () => ({ eq: () => ({ count: 50, error: null }) }) };
        }
        if (table === "projects") {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { business_id: "biz-1" } }) }) }) };
        }
        if (table === "businesses") {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { verification_level: 2 } }) }) }) };
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
