import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const verifyDomainPointsToKebu = vi.fn();

vi.mock("@/lib/create/auth", () => ({
  requireUser: (...args: unknown[]) => requireUser(...args),
  logCreate: vi.fn(),
}));

vi.mock("@/lib/api-guard", () => ({
  builderRateLimit: () => null,
}));

vi.mock("@/lib/create/custom-domains", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/create/custom-domains")>();
  return {
    ...actual,
    verifyDomainPointsToKebu: (...args: unknown[]) => verifyDomainPointsToKebu(...args),
  };
});

import {
  DELETE as deleteDomain,
  GET as getDomains,
  POST as postDomain,
} from "@/app/api/projects/[id]/domains/route";
import { POST as verifyDomain } from "@/app/api/projects/[id]/domains/[domainId]/verify/route";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_PROJECT = "22222222-2222-4222-8222-222222222222";
const DOMAIN_ID = "33333333-3333-4333-8333-333333333333";
const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function authError(status = 401) {
  return {
    error: new Response(JSON.stringify({ error: "Sign in required." }), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  };
}

type DomainRow = {
  id: string;
  project_id: string;
  hostname: string;
  status: string;
  verified: boolean;
  is_primary: boolean;
  dns_target: string | null;
};

function mockSupabaseForDomains(options: {
  ownerId?: string;
  subdomain?: string | null;
  domains?: DomainRow[];
  taken?: { id: string; project_id: string } | null;
  insertResult?: DomainRow;
  updateResult?: DomainRow;
}) {
  const domains = [...(options.domains ?? [])];
  const ownerId = options.ownerId ?? USER_A;
  const subdomain = "subdomain" in options ? options.subdomain : "my-brand";

  return {
    from(table: string) {
      if (table === "projects") {
        return {
          select: () => ({
            eq: (_col: string, id: string) => ({
              eq: (_col2: string, uid: string) => ({
                maybeSingle: async () => {
                  if (uid !== ownerId || id !== PROJECT_ID) return { data: null };
                  return {
                    data: { id: PROJECT_ID, owner_id: ownerId, subdomain },
                  };
                },
              }),
            }),
          }),
        };
      }

      if (table === "site_domains") {
        return {
          select: (_cols?: string) => {
            const chain = {
              eq: (col: string, val: string) => {
                if (col === "hostname") {
                  return {
                    maybeSingle: async () => ({
                      data: options.taken && options.taken.project_id !== PROJECT_ID ? options.taken : options.taken ?? null,
                    }),
                    eq: (_col2: string, pid: string) => ({
                      maybeSingle: async () => {
                        const row = domains.find((d) => d.id === val && d.project_id === pid);
                        return { data: row ?? null };
                      },
                    }),
                  };
                }
                if (col === "project_id") {
                  return {
                    order: async () => ({ data: domains.filter((d) => d.project_id === val), error: null }),
                  };
                }
                if (col === "id") {
                  return {
                    eq: (_col2: string, pid: string) => ({
                      maybeSingle: async () => {
                        const row = domains.find((d) => d.id === val && d.project_id === pid);
                        return { data: row ?? null };
                      },
                    }),
                  };
                }
                return chain;
              },
              order: () => ({
                // GET list
                then: undefined,
              }),
            };
            return {
              eq: (col: string, val: string) => {
                if (col === "project_id") {
                  return {
                    order: () => ({
                      // vitest doesn't await order - make order return promise-like
                    }),
                  };
                }
                return chain.eq(col, val);
              },
            };
          },
          insert: (row: DomainRow) => ({
            select: () => ({
              single: async () => ({
                data: options.insertResult ?? { ...row, id: DOMAIN_ID, status: "pending", verified: false },
                error: null,
              }),
            }),
          }),
          update: (patch: Partial<DomainRow>) => ({
            eq: (col: string, val: string) => {
              if (col === "project_id") {
                return Promise.resolve({ error: null });
              }
              return {
                select: () => ({
                  single: async () => ({
                    data: options.updateResult ?? {
                      id: val,
                      project_id: PROJECT_ID,
                      hostname: "mybrand.com",
                      status: patch.status ?? "pending",
                      verified: patch.verified ?? false,
                      is_primary: true,
                      dns_target: "my-brand.kebu.africa",
                      ...patch,
                    },
                    error: null,
                  }),
                }),
              };
            },
          }),
          delete: () => ({
            eq: (_col: string, _val: string) => ({
              eq: async () => ({ error: null }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };
}

/** Simpler list mock for GET */
function mockSupabaseGet(domains: DomainRow[], subdomain = "my-brand") {
  return {
    from(table: string) {
      if (table === "projects") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: PROJECT_ID, owner_id: USER_A, subdomain },
                }),
              }),
            }),
          }),
        };
      }
      if (table === "site_domains") {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: domains, error: null }),
            }),
          }),
        };
      }
      return mockSupabaseForDomains({ domains, subdomain }).from(table);
    },
  };
}

