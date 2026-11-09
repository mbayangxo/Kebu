import { NextResponse, type NextRequest } from "next/server";
import { publicSiteRateLimit } from "@/lib/api-guard";
import { listPublishedBusinessPins } from "@/lib/maps/business-pins";

export const dynamic = "force-dynamic";

/** Real "what businesses are actually there?" pins — see lib/maps/business-pins.ts. */
export async function GET(req: NextRequest) {
  const limited = publicSiteRateLimit(req);
  if (limited) return limited;

  const result = await listPublishedBusinessPins();
  if (!result.ok) {
    return NextResponse.json({ error: result.reason, pins: [] }, { status: 503 });
  }
  return NextResponse.json({ pins: result.pins });
}
