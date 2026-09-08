import type { SupabaseClient } from "@supabase/supabase-js";
import type { FundingType, Opportunity, Sector, VerifiedStatus, Volatility } from "@/lib/types";

export type OpportunityListingRow = {
  id: string;
  title: string;
  country: string;
  region: string | null;
  type: string;
  sectors: string[] | null;
  eligibility_age_min: number | null;
  eligibility_age_max: number | null;
  eligibility_gender: string | null;
  eligibility_citizenship: string[] | null;
  eligibility_residence: string[] | null;
  diaspora_allowed: boolean | null;
  business_stage_required: string[] | null;
  amount: number | null;
  amount_max: number | null;
  currency: string | null;
  deadline: string | null;
  source_url: string;
  source_name: string;
  verified_status: string | null;
  summary: string;
  description: string | null;
  documents_required: string[] | null;
  application_steps: string[] | null;
  notes: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type ListingFilters = {
  type?: FundingType | null;
  sector?: Sector | null;
  country?: string | null;
  diaspora?: boolean;
  q?: string | null;
  limit?: number;
};

function metaString(meta: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const v = meta?.[key];
  return typeof v === "string" && v.trim() ? v : undefined;
}

/** Map Postgres row → app Opportunity (trust fields from metadata jsonb). */
export function rowToOpportunity(row: OpportunityListingRow): Opportunity {
  const meta = row.metadata ?? {};
  return {
    id: row.id,
    title: row.title,
    country: row.country,
    region: row.region ?? undefined,
    type: row.type as FundingType,
    sectors: (row.sectors ?? []) as Sector[],
    eligibility_age_min: row.eligibility_age_min ?? undefined,
    eligibility_age_max: row.eligibility_age_max ?? undefined,
    eligibility_gender: row.eligibility_gender ?? undefined,
    eligibility_citizenship: row.eligibility_citizenship ?? undefined,
    eligibility_residence: row.eligibility_residence ?? undefined,
    diaspora_allowed: row.diaspora_allowed ?? false,
    business_stage_required: (row.business_stage_required ?? undefined) as Opportunity["business_stage_required"],
    amount: row.amount != null ? Number(row.amount) : undefined,
    amount_max: row.amount_max != null ? Number(row.amount_max) : undefined,
    currency: row.currency ?? "USD",
    deadline: row.deadline ?? undefined,
    source_url: row.source_url,
    source_name: row.source_name,
    verified_status: (row.verified_status ?? "needs_review") as VerifiedStatus,
    verified_at: metaString(meta, "verified_at"),
    flag_reason: metaString(meta, "flag_reason"),
    volatility: metaString(meta, "volatility") as Volatility | undefined,
    attributed_ministry: metaString(meta, "attributed_ministry"),
    legal_basis: metaString(meta, "legal_basis"),
    attributed_official: metaString(meta, "attributed_official"),
    verification_source_url: metaString(meta, "verification_source_url"),
    summary: row.summary,
    description: row.description ?? undefined,
    documents_required: row.documents_required ?? undefined,
    application_steps: row.application_steps ?? undefined,
    notes: row.notes ?? undefined,
    tags: row.tags ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const LISTING_SELECT =
  "id, title, country, region, type, sectors, eligibility_age_min, eligibility_age_max, eligibility_gender, eligibility_citizenship, eligibility_residence, diaspora_allowed, business_stage_required, amount, amount_max, currency, deadline, source_url, source_name, verified_status, summary, description, documents_required, application_steps, notes, tags, metadata, created_at, updated_at";

export function opportunityToDbRow(opp: Opportunity): Record<string, unknown> {
  const {
    verified_at,
    flag_reason,
    volatility,
    attributed_ministry,
    legal_basis,
    attributed_official,
    verification_source_url,
    ...rest
  } = opp;

  const metadata: Record<string, unknown> = {};
  if (verified_at) metadata.verified_at = verified_at;
  if (flag_reason) metadata.flag_reason = flag_reason;
  if (volatility) metadata.volatility = volatility;
  if (attributed_ministry) metadata.attributed_ministry = attributed_ministry;
  if (legal_basis) metadata.legal_basis = legal_basis;
  if (attributed_official) metadata.attributed_official = attributed_official;
  if (verification_source_url) metadata.verification_source_url = verification_source_url;

  return {
    id: rest.id,
    title: rest.title,
    country: rest.country,
    region: rest.region ?? null,
    type: rest.type,
    sectors: rest.sectors,
    eligibility_age_min: rest.eligibility_age_min ?? null,
    eligibility_age_max: rest.eligibility_age_max ?? null,
    eligibility_gender: rest.eligibility_gender ?? null,
    eligibility_citizenship: rest.eligibility_citizenship ?? null,
    eligibility_residence: rest.eligibility_residence ?? null,
    diaspora_allowed: rest.diaspora_allowed,
    business_stage_required: rest.business_stage_required ?? null,
    amount: rest.amount ?? null,
    amount_max: rest.amount_max ?? null,
    currency: rest.currency,
    deadline: rest.deadline ?? null,
    source_url: rest.source_url,
    source_name: rest.source_name,
    verified_status: rest.verified_status,
    summary: rest.summary,
    description: rest.description ?? null,
    documents_required: rest.documents_required ?? null,
    application_steps: rest.application_steps ?? null,
    notes: rest.notes ?? null,
    tags: rest.tags ?? null,
    metadata,
    updated_at: new Date().toISOString(),
  };
}

export async function listOpportunityListings(
  supabase: SupabaseClient,
  filters: ListingFilters = {},
): Promise<{ listings: Opportunity[]; error: string | null; missingTable: boolean }> {
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 200);

  let query = supabase.from("opportunities").select(LISTING_SELECT).order("updated_at", { ascending: false }).limit(limit);

  if (filters.type) query = query.eq("type", filters.type);
  if (filters.country) {
    query = query.in("country", [filters.country, "Pan-Africa", "All Africa"]);
  }
  if (filters.diaspora) query = query.eq("diaspora_allowed", true);

  const { data, error } = await query;

  if (error) {
    const missing =
      error.message.includes("does not exist") ||
      error.code === "42P01" ||
      error.message.includes("column");
    return { listings: [], error: error.message, missingTable: missing };
  }

  let rows = (data ?? []) as OpportunityListingRow[];

  if (filters.sector) {
    rows = rows.filter((r) => (r.sectors ?? []).includes(filters.sector!));
  }

  if (filters.q) {
    const q = filters.q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.country.toLowerCase().includes(q),
    );
  }

  return { listings: rows.map(rowToOpportunity), error: null, missingTable: false };
}

export async function getOpportunityListingById(
  supabase: SupabaseClient,
  id: string,
): Promise<{ listing: Opportunity | null; error: string | null; missingTable: boolean }> {
  const { data, error } = await supabase.from("opportunities").select(LISTING_SELECT).eq("id", id).maybeSingle();

  if (error) {
    const missing =
      error.message.includes("does not exist") ||
      error.code === "42P01" ||
      error.message.includes("column");
    return { listing: null, error: error.message, missingTable: missing };
  }

  if (!data) return { listing: null, error: null, missingTable: false };
  return { listing: rowToOpportunity(data as OpportunityListingRow), error: null, missingTable: false };
}
