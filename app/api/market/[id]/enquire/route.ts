import { NextRequest, NextResponse } from "next/server";
import { getListing, createEnquiry, getEnquiriesForListing, updateEnquiry } from "@/lib/market-data";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  try {
    const body = await req.json();

    if (!body.buyerName?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
    if (!body.buyerPhone?.trim()) return NextResponse.json({ error: "Phone required" }, { status: 400 });
    if (!body.quantity?.trim()) return NextResponse.json({ error: "Quantity required" }, { status: 400 });

    const enquiry = await createEnquiry({
      listingId: id,
      buyerName: String(body.buyerName).trim(),
      buyerPhone: String(body.buyerPhone).trim(),
      buyerEmail: body.buyerEmail ? String(body.buyerEmail).trim() : undefined,
      buyerBusiness: body.buyerBusiness ? String(body.buyerBusiness).trim() : undefined,
      quantity: String(body.quantity).trim(),
      unit: listing.unit,
      message: body.message ? String(body.message).trim() : undefined,
    });

    return NextResponse.json(enquiry, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const enquiries = await getEnquiriesForListing(id);

  // Only return full contact details to the seller.
  // Sellers identify themselves with the ADMIN_PASSWORD header until a proper
  // seller-auth system is in place.
  const adminKey = process.env.ADMIN_PASSWORD;
  const isOwner = adminKey && req.headers.get("x-seller-key") === adminKey;

  const safeEnquiries = isOwner
    ? enquiries
    : enquiries.map(({ buyerName, quantity, unit, message, status, createdAt, id: enquiryId, listingId }) => ({
        id: enquiryId, listingId, buyerName, quantity, unit, message, status, createdAt,
      }));

  return NextResponse.json({ listing, enquiries: safeEnquiries });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    if (!body.enquiryId) return NextResponse.json({ error: "enquiryId required" }, { status: 400 });

    const updated = await updateEnquiry(id, body.enquiryId, {
      status: body.status,
      sellerReply: body.sellerReply,
      repliedAt: body.sellerReply ? new Date().toISOString() : undefined,
    });

    if (!updated) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
