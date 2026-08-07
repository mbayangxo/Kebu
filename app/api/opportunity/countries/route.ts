import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Public list of published Opportunity OS countries. */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("placeholder")) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("country_profiles")
    .select(
      "country, country_code, capital, population, gdp, industries, overview, data_confidence, updated_at"
    )
    .eq("publish_status", "published")
    .order("country", { ascending: true });

  if (error) {
    const missing =
      error.message.includes("does not exist") ||
      error.code === "42P01" ||
      error.message.includes("column");
    return NextResponse.json(
      {
        error: missing
          ? "Country Explorer tables missing. Apply supabase/migrations/001 and 009."
          : "Could not load countries.",
        detail: error.message,
        countries: [],
      },
      { status: missing ? 503 : 500 }
    );
  }

  return NextResponse.json({
    countries: data ?? [],
    trust: {
      note: "Listed fields are curated/verified-style public profiles — not AI-generated opportunity advice.",
    },
  });
}
