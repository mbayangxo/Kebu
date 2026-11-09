import { NextResponse, type NextRequest } from "next/server";
import { mapsProxyRateLimit } from "@/lib/api-guard";
import { routeBetween } from "@/lib/maps/provider";

export const dynamic = "force-dynamic";

function parseLatLng(raw: string | null): { latitude: number; longitude: number } | null {
  if (!raw) return null;
  const [latStr, lngStr] = raw.split(",");
  const latitude = Number(latStr);
  const longitude = Number(lngStr);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

/** "How far / how long?" — server-side proxy to the routing provider. */
export async function GET(req: NextRequest) {
  const limited = mapsProxyRateLimit(req);
  if (limited) return limited;

  const from = parseLatLng(req.nextUrl.searchParams.get("from"));
  const to = parseLatLng(req.nextUrl.searchParams.get("to"));
  if (!from || !to) {
    return NextResponse.json({ error: "Invalid from/to coordinates. Expected 'lat,lng'." }, { status: 400 });
  }

  const result = await routeBetween(from, to);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 502 });
  }
  return NextResponse.json({
    distanceMeters: result.distanceMeters,
    durationSeconds: result.durationSeconds,
    geometry: result.geometry,
  });
}
