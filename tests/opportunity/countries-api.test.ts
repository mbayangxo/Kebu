import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requireUser = vi.fn();
const createClient = vi.fn();
const aiRateLimit = vi.fn();

vi.mock("@/lib/create/auth", () => ({
  requireUser: (...args: unknown[]) => requireUser(...args),
  logCreate: vi.fn(),
}));

vi.mock("@/lib/api-guard", () => ({
  aiRateLimit: (...args: unknown[]) => aiRateLimit(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}));

import { GET as getCountries } from "@/app/api/opportunity/countries/route";
import { GET as getCountry } from "@/app/api/opportunity/countries/[code]/route";
import { POST as postAiAnalysis } from "@/app/api/opportunity/countries/[code]/ai-analysis/route";

const SN_PROFILE = {
  id: "profile-sn",
  country: "Senegal",
  country_code: "SN",
  capital: "Dakar",
  population: 17_000_000,
  gdp: "$27B",
  industries: ["Fishing", "Agriculture"],
  overview: "Curated overview",
  economy_overview: "Economy notes",
  major_exports: ["Fish"],
  major_imports: null,
  agricultural_products: ["Agriculture"],
  manufacturing_sectors: [],
  technology_ecosystem: null,
  infrastructure: null,
  logistics: null,
  trade_agreements: [],
  public_entrepreneurship_programs: ["DER/FJ"],
  startup_ecosystem: null,
  universities: [],
  industrial_zones: [],
  business_registration_guidance: "Check official sources.",
  youth_programs: [],
  women_programs: [],
  sme_agencies: [],
  startup_notes: null,
  diaspora_notes: null,
  business_etiquette: [],
  cultural_notes: null,
  historical_notes: null,
  publish_status: "published",
  data_confidence: "moderate",
  sources: [{ title: "Kebu curated", type: "curated" }],
  last_verified_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  languages: ["French"],
};

function mockSupabaseForCountry(options: {
  list?: typeof SN_PROFILE[];
  profile?: typeof SN_PROFILE | null;
  listError?: { message: string; code?: string };
  profileError?: { message: string };
  analyses?: unknown[];
}) {
  const profileResult = async () => {
    if (options.profileError) return { data: null, error: options.profileError };
    return { data: options.profile ?? null, error: null };
  };

  return {
    from(table: string) {
      if (table === "country_profiles") {
        return {
          select: () => ({
            eq: (_col: string, _val: string) => ({
              eq: () => ({
                maybeSingle: profileResult,
              }),
              order: async () => {
                if (options.listError) return { data: null, error: options.listError };
                return { data: options.list ?? [], error: null };
              },
            }),
          }),
        };
      }
      if (table === "country_ai_analyses") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: options.analyses ?? [], error: null }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({ data: null, error: { message: "skip ai insert in unit test" } }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
    },
  };
}

describe("GET /api/opportunity/countries", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    createClient.mockReset();
  });

  it("returns published countries", async () => {
    createClient.mockResolvedValue(mockSupabaseForCountry({ list: [SN_PROFILE] }));
    const res = await getCountries();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.countries).toHaveLength(1);
    expect(body.countries[0].country_code).toBe("SN");
    expect(body.trust.note).toContain("Curated");
  });

  it("returns 503 when tables missing", async () => {
    createClient.mockResolvedValue(
      mockSupabaseForCountry({ listError: { message: 'relation "country_profiles" does not exist' } }),
    );
    const res = await getCountries();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain("009");
  });
});

describe("GET /api/opportunity/countries/[code]", () => {
  beforeEach(() => {
    createClient.mockReset();
  });

  it("returns curated profile separate from AI analyses", async () => {
    createClient.mockResolvedValue(
      mockSupabaseForCountry({
        profile: SN_PROFILE,
        analyses: [
          {
            id: "ai-1",
            country_code: "SN",
            label: "ai_generated",
            analysis_markdown: "AI text",
            confidence: "low",
            created_at: "2026-01-02T00:00:00.000Z",
          },
        ],
      }),
    );
    const res = await getCountry(new Request("http://localhost"), {
      params: Promise.resolve({ code: "sn" }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.verified.country_code).toBe("SN");
    expect(body.aiAnalyses).toHaveLength(1);
    expect(body.labels.verified).toContain("Curated");
    expect(body.verified).not.toHaveProperty("analysis_markdown");
  });

  it("returns 404 when country not published", async () => {
    createClient.mockResolvedValue(mockSupabaseForCountry({ profile: null }));
    const res = await getCountry(new Request("http://localhost"), {
      params: Promise.resolve({ code: "zz" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid code", async () => {
    const res = await getCountry(new Request("http://localhost"), {
      params: Promise.resolve({ code: "senegal" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/opportunity/countries/[code]/ai-analysis", () => {
  beforeEach(() => {
    aiRateLimit.mockReturnValue(null);
    requireUser.mockReset();
    createClient.mockReset();
  });

  it("returns 401 when not signed in", async () => {
    requireUser.mockResolvedValue({
      error: new Response(JSON.stringify({ error: "Sign in required." }), { status: 401 }),
    });
    const res = await postAiAnalysis(new NextRequest("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ code: "sn" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 503 when ANTHROPIC_API_KEY missing", async () => {
    requireUser.mockResolvedValue({ user: { id: "user-1" }, supabase: {} });
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await postAiAnalysis(new NextRequest("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ code: "sn" }),
    });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain("ANTHROPIC_API_KEY");
  });
});
