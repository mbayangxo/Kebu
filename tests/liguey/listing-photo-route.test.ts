import { beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/create/auth", () => ({ requireUser: auth }));
import { POST } from "@/app/api/liguey/employers/[businessId]/listings/[listingId]/photo/route";

const userId = "11111111-1111-4111-8111-111111111111";
const businessId = "22222222-2222-4222-8222-222222222222";
const listingId = "33333333-3333-4333-8333-333333333333";
const ctx = { params: Promise.resolve({ businessId, listingId }) };

function requestWithFile(file?: File) {
  const form = new FormData();
  if (file) form.append("file", file);
  return new Request(`https://kebu.test/api/liguey/employers/${businessId}/listings/${listingId}/photo`, { method: "POST", body: form });
}

function setup(opts: { managerRole?: string | null; uploadError?: unknown; updateError?: unknown } = {}) {
  const memberMaybeSingle = vi.fn().mockResolvedValue({ data: opts.managerRole === undefined ? { role: "founder" } : opts.managerRole === null ? null : { role: opts.managerRole }, error: null });
  const upload = vi.fn().mockResolvedValue({ error: opts.uploadError ?? null });
  const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: "https://cdn.test/listing-photo.jpg" } });
  const updateEq2 = vi.fn().mockResolvedValue({ error: opts.updateError ?? null });
  const updateEq1 = vi.fn(() => ({ eq: updateEq2 }));

  const from = vi.fn((table: string) => {
    if (table === "business_members") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: memberMaybeSingle };
    if (table === "job_listings") return { update: vi.fn(() => ({ eq: updateEq1 })) };
    throw new Error("unexpected table " + table);
  });
  const storage = { from: vi.fn(() => ({ upload, getPublicUrl })) };
  auth.mockResolvedValue({ user: { id: userId }, supabase: { from, storage } });
  return { upload, updateEq1 };
}

beforeEach(() => vi.clearAllMocks());

describe("Liguey listing photo upload route", () => {
  it("uploads a real image to Storage and saves its public URL on the listing", async () => {
    setup();
    const file = new File([new Uint8Array([1, 2, 3])], "photo.jpg", { type: "image/jpeg" });
    const response = await POST(requestWithFile(file), ctx);
    expect(response.status).toBe(200);
    expect((await response.json()).photoUrl).toBe("https://cdn.test/listing-photo.jpg");
  });

  it("rejects a non-manager", async () => {
    setup({ managerRole: "employee" });
    const file = new File([new Uint8Array([1])], "photo.jpg", { type: "image/jpeg" });
    const response = await POST(requestWithFile(file), ctx);
    expect(response.status).toBe(403);
  });

  it("rejects a request with no file", async () => {
    setup();
    const response = await POST(requestWithFile(), ctx);
    expect(response.status).toBe(400);
  });

  it("rejects a file over 3 MB", async () => {
    setup();
    const big = new File([new Uint8Array(3_000_001)], "big.jpg", { type: "image/jpeg" });
    const response = await POST(requestWithFile(big), ctx);
    expect(response.status).toBe(400);
  });

  it("surfaces a real Storage upload failure rather than pretending it worked", async () => {
    setup({ uploadError: { message: "network error" } });
    const file = new File([new Uint8Array([1])], "photo.jpg", { type: "image/jpeg" });
    const response = await POST(requestWithFile(file), ctx);
    expect(response.status).toBe(500);
  });
});
