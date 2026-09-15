import { NextResponse } from "next/server";

/** Legacy AI generation for in-memory store. Superseded by /api/projects/create-website (AI mode). */
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint has been removed. Use /create/new with AI mode to generate a site." },
    { status: 410 },
  );
}
