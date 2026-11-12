import { beforeEach, describe, expect, it, vi } from "vitest";

const maybeSingle = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => maybeSingle(),
        }),
      }),
    }),
  }),
}));
vi.mock("@/lib/api-guard", () => ({ publicSiteRateLimit: () => null }));

import { GET } from "@/app/api/public/businesses/[id]/route";

function mkReq(url: string) {
  return new Request(url) as unknown as Request;
}

const VALID_ID = "11111111-1111-4111-8111-111111111111";

describe("public business detail route", () => {
  beforeEach(() => {
    maybeSingle.mockReset();
  });

  it("rejects malformed ids before touching the database", async () => {
    const res = await GET(mkReq("http://localhost"), { params: Promise.resolve({ id: "not-a-uuid" }) });
    expect(res.status).toBe(404);
    expect(maybeSingle).not.toHaveBeenCalled();
  });

  it("never returns a draft business record", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: VALID_ID,
        public_kebu_id: "KEBU-SN-01-ABCDEF",
        legal_name: "Private Draft Co",
        trading_name: null,
        country_code: "SN",
        region: null,
        category: "fashion",
        description: "Still a draft.",
        website: null,
        verification_level: 0,
        lifecycle_status: "draft",
        updated_at: "2026-10-01T00:00:00Z",
      },
    });
    const res = await GET(mkReq("http://localhost"), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).not.toHaveProperty("business");
  });

  it("never reports a real database error as 'not found' — that would mislead visitors", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: "fetch failed" } });
    const res = await GET(mkReq("http://localhost"), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).not.toMatch(/not found/i);
  });

  it("never renders a non-http(s) website as a clickable link, even if one is already stored", async () => {
    // Defense in depth: the write paths now reject javascript:/data:/etc URLs, but
    // this re-checks at the one place that value is ever handed to a stranger as a
    // raw href, in case a bad value was written before that fix, or by a path this
    // route doesn't control.
    maybeSingle.mockResolvedValue({
      data: {
        id: VALID_ID,
        public_kebu_id: "KEBU-SN-01-ABCDEF",
        legal_name: "Atelier Baobab SARL",
        trading_name: "Atelier Baobab",
        country_code: "SN",
        region: "Dakar",
        category: "fashion",
        description: "Handmade clothing workshop.",
        website: "javascript:alert(document.cookie)",
        verification_level: 1,
        lifecycle_status: "active",
        updated_at: "2026-10-01T00:00:00Z",
      },
    });
    const res = await GET(mkReq("http://localhost"), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.business.website).toBeNull();
  });

  it("returns a minimal public card for an active business, withholding contact details", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: VALID_ID,
        public_kebu_id: "KEBU-SN-01-ABCDEF",
        legal_name: "Atelier Baobab SARL",
        trading_name: "Atelier Baobab",
        country_code: "SN",
        region: "Dakar",
        category: "fashion",
        description: "Handmade clothing workshop.",
        website: "https://baobab.example",
        verification_level: 2,
        lifecycle_status: "active",
        updated_at: "2026-10-01T00:00:00Z",
      },
    });
    const res = await GET(mkReq("http://localhost"), { params: Promise.resolve({ id: VALID_ID }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.business.name).toBe("Atelier Baobab");
    expect(body.business.verified).toBe(true);
    expect(body.business).not.toHaveProperty("business_email");
    expect(body.business).not.toHaveProperty("business_phone");
    expect(body.business).not.toHaveProperty("email");
    expect(body.business).not.toHaveProperty("phone");
  });
});
