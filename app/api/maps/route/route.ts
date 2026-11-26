import { NextResponse, type NextRequest } from "next/server";
import { mapsProxyRateLimit } from "@/lib/api-guard";
import { routeBetween, type RouteProfile } from "@/lib/maps/provider";

export const dynamic = "force-dynamic";

const ROUTE_PROFILES: RouteProfile[] = ["driving", "walking", "cycling"];

function parseLatLng(raw: string | null): { latitude: number; longitude: number } | null {
  if (!raw) return null;
  const [latStr, lngStr] = raw.split(",");
  const latitude = Number(latStr);
  const longitude = Number(lngStr);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

function parseProfile(raw: string | null): RouteProfile | null {
  if (!raw) return "driving";
  return ROUTE_PROFILES.includes(raw as RouteProfile) ? (raw as RouteProfile) : null;
}

/** "How far / how long?" — server-side proxy to the routing provider. */
export async function GET(req: NextRequest) {
  const limited = mapsProxyRateLimit(req);
  if (limited) return limited;

  const from = parseLatLng(req.nextUrl.searchParams.get("from"));
  const to = parseLatLng(req.nextUrl.searchParams.get("to"));
  const profile = parseProfile(req.nextUrl.searchParams.get("profile"));
  if (!from || !to) {
    return NextResponse.json({ error: "Invalid from/to coordinates. Expected 'lat,lng'." }, { status: 400 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Invalid profile. Expected driving, walking, or cycling." }, { status: 400 });
  }

  const result = await routeBetween(from, to, profile);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 502 });
  }
  return NextResponse.json({
    profile: result.profile,
    distanceMeters: result.distanceMeters,
    durationSeconds: result.durationSeconds,
    geometry: result.geometry,
  });
}
