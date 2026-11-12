import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import {
  hasVerifiedAfricanOpportunityAccess,
  loadAfricanOpportunityEntitlement,
} from "@/lib/entitlements/african-opportunity-access";
import { getOpportunityListingById } from "@/lib/opportunity/listings";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Single verified-African Opportunity OS program listing by id. */
export async function GET(_req: Request, { params }: Params) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("placeholder")) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const entitlement = await loadAfricanOpportunityEntitlement({
    supabase,
    userId: user.id,
    sync: false,
  });
  if (!hasVerifiedAfricanOpportunityAccess(entitlement)) {
    return NextResponse.json(
      { error: "Verified African Opportunity access required.", needsEntitlement: true, entitlement },
      { status: 403 },
    );
  }

  const { id } = await params;
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
