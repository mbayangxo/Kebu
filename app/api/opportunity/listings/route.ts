import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listOpportunityListings } from "@/lib/opportunity/listings";
import { OPPORTUNITY_TRUST_LABELS } from "@/lib/opportunity/trust-labels";
import type { FundingType, Sector } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Public Opportunity OS program listings (grants, loans, tenders, …) from Supabase. */
export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("placeholder")) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type") as FundingType | null;
  const sector = searchParams.get("sector") as Sector | null;
  const country = searchParams.get("country");
  const diaspora = searchParams.get("diaspora") === "true";
  const q = searchParams.get("q");

  const supabase = await createClient();
  const { listings, error, missingTable } = await listOpportunityListings(supabase, {
    type,
    sector,
    country,
    diaspora,
    q,
    limit: 120,
  });

  if (error) {
    return NextResponse.json(
      {
        error: missingTable
          ? "Opportunity listings table missing. Apply migration 001 and seed listings."
          : "Could not load listings.",
        detail: error,
        listings: [],
      },
      { status: missingTable ? 503 : 500 },
    );
  }

  return NextResponse.json({
    listings,
    count: listings.length,
    trust: {
      note: `${OPPORTUNITY_TRUST_LABELS.curated} — verify deadlines and eligibility at the official source before applying.`,
    },
  });
}
