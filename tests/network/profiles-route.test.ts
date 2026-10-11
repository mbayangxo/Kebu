import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { DIRECTORY_FIELDS, networkProfileInput } from "@/lib/network/profile";

const requireUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/create/auth", () => ({ requireUser }));
import { GET, POST } from "@/app/api/network/profiles/route";

const valid = {
  name: "Awa Diallo", location: "Dakar, Senegal", country: "Senegal", sector: "Design",
  headline: "Creating a design studio", building: "A local design studio.",
  offering: "Brand design", looking_for: ["Partner"], stage: "Idea", languages: ["Wolof"],
};
const req = (body: unknown, origin?: string) => new Request("https://kebu.test/api/network/profiles", {
  method: "POST", headers: { "Content-Type": "application/json", host: "kebu.test", ...(origin ? { origin } : {}) },
  body: JSON.stringify({ submission_id: "33333333-3333-4333-8333-333333333333", ...(body as object) }),
});

function db(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(), insert: vi.fn(), single: vi.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.limit.mockResolvedValue(result);
  chain.single.mockResolvedValue(result);
  const supabase = { from: vi.fn().mockReturnValue(chain) };
  requireUser.mockResolvedValue({ user: { id: "owner-1" }, supabase });
  return { chain, supabase };
}
beforeEach(() => vi.clearAllMocks());

describe("Network profile persistence and permissions", () => {
  it("refuses signed-out reads and writes without contacting the database", async () => {
    requireUser.mockResolvedValue({ error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) });
    expect((await GET()).status).toBe(401);
    expect((await POST(req(valid))).status).toBe(401);
  });
  it("rejects foreign browser origins before authentication", async () => {
    expect((await POST(req(valid, "https://other.test"))).status).toBe(403);
    expect(requireUser).not.toHaveBeenCalled();
  });
  it("binds the saved profile to the authenticated user and confirms its row", async () => {
    const { chain } = db({ data: { id: "saved-row" }, error: null });
    const res = await POST(req(valid));
    expect(res.status).toBe(201);
    expect(chain.insert).toHaveBeenCalledWith({ ...valid, id: "33333333-3333-4333-8333-333333333333", user_id: "owner-1", is_visible: true });
    expect(await res.json()).toEqual({ profile: { id: "saved-row" } });
    expect(res.headers.get("cache-control")).toContain("no-store");
  });
  it.each(["user_id", "is_verified", "is_visible", "contact_count"])("rejects client ownership/trust field %s", async field => {
    const { chain } = db({ data: { id: "saved-row" }, error: null });
    expect((await POST(req({ ...valid, [field]: "forged" }))).status).toBe(400);
    expect(chain.insert).not.toHaveBeenCalled();
  });
  it("reports persistence errors rather than claiming success or returning database details", async () => {
    db({ data: null, error: { message: "private database detail" } });
    const res = await POST(req(valid));
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain("private database detail");
  });
  it("does not claim success without a confirmed row", async () => {
    db({ data: null, error: null });
    expect((await POST(req(valid))).status).toBe(503);
  });
  it("confirms an identical retry without creating a second profile", async () => {
    const { chain } = db({ data: null, error: { code: "23505" } });
    chain.single.mockResolvedValueOnce({ data: null, error: { code: "23505" } })
      .mockResolvedValueOnce({ data: { ...valid, id: "saved-row" }, error: null });
    const res = await POST(req(valid));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ profile: { id: "saved-row" } });
    expect(chain.insert).toHaveBeenCalledTimes(1);
    expect(chain.eq).toHaveBeenCalledWith("user_id", "owner-1");
    expect(chain.eq).toHaveBeenCalledWith("id", "33333333-3333-4333-8333-333333333333");
  });
  it.each([null, { ...valid, headline: "Different profile" }])("refuses a duplicate belonging to another owner or changed submission", async saved => {
    const { chain } = db({ data: null, error: { code: "23505" } });
    chain.single.mockResolvedValueOnce({ data: null, error: { code: "23505" } })
      .mockResolvedValueOnce({ data: saved, error: null });
    expect((await POST(req(valid))).status).toBe(409);
  });
  it("does not confirm a retry when reading the earlier save fails", async () => {
    const { chain } = db({ data: null, error: { code: "23505" } });
    chain.single.mockResolvedValueOnce({ data: null, error: { code: "23505" } })
      .mockResolvedValueOnce({ data: null, error: { message: "private database detail" } });
    const res = await POST(req(valid));
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain("private database detail");
  });
  it("handles thrown connection failures", async () => {
    const { chain } = db({ data: null, error: null });
    chain.single.mockRejectedValue(new Error("connection failed"));
    expect((await POST(req(valid))).status).toBe(503);
  });
  it("rejects invalid JSON and oversized requests", async () => {
    db({ data: null, error: null });
    const invalid = new Request("https://kebu.test/api/network/profiles", { method: "POST", body: "{" });
    expect((await POST(invalid)).status).toBe(400);
    expect((await POST(req({ ...valid, building: "x".repeat(16001) }))).status).toBe(413);
  });
  it("rejects blank text, unsupported needs and excessive arrays", () => {
    expect(networkProfileInput.safeParse({ ...valid, name: " " }).success).toBe(false);
    expect(networkProfileInput.safeParse({ ...valid, looking_for: ["Bad"] }).success).toBe(false);
    expect(networkProfileInput.safeParse({ ...valid, languages: Array(21).fill("Wolof") }).success).toBe(false);
  });
  it("reads only visible profile fields and bounds the directory without fake totals", async () => {
    const { chain } = db({ data: [{ id: "member-1" }], error: null });
    const res = await GET();
    expect(chain.select).toHaveBeenCalledWith(DIRECTORY_FIELDS);
    expect(chain.eq).toHaveBeenCalledWith("is_visible", true);
    expect(chain.limit).toHaveBeenCalledWith(501);
    expect(DIRECTORY_FIELDS).not.toContain("user_id");
    expect(await res.json()).toEqual({ profiles: [{ id: "member-1", looking_for: [], languages: [] }], hasMore: false });
  });
  it("handles nullable arrays in existing profiles without inventing a stage", async () => {
    db({ data: [{ ...valid, id: "legacy", looking_for: null, languages: null, stage: null }], error: null });
    const res = await GET();
    const result = await res.json();
    expect(result.profiles[0]).toMatchObject({ looking_for: [], languages: [], stage: null });
  });
  it("labels truncation and treats database failures differently from empty directories", async () => {
    db({ data: Array.from({ length: 501 }, (_, id) => ({ id })), error: null });
    const res = await GET();
    const result = await res.json();
    expect(result.profiles).toHaveLength(500);
    expect(result.hasMore).toBe(true);
    db({ data: null, error: { message: "private detail" } });
    expect((await GET()).status).toBe(503);
  });
});
