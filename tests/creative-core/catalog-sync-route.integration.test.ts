import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { uuidFor } from "./helpers";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), access: vi.fn(), sync: vi.fn(), rate: vi.fn() }));
vi.mock("@/lib/create/auth", () => ({ requireUser: mocks.auth }));
vi.mock("@/lib/create/assert-project-access", () => ({ assertProjectProductAccess: mocks.access }));
vi.mock("@/lib/create/sync-catalog-to-sections", () => ({ syncCatalogToProductsSections: mocks.sync }));
vi.mock("@/lib/api-guard", () => ({ builderRateLimit: mocks.rate }));
import { GET, POST } from "@/app/api/projects/[id]/catalog-sync/route";
import { POST as addVariant } from "@/app/api/projects/[id]/products/[productId]/variants/route";
import { PATCH as editVariant, DELETE as deleteVariant } from "@/app/api/projects/[id]/products/[productId]/variants/[variantId]/route";
const id = uuidFor(1, 0x72), context = { params: Promise.resolve({ id }) }, db = {};
const request = (origin = "https://kebu.test") => new Request(`https://kebu.test/api/projects/${id}/catalog-sync`, { method: "POST", headers: { origin, host: "kebu.test" } });
beforeEach(() => {
  vi.clearAllMocks(); mocks.auth.mockResolvedValue({ supabase: db, user: { id: "owner" } });
  mocks.access.mockResolvedValue({ ok: true }); mocks.rate.mockReturnValue(null);
  mocks.sync.mockResolvedValue({ status: "synced" });
});
describe("catalog sync retry endpoint", () => {
  it("inspects with no writes on GET and recomputes only projection on POST", async () => {
    const inspected = await GET(request(), context);
    expect(mocks.sync).toHaveBeenLastCalledWith(db, id, true);
    expect(inspected.headers.get("Cache-Control")).toBe("no-store");
    expect(await inspected.json()).toEqual({ catalogSync: { status: "synced" } });
    await POST(request(), context); expect(mocks.sync).toHaveBeenLastCalledWith(db, id, false);
    expect(mocks.access).toHaveBeenCalledWith(db, id, "owner");
  });
  it("reports pending separately from already-saved catalog data", async () => {
    mocks.sync.mockResolvedValue({ status: "pending", message: "Retry sync" });
    const response = await POST(request(), context);
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ catalogSync: { status: "pending" } });
  });
  it("checks origin and rate limits before authorization and synchronization", async () => {
    expect((await POST(request("https://evil.test"), context)).status).toBe(403);
    expect(mocks.auth).not.toHaveBeenCalled(); expect(mocks.sync).not.toHaveBeenCalled();
    mocks.rate.mockReturnValue(NextResponse.json({ error: "Limited" }, { status: 429 }));
    expect((await POST(request(), context)).status).toBe(429); expect(mocks.auth).not.toHaveBeenCalled();
  });
  it("rejects anonymous, inaccessible and invalid project ids without syncing", async () => {
    mocks.auth.mockResolvedValueOnce({ error: NextResponse.json({ error: "Sign in" }, { status: 401 }) });
    expect((await GET(request(), context)).status).toBe(401);
    mocks.access.mockResolvedValueOnce({ ok: false }); expect((await POST(request(), context)).status).toBe(404);
    expect((await POST(request(), { params: Promise.resolve({ id: "invalid" }) })).status).toBe(400);
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("rejects cross-site variant add/edit/delete before auth or any catalog mutation", async () => {
    const params = { params: Promise.resolve({ id, productId: "product", variantId: "variant" }) };
    for (const handler of [addVariant, editVariant, deleteVariant]) {
      expect((await handler(request("https://evil.test"), params)).status).toBe(403);
    }
    expect(mocks.auth).not.toHaveBeenCalled(); expect(mocks.sync).not.toHaveBeenCalled();
  });
});
