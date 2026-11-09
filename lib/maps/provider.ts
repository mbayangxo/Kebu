/**
 * Kebu Maps provider abstraction — mirrors lib/mail/provider.ts's ladder:
 * one typed interface per capability, one real open/no-key adapter wired up
 * today, explicit room for a future self-hosted ("kebu-native") adapter.
 * See docs/KEBU-MAPS-AND-INFRASTRUCTURE.md Part B for the sovereignty ladder
 * this follows (own software/UX now, own data/infra progressively later).
 */

export type TileProviderName = "openfreemap";

/** Vector tile style JSON URL for the MapLibre GL renderer. No API key required. */
export function getMapStyleUrl(provider: TileProviderName = "openfreemap"): string {
  if (provider !== "openfreemap") {
    throw new Error(`Unsupported tile provider: ${provider}`);
  }
  // OpenFreeMap: free, open (OSM data, ODbL), no API key, production-usable.
  return "https://tiles.openfreemap.org/styles/liberty";
}

export type GeocodeProviderName = "nominatim";

export type GeocodeHit = {
  label: string;
  latitude: number;
  longitude: number;
};

export type GeocodeResult =
  | { ok: true; provider: GeocodeProviderName; results: GeocodeHit[] }
  | { ok: false; provider: GeocodeProviderName; reason: string };

/**
 * Nominatim's public instance is rate-limited (max ~1 req/s, usage policy at
 * https://operations.osmfoundation.org/policies/nominatim/) — fine for this
 * app's current scale behind our own rate limiter, not for production-scale
 * geocoding volume. Swapping to a self-hosted Nominatim later only requires
 * changing the base URL below, same v1 -> v2 pattern as Kebu Mail.
 */
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_USER_AGENT = "KebuMaps/1.0 (+https://kebu.africa)";

export async function geocodeSearch(
  query: string,
  provider: GeocodeProviderName = "nominatim",
): Promise<GeocodeResult> {
  if (provider !== "nominatim") {
    return { ok: false, provider: "nominatim", reason: `Unsupported geocoding provider: ${provider}` };
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return { ok: true, provider, results: [] };
  }

  const url = `${NOMINATIM_BASE_URL}?format=jsonv2&q=${encodeURIComponent(trimmed)}&limit=6`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": NOMINATIM_USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) {
      return { ok: false, provider, reason: `Geocoding provider returned HTTP ${res.status}.` };
    }
    const body = (await res.json().catch(() => null)) as
      | Array<{ display_name?: string; lat?: string; lon?: string }>
      | null;
    if (!Array.isArray(body)) {
      return { ok: false, provider, reason: "Geocoding provider returned an invalid response." };
    }
    const results: GeocodeHit[] = [];
    for (const row of body) {
      const lat = Number(row.lat);
      const lon = Number(row.lon);
      if (!row.display_name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      results.push({ label: row.display_name, latitude: lat, longitude: lon });
    }
    return { ok: true, provider, results };
  } catch {
    return { ok: false, provider, reason: "Geocoding provider network error." };
  }
}

export type RouteProviderName = "osrm-demo";

export type RouteProfile = "driving";

export type RouteOutcome =
  | {
      ok: true;
      provider: RouteProviderName;
      distanceMeters: number;
      durationSeconds: number;
      /** [lng, lat] pairs, GeoJSON order, ready for a MapLibre GeoJSON source. */
      geometry: [number, number][];
    }
  | { ok: false; provider: RouteProviderName; reason: string };

/**
 * router.project-osrm.org is OSRM's public demo deployment — explicitly a
 * demo/development endpoint (no SLA, no key, shared by the whole open-source
 * community), not a production routing backend. It only serves the "driving"
 * profile in its default public configuration, so that is the one real mode
 * this ships; walk/bike are not faked with no backend. A self-hosted OSRM
 * instance (with walking/cycling profiles) is a drop-in swap behind this
 * same interface later, matching the Mail provider's v1 -> v2 ladder.
 */
const OSRM_DEMO_BASE_URL = "https://router.project-osrm.org/route/v1/driving";

export async function routeBetween(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
  provider: RouteProviderName = "osrm-demo",
): Promise<RouteOutcome> {
  if (provider !== "osrm-demo") {
    return { ok: false, provider: "osrm-demo", reason: `Unsupported routing provider: ${provider}` };
  }

  const coords = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
  const url = `${OSRM_DEMO_BASE_URL}/${coords}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { ok: false, provider, reason: `Routing provider returned HTTP ${res.status}.` };
    }
    const body = (await res.json().catch(() => null)) as {
      code?: string;
      routes?: Array<{
        distance?: number;
        duration?: number;
        geometry?: { type?: string; coordinates?: [number, number][] };
      }>;
    } | null;

    if (!body || body.code !== "Ok" || !body.routes?.length) {
      return { ok: false, provider, reason: "No route found between those points." };
    }

    const route = body.routes[0];
    const distanceMeters = Number(route?.distance);
    const durationSeconds = Number(route?.duration);
    const geometry = route?.geometry?.coordinates;

    if (!Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds) || !Array.isArray(geometry)) {
      return { ok: false, provider, reason: "Routing provider returned an invalid response." };
    }

    return { ok: true, provider, distanceMeters, durationSeconds, geometry };
  } catch {
    return { ok: false, provider, reason: "Routing provider network error." };
  }
}
