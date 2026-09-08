import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOpportunityListingById } from "@/lib/opportunity/listings";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Single Opportunity OS program listing by id. */
export async function GET(_req: Request, { params }: Params) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("placeholder")) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { listing, error, missingTable } = await getOpportunityListingById(supabase, id);

  if (error) {
    return NextResponse.json(
      {
        error: missingTable ? "Opportunity listings table missing." : "Could not load listing.",
        detail: error,
      },
      { status: missingTable ? 503 : 500 },
    );
  }

  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  return NextResponse.json({ listing });
}
