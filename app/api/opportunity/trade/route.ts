import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Public list of published African intercontinental trade gaps (Opportunity
 * OS §7, e.g. "products Senegal could sell to Nigeria"). Real table, real
 * RLS, real query — but genuinely empty today: a trade-gap claim needs real
 * curated supply/demand data for BOTH countries in the pair, and only
 * Senegal has a real public.country_profiles row so far. Returns an honest
 * empty list with a `needsSecondCountry: true` flag rather than ever
 * inventing a country pair's statistics to fill the page.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("placeholder")) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunity_trade_gaps")
    .select("slug, origin_country_code, destination_country_code, product_category, confidence, trust_label")
    .eq("publish_status", "published")
    .order("sort_order", { ascending: true });

  if (error) {
    const missing = error.message.includes("does not exist") || error.code === "42P01";
    return NextResponse.json(
      {
        error: missing
          ? "Trade-gap table missing. Apply the opportunity explore engines migration."
          : "Could not load trade-gap analyses.",
        gaps: [],
      },
      { status: missing ? 503 : 500 },
    );
  }

  const gaps = data ?? [];
  return NextResponse.json({
    gaps,
    needsSecondCountry: gaps.length === 0,
  });
}
