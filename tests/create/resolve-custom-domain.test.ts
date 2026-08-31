import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMaybeSingle = vi.fn();
const mockProjectMaybeSingle = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "site_domains") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: (...args: unknown[]) => mockMaybeSingle(...args),
              }),
            }),
          }),
        };
      }
      if (table === "projects") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: (...args: unknown[]) => mockProjectMaybeSingle(...args),
            }),
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
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  });

  it("returns null without service credentials", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { resolveSubdomainForCustomHost } = await import("@/lib/create/resolve-custom-domain");
    expect(await resolveSubdomainForCustomHost("shop.example.com")).toBeNull();
  });

  it("maps verified hostname to project subdomain", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { hostname: "shop.example.com", project_id: "proj-1", status: "verified" },
      error: null,
    });
    mockProjectMaybeSingle.mockResolvedValue({ data: { subdomain: "my-shop" }, error: null });

    const { resolveSubdomainForCustomHost } = await import("@/lib/create/resolve-custom-domain");
    expect(await resolveSubdomainForCustomHost("www.shop.example.com")).toBe("my-shop");
  });

  it("returns null when domain is not verified", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { resolveSubdomainForCustomHost } = await import("@/lib/create/resolve-custom-domain");
    expect(await resolveSubdomainForCustomHost("unknown.com")).toBeNull();
  });
});
