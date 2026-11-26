"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  config as maplibreConfig,
  type GeoJSONSource,
} from "maplibre-gl";
import type { Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { KEBU } from "@/lib/kebu-brand";
import { getMapStyleUrl, type RouteProfile } from "@/lib/maps/provider";

// Turbopack doesn't correctly bundle MapLibre's `new Worker(new URL(...))`
// self-reference in dev, so the tile-parsing worker 404s/fails silently and
// the map never finishes loading. Point it at our own same-origin route
// (app/vendor/maplibre-worker/route.ts) instead — self-hosted, so this has
// no runtime dependency on a third-party CDN either.
maplibreConfig.WORKER_URL = "/vendor/maplibre-worker";

type GeocodeHit = { label: string; latitude: number; longitude: number };
type BusinessPin = {
  projectId: string;
  subdomain: string;
  title: string;
  latitude: number;
  longitude: number;
  address: string | null;
  url: string | null;
};
type RouteOutcome = { profile: RouteProfile; distanceMeters: number; durationSeconds: number; geometry: [number, number][] };

const TRAVEL_PROFILES: { id: RouteProfile; label: string }[] = [
  { id: "driving", label: "Drive" },
  { id: "walking", label: "Walk" },
  { id: "cycling", label: "Cycle" },
];

const ROUTE_SOURCE_ID = "kebu-route";
const ROUTE_LAYER_ID = "kebu-route-line";
const PINS_SOURCE_ID = "kebu-business-pins";
const PINS_LAYER_ID = "kebu-business-pins-circles";

/** Africa-wide default view until the user's own location resolves. */
const DEFAULT_CENTER: [number, number] = [20, 2];
const DEFAULT_ZOOM = 2.6;

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
}

