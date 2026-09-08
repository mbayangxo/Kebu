import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rowToOpportunityCardListItem } from "@/lib/opportunity/opportunity-card-schema";
import { OPPORTUNITY_TRUST_LABELS } from "@/lib/opportunity/trust-labels";

export const dynamic = "force-dynamic";

/** Public list of published Opportunity OS cards. */
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
    .from("opportunity_cards")
    .select(
      "slug, title, opportunity_summary, country_code, location_label, confidence, trust_label, difficulty, capital_intensity",
    )
    .eq("publish_status", "published")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (country && /^[A-Z]{2}$/.test(country)) {
    query = query.eq("country_code", country);
  }

  const { data, error } = await query;

  if (error) {
    const missing =
      error.message.includes("does not exist") ||
      error.code === "42P01" ||
      error.message.includes("column");
    return NextResponse.json(
      {
        error: missing
          ? "Opportunity Cards table missing. Apply supabase/migrations/063_opportunity_cards.sql."
          : "Could not load opportunity cards.",
        detail: error.message,
        cards: [],
      },
      { status: missing ? 503 : 500 },
    );
  }

  return NextResponse.json({
    cards: (data ?? []).map(rowToOpportunityCardListItem),
    trust: {
      note: `${OPPORTUNITY_TRUST_LABELS.curated} — evidence-linked cards; not ${OPPORTUNITY_TRUST_LABELS.ai_generated.toLowerCase()}.`,
    },
  });
}
