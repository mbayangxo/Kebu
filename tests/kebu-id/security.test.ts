import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();

vi.mock("@/lib/create/auth", () => ({
  requireUser: (...args: unknown[]) => requireUser(...args),
  logCreate: vi.fn(),
}));

import { GET as getPublic } from "@/app/api/public/kebu-id/[kebuId]/route";
import { GET as getBusiness, POST as postBusiness } from "@/app/api/businesses/route";
import { GET as getBusinessById } from "@/app/api/businesses/[id]/route";

function jsonResponse(error: string, status: number) {
  return {
    error: new Response(JSON.stringify({ error }), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  };
}

describe("Kebu ID Slice 1 security contracts", () => {
  beforeEach(() => {
    requireUser.mockReset();
  });

  it("rejects logged-out create", async () => {
    requireUser.mockResolvedValue(jsonResponse("Sign in required.", 401));
    const res = await postBusiness(
      new Request("http://localhost/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": "test-key-abcdefgh" },
        body: JSON.stringify({
          legalName: "Test",
          countryCode: "SN",
          category: "services",
          description: "Desc",
        }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("rejects logged-out business list", async () => {
    requireUser.mockResolvedValue(jsonResponse("Sign in required.", 401));
    const res = await getBusiness();
    expect(res.status).toBe(401);
  });

  it("rejects logged-out business dashboard fetch", async () => {
    requireUser.mockResolvedValue(jsonResponse("Sign in required.", 401));
    const res = await getBusinessById(new Request("http://localhost"), {
      params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }),
    });
    expect(res.status).toBe(401);
  });

  it("public Kebu ID never returns private draft records", async () => {
    const res = await getPublic(new Request("http://localhost"), {
      params: Promise.resolve({ kebuId: "KEBU-SN-01-A7K92P" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).not.toHaveProperty("business");
    expect(body).not.toHaveProperty("legal_name");
  });

  it("invalid public Kebu ID format is 400", async () => {
    const res = await getPublic(new Request("http://localhost"), {
      params: Promise.resolve({ kebuId: "SEQUENTIAL-1" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("Kebu ID create flow (mocked supabase)", () => {
  beforeEach(() => {
    requireUser.mockReset();
  });

  it("creates business + founder + audit and returns 201", async () => {
    const business = {
      id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      public_kebu_id: "KEBU-SN-01-ABCDEF",
      legal_name: "Atelier Baobab",
      trading_name: null,
      country_code: "SN",
      category: "fashion",
      description: "Handmade clothing",
      lifecycle_status: "draft",
      verification_level: 1,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    const from = vi.fn((table: string) => {
      if (table === "business_create_idempotency") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null }),
              }),
            }),
          }),
          insert: async () => ({ error: null }),
        };
      }
      if (table === "businesses") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: business, error: null }),
            }),
          }),
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: business }),
            }),
          }),
          delete: () => ({ eq: async () => ({ error: null }) }),
        };
      }
      if (table === "business_members") {
        return { insert: async () => ({ error: null }) };
      }
      if (table === "business_audit_logs") {
        return { insert: async () => ({ error: null }) };
      }
      throw new Error(`unexpected table ${table}`);
    });

    requireUser.mockResolvedValue({
      user: { id: "user-a" },
      supabase: { from },
    });

    const res = await postBusiness(
      new Request("http://localhost/api/businesses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "idem-key-unique-01",
        },
        body: JSON.stringify({
          legalName: "Atelier Baobab",
          countryCode: "SN",
          category: "fashion",
          description: "Handmade clothing",
        }),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.business.id).toBe(business.id);
    expect(body.idempotent).toBe(false);
    expect(from).toHaveBeenCalledWith("business_members");
    expect(from).toHaveBeenCalledWith("business_audit_logs");
  });

  it("replays same idempotency key without creating another business", async () => {
    const business = {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      public_kebu_id: "KEBU-NG-01-ZZZZZZ",
      legal_name: "Lagos Goods",
      trading_name: null,
      country_code: "NG",
      category: "retail",
      description: "Retail shop",
      lifecycle_status: "draft",
      verification_level: 1,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    let businessInserts = 0;
    const from = vi.fn((table: string) => {
      if (table === "business_create_idempotency") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { business_id: business.id } }),
              }),
            }),
          }),
        };
      }
      if (table === "businesses") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: business }),
            }),
          }),
          insert: () => {
            businessInserts += 1;
            return {
              select: () => ({
                single: async () => ({ data: business, error: null }),
              }),
            };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    requireUser.mockResolvedValue({
      user: { id: "user-a" },
      supabase: { from },
    });

    const req = () =>
      postBusiness(
        new Request("http://localhost/api/businesses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": "same-idempotency-key",
          },
          body: JSON.stringify({
            legalName: "Lagos Goods",
            countryCode: "NG",
            category: "retail",
            description: "Retail shop",
          }),
        })
      );

    const first = await req();
    const second = await req();
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(businessInserts).toBe(0);
    const a = await first.json();
    const b = await second.json();
    expect(a.business.id).toBe(b.business.id);
    expect(a.idempotent).toBe(true);
  });

  it("returns 404 when another user is not a member", async () => {
    const from = vi.fn((table: string) => {
      if (table === "business_members") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    requireUser.mockResolvedValue({
      user: { id: "user-b" },
      supabase: { from },
    });

    const res = await getBusinessById(new Request("http://localhost"), {
      params: Promise.resolve({ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Business not found.");
  });
});
