import { beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/create/auth", () => ({ requireUser: auth }));
import { GET, POST, PATCH } from "@/app/api/liguey/applications/route";

const userId = "11111111-1111-4111-8111-111111111111";
const listingId = "22222222-2222-4222-8222-222222222222";
const businessId = "33333333-3333-4333-8333-333333333333";
const applicationId = "44444444-4444-4444-8444-444444444444";
const applicationRow = { id: applicationId, listing_id: listingId, business_id: businessId, applicant_user_id: userId, cover_note: "Interested", status: "submitted" };

const request = (method: string, body?: unknown) =>
  new Request("https://kebu.test/api/liguey/applications", { method, headers: { "Content-Type": "application/json" }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });

function setup(opts: { listResult?: { data: unknown; error: unknown }; insertResult?: { data: unknown; error: unknown }; withdrawResult?: { data: unknown; error: unknown } } = {}) {
  const listOrder = vi.fn().mockResolvedValue(opts.listResult ?? { data: [applicationRow], error: null });
  const listingsIn = vi.fn().mockResolvedValue({ data: [{ id: listingId, title: "Translator", status: "published" }], error: null });
  const insertSingle = vi.fn().mockResolvedValue(opts.insertResult ?? { data: applicationRow, error: null });
  const withdrawMaybeSingle = vi.fn().mockResolvedValue(opts.withdrawResult ?? { data: { id: applicationId, status: "withdrawn" }, error: null });
  const from = vi.fn((table: string) => {
    if (table === "job_applications") {
      return {
        select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: listOrder,
        insert: vi.fn(() => ({ select: vi.fn().mockReturnThis(), single: insertSingle })),
        update: vi.fn(() => ({ eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), maybeSingle: withdrawMaybeSingle })),
      };
    }
    if (table === "job_listings") return { select: vi.fn().mockReturnThis(), in: listingsIn };
    throw new Error("unexpected table " + table);
  });
  auth.mockResolvedValue({ user: { id: userId }, supabase: { from } });
}

beforeEach(() => vi.clearAllMocks());

describe("Liguey applicant applications route", () => {
  it("lists the worker's own applications with listing titles", async () => {
    setup();
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.applications).toHaveLength(1);
    expect(body.listings[0]).toMatchObject({ title: "Translator" });
  });

  it("submits an application", async () => {
    setup();
    const response = await POST(request("POST", { listingId, businessId, coverNote: "Interested" }));
    expect(response.status).toBe(201);
  });

  it("reports a duplicate application as a conflict", async () => {
    setup({ insertResult: { data: null, error: { code: "23505" } } });
    const response = await POST(request("POST", { listingId, businessId }));
    expect(response.status).toBe(409);
  });

  it("refuses applying to a listing that isn't actually open (RLS rejects the insert)", async () => {
    setup({ insertResult: { data: null, error: { message: "row-level security" } } });
    const response = await POST(request("POST", { listingId, businessId }));
    expect(response.status).toBe(403);
  });

  it("rejects an invalid submission payload", async () => {
    setup();
    const response = await POST(request("POST", { listingId: "not-a-uuid" }));
    expect(response.status).toBe(400);
  });

  it("withdraws the worker's own application", async () => {
    setup();
    const response = await PATCH(request("PATCH", { applicationId }));
    expect(response.status).toBe(200);
    expect((await response.json()).application.status).toBe("withdrawn");
  });

  it("404s withdrawing an application that isn't the worker's own", async () => {
    setup({ withdrawResult: { data: null, error: null } });
    const response = await PATCH(request("PATCH", { applicationId }));
    expect(response.status).toBe(404);
  });

  it("rejects cross-origin mutation before auth", async () => {
    const response = await POST(new Request("https://kebu.test/api/liguey/applications", { method: "POST", headers: { Origin: "https://other.test" } }));
    expect(response.status).toBe(403);
    expect(auth).not.toHaveBeenCalled();
  });
});
