import { beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/create/auth", () => ({ requireUser: auth }));
const createServiceClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/opportunity/admin", () => ({ createServiceClient }));
const generateApplicantInsight = vi.hoisted(() => vi.fn());
vi.mock("@/lib/liguey/applicant-insight", () => ({ generateApplicantInsight }));
import { GET, POST } from "@/app/api/liguey/employers/[businessId]/listings/[listingId]/applications/[applicationId]/insight/route";

const userId = "11111111-1111-4111-8111-111111111111";
const businessId = "22222222-2222-4222-8222-222222222222";
const listingId = "33333333-3333-4333-8333-333333333333";
const applicationId = "44444444-4444-4444-8444-444444444444";
const applicantId = "55555555-5555-4555-8555-555555555555";

const baseUrl = `https://kebu.test/api/liguey/employers/${businessId}/listings/${listingId}/applications/${applicationId}/insight`;
const ctx = { params: Promise.resolve({ businessId, listingId, applicationId }) };

const listingRow = { title: "Community translator", description: "d", requirements: "r", employment_type: "contract", location_type: "remote" };
const applicationRow = { id: applicationId, applicant_user_id: applicantId, cover_note: "Interested" };
const profileRow = { headline: "Translator", bio: "bio", skills: ["translation"], languages: ["Wolof"], experience: [] };
const insightRow = { application_id: applicationId, model: "test-model", summary: "A real summary.", strengths: ["a"], questions_to_ask: ["q"], caution: "" };

function setup(opts: {
  managerRole?: string | null;
  listing?: typeof listingRow | null;
  application?: typeof applicationRow | null;
  profile?: typeof profileRow | null;
  rpcAllowed?: boolean;
  rpcError?: unknown;
  upsertResult?: { data: unknown; error: unknown };
  getInsight?: { data: unknown; error: unknown };
} = {}) {
  const memberMaybeSingle = vi.fn().mockResolvedValue({ data: opts.managerRole === undefined ? { role: "founder" } : opts.managerRole === null ? null : { role: opts.managerRole }, error: null });
  const listingMaybeSingle = vi.fn().mockResolvedValue({ data: opts.listing === undefined ? listingRow : opts.listing, error: null });
  const applicationMaybeSingle = vi.fn().mockResolvedValue({ data: opts.application === undefined ? applicationRow : opts.application, error: null });
  const profileMaybeSingle = vi.fn().mockResolvedValue({ data: opts.profile === undefined ? profileRow : opts.profile, error: null });
  const insightMaybeSingle = vi.fn().mockResolvedValue(opts.getInsight ?? { data: null, error: null });
  const upsertSingle = vi.fn().mockResolvedValue(opts.upsertResult ?? { data: insightRow, error: null });
  const rpc = vi.fn().mockResolvedValue(opts.rpcError ? { data: null, error: opts.rpcError } : { data: opts.rpcAllowed ?? true, error: null });

  const from = vi.fn((table: string) => {
    if (table === "business_members") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: memberMaybeSingle };
    if (table === "job_listings") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: listingMaybeSingle };
    if (table === "job_applications") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: applicationMaybeSingle };
    if (table === "worker_profiles") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: profileMaybeSingle };
    if (table === "liguey_applicant_insights") {
      return {
        select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: insightMaybeSingle,
        upsert: vi.fn(() => ({ select: vi.fn().mockReturnThis(), single: upsertSingle })),
      };
    }
    throw new Error("unexpected table " + table);
  });
  auth.mockResolvedValue({ user: { id: userId }, supabase: { from } });
  createServiceClient.mockReturnValue({ rpc });
  return { rpc, upsertSingle };
}

beforeEach(() => vi.clearAllMocks());

describe("Liguey applicant insight route", () => {
  it("GET returns null when no insight has been generated yet", async () => {
    setup();
    const res = await GET(new Request(baseUrl), ctx);
    expect(res.status).toBe(200);
    expect((await res.json()).insight).toBeNull();
  });

  it("POST rejects a non-manager", async () => {
    setup({ managerRole: "employee" });
    const res = await POST(new Request(baseUrl, { method: "POST" }), ctx);
    expect(res.status).toBe(403);
  });

  it("POST 409s when the applicant has no profile to review", async () => {
    setup({ profile: null });
    const res = await POST(new Request(baseUrl, { method: "POST" }), ctx);
    expect(res.status).toBe(409);
  });

  it("POST 429s once the business's monthly Yande limit is reached", async () => {
    setup({ rpcAllowed: false });
    const res = await POST(new Request(baseUrl, { method: "POST" }), ctx);
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe("LIGUEY_AI_LIMIT");
    expect(generateApplicantInsight).not.toHaveBeenCalled();
  });

  it("POST generates and saves a real insight for a manager, grounded in the real listing and profile", async () => {
    setup();
    generateApplicantInsight.mockResolvedValue({ model: "test-model", summary: "A real summary.", strengths: ["a"], questionsToAsk: ["q"], caution: "" });
    const res = await POST(new Request(baseUrl, { method: "POST" }), ctx);
    expect(res.status).toBe(200);
    expect((await res.json()).insight).toMatchObject({ summary: "A real summary." });
    expect(generateApplicantInsight).toHaveBeenCalledWith(expect.objectContaining({
      listing: expect.objectContaining({ title: "Community translator" }),
      applicant: expect.objectContaining({ headline: "Translator" }),
      coverNote: "Interested",
      userId,
    }));
  });

  it("POST surfaces a clean error when Yande itself fails, without saving anything fake", async () => {
    setup();
    generateApplicantInsight.mockRejectedValue(new Error("Yande is not configured for this environment."));
    const res = await POST(new Request(baseUrl, { method: "POST" }), ctx);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("Yande is not configured for this environment.");
  });
});