describe("Custom domains API", () => {
  beforeEach(() => {
    requireUser.mockReset();
    verifyDomainPointsToKebu.mockReset();
  });

  it("GET rejects logged-out users", async () => {
    requireUser.mockResolvedValue(authError());
    const res = await getDomains(new Request("http://localhost"), {
      params: Promise.resolve({ id: PROJECT_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("GET returns domains for project owner", async () => {
    requireUser.mockResolvedValue({
      user: { id: USER_A },
      supabase: mockSupabaseGet([
        {
          id: DOMAIN_ID,
          project_id: PROJECT_ID,
          hostname: "mybrand.com",
          status: "pending",
          verified: false,
          is_primary: true,
          dns_target: "my-brand.kebu.africa",
        },
      ]),
    });
    const res = await getDomains(new Request("http://localhost"), {
      params: Promise.resolve({ id: PROJECT_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.domains).toHaveLength(1);
    expect(body.instructions?.dnsTarget).toBe("my-brand.kebu.africa");
  });

  it("POST rejects without subdomain on project", async () => {
    requireUser.mockResolvedValue({
      user: { id: USER_A },
      supabase: mockSupabaseForDomains({ subdomain: null }),
    });
    const res = await postDomain(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname: "mybrand.com" }),
      }),
      { params: Promise.resolve({ id: PROJECT_ID }) },
    );
    expect(res.status).toBe(400);
  });

  it("POST rejects invalid hostname", async () => {
    requireUser.mockResolvedValue({
      user: { id: USER_A },
      supabase: mockSupabaseForDomains({}),
    });
    const res = await postDomain(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname: "bad kebu.africa" }),
      }),
      { params: Promise.resolve({ id: PROJECT_ID }) },
    );
    expect(res.status).toBe(400);
  });

  it("POST rejects domain owned by another project", async () => {
    requireUser.mockResolvedValue({
      user: { id: USER_A },
      supabase: mockSupabaseForDomains({
        taken: { id: "other", project_id: OTHER_PROJECT },
      }),
    });
    const res = await postDomain(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname: "taken.com" }),
      }),
      { params: Promise.resolve({ id: PROJECT_ID }) },
    );
    expect(res.status).toBe(409);
  });

  it("POST creates domain with DNS target", async () => {
    requireUser.mockResolvedValue({
      user: { id: USER_A },
      supabase: mockSupabaseForDomains({ taken: null }),
    });
    const res = await postDomain(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname: "mybrand.com" }),
      }),
      { params: Promise.resolve({ id: PROJECT_ID }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.domain.hostname).toBe("mybrand.com");
    expect(body.instructions.dnsTarget).toBe("my-brand.kebu.africa");
  });

  it("DELETE rejects logged-out users", async () => {
    requireUser.mockResolvedValue(authError());
    const res = await deleteDomain(
      new Request("http://localhost", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId: DOMAIN_ID }),
      }),
      { params: Promise.resolve({ id: PROJECT_ID }) },
    );
    expect(res.status).toBe(401);
  });

  it("verify returns 404 when domain not on project", async () => {
    requireUser.mockResolvedValue({
      user: { id: USER_A },
      supabase: {
        from(table: string) {
          if (table === "projects") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: { id: PROJECT_ID, owner_id: USER_A, subdomain: "my-brand" },
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "site_domains") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: null }),
                  }),
                }),
              }),
            };
          }
          throw new Error(table);
        },
      },
    });
    const res = await verifyDomain(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: PROJECT_ID, domainId: DOMAIN_ID }),
    });
    expect(res.status).toBe(404);
  });

  it("verify updates status when DNS matches", async () => {
    verifyDomainPointsToKebu.mockResolvedValue({ ok: true, detail: "CNAME ok" });
    requireUser.mockResolvedValue({
      user: { id: USER_A },
      supabase: {
        from(table: string) {
          if (table === "projects") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: { id: PROJECT_ID, owner_id: USER_A, subdomain: "my-brand" },
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === "site_domains") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: {
                        id: DOMAIN_ID,
                        hostname: "mybrand.com",
                        dns_target: "my-brand.kebu.africa",
                        project_id: PROJECT_ID,
                      },
                    }),
                  }),
                }),
              }),
              update: () => ({
                eq: () => ({
                  select: () => ({
                    single: async () => ({
                      data: {
                        id: DOMAIN_ID,
                        hostname: "mybrand.com",
                        status: "verified",
                        verified: true,
                        is_primary: true,
                        dns_target: "my-brand.kebu.africa",
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          throw new Error(table);
        },
      },
    });
    const res = await verifyDomain(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: PROJECT_ID, domainId: DOMAIN_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.liveUrl).toBe("https://www.mybrand.com");
  });
});
