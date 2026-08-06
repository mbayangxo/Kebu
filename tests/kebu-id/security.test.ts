import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const createRegisteredBusiness = vi.fn();
const recalculateAndStoreReadiness = vi.fn();

vi.mock("@/lib/create/auth", () => ({
  requireUser: (...args: unknown[]) => requireUser(...args),
  logCreate: vi.fn(),
}));

vi.mock("@/lib/kebu-id/create-registration", () => ({
  createRegisteredBusiness: (...args: unknown[]) => createRegisteredBusiness(...args),
  recalculateAndStoreReadiness: (...args: unknown[]) => recalculateAndStoreReadiness(...args),
}));

import { GET as getPublic } from "@/app/api/public/kebu-id/[kebuId]/route";
import { GET as getBusiness, POST as postBusiness } from "@/app/api/businesses/route";
import { GET as getBusinessById, PATCH as patchBusiness } from "@/app/api/businesses/[id]/route";
import { POST as postReadiness } from "@/app/api/businesses/[id]/readiness/route";

function jsonResponse(error: string, status: number) {
  return {
    error: new Response(JSON.stringify({ error }), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  };
}

const validBody = {
  legalName: "Atelier Baobab",
  countryCode: "SN",
  region: "Dakar",
  category: "fashion",
  description: "Handmade clothing workshop in Dakar for local markets.",
  businessEmail: "hello@baobab.sn",
  businessPhone: "+221770000000",
  legalStructure: "sarl",
  founderName: "Awa Diop",
  founderEmail: "awa@baobab.sn",
  ownershipPercent: 100,
};

describe("Business registration security contracts", () => {
  beforeEach(() => {
    requireUser.mockReset();
    createRegisteredBusiness.mockReset();
    recalculateAndStoreReadiness.mockReset();
  });

  it("rejects logged-out create", async () => {
    requireUser.mockResolvedValue(jsonResponse("Sign in required.", 401));
    const res = await postBusiness(
      new Request("http://localhost/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": "test-key-abcdefgh" },
        body: JSON.stringify(validBody),
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

  it("rejects browser-submitted score values on create", async () => {
    requireUser.mockResolvedValue({ user: { id: "user-a" }, supabase: {} });
    const res = await postBusiness(
      new Request("http://localhost/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": "test-key-abcdefgh" },
        body: JSON.stringify({ ...validBody, scoreValue: 99 }),
      })
    );
    expect(res.status).toBe(400);
    expect(createRegisteredBusiness).not.toHaveBeenCalled();
  });

  it("rejects client score fields on readiness recalculation", async () => {
    requireUser.mockResolvedValue({
      user: { id: "user-a" },
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { role: "founder", status: "active" } }),
                }),
              }),
            }),
          }),
        }),
      },
    });
    const res = await postReadiness(
      new Request("http://localhost/api/businesses/x/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoreValue: 100 }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) }
    );
    expect(res.status).toBe(400);
    expect(recalculateAndStoreReadiness).not.toHaveBeenCalled();
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

  it("creates via server registration service", async () => {
    const business = {
      id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      public_kebu_id: "KEBU-SN-01-ABCDEF",
      legal_name: "Atelier Baobab",
      registration_status: "preparing",
    };
    requireUser.mockResolvedValue({ user: { id: "user-a" }, supabase: { tag: "sb" } });
    createRegisteredBusiness.mockResolvedValue({ ok: true, business, idempotent: false });

    const res = await postBusiness(
      new Request("http://localhost/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": "idem-key-unique-01" },
        body: JSON.stringify(validBody),
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.business.id).toBe(business.id);
    expect(createRegisteredBusiness).toHaveBeenCalledOnce();
  });

  it("replays idempotent create without calling duplicate semantics as failure", async () => {
    const business = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", public_kebu_id: "KEBU-SN-01-ZZZZZZ" };
    requireUser.mockResolvedValue({ user: { id: "user-a" }, supabase: {} });
    createRegisteredBusiness.mockResolvedValue({ ok: true, business, idempotent: true });

    const res = await postBusiness(
      new Request("http://localhost/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": "same-idempotency-key" },
        body: JSON.stringify(validBody),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.idempotent).toBe(true);
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
  });

  it("rejects non-founder PATCH as not found", async () => {
    const from = vi.fn(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { role: "viewer", status: "active" } }),
            }),
          }),
        }),
      }),
    }));
    requireUser.mockResolvedValue({ user: { id: "user-a" }, supabase: { from } });
    const res = await patchBusiness(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Updated description that is long enough." }),
      }),
      { params: Promise.resolve({ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" }) }
    );
    expect(res.status).toBe(404);
  });
});
