import { parseCuratedSources } from "@/lib/opportunity/trust-labels";

export type ImportReplacementListItem = {
  slug: string;
  countryCode: string;
  productCategory: string;
  verdict: "promising" | "mixed" | "unlikely";
  confidence: string;
  trustLabel: string;
};

export type ImportReplacementDetail = ImportReplacementListItem & {
  importDependencyNote: string;
  localProductionStatus: string;
  rawMaterialAvailability: string | null;
  processingGap: string | null;
  equipmentNeeded: string[];
  skillsNeeded: string[];
  targetMarkets: string[];
  verdictReasoning: string;
  sources: ReturnType<typeof parseCuratedSources>;
  updatedAt: string;
};

type ImportReplacementRow = {
  slug: string;
  country_code: string;
  product_category: string;
  verdict: string;
  confidence: string;
  trust_label: string;
  import_dependency_note: string;
  local_production_status: string;
  raw_material_availability: string | null;
  processing_gap: string | null;
  equipment_needed: string[] | null;
  skills_needed: string[] | null;
  target_markets: string[] | null;
  verdict_reasoning: string;
  sources: unknown;
  updated_at: string;
};

export function rowToImportReplacementDetail(row: ImportReplacementRow): ImportReplacementDetail {
  return {
    slug: row.slug,
    countryCode: row.country_code,
    productCategory: row.product_category,
    verdict: row.verdict as ImportReplacementListItem["verdict"],
    confidence: row.confidence,
    trustLabel: row.trust_label,
    importDependencyNote: row.import_dependency_note,
    localProductionStatus: row.local_production_status,
    rawMaterialAvailability: row.raw_material_availability,
    processingGap: row.processing_gap,
    equipmentNeeded: row.equipment_needed ?? [],
    skillsNeeded: row.skills_needed ?? [],
    targetMarkets: row.target_markets ?? [],
    verdictReasoning: row.verdict_reasoning,
    sources: parseCuratedSources(row.sources),
    updatedAt: row.updated_at,
  };
}

export type DiscoveryHypothesisListItem = {
  slug: string;
  title: string;
  countryCode: string;
  confidence: string;
  trustLabel: string;
};

export type DiscoveryHypothesisDetail = DiscoveryHypothesisListItem & {
  hypothesis: string;
  signalBasis: string[];
  reasoning: string;
  sources: ReturnType<typeof parseCuratedSources>;
  updatedAt: string;
};

type DiscoveryHypothesisRow = {
  slug: string;
  title: string;
  country_code: string;
  confidence: string;
  trust_label: string;
  hypothesis: string;
  signal_basis: string[] | null;
  reasoning: string;
  sources: unknown;
  updated_at: string;
};

export function rowToDiscoveryHypothesisDetail(row: DiscoveryHypothesisRow): DiscoveryHypothesisDetail {
  return {
    slug: row.slug,
    title: row.title,
    countryCode: row.country_code,
    confidence: row.confidence,
    trustLabel: row.trust_label,
    hypothesis: row.hypothesis,
    signalBasis: row.signal_basis ?? [],
    reasoning: row.reasoning,
    sources: parseCuratedSources(row.sources),
    updatedAt: row.updated_at,
  };
}

export type TradeGapListItem = {
  slug: string;
  originCountryCode: string;
  destinationCountryCode: string;
  productCategory: string;
  confidence: string;
  trustLabel: string;
};
