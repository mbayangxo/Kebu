import { NextResponse } from "next/server";
import { publicSiteRateLimit } from "@/lib/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const CODE_RE = /^[A-Za-z]{2}$/;

type Params = { params: Promise<{ code: string }> };

/**
 * Public country-intelligence card for Kebu Search result pages (Research,
 * Trade and Culture all link here). Re-checks publish_status='published'
 * directly (never trusts search_documents, which can be stale) — a profile
 * reverted to draft or archived always 404s, mirroring the same contract as
 * every other public Search detail route in this slice.
 */
export async function GET(req: Request, { params }: Params) {
  const limited = publicSiteRateLimit(req);
  if (limited) return limited;

  const { code } = await params;
  if (!CODE_RE.test(code)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("country_profiles")
    .select(
      "country, country_code, capital, population, gdp, economy_overview, startup_ecosystem, technology_ecosystem, universities, major_exports, major_imports, trade_agreements, industrial_zones, manufacturing_sectors, logistics, cultural_notes, historical_notes, historical_empires, ethnic_groups, business_etiquette, diaspora_notes, data_confidence, publish_status, last_verified_at",
    )
    .eq("country_code", code.toUpperCase())
    .eq("publish_status", "published")
    .maybeSingle();

  if (error) {
    console.error("[public/countries] lookup failed:", error);
    return NextResponse.json({ error: "This profile could not load." }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({
    country: {
      name: profile.country,
      code: profile.country_code,
      capital: profile.capital,
      population: profile.population,
      gdp: profile.gdp,
      economyOverview: profile.economy_overview,
      startupEcosystem: profile.startup_ecosystem,
      technologyEcosystem: profile.technology_ecosystem,
      universities: profile.universities ?? [],
      majorExports: profile.major_exports ?? [],
      majorImports: profile.major_imports ?? [],
      tradeAgreements: profile.trade_agreements ?? [],
      industrialZones: profile.industrial_zones ?? [],
      manufacturingSectors: profile.manufacturing_sectors ?? [],
      logistics: profile.logistics,
      culturalNotes: profile.cultural_notes,
      historicalNotes: profile.historical_notes,
      historicalEmpires: profile.historical_empires ?? [],
      ethnicGroups: profile.ethnic_groups ?? [],
      businessEtiquette: profile.business_etiquette ?? [],
      diasporaNotes: profile.diaspora_notes,
      dataConfidence: profile.data_confidence,
      lastVerifiedAt: profile.last_verified_at,
    },
  });
}
