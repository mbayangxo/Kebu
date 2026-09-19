import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requireUser = vi.fn();
const builderRateLimit = vi.fn();
const loadAfricanOpportunityEntitlement = vi.fn();
const hasVerifiedAfricanOpportunityAccess = vi.fn();

vi.mock("@/lib/create/auth", () => ({
  requireUser: (...args: unknown[]) => requireUser(...args),
}));

vi.mock("@/lib/entitlements/african-opportunity-access", () => ({
  loadAfricanOpportunityEntitlement: (...args: unknown[]) => loadAfricanOpportunityEntitlement(...args),
  hasVerifiedAfricanOpportunityAccess: (...args: unknown[]) => hasVerifiedAfricanOpportunityAccess(...args),
}));

vi.mock("@/lib/api-guard", () => ({
  builderRateLimit: (...args: unknown[]) => builderRateLimit(...args),
}));

import { GET as getListings } from "@/app/api/opportunity/listings/route";
import { GET as getListingById } from "@/app/api/opportunity/listings/[id]/route";

const LISTING_ROW = {
  id: "opp-001",
  title: "Tony Elumelu Foundation Entrepreneurship Programme",
  country: "Pan-Africa",
  region: "All Africa",
  type: "Grant",
  sectors: ["Tech"],
  eligibility_age_min: 18,
  eligibility_age_max: 35,
  eligibility_gender: "All",
  eligibility_citizenship: ["All African countries"],
  eligibility_residence: ["Africa"],
  diaspora_allowed: true,
  business_stage_required: ["Idea"],
  amount: 5000,
  amount_max: null,
  currency: "USD",
  deadline: "2025-01-15",
  source_url: "https://www.tonyelumelufoundation.org/teep",
  source_name: "Tony Elumelu Foundation",
  verified_status: "verified",
  summary: "Seed funding for African entrepreneurs.",
  description: null,
  documents_required: null,
  application_steps: null,
  notes: null,
  tags: null,
  metadata: { verified_at: "2026-06-18", volatility: "high" },
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("opportunity listings API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    loadAfricanOpportunityEntitlement.mockResolvedValue({
      key: "african_opportunity_access",
      status: "verified",
      grantedAt: "2026-06-18T00:00:00Z",
      source: "afrique_id",
    });
    hasVerifiedAfricanOpportunityAccess.mockReturnValue(true);
  });

  it("GET /api/opportunity/listings returns db rows", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [LISTING_ROW], error: null }),
          }),
        }),
      }),
    };
    requireUser.mockResolvedValue({ user: { id: "user-1" }, supabase });

    const res = await getListings(new NextRequest("http://localhost/api/opportunity/listings"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.listings).toHaveLength(1);
    expect(body.listings[0].id).toBe("opp-001");
    expect(body.listings[0].verified_at).toBe("2026-06-18");
  });

  it("GET /api/opportunity/listings/[id] returns 404 when missing", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    };
    requireUser.mockResolvedValue({ user: { id: "user-1" }, supabase });

    const res = await getListingById(new Request("http://localhost"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("requires authentication", async () => {
    requireUser.mockResolvedValue({
      error: Response.json({ error: "Sign in required." }, { status: 401 }),
    });

    const res = await getListings(new NextRequest("http://localhost/api/opportunity/listings"));
    expect(res.status).toBe(401);
    expect(loadAfricanOpportunityEntitlement).not.toHaveBeenCalled();
  });

  it("rejects users without verified indigenous Afrique ID access", async () => {
    requireUser.mockResolvedValue({ user: { id: "user-1" }, supabase: {} });
    loadAfricanOpportunityEntitlement.mockResolvedValue({
      key: "african_opportunity_access",
      status: "pending",
      grantedAt: null,
      source: "afrique_id",
    });
    hasVerifiedAfricanOpportunityAccess.mockReturnValue(false);

    const res = await getListings(new NextRequest("http://localhost/api/opportunity/listings"));
    expect(res.status).toBe(403);
    expect((await res.json()).needsEntitlement).toBe(true);
  });
});
