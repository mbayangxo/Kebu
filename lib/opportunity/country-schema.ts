import { z } from "zod";
import type { CuratedSource } from "@/lib/opportunity/trust-labels";

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

const AG_KEYWORDS = /agri|farm|fish|cocoa|coffee|tea|crop|livestock|forestry|palm|cashew|shea|groundnut|maize|rice|millet|sorghum|horticulture|food/i;
const MFG_KEYWORDS = /manufactur|mining|textile|cement|steel|processing|refin|industrial|production|oil|gas|energy|pharma/i;
const TECH_KEYWORDS = /tech|digital|fintech|telecom|software|startup|creative|media|film|music/i;

function pickByPattern(items: string[], pattern: RegExp): string[] {
  return items.filter((i) => pattern.test(i));
}

function buildSources(p: {
  country: string;
  procurement_links?: { name: string; url: string }[];
}): CuratedSource[] {
  const sources: CuratedSource[] = [
    {
      title: "Kebu curated country profile",
      type: "curated",
      note: "Imported from curated dataset; cite official sources when updating.",
    },
  ];
  for (const link of p.procurement_links ?? []) {
    sources.push({
      title: link.name,
      type: "public_portal",
      url: link.url,
      note: "Public procurement / government portal — verify current listings on the official site.",
    });
  }
  return sources;
}

/** Map curated TS profile into DB upsert payload (curated — not AI). */
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
  procurement_links?: { name: string; url: string }[];
  youth_programs?: string[];
  women_programs?: string[];
  sme_agencies?: string[];
  startup_notes?: string;
  diaspora_notes?: string;
  business_etiquette?: string[];
}) {
  const industries = p.industries ?? [];
  const agProducts = pickByPattern(industries, AG_KEYWORDS);
  const mfgSectors = pickByPattern(industries, MFG_KEYWORDS);
  const techSectors = pickByPattern(industries, TECH_KEYWORDS);
  const exportCandidates = industries.filter((i) => !TECH_KEYWORDS.test(i)).slice(0, 8);

  const overviewParts = [p.cultural_notes, p.historical_notes].filter(Boolean);
  const overview = overviewParts.length
    ? overviewParts.join("\n\n")
    : `${p.country} — curated public overview for Opportunity OS Country Explorer.`;

  const economyParts: string[] = [];
  if (industries.length) economyParts.push(`Key sectors often cited: ${industries.join(", ")}.`);
  if (p.gdp) economyParts.push(`GDP reference: ${p.gdp}.`);
  if (p.startup_notes) economyParts.push(p.startup_notes);

  const smeList = p.sme_agencies?.length ? p.sme_agencies.join(", ") : null;
  const registrationGuidance = smeList
    ? `Start with official business registration in ${p.country}. SME / investment agencies often cited: ${smeList}. Confirm fees, forms, and timelines on government portals before filing.`
    : `Confirm current business registration procedures with official ${p.country} government sources before filing.`;

  return {
    country: p.country,
    country_code: p.country_code.toUpperCase(),
    capital: p.capital ?? null,
    population: p.population ?? null,
    gdp: p.gdp ?? null,
    languages: p.languages ?? [],
    industries,
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
    overview,
    economy_overview: economyParts.join(" ") || null,
    major_exports: exportCandidates.length ? exportCandidates : industries.slice(0, 6),
    major_imports: null,
    agricultural_products: agProducts.length ? agProducts : industries.filter((i) => AG_KEYWORDS.test(i)),
    manufacturing_sectors: mfgSectors.length ? mfgSectors : [],
    technology_ecosystem: p.startup_notes ?? (techSectors.length ? techSectors.join(", ") : null),
    infrastructure: p.diaspora_notes
      ? `Diaspora & connectivity context: ${p.diaspora_notes}`
      : null,
    logistics: p.procurement_links?.length
      ? `Public procurement portals listed in sources — useful for tenders and supplier discovery.`
      : null,
    trade_agreements: [],
    public_entrepreneurship_programs: [...(p.youth_programs ?? []), ...(p.women_programs ?? [])].slice(0, 20),
    startup_ecosystem: p.startup_notes ?? null,
    universities: [],
    industrial_zones: [],
    business_registration_guidance: registrationGuidance,
    publish_status: "published" as const,
    data_confidence: "moderate" as const,
    sources: buildSources(p),
    last_verified_at: new Date().toISOString(),
  };
}
