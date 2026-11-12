/**
 * Real geocoding/routing provider wiring in lib/maps/provider.ts — mocked at
 * the fetch boundary, same convention as tests/mail/provider.test.ts. A bug
 * in URL building or response parsing fails here, not just in production.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { geocodeSearch, getMapStyleUrl, routeBetween } from "@/lib/maps/provider";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getMapStyleUrl", () => {
  it("returns the real OpenFreeMap style URL with no API key", () => {
    expect(getMapStyleUrl()).toBe("https://tiles.openfreemap.org/styles/liberty");
  });

  it("rejects an unsupported provider rather than silently falling back", () => {
    // @ts-expect-error — intentionally passing an invalid provider name
    expect(() => getMapStyleUrl("mapbox")).toThrow("Unsupported tile provider");
  });
});

describe("geocodeSearch", () => {
  it("returns an empty result for a blank query without calling the network", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const result = await geocodeSearch("   ");
    expect(result).toEqual({ ok: true, provider: "nominatim", results: [] });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls Nominatim with an identifying User-Agent and parses real hits", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify([
          { display_name: "Dakar, Senegal", lat: "14.6928", lon: "-17.4467" },
          { display_name: "Garbage row", lat: "not-a-number", lon: "-17.4" },
        ]),
        { status: 200 },
      ),
    );
    const result = await geocodeSearch("Dakar");
    expect(result).toEqual({
      ok: true,
      provider: "nominatim",
      results: [{ label: "Dakar, Senegal", latitude: 14.6928, longitude: -17.4467 }],
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("nominatim.openstreetmap.org/search?format=jsonv2&q=Dakar"),
      expect.objectContaining({ headers: expect.objectContaining({ "User-Agent": expect.stringContaining("KebuMaps") }) }),
    );
  });

  it("drops rows missing a usable label or coordinates instead of throwing", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify([{ display_name: "", lat: "1", lon: "2" }]), { status: 200 }),
    );
    const result = await geocodeSearch("x");
    expect(result).toEqual({ ok: true, provider: "nominatim", results: [] });
  });

  it("surfaces a non-2xx provider response as a failure, not a crash", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response("", { status: 503 }));
    const result = await geocodeSearch("x");
    expect(result).toEqual({ ok: false, provider: "nominatim", reason: "Geocoding provider returned HTTP 503." });
  });

  it("treats a network error as a failure, not a throw", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("ENOTFOUND"));
    const result = await geocodeSearch("x");
    expect(result).toEqual({ ok: false, provider: "nominatim", reason: "Geocoding provider network error." });
  });
});

describe("routeBetween", () => {
  const dakar = { latitude: 14.6928, longitude: -17.4467 };
  const thies = { latitude: 14.7886, longitude: -16.9246 };

  it("defaults to driving via the project-osrm.org demo, lng,lat order, and parses distance/duration/geometry", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "Ok",
          routes: [{ distance: 68000, duration: 3600, geometry: { type: "LineString", coordinates: [[-17.4467, 14.6928], [-16.9246, 14.7886]] } }],
        }),
        { status: 200 },
      ),
    );
    const result = await routeBetween(dakar, thies);
    expect(result).toEqual({
      ok: true,
      provider: "osrm-demo",
      profile: "driving",
      distanceMeters: 68000,
      durationSeconds: 3600,
      geometry: [[-17.4467, 14.6928], [-16.9246, 14.7886]],
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://router.project-osrm.org/route/v1/driving/-17.4467,14.6928;-16.9246,14.7886?overview=full&geometries=geojson",
    );
  });

  it("routes walking via the FOSSGIS routed-foot host", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "Ok",
          routes: [{ distance: 2461, duration: 1969, geometry: { type: "LineString", coordinates: [[-17.4467, 14.6928], [-16.9246, 14.7886]] } }],
        }),
        { status: 200 },
      ),
    );
    const result = await routeBetween(dakar, thies, "walking");
    expect(result).toEqual({
      ok: true,
      provider: "osrm-demo",
      profile: "walking",
      distanceMeters: 2461,
      durationSeconds: 1969,
      geometry: [[-17.4467, 14.6928], [-16.9246, 14.7886]],
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://routing.openstreetmap.de/routed-foot/route/v1/foot/-17.4467,14.6928;-16.9246,14.7886?overview=full&geometries=geojson",
    );
  });

  it("routes cycling via the FOSSGIS routed-bike host", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "Ok",
          routes: [{ distance: 2462, duration: 615, geometry: { type: "LineString", coordinates: [[-17.4467, 14.6928], [-16.9246, 14.7886]] } }],
        }),
        { status: 200 },
      ),
    );
    const result = await routeBetween(dakar, thies, "cycling");
    expect(result).toEqual({
      ok: true,
      provider: "osrm-demo",
      profile: "cycling",
      distanceMeters: 2462,
      durationSeconds: 615,
      geometry: [[-17.4467, 14.6928], [-16.9246, 14.7886]],
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://routing.openstreetmap.de/routed-bike/route/v1/bike/-17.4467,14.6928;-16.9246,14.7886?overview=full&geometries=geojson",
    );
  });

  it("reports no route rather than fabricating one when OSRM finds none", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ code: "NoRoute", routes: [] }), { status: 200 }));
    const result = await routeBetween(dakar, thies);
    expect(result).toEqual({ ok: false, provider: "osrm-demo", profile: "driving", reason: "No route found between those points." });
  });

  it("surfaces an invalid provider payload as a failure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ code: "Ok", routes: [{ distance: "bad", duration: 1, geometry: { coordinates: [] } }] }), { status: 200 }),
    );
    const result = await routeBetween(dakar, thies);
    expect(result).toEqual({ ok: false, provider: "osrm-demo", profile: "driving", reason: "Routing provider returned an invalid response." });
  });

  it("treats a network error as a failure, not a throw", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("ECONNRESET"));
    const result = await routeBetween(dakar, thies);
    expect(result).toEqual({ ok: false, provider: "osrm-demo", profile: "driving", reason: "Routing provider network error." });
  });
});
