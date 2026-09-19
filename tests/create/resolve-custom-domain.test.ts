import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMaybeSingle = vi.fn();
const mockProjectMaybeSingle = vi.fn();
const domainEq = vi.fn();
const projectEq = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "site_domains") {
        return {
          select: () => ({
            eq: (column: string, value: unknown) => {
              domainEq(column, value);
              return {
                eq: (nextColumn: string, nextValue: unknown) => {
                  domainEq(nextColumn, nextValue);
                  return {
                    maybeSingle: (...args: unknown[]) => mockMaybeSingle(...args),
                  };
                },
              };
            },
          }),
        };
      }
      if (table === "projects") {
        return {
          select: () => ({
            eq: (column: string, value: unknown) => {
              projectEq(column, value);
              return {
                maybeSingle: (...args: unknown[]) => mockProjectMaybeSingle(...args),
              };
            },
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

describe("resolveSubdomainForCustomHost", () => {
  beforeEach(() => {
    vi.resetModules();
    mockMaybeSingle.mockReset();
    mockProjectMaybeSingle.mockReset();
    domainEq.mockReset();
    projectEq.mockReset();
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

  it("maps only a verified hostname to its project subdomain", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { hostname: "shop.example.com", project_id: "proj-1", status: "verified" },
      error: null,
    });
    mockProjectMaybeSingle.mockResolvedValue({ data: { subdomain: "my-shop" }, error: null });

    const { resolveSubdomainForCustomHost } = await import("@/lib/create/resolve-custom-domain");
    expect(await resolveSubdomainForCustomHost("WWW.SHOP.EXAMPLE.COM:443")).toBe("my-shop");

    expect(domainEq).toHaveBeenNthCalledWith(1, "hostname", "shop.example.com");
    expect(domainEq).toHaveBeenNthCalledWith(2, "status", "verified");
    expect(projectEq).toHaveBeenCalledWith("id", "proj-1");
  });

  it("returns null when the domain registry has no verified match", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { resolveSubdomainForCustomHost } = await import("@/lib/create/resolve-custom-domain");

    expect(await resolveSubdomainForCustomHost("unknown.com")).toBeNull();
    expect(mockProjectMaybeSingle).not.toHaveBeenCalled();
  });

  it("fails closed when domain lookup errors", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "lookup failed" } });
    const { resolveSubdomainForCustomHost } = await import("@/lib/create/resolve-custom-domain");

    expect(await resolveSubdomainForCustomHost("shop.example.com")).toBeNull();
    expect(mockProjectMaybeSingle).not.toHaveBeenCalled();
  });

  it("fails closed when the mapped project has no usable subdomain", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { hostname: "shop.example.com", project_id: "proj-1", status: "verified" },
      error: null,
    });
    mockProjectMaybeSingle.mockResolvedValue({ data: { subdomain: null }, error: null });

    const { resolveSubdomainForCustomHost } = await import("@/lib/create/resolve-custom-domain");
    expect(await resolveSubdomainForCustomHost("shop.example.com")).toBeNull();
  });
});
