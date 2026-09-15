import { NextRequest, NextResponse } from "next/server";

/** Legacy in-memory orders list. */
export async function GET(_req: NextRequest) {
  return NextResponse.json(
    { error: "This endpoint has been removed." },
    { status: 410 },
  );
}
