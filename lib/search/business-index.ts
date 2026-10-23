import type { SupabaseClient } from "@supabase/supabase-js";

type BusinessSearchDocument = {
  source_key: string;
  mode: "businesses";
  entity_type: "business";
  entity_id: string;
  title: string;
  summary: string;
  source_url: string | null;
  source_name: string;
  trust_label: "verified" | "unverified";
  access_scope: "public";
  category: string | null;
  country_code: string | null;
  fetched_at: string;
  updated_at: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  agriculture: "Agriculture",
  fashion: "Fashion",
  beauty: "Beauty",
  food: "Food",
  retail: "Retail",
  technology: "Technology",
  education: "Education",
  services: "Services",
  tourism: "Tourism",
  construction: "Construction",
  manufacturing: "Manufacturing",
  health: "Health",
  other: "Other",
};

/**
 * Indexes businesses that have actually left draft status. A business only
 * becomes publicly discoverable once an admin/system process promotes
 * lifecycle_status to 'active' — self-service PATCH cannot set this field
 * (see app/api/businesses/[id]/route.ts's banned-fields list), so an empty
 * result here is an honest reflection of how many businesses are genuinely
 * public today, not a bug.
 */
export async function refreshBusinessSearchIndex(admin: SupabaseClient) {
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("businesses")
    .select(
      "id, public_kebu_id, legal_name, trading_name, country_code, category, description, website, verification_level, updated_at",
    )
    .eq("lifecycle_status", "active")
    .limit(5000);

  if (error) throw error;

  const docs: BusinessSearchDocument[] = (data ?? []).map((business) => {
    const categoryLabel = CATEGORY_LABELS[business.category as string] ?? business.category;
    return {
      source_key: "business:" + business.id,
      mode: "businesses" as const,
      entity_type: "business" as const,
      entity_id: business.id,
      title: business.trading_name || business.legal_name,
      summary: [categoryLabel, business.country_code, business.description]
        .filter(Boolean)
        .join(" · ")
        .slice(0, 400),
      source_url: business.website || null,
      source_name: "Kebu Business Directory",
      trust_label: (business.verification_level ?? 0) > 0 ? ("verified" as const) : ("unverified" as const),
      access_scope: "public" as const,
      category: business.category || null,
      country_code: business.country_code || null,
      fetched_at: now,
      updated_at: business.updated_at || now,
    };
  });

  if (docs.length) {
    const { error: upsertError } = await admin.from("search_documents").upsert(docs, { onConflict: "source_key" });
    if (upsertError) throw upsertError;
  }

  return { businesses: docs.length };
}
