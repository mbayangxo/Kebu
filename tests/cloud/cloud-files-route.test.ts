import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({
  auth: vi.fn(), createAdminClient: vi.fn(), maybeNotify: vi.fn(),
}));
vi.mock("@/lib/create/auth", () => ({ requireUser: deps.auth, logCreate: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: deps.createAdminClient }));
vi.mock("@/lib/cloud/storage-notify", () => ({ maybeNotifyCloudStorageThreshold: deps.maybeNotify }));

import { POST as uploadFile } from "@/app/api/cloud/buckets/[bucketId]/files/route";

const owner = "11111111-1111-4111-8111-111111111111";
const bucketId = "22222222-2222-4222-8222-222222222222";

function chain(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  const methods = ["select", "insert", "eq", "gt", "order", "limit", "maybeSingle", "single"];
  for (const m of methods) q[m] = vi.fn(() => q);
  (q.single as ReturnType<typeof vi.fn>).mockImplementation(async () => result);
  (q.maybeSingle as ReturnType<typeof vi.fn>).mockImplementation(async () => result);
  q.then = ((resolve: (v: unknown) => void) => resolve(result)) as unknown;
  return q;
}

function storageMock() {
  return { from: vi.fn(() => ({ upload: vi.fn(async () => ({ error: null })), remove: vi.fn(async () => ({})) })) };
}

function uploadFormData(bytes: number): FormData {
  const fd = new FormData();
  fd.set("file", new File([new Uint8Array(bytes)], "note.txt", { type: "text/plain" }));
  return fd;
}

const params = Promise.resolve({ bucketId });

beforeEach(() => {
  vi.clearAllMocks();
  deps.createAdminClient.mockReturnValue({ fakeAdminClient: true });
  deps.maybeNotify.mockResolvedValue(false);
});

describe("POST /api/cloud/buckets/[bucketId]/files", () => {
  it("rejects a file that exceeds the remaining plan quota", async () => {
    const supabase = {
      from: (table: string) => {
        if (table === "cloud_storage_buckets") return chain({ data: { id: bucketId, visibility: "private" }, error: null });
        if (table === "cloud_storage_files") return chain({ data: [{ size_bytes: 499 * 1024 * 1024 }], error: null });
        if (table === "cloud_deployment_versions") return chain({ data: [], error: null });
        return chain({ data: [], error: null });
      },
      storage: storageMock(),
    };
    deps.auth.mockResolvedValue({ user: { id: owner }, supabase });
    const res = await uploadFile(new Request("https://kebu.test/x", { method: "POST", body: uploadFormData(10 * 1024 * 1024) }), { params });
    expect(res.status).toBe(413);
    expect(deps.maybeNotify).not.toHaveBeenCalled();
  });

  // cloud_storage_files is hit three times per successful upload, in this
  // order, each with a different expected shape: (1) the pre-upload quota
  // select (array), (2) the insert().select().single() for the new file
  // (object), (3) the post-upload quota re-check (array again).
  function supabaseForSuccessfulUpload(usedBytesBeforeUpload: number) {
    let filesCalls = 0;
    const insertedRow = { id: "33333333-3333-4333-8333-333333333333", file_name: "note.txt", mime_type: "text/plain", size_bytes: 10, created_at: "2026-01-01" };
    return {
      from: (table: string) => {
        if (table === "cloud_storage_buckets") return chain({ data: { id: bucketId, visibility: "private" }, error: null });
        if (table === "cloud_deployment_versions") return chain({ data: [], error: null });
        if (table === "cloud_storage_files") {
          filesCalls += 1;
          if (filesCalls === 2) return chain({ data: insertedRow, error: null });
          return chain({ data: [{ size_bytes: usedBytesBeforeUpload }], error: null });
        }
        return chain({ data: [], error: null });
      },
      storage: storageMock(),
    };
  }

  it("uploads a valid file and checks the storage-warning threshold afterward with the real post-upload usage", async () => {
    // 400MB already used; the free tier's 500MB cap makes that 80% exactly.
    const supabase = supabaseForSuccessfulUpload(400 * 1024 * 1024);
    deps.auth.mockResolvedValue({ user: { id: owner }, supabase });
    const res = await uploadFile(new Request("https://kebu.test/x", { method: "POST", body: uploadFormData(10) }), { params });
    expect(res.status).toBe(200);
    expect(deps.maybeNotify).toHaveBeenCalledTimes(1);
    const [adminArg, ownerArg, quotaArg] = deps.maybeNotify.mock.calls[0]!;
    expect(adminArg).toEqual({ fakeAdminClient: true });
    expect(ownerArg).toBe(owner);
    expect(quotaArg.usedBytes).toBe(400 * 1024 * 1024);
  });

  it("still returns the uploaded file even if the storage-warning check itself fails", async () => {
    deps.maybeNotify.mockRejectedValue(new Error("enqueue failed"));
    const supabase = supabaseForSuccessfulUpload(0);
    deps.auth.mockResolvedValue({ user: { id: owner }, supabase });
    const res = await uploadFile(new Request("https://kebu.test/x", { method: "POST", body: uploadFormData(10) }), { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.file.file_name).toBe("note.txt");
  });
});