export function KebuMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const destMarkerRef = useRef<Marker | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<GeocodeHit[]>([]);
  const [destination, setDestination] = useState<GeocodeHit | null>(null);
  const [route, setRoute] = useState<RouteOutcome | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [travelProfile, setTravelProfile] = useState<RouteProfile>("driving");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: getMapStyleUrl(),
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => setMapReady(true));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Business pins layer — loaded once, independent of routing/search state.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/public/maps/businesses");
        const body = (await res.json().catch(() => ({ pins: [] }))) as { pins?: BusinessPin[] };
        if (cancelled || !res.ok) return;
        const pins = body.pins ?? [];

        const geojson = {
          type: "FeatureCollection" as const,
          features: pins.map((pin) => ({
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [pin.longitude, pin.latitude] },
            properties: {
              title: pin.title,
              address: pin.address ?? "",
              url: pin.url ?? "",
            },
          })),
        };

        if (map.getSource(PINS_SOURCE_ID)) {
          (map.getSource(PINS_SOURCE_ID) as GeoJSONSource).setData(geojson);
        } else {
          map.addSource(PINS_SOURCE_ID, { type: "geojson", data: geojson });
          map.addLayer({
            id: PINS_LAYER_ID,
            type: "circle",
            source: PINS_SOURCE_ID,
            paint: {
              "circle-radius": 7,
              "circle-color": KEBU.orange,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#fff",
            },
          });
          map.on("click", PINS_LAYER_ID, (e) => {
            const feature = e.features?.[0];
            if (!feature) return;
            const { title, address, url } = feature.properties as { title: string; address: string; url: string };
            const coords = (feature.geometry as Point).coordinates as [number, number];
            new Popup({ closeButton: true })
              .setLngLat(coords)
              .setHTML(
                `<strong>${escapeHtml(title)}</strong>` +
                  (address ? `<br/>${escapeHtml(address)}` : "") +
                  (url ? `<br/><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Visit site</a>` : ""),
              )
              .addTo(map);
          });
          map.on("mouseenter", PINS_LAYER_ID, () => (map.getCanvas().style.cursor = "pointer"));
          map.on("mouseleave", PINS_LAYER_ID, () => (map.getCanvas().style.cursor = ""));
        }
      } catch {
        // Pins layer is a progressive enhancement — navigation still works without it.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mapReady]);

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocateError("Geolocation is not available in this browser.");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setUserLocation({ latitude, longitude });
        setLocating(false);

        const map = mapRef.current;
        if (map) {
          map.flyTo({ center: [longitude, latitude], zoom: 14 });
          if (userMarkerRef.current) {
            userMarkerRef.current.setLngLat([longitude, latitude]);
          } else {
            userMarkerRef.current = new Marker({ color: KEBU.black })
              .setLngLat([longitude, latitude])
              .addTo(map);
          }
        }
      },
      (err) => {
        setLocating(false);
        setLocateError(err.code === err.PERMISSION_DENIED ? "Location permission denied." : "Could not get your location.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, []);

  const runSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/maps/geocode?q=${encodeURIComponent(trimmed)}`);
      const body = (await res.json().catch(() => ({}))) as { results?: GeocodeHit[]; error?: string };
      if (!res.ok) {
        setSearchError(body.error ?? "Search failed.");
        setResults([]);
        return;
      }
      setResults(body.results ?? []);
      if (!body.results?.length) setSearchError("No places found.");
    } catch {
      setSearchError("Network error while searching.");
    } finally {
      setSearching(false);
    }
  }, [query]);

  const selectDestination = useCallback((hit: GeocodeHit) => {
    setDestination(hit);
    setResults([]);
    setRoute(null);
    setRouteError(null);
    const map = mapRef.current;
    if (map) {
      map.flyTo({ center: [hit.longitude, hit.latitude], zoom: 13 });
      if (destMarkerRef.current) {
        destMarkerRef.current.setLngLat([hit.longitude, hit.latitude]);
      } else {
        destMarkerRef.current = new Marker({ color: KEBU.orange }).setLngLat([hit.longitude, hit.latitude]).addTo(map);
      }
    }
  }, []);

  const runRoute = useCallback(async () => {
    const from = userLocation;
    if (!from || !destination) return;
    setRouting(true);
    setRouteError(null);
    try {
      const res = await fetch(
        `/api/maps/route?from=${from.latitude},${from.longitude}&to=${destination.latitude},${destination.longitude}&profile=${travelProfile}`,
      );
      const body = (await res.json().catch(() => ({}))) as RouteOutcome & { error?: string };
      if (!res.ok) {
        setRouteError(body.error ?? "Could not find a route.");
        setRoute(null);
        return;
      }
      setRoute(body);

      const map = mapRef.current;
      if (map) {
        const geojson = {
          type: "Feature" as const,
          geometry: { type: "LineString" as const, coordinates: body.geometry },
          properties: {},
        };
        if (map.getSource(ROUTE_SOURCE_ID)) {
          (map.getSource(ROUTE_SOURCE_ID) as GeoJSONSource).setData(geojson);
        } else {
          map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data: geojson });
          map.addLayer({
            id: ROUTE_LAYER_ID,
            type: "line",
            source: ROUTE_SOURCE_ID,
            paint: { "line-color": KEBU.black, "line-width": 4, "line-opacity": 0.85 },
          });
        }
      }
    } catch {
      setRouteError("Network error while routing.");
    } finally {
      setRouting(false);
    }
  }, [destination, userLocation, travelProfile]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl" style={{ border: `1px solid ${KEBU.border}` }}>
      <div ref={containerRef} className="absolute inset-0" />

      <div className="absolute left-3 top-3 z-10 flex w-[min(320px,calc(100%-24px))] flex-col gap-2">
        <form onSubmit={runSearch} className="flex gap-1.5 rounded-xl bg-white p-2 shadow-md" style={{ border: `1px solid ${KEBU.border}` }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a place…"
            className="flex-1 bg-transparent px-1.5 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            style={{ background: KEBU.orange }}
          >
            {searching ? "…" : "Search"}
          </button>
        </form>

        {searchError ? (
          <p className="rounded-lg bg-white px-3 py-2 text-xs" style={{ color: "#991B1B", border: `1px solid ${KEBU.border}` }}>
            {searchError}
          </p>
        ) : null}

        {results.length > 0 ? (
          <div className="max-h-64 overflow-y-auto rounded-xl bg-white shadow-md" style={{ border: `1px solid ${KEBU.border}` }}>
            {results.map((hit, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectDestination(hit)}
                className="block w-full border-b px-3 py-2 text-left text-xs last:border-b-0 hover:bg-gray-50"
                style={{ borderColor: KEBU.border, color: KEBU.black }}
              >
                {hit.label}
              </button>
            ))}
          </div>
        ) : null}

        {destination ? (
          <div className="rounded-xl bg-white p-3 shadow-md" style={{ border: `1px solid ${KEBU.border}` }}>
            <p className="mb-2 text-xs font-bold" style={{ color: KEBU.black }}>{destination.label}</p>
            <div className="mb-2 flex gap-1">
              {TRAVEL_PROFILES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setTravelProfile(p.id)}
                  className="flex-1 rounded-lg px-2 py-1 text-[11px] font-semibold"
                  style={{
                    background: travelProfile === p.id ? KEBU.black : "#F3F3F0",
                    color: travelProfile === p.id ? "#fff" : KEBU.muted,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void runRoute()}
              disabled={routing || !userLocation}
              className="w-full rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              style={{ background: KEBU.black }}
            >
              {routing ? "Routing…" : "Directions from me"}
            </button>
            {!userLocation ? (
              <p className="mt-1.5 text-[10px]" style={{ color: KEBU.muted }}>Share your location first.</p>
            ) : null}
            {routeError ? <p className="mt-1.5 text-[11px]" style={{ color: "#991B1B" }}>{routeError}</p> : null}
            {route ? (
              <p className="mt-1.5 text-[11px]" style={{ color: KEBU.muted }}>
                {formatDistance(route.distanceMeters)} · {formatDuration(route.durationSeconds)} ({route.profile})
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={locateMe}
        disabled={locating}
        className="absolute bottom-6 right-3 z-10 rounded-full px-4 py-2.5 text-xs font-bold text-white shadow-md disabled:opacity-50"
        style={{ background: KEBU.orange }}
        aria-label="Locate me"
      >
        {locating ? "Locating…" : "📍 Locate me"}
      </button>
      {locateError ? (
        <p className="absolute bottom-20 right-3 z-10 max-w-[220px] rounded-lg bg-white px-3 py-2 text-[11px] shadow-md" style={{ color: "#991B1B" }}>
          {locateError}
        </p>
      ) : null}
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
