import { beforeEach, describe, expect, it, vi } from "vitest";
const deps = vi.hoisted(() => ({ auth: vi.fn(), access: vi.fn(), workspace: vi.fn(), log: vi.fn() }));
vi.mock("@/lib/create/auth", () => ({ requireUser: deps.auth, logCreate: deps.log }));
vi.mock("@/lib/studio/design-access", () => ({ resolveStudioDesignAccess: deps.access }));
vi.mock("@/lib/account/server-workspace", () => ({ loadActiveWorkspaceScope: deps.workspace }));
vi.mock("@/lib/opportunity/admin", () => ({ createServiceClient: () => null }));
vi.mock("@/lib/api-guard", () => ({ builderRateLimit: () => null }));
import { POST } from "@/app/api/studio/upload/route";
const id = "11111111-1111-4111-8111-111111111111";
function setup(options: { libraryError?: boolean; missingReceipt?: boolean; cleanupError?: boolean; businessId?: string | null } = {}) {
  const storage = { upload: vi.fn().mockResolvedValue({ error: null }), getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://assets.test/image.png" } })), remove: vi.fn().mockResolvedValue({ error: options.cleanupError ? { message: "private" } : null }) };
  const library = { insert: vi.fn(), select: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: options.missingReceipt ? null : { id: "receipt" }, error: options.libraryError ? { message: "private" } : null }) };
  library.insert.mockReturnValue(library); library.select.mockReturnValue(library);
  const design = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: { business_id: options.businessId ?? null } }) };
  design.select.mockReturnValue(design); design.eq.mockReturnValue(design);
  deps.auth.mockResolvedValue({ user: { id: "owner" }, supabase: { storage: { from: () => storage }, from: (table: string) => table === "studio_uploads" ? library : design } });
  return { storage, library };
}
function request(designId?: string) {
  const form = new FormData(); form.set("file", new File([new Uint8Array([0x89,0x50,0x4e,0x47,13,10,26,10])], "real.png", { type: "image/png" }));
  if (designId) form.set("designId", designId);
  return new Request("https://kebu.test/api/studio/upload", { method: "POST", body: form });
}
beforeEach(() => { vi.clearAllMocks(); deps.workspace.mockResolvedValue({ activeBusinessId: null }); deps.access.mockResolvedValue({ canEdit: true }); });
describe("Studio upload receipts", () => {
  it("returns success only after storage and library both acknowledge", async () => {
    const { storage, library } = setup(); const response = await POST(request(id));
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ uploadId: "receipt", kind: "image" });
    expect(library.insert).toHaveBeenCalledWith(expect.objectContaining({ owner_id: "owner", business_id: null })); expect(storage.remove).not.toHaveBeenCalled();
  });
  it.each([{ libraryError: true }, { missingReceipt: true }])("removes an unregistered object and reports failure for %j", async options => {
    const { storage } = setup(options); const response = await POST(request()); expect(response.status).toBe(503);
    expect(storage.remove).toHaveBeenCalledWith([expect.stringContaining("owner/studio/misc/")]); expect(await response.text()).not.toContain("private");
  });
  it("records failed compensating cleanup without claiming success", async () => {
    setup({ libraryError: true, cleanupError: true }); expect((await POST(request())).status).toBe(503); expect(deps.log).toHaveBeenCalledWith("studio.upload_cleanup_failed", expect.anything());
  });
  it("refuses invalid design ids instead of silently uploading as miscellaneous", async () => {
    const { storage } = setup(); expect((await POST(request("broken"))).status).toBe(400); expect(storage.upload).not.toHaveBeenCalled();
  });
  it("refuses viewers before storage writes", async () => {
    const { storage } = setup(); deps.access.mockResolvedValue({ canEdit: false }); expect((await POST(request(id))).status).toBe(404); expect(storage.upload).not.toHaveBeenCalled();
  });
  it("refuses a design in another workspace before storage writes", async () => {
    const { storage } = setup({ businessId: id }); expect((await POST(request(id))).status).toBe(409); expect(storage.upload).not.toHaveBeenCalled();
  });
});
