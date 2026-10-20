import { beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/create/auth", () => ({ requireUser: auth }));
import { GET as browseGet } from "@/app/api/studio/creative-assets/route";
import { GET as devGet, POST as devPost } from "@/app/api/studio/creative-assets/developer/route";
import { PATCH as statusPatch } from "@/app/api/studio/creative-assets/[id]/route";
import { POST as acquirePost } from "@/app/api/studio/creative-assets/[id]/acquire/route";

const userId = "11111111-1111-4111-8111-111111111111";
const devProfileId = "22222222-2222-4222-8222-222222222222";
const assetId = "33333333-3333-4333-8333-333333333333";

const devProfileRow = { id: devProfileId, user_id: userId, display_name: "Dev", bio: null, website_url: null, status: "approved", created_at: "2026-10-20T00:00:00Z" };
const assetRow = {
  id: assetId, developer_id: devProfileId, slug: "kente-stripe", kind: "pattern", name: "Kente stripe",
  description: null, category: "pattern", tags: [], file_url: "https://files.example/kente.png",
  preview_url: null, license_note: "Free to use in your Kebu designs.", price_cents: 0, acquire_count: 0,
  status: "published", created_at: "2026-10-20T00:00:00Z", updated_at: "2026-10-20T00:00:00Z",
};

function chain(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  builder.select = vi.fn(self);
  builder.eq = vi.fn(self);
  builder.ilike = vi.fn(self);
  builder.order = vi.fn(self);
  builder.limit = vi.fn().mockResolvedValue(result);
  builder.maybeSingle = vi.fn().mockResolvedValue(result);
  builder.single = vi.fn().mockResolvedValue(result);
  builder.insert = vi.fn(self);
  builder.update = vi.fn(self);
  builder.then = undefined;
  return builder;
}

function request(url: string, method: string, body?: unknown) {
  return new Request(url, { method, headers: { "Content-Type": "application/json" }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
}
const ctx = { params: Promise.resolve({ id: assetId }) };

beforeEach(() => vi.clearAllMocks());

describe("Studio creative assets — browse route", () => {
  it("lists published assets", async () => {
    const from = vi.fn(() => chain({ data: [assetRow], error: null }));
    auth.mockResolvedValue({ user: { id: userId }, supabase: { from } });
    const res = await browseGet(request("https://kebu.test/api/studio/creative-assets", "GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].name).toBe("Kente stripe");
    expect(body.items[0]).not.toHaveProperty("fileUrl");
  });
});

describe("Studio creative assets — developer route", () => {
  it("returns an empty profile and no items for a brand new user", async () => {
    const from = vi.fn((table: string) => {
      if (table === "developer_profiles") return chain({ data: null, error: null });
      throw new Error("unexpected table " + table);
    });
    auth.mockResolvedValue({ user: { id: userId }, supabase: { from } });
    const res = await devGet();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profile).toBeNull();
    expect(body.items).toEqual([]);
  });

  it("publishes a new free asset, auto-creating an approved developer profile", async () => {
    const from = vi.fn((table: string) => {
      if (table === "developer_profiles") {
        return { ...chain({ data: null, error: null }), insert: vi.fn(() => chain({ data: devProfileRow, error: null })) };
      }
      if (table === "marketplace_creative_assets") {
        return { ...chain({ data: null, error: null }), insert: vi.fn(() => chain({ data: assetRow, error: null })) };
      }
      throw new Error("unexpected table " + table);
    });
    auth.mockResolvedValue({ user: { id: userId }, supabase: { from } });
    const res = await devPost(
      request("https://kebu.test/api/studio/creative-assets/developer", "POST", {
        kind: "pattern",
        name: "Kente stripe",
        fileUrl: "https://files.example/kente.png",
        publish: true,
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.item.status).toBe("published");
  });

  it("rejects a listing with no kind", async () => {
    const from = vi.fn(() => chain({ data: null, error: null }));
    auth.mockResolvedValue({ user: { id: userId }, supabase: { from } });
    const res = await devPost(
      request("https://kebu.test/api/studio/creative-assets/developer", "POST", { name: "Missing kind", fileUrl: "https://files.example/a.png" }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects a non-url file", async () => {
    const from = vi.fn(() => chain({ data: null, error: null }));
    auth.mockResolvedValue({ user: { id: userId }, supabase: { from } });
    const res = await devPost(
      request("https://kebu.test/api/studio/creative-assets/developer", "POST", { kind: "photo", name: "Bad file", fileUrl: "not-a-url" }),
    );
    expect(res.status).toBe(400);
  });
});

describe("Studio creative assets — status route", () => {
  it("rejects an invalid status value", async () => {
    const from = vi.fn(() => chain({ data: null, error: null }));
    auth.mockResolvedValue({ user: { id: userId }, supabase: { from } });
    const res = await statusPatch(
      request(`https://kebu.test/api/studio/creative-assets/${assetId}`, "PATCH", { status: "deleted" }),
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("404s when the asset is not mine", async () => {
    const from = vi.fn((table: string) => {
      if (table === "developer_profiles") return chain({ data: devProfileRow, error: null });
      if (table === "marketplace_creative_assets") return chain({ data: [], error: null });
      throw new Error("unexpected table " + table);
    });
    auth.mockResolvedValue({ user: { id: userId }, supabase: { from } });
    const res = await statusPatch(
      request(`https://kebu.test/api/studio/creative-assets/${assetId}`, "PATCH", { status: "archived" }),
      ctx,
    );
    expect(res.status).toBe(404);
  });
});

describe("Studio creative assets — acquire route", () => {
  it("adds a free published asset to the caller's library", async () => {
    const from = vi.fn((table: string) => {
      if (table === "marketplace_creative_assets") return chain({ data: { ...assetRow, acquire_count: 0 }, error: null });
      if (table === "creative_asset_library") {
        return { ...chain({ data: null, error: null }), insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }
      throw new Error("unexpected table " + table);
    });
    auth.mockResolvedValue({ user: { id: userId }, supabase: { from } });
    const res = await acquirePost(request(`https://kebu.test/api/studio/creative-assets/${assetId}/acquire`, "POST"), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.alreadyOwned).toBe(false);
  });

  it("404s on an asset that does not exist or is not published", async () => {
    const from = vi.fn((table: string) => {
      if (table === "marketplace_creative_assets") return chain({ data: null, error: null });
      throw new Error("unexpected table " + table);
    });
    auth.mockResolvedValue({ user: { id: userId }, supabase: { from } });
    const res = await acquirePost(request(`https://kebu.test/api/studio/creative-assets/${assetId}/acquire`, "POST"), ctx);
    expect(res.status).toBe(404);
  });
});
