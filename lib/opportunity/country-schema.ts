import { z } from "zod";

export const SAFE_COUNTRY_FIELDS =
  "id, country, country_code, capital, population, gdp, languages, industries, cultural_notes, historical_notes, historical_empires, ethnic_groups, procurement_links, youth_programs, women_programs, sme_agencies, startup_notes, diaspora_notes, business_etiquette, overview, economy_overview, major_exports, major_imports, agricultural_products, manufacturing_sectors, technology_ecosystem, infrastructure, logistics, trade_agreements, public_entrepreneurship_programs, startup_ecosystem, universities, industrial_zones, business_registration_guidance, publish_status, data_confidence, sources, last_verified_at, created_at, updated_at" as const;

export const countryCodeParamSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/);

export type CountryProfileRow = {
  id: string;
  country: string;
  country_code: string;
  capital: string | null;
  population: number | null;
  gdp: string | null;
  languages: string[] | null;
  industries: string[] | null;
  overview: string | null;
  economy_overview: string | null;
  major_exports: string[] | null;
  major_imports: string[] | null;
  agricultural_products: string[] | null;
  manufacturing_sectors: string[] | null;
  technology_ecosystem: string | null;
  infrastructure: string | null;
  logistics: string | null;
  trade_agreements: string[] | null;
  public_entrepreneurship_programs: string[] | null;
  startup_ecosystem: string | null;
  universities: string[] | null;
  industrial_zones: string[] | null;
  business_registration_guidance: string | null;
  youth_programs: string[] | null;
  women_programs: string[] | null;
  sme_agencies: string[] | null;
  startup_notes: string | null;
  diaspora_notes: string | null;
  business_etiquette: string[] | null;
  cultural_notes: string | null;
  historical_notes: string | null;
  publish_status: string;
  data_confidence: string | null;
  sources: unknown;
  last_verified_at: string | null;
  updated_at: string;
};

export type CountryAiAnalysisRow = {
  id: string;
  country_code: string;
  label: string;
  prompt_summary: string | null;
  analysis_markdown: string;
  model_version: string | null;
  confidence: string;
  created_at: string;
};

/** Map curated TS profile into DB upsert payload (verified/curated — not AI). */
export function profileToDbRow(p: {
  country: string;
  country_code: string;
  capital?: string;
  population?: number;
  gdp?: string;
  languages?: string[];
  industries?: string[];
  cultural_notes?: string;
  historical_notes?: string;
  historical_empires?: string[];
  ethnic_groups?: string[];
  procurement_links?: unknown;
  youth_programs?: string[];
  women_programs?: string[];
  sme_agencies?: string[];
  startup_notes?: string;
  diaspora_notes?: string;
  business_etiquette?: string[];
}) {
  return {
    country: p.country,
    country_code: p.country_code.toUpperCase(),
    capital: p.capital ?? null,
    population: p.population ?? null,
    gdp: p.gdp ?? null,
    languages: p.languages ?? [],
    industries: p.industries ?? [],
    cultural_notes: p.cultural_notes ?? null,
    historical_notes: p.historical_notes ?? null,
    historical_empires: p.historical_empires ?? [],
    ethnic_groups: p.ethnic_groups ?? [],
    procurement_links: p.procurement_links ?? [],
    youth_programs: p.youth_programs ?? [],
    women_programs: p.women_programs ?? [],
    sme_agencies: p.sme_agencies ?? [],
    startup_notes: p.startup_notes ?? null,
    diaspora_notes: p.diaspora_notes ?? null,
    business_etiquette: p.business_etiquette ?? [],
    overview: p.cultural_notes
      ? `${p.country} — curated public overview for Opportunity OS Country Explorer.`
      : null,
    economy_overview: p.industries?.length
      ? `Key industries often cited for ${p.country}: ${p.industries.join(", ")}.`
      : null,
    public_entrepreneurship_programs: [
      ...(p.youth_programs ?? []),
      ...(p.women_programs ?? []),
    ].slice(0, 20),
    startup_ecosystem: p.startup_notes ?? null,
    publish_status: "published" as const,
    data_confidence: "moderate" as const,
    sources: [
      {
        title: "Kebu curated country profile",
        type: "curated",
        note: "Imported from curated dataset; cite official sources when updating.",
      },
    ],
    last_verified_at: new Date().toISOString(),
  };
}
