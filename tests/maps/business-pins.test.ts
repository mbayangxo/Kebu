/**
 * Real business-pins extraction (lib/maps/business-pins.ts) over the actual
 * published-site definition shape (lib/create/website-schema.ts's "map"
 * section) — not a reimplementation. listPublishedBusinessPins is tested
 * against a mocked Supabase admin client, same convention as
 * tests/library/slides-api.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WebsiteDefinition } from "@/lib/create/website-schema";

const deps = vi.hoisted(() => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/opportunity/admin", () => ({ createServiceClient: deps.createServiceClient }));

import { extractPinFromDefinition, listPublishedBusinessPins } from "@/lib/maps/business-pins";

function definitionWithMapSection(props: Record<string, unknown>, title = "Awa Creative"): WebsiteDefinition {
  return {
    schemaVersion: "website-v1",
    title,
    theme: {} as WebsiteDefinition["theme"],
    pages: [
      {
        slug: "home",
        title: "Home",
        sections: [{ type: "map", props } as WebsiteDefinition["pages"][number]["sections"][number]],
        deviceLayouts: {} as WebsiteDefinition["pages"][number]["deviceLayouts"],
      },
    ],
  } as WebsiteDefinition;
}

describe("extractPinFromDefinition", () => {
  it("extracts a real pin from a site's real 'Find us' map section", () => {
    const definition = definitionWithMapSection({ latitude: 14.6928, longitude: -17.4467, address: "Plateau, Dakar" });
    const pin = extractPinFromDefinition("proj-1", "awa-creative", definition);
    expect(pin).toEqual({
      projectId: "proj-1",
      subdomain: "awa-creative",
      title: "Awa Creative",
      latitude: 14.6928,
      longitude: -17.4467,
      address: "Plateau, Dakar",
      url: "/sites/awa-creative",
    });
  });

  it("does not fabricate a pin when the site has no map section at all", () => {
    const definition: WebsiteDefinition = {
      schemaVersion: "website-v1",
      title: "No Location",
      theme: {} as WebsiteDefinition["theme"],
      pages: [{ slug: "home", title: "Home", sections: [{ type: "hero", props: {} } as WebsiteDefinition["pages"][number]["sections"][number]], deviceLayouts: {} as WebsiteDefinition["pages"][number]["deviceLayouts"] }],
    } as WebsiteDefinition;
    expect(extractPinFromDefinition("proj-2", "no-location", definition)).toBeNull();
  });

  it("respects the owner hiding the map section", () => {
    const definition = definitionWithMapSection({ latitude: 14.6928, longitude: -17.4467, hidden: true });
    expect(extractPinFromDefinition("proj-3", "hidden-map", definition)).toBeNull();
  });

  it("does not fabricate a pin when latitude/longitude are missing or malformed", () => {
    const definition = definitionWithMapSection({ address: "Somewhere" });
    expect(extractPinFromDefinition("proj-4", "no-coords", definition)).toBeNull();
  });

  it("returns null address rather than an empty string", () => {
    const definition = definitionWithMapSection({ latitude: 1, longitude: 2, address: "   " });
    expect(extractPinFromDefinition("proj-5", "blank-address", definition)?.address).toBeNull();
  });
});

function snapshotRow(projectId: string, subdomain: string, definition: WebsiteDefinition) {
  return { project_id: projectId, subdomain, schema_version: "website-v1", content_hash: null, snapshot: definition, published_at: "2026-11-01T00:00:00Z" };
}

function chain(rows: unknown[], error: { message: string } | null = null) {
  const q: Record<string, unknown> = {};
  const methods = ["select", "eq", "order", "limit"];
  for (const m of methods) q[m] = vi.fn(() => q);
  // limit() is the terminal call in listPublishedBusinessPins's query chain.
  (q.limit as ReturnType<typeof vi.fn>).mockImplementation(async () => ({ data: error ? null : rows, error }));
  return q;
}

beforeEach(() => vi.clearAllMocks());

describe("listPublishedBusinessPins", () => {
  it("reports unavailable rather than silently returning an empty list when unconfigured", async () => {
    deps.createServiceClient.mockReturnValue(null);
    const result = await listPublishedBusinessPins();
    expect(result).toEqual({ ok: false, reason: "Maps business-pins source is not configured." });
  });

  it("only queries live deployments, ordered newest-first", async () => {
    const q = chain([]);
    deps.createServiceClient.mockReturnValue({ from: vi.fn(() => q) });
    await listPublishedBusinessPins();
    expect(q.eq).toHaveBeenCalledWith("status", "live");
    expect(q.order).toHaveBeenCalledWith("published_at", { ascending: false });
  });

  it("extracts real pins from genuinely published sites only, deduping per project", async () => {
    const withMap = definitionWithMapSection({ latitude: 14.6928, longitude: -17.4467 }, "Awa Creative");
    const noMap: WebsiteDefinition = { schemaVersion: "website-v1", title: "No Pin", theme: {} as WebsiteDefinition["theme"], pages: [{ slug: "home", title: "Home", sections: [{ type: "hero", props: {} } as WebsiteDefinition["pages"][number]["sections"][number]], deviceLayouts: {} as WebsiteDefinition["pages"][number]["deviceLayouts"] }] } as WebsiteDefinition;

    const q = chain([
      snapshotRow("proj-1", "awa-creative", withMap),
      snapshotRow("proj-2", "no-pin", noMap),
      // A stale duplicate deployment row for the same project must not double-count.
      snapshotRow("proj-1", "awa-creative", withMap),
    ]);
    deps.createServiceClient.mockReturnValue({ from: vi.fn(() => q) });

    const result = await listPublishedBusinessPins();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pins).toHaveLength(1);
      expect(result.pins[0]).toMatchObject({ projectId: "proj-1", subdomain: "awa-creative", title: "Awa Creative" });
    }
  });

  it("renders an empty pin layer correctly when no real site has set a location yet", async () => {
    const q = chain([]);
    deps.createServiceClient.mockReturnValue({ from: vi.fn(() => q) });
    const result = await listPublishedBusinessPins();
    expect(result).toEqual({ ok: true, pins: [] });
  });

  it("surfaces a real database error instead of swallowing it", async () => {
    const q = chain([], { message: "connection refused" });
    deps.createServiceClient.mockReturnValue({ from: vi.fn(() => q) });
    const result = await listPublishedBusinessPins();
    expect(result).toEqual({ ok: false, reason: "Could not load published sites." });
  });
});
