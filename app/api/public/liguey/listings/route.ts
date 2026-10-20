import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { publicSiteRateLimit } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

/**
 * Real work discovery (K066 acceptance case 2) — published listings only,
 * via the service-role client with an explicit status filter in
 * application code, mirroring app/api/public/events/[publicId]/route.ts.
 * No business_* table has ever had an anon RLS policy opening it to the
 * public (confirmed during acceptance case 4); this is that same, already-
 * established pattern, not a new one. No invented listings — if there are
 * genuinely zero published listings, this returns an empty array.
 */
export async function GET(req: Request) {
  const limited = publicSiteRateLimit(req);
  if (limited) return limited;

  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const url = new URL(req.url);
  const employmentType = url.searchParams.get("employmentType");
  const locationType = url.searchParams.get("locationType");

  let query = admin
    .from("job_listings")
    .select("id, business_id, public_id, title, employment_type, location_type, location, pay_label, photo_url, updated_at")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (employmentType) query = query.eq("employment_type", employmentType);
  if (locationType) query = query.eq("location_type", locationType);

  const { data: listings, error } = await query;
  if (error) return NextResponse.json({ error: "Could not load listings." }, { status: 503 });

  const businessIds = [...new Set((listings ?? []).map((listing) => listing.business_id))];
  let businesses: { id: string; legal_name: string; trading_name: string | null }[] = [];
  if (businessIds.length) {
    const { data } = await admin.from("businesses").select("id, legal_name, trading_name").in("id", businessIds);
    businesses = data ?? [];
  }
  const businessNameById = new Map(businesses.map((business) => [business.id, business.trading_name || business.legal_name]));

  return NextResponse.json({
    listings: (listings ?? []).map((listing) => ({
      publicId: listing.public_id,
      title: listing.title,
      employmentType: listing.employment_type,
      locationType: listing.location_type,
      location: listing.location,
      payLabel: listing.pay_label,
      photoUrl: listing.photo_url,
      employerName: businessNameById.get(listing.business_id) ?? "Kebu business",
      updatedAt: listing.updated_at,
    })),
  });
}
