import { NextResponse } from "next/server";

/** Legacy in-memory order route. Orders are now handled by /api/public/sites/[subdomain]/orders. */
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has been removed. Orders are placed through /api/public/sites/[subdomain]/orders." },
    { status: 410 },
  );
}
