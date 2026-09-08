import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listOpportunityListings } from "@/lib/opportunity/listings";
import type { FundingType, Sector } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Legacy path — delegates to Supabase `opportunities` table. Prefer `/api/opportunity/listings`. */
export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("placeholder")) {
    return Response.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type") as FundingType | null;
  const sector = searchParams.get("sector") as Sector | null;
  const country = searchParams.get("country");
  const diaspora = searchParams.get("diaspora") === "true";
  const q = searchParams.get("q")?.toLowerCase();

  const supabase = await createClient();
  const { listings, error, missingTable } = await listOpportunityListings(supabase, {
    type,
    sector,
    country,
    diaspora,
    q,
  });

  if (error) {
    return Response.json(
      {
        error: missingTable ? "Opportunity listings table missing." : "Could not load listings.",
        detail: error,
      },
      { status: missingTable ? 503 : 500 },
    );
  }

  return Response.json(listings);
}
