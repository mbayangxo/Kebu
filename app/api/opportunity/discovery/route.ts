import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rowToDiscoveryHypothesisDetail } from "@/lib/opportunity/explore-engines-schema";
import { OPPORTUNITY_TRUST_LABELS } from "@/lib/opportunity/trust-labels";

export const dynamic = "force-dynamic";

const COLUMNS = "slug, title, country_code, hypothesis, signal_basis, reasoning, confidence, trust_label, sources, updated_at";

/** Public list of published Discovery hypotheses (Opportunity OS §8). */
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
    .from("opportunity_discovery_hypotheses")
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
          ? "Discovery hypotheses table missing. Apply the opportunity explore engines migration."
          : "Could not load discovery hypotheses.",
        hypotheses: [],
      },
      { status: missing ? 503 : 500 },
    );
  }

  return NextResponse.json({
    hypotheses: (data ?? []).map(rowToDiscoveryHypothesisDetail),
    trust: {
      note: `${OPPORTUNITY_TRUST_LABELS.curated} — hypotheses reasoned from real curated signals, not ${OPPORTUNITY_TRUST_LABELS.ai_generated.toLowerCase()}.`,
    },
  });
}
