import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rowToImportReplacementDetail } from "@/lib/opportunity/explore-engines-schema";
import { OPPORTUNITY_TRUST_LABELS } from "@/lib/opportunity/trust-labels";

export const dynamic = "force-dynamic";

const COLUMNS =
  "slug, country_code, product_category, import_dependency_note, local_production_status, raw_material_availability, processing_gap, equipment_needed, skills_needed, target_markets, verdict, verdict_reasoning, confidence, trust_label, sources, updated_at";

/** Public list of published Import-Replacement analyses (Opportunity OS §5). */
export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("placeholder")) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country")?.trim().toUpperCase();

  const supabase = await createClient();
  let query = supabase
    .from("opportunity_import_replacement_analyses")
    .select(COLUMNS)
    .eq("publish_status", "published")
    .order("sort_order", { ascending: true });

  if (country && /^[A-Z]{2}$/.test(country)) {
    query = query.eq("country_code", country);
  }

  const { data, error } = await query;

  if (error) {
    const missing = error.message.includes("does not exist") || error.code === "42P01";
    return NextResponse.json(
      {
        error: missing
          ? "Import-replacement table missing. Apply the opportunity explore engines migration."
          : "Could not load import-replacement analyses.",
        analyses: [],
      },
      { status: missing ? 503 : 500 },
    );
  }

  return NextResponse.json({
    analyses: (data ?? []).map(rowToImportReplacementDetail),
    trust: {
      note: `${OPPORTUNITY_TRUST_LABELS.curated} — every claim here traces to Kebu's own curated country data; validate before investing.`,
    },
  });
}
