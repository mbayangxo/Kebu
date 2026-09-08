import { NextRequest, NextResponse } from "next/server";

/**
 * Legacy in-memory store analytics — retired.
 * Real metrics: Shop → Analytics (`/api/projects/[id]/shop-analytics`)
 * and Site detail (`/api/projects/[id]/analytics`).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  return NextResponse.json(
    {
      ok: false,
      error:
        "In-memory store analytics were removed. Use published site beacons + Shop → Analytics (Supabase).",
      slug,
    },
    { status: 410 },
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  return NextResponse.json(
    {
      error:
        "In-memory store analytics were removed. Open Shop → Analytics for real order/cart patterns.",
      slug,
    },
    { status: 410 },
  );
}
