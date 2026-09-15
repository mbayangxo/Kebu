import { NextResponse } from "next/server";

/** Legacy in-memory store publisher. Superseded by /api/projects/create-website. */
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has been removed. Use /api/projects/create-website to create a site." },
    { status: 410 },
  );
}
