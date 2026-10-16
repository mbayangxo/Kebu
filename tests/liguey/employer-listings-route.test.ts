import { beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/create/auth", () => ({ requireUser: auth }));
import { GET, POST } from "@/app/api/liguey/employers/[businessId]/listings/route";

const userId = "11111111-1111-4111-8111-111111111111";
const businessId = "22222222-2222-4222-8222-222222222222";
const listingRow = {
  id: "33333333-3333-4333-8333-333333333333", business_id: businessId, public_id: "job_abc",
  title: "Translator", description: "", requirements: "", employment_type: "contract",
  location_type: "onsite", location: "", status: "draft", created_by: userId,
};

const request = (method: string, body?: unknown) =>
  new Request(`https://kebu.test/api/liguey/employers/${businessId}/listings`, { method, headers: { "Content-Type": "application/json" }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
const ctx = { params: Promise.resolve({ businessId }) };

function setup(opts: { managerRole?: string | null; listResult?: { data: unknown; error: unknown }; insertResult?: { data: unknown; error: unknown } } = {}) {
  const memberMaybeSingle = vi.fn().mockResolvedValue({ data: opts.managerRole === undefined ? { role: "founder" } : opts.managerRole === null ? null : { role: opts.managerRole }, error: null });
  const listOrder = vi.fn().mockResolvedValue(opts.listResult ?? { data: [listingRow], error: null });
  const clashMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const insertSingle = vi.fn().mockResolvedValue(opts.insertResult ?? { data: listingRow, error: null });
  const from = vi.fn((table: string) => {
    if (table === "business_members") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: memberMaybeSingle };
    if (table === "job_listings") {
      return {
        select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: listOrder,
        maybeSingle: clashMaybeSingle, insert: vi.fn(() => ({ select: vi.fn().mockReturnThis(), single: insertSingle })),
      };
    }
    throw new Error("unexpected table " + table);
  });
  auth.mockResolvedValue({ user: { id: userId }, supabase: { from } });
  return { from };
}

beforeEach(() => vi.clearAllMocks());

describe("Liguey employer listings route", () => {
  it("lists a business's listings", async () => {
    setup();
    const response = await GET(request("GET"), ctx);
    expect(response.status).toBe(200);
    expect((await response.json()).listings).toHaveLength(1);
  });

  it("a founder can create a draft listing", async () => {
    setup();
    const response = await POST(request("POST", { title: "Translator", employmentType: "contract" }), ctx);
    expect(response.status).toBe(201);
  });

  it("rejects listing creation from a non-manager role", async () => {
    setup({ managerRole: "employee" });
    const response = await POST(request("POST", { title: "Translator", employmentType: "contract" }), ctx);
    expect(response.status).toBe(403);
  });

  it("rejects listing creation from someone with no membership at all", async () => {
    setup({ managerRole: null });
    const response = await POST(request("POST", { title: "Translator", employmentType: "contract" }), ctx);
    expect(response.status).toBe(403);
  });

  it("rejects an invalid listing payload", async () => {
    setup();
    const response = await POST(request("POST", { title: "" }), ctx);
    expect(response.status).toBe(400);
  });

  it("rejects cross-origin mutation before auth", async () => {
    const response = await POST(new Request(`https://kebu.test/api/liguey/employers/${businessId}/listings`, { method: "POST", headers: { Origin: "https://other.test" } }), ctx);
    expect(response.status).toBe(403);
    expect(auth).not.toHaveBeenCalled();
  });
});
