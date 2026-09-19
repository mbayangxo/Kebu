import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMaybeSingle = vi.fn();
const domainEq = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table !== "site_domains") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: (column: string, value: unknown) => {
            domainEq(column, value);
            return {
              eq: (nextColumn: string, nextValue: unknown) => {
                domainEq(nextColumn, nextValue);
                return { maybeSingle: (...args: unknown[]) => mockMaybeSingle(...args) };
              },
            };
          },
        }),
      };
    },
  }),
}));

describe("resolveSubdomainForCustomHost", () => {
  beforeEach(() => {
    vi.resetModules();
    mockMaybeSingle.mockReset();
    domainEq.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  });

  it("returns null without service credentials", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { resolveSubdomainForCustomHost } = await import("@/lib/create/resolve-custom-domain");
    expect(await resolveSubdomainForCustomHost("shop.example.com")).toBeNull();
    expect(domainEq).not.toHaveBeenCalled();
  });

  it("does not query the database for localhost", async () => {
    const { resolveSubdomainForCustomHost } = await import("@/lib/create/resolve-custom-domain");
    expect(await resolveSubdomainForCustomHost("localhost:3000")).toBeNull();
    expect(domainEq).not.toHaveBeenCalled();
  });

  it("maps a verified hostname using one joined database lookup", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { hostname: "shop.example.com", status: "verified", projects: { subdomain: "my-shop" } },
      error: null,
    });
    const { resolveSubdomainForCustomHost } = await import("@/lib/create/resolve-custom-domain");
    expect(await resolveSubdomainForCustomHost("WWW.SHOP.EXAMPLE.COM:443")).toBe("my-shop");
    expect(domainEq).toHaveBeenNthCalledWith(1, "hostname", "shop.example.com");
    expect(domainEq).toHaveBeenNthCalledWith(2, "status", "verified");
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1);
  });

  it("caches successful lookups on the hot path", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { hostname: "shop.example.com", status: "verified", projects: { subdomain: "my-shop" } },
      error: null,
    });
    const { resolveSubdomainForCustomHost } = await import("@/lib/create/resolve-custom-domain");
    expect(await resolveSubdomainForCustomHost("shop.example.com")).toBe("my-shop");
    expect(await resolveSubdomainForCustomHost("shop.example.com")).toBe("my-shop");
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1);
  });

  it("negative-caches unknown hosts and fails closed", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { resolveSubdomainForCustomHost } = await import("@/lib/create/resolve-custom-domain");
    expect(await resolveSubdomainForCustomHost("unknown.com")).toBeNull();
    expect(await resolveSubdomainForCustomHost("unknown.com")).toBeNull();
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1);
  });

  it("can invalidate a hostname after domain lifecycle changes", async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { hostname: "shop.example.com", status: "verified", projects: { subdomain: "my-shop" } },
        error: null,
      });
    const { resolveSubdomainForCustomHost, invalidateCustomDomainCache } = await import("@/lib/create/resolve-custom-domain");
    expect(await resolveSubdomainForCustomHost("shop.example.com")).toBeNull();
    invalidateCustomDomainCache("shop.example.com");
    expect(await resolveSubdomainForCustomHost("shop.example.com")).toBe("my-shop");
    expect(mockMaybeSingle).toHaveBeenCalledTimes(2);
  });
});
