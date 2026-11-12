import { beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/create/auth", () => ({ requireUser: auth }));
import { GET, PATCH } from "@/app/api/liguey/profile/route";

const userId = "11111111-1111-4111-8111-111111111111";
const row = {
  user_id: userId, headline: null, bio: "", skills: [], languages: [], experience: [],
  location: null, country_code: null, remote_eligible: false, availability: null,
  is_discoverable: false, verified_at: null, created_at: "2026-10-16T00:00:00.000Z", updated_at: "2026-10-16T00:00:00.000Z",
};
const request = (method: string, body?: unknown) =>
  new Request("https://kebu.test/api/liguey/profile", { method, headers: { "Content-Type": "application/json" }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });

function setup(opts: { existing?: typeof row | null; insertError?: unknown; updateResult?: typeof row | null } = {}) {
  const select = vi.fn().mockReturnThis();
  const eq = vi.fn().mockReturnThis();
  const maybeSingle = vi.fn().mockResolvedValue({ data: opts.existing === undefined ? null : opts.existing, error: null });
  const insertSingle = vi.fn().mockResolvedValue(opts.insertError ? { data: null, error: opts.insertError } : { data: row, error: null });
  const insert = vi.fn(() => ({ select, single: insertSingle }));
  const updateMaybeSingle = vi.fn().mockResolvedValue({ data: opts.updateResult === undefined ? row : opts.updateResult, error: null });
  const update = vi.fn(() => ({ eq: vi.fn(() => ({ select, maybeSingle: updateMaybeSingle })) }));
  const from = vi.fn(() => ({ select, eq, maybeSingle, insert, update }));
  auth.mockResolvedValue({ user: { id: userId }, supabase: { from } });
  return { from, insert, update, maybeSingle };
}

beforeEach(() => vi.clearAllMocks());

describe("Liguey worker profile route", () => {
  it("creates a profile lazily on first GET when none exists", async () => {
    const { insert } = setup({ existing: null });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalledWith({ user_id: userId });
    const body = await response.json();
    expect(body.profile).toMatchObject({ headline: null, isDiscoverable: false });
  });

  it("returns the existing profile without inserting again", async () => {
    const { insert } = setup({ existing: row });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(insert).not.toHaveBeenCalled();
  });

  it("handles a racing double-create by re-reading instead of failing", async () => {
    const { maybeSingle } = setup({ existing: null, insertError: { code: "23505" } });
    // The route's own re-read after a 23505 should find the row another
    // concurrent request just created, even though this call's initial
    // existence check (first maybeSingle call) saw nothing yet.
    maybeSingle.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: row, error: null });
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it("rejects an update with no recognized fields", async () => {
    setup();
    const response = await PATCH(request("PATCH", {}));
    expect(response.status).toBe(400);
  });

  it("maps camelCase fields to snake_case columns on update", async () => {
    const { update } = setup();
    await PATCH(request("PATCH", { headline: "Open to work", isDiscoverable: true, countryCode: "SN" }));
    expect(update).toHaveBeenCalledWith({ headline: "Open to work", is_discoverable: true, country_code: "SN" });
  });

  it("rejects invalid experience entries", async () => {
    setup();
    const response = await PATCH(request("PATCH", { experience: [{ title: "" }] }));
    expect(response.status).toBe(400);
  });

  it("404s an update when the profile does not exist yet", async () => {
    setup({ updateResult: null });
    const response = await PATCH(request("PATCH", { headline: "x" }));
    expect(response.status).toBe(404);
  });

  it("rejects cross-origin mutation before auth", async () => {
    const response = await PATCH(new Request("https://kebu.test/api/liguey/profile", { method: "PATCH", headers: { Origin: "https://other.test" } }));
    expect(response.status).toBe(403);
    expect(auth).not.toHaveBeenCalled();
  });
});
