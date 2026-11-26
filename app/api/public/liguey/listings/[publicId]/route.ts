import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/opportunity/admin";
import { publicSiteRateLimit } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ publicId: string }> };

/** Public listing detail (published only) — mirrors app/api/public/events/[publicId]/route.ts. */
export async function GET(req: Request, { params }: Params) {
  const limited = publicSiteRateLimit(req);
  if (limited) return limited;

  const { publicId: raw } = await params;
  const publicId = raw.trim().toLowerCase();
  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data: listing, error } = await admin
    .from("job_listings")
    .select("id, business_id, public_id, title, description, requirements, employment_type, location_type, location, pay_label, photo_url, status, updated_at")
    .eq("public_id", publicId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load listing." }, { status: 503 });
  if (!listing || listing.status !== "published") return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  const { data: business } = await admin.from("businesses").select("legal_name, trading_name, description, website").eq("id", listing.business_id).maybeSingle();

  return NextResponse.json({
    listing: {
      id: listing.id,
      businessId: listing.business_id,
      publicId: listing.public_id,
      title: listing.title,
      description: listing.description,
      requirements: listing.requirements,
      employmentType: listing.employment_type,
      locationType: listing.location_type,
      location: listing.location,
      payLabel: listing.pay_label,
      photoUrl: listing.photo_url,
      employerName: business ? (business.trading_name || business.legal_name) : "Kebu business",
      employerAbout: business?.description ?? "",
      employerWebsite: business?.website ?? "",
      updatedAt: listing.updated_at,
    },
  });
}
