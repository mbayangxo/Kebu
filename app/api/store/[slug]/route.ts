import { NextRequest, NextResponse } from "next/server";

/** Legacy in-memory store GET. Public deployments are now at /api/public/sites/[subdomain]. */
export async function GET(_req: NextRequest) {
  return NextResponse.json(
    { error: "This endpoint has been removed." },
    { status: 410 },
  );
}
