import { z } from "zod";
import { parseCuratedSources } from "@/lib/opportunity/trust-labels";

export const opportunityCardSlugSchema = z
  .string()
  .trim()
  .min(3)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export type OpportunityCardListItem = {
  slug: string;
  title: string;
  opportunitySummary: string;
  countryCode: string;
  locationLabel: string | null;
  confidence: string;
  trustLabel: string;
  difficulty: string | null;
  capitalIntensity: string | null;
};

export type OpportunityCardDetail = OpportunityCardListItem & {
  problem: string;
  evidence: string;
  whyNow: string | null;
  customerSegment: string | null;
  currentSolutions: string | null;
  importDependency: string | null;
  localResources: string[];
  requiredCapabilities: string[];
  estimatedMarket: string | null;
  competition: string | null;
  regulatoryNotes: string | null;
  potentialAfricanMarkets: string[];
  businessModels: string[];
  timeToMarket: string | null;
  sources: ReturnType<typeof parseCuratedSources>;
  updatedAt: string;
};

export function rowToOpportunityCardListItem(row: {
  slug: string;
  title: string;
  opportunity_summary: string;
  country_code: string;
  location_label: string | null;
  confidence: string;
  trust_label: string;
  difficulty: string | null;
  capital_intensity: string | null;
}): OpportunityCardListItem {
  return {
    slug: row.slug,
    title: row.title,
    opportunitySummary: row.opportunity_summary,
    countryCode: row.country_code,
    locationLabel: row.location_label,
    confidence: row.confidence,
    trustLabel: row.trust_label,
    difficulty: row.difficulty,
    capitalIntensity: row.capital_intensity,
  };
}

export function rowToOpportunityCardDetail(row: {
  slug: string;
  title: string;
  opportunity_summary: string;
  country_code: string;
  location_label: string | null;
  confidence: string;
  trust_label: string;
  difficulty: string | null;
  capital_intensity: string | null;
  problem: string;
  evidence: string;
  why_now: string | null;
  customer_segment: string | null;
  current_solutions: string | null;
  import_dependency: string | null;
  local_resources: string[] | null;
  required_capabilities: string[] | null;
  estimated_market: string | null;
  competition: string | null;
  regulatory_notes: string | null;
  potential_african_markets: string[] | null;
  business_models: string[] | null;
  time_to_market: string | null;
  sources: unknown;
  updated_at: string;
}): OpportunityCardDetail {
  return {
    ...rowToOpportunityCardListItem(row),
    problem: row.problem,
    evidence: row.evidence,
    whyNow: row.why_now,
    customerSegment: row.customer_segment,
    currentSolutions: row.current_solutions,
    importDependency: row.import_dependency,
    localResources: row.local_resources ?? [],
    requiredCapabilities: row.required_capabilities ?? [],
    estimatedMarket: row.estimated_market,
    competition: row.competition,
    regulatoryNotes: row.regulatory_notes,
    potentialAfricanMarkets: row.potential_african_markets ?? [],
    businessModels: row.business_models ?? [],
    timeToMarket: row.time_to_market,
    sources: parseCuratedSources(row.sources),
    updatedAt: row.updated_at,
  };
}
