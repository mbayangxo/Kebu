import { beforeEach, describe, expect, it, vi } from "vitest";
const deps = vi.hoisted(() => ({ auth: vi.fn(), service: vi.fn() }));
vi.mock("@/lib/create/auth", () => ({ requireUser: deps.auth }));
vi.mock("@/lib/opportunity/admin", () => ({ createServiceClient: deps.service }));
vi.mock("@/lib/api-guard", () => ({ builderRateLimit: () => null }));
import { DELETE, POST } from "@/app/api/rooms/[id]/files/route";
import { DELETE as removeShare } from "@/app/api/library/shares/route";
import { POST as sendMail } from "@/app/api/mail/send/route";
const fileId = "11111111-1111-4111-8111-111111111111", roomId = "22222222-2222-4222-8222-222222222222";
const context = { params: Promise.resolve({ id: roomId }) };
function setup(result: { data: unknown; error: unknown }) {
  const read = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: fileId, storage_path: "uploader/rooms/private.pdf" }, error: null }) };
  const write = { delete: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn().mockResolvedValue(result) };
  for(const fn of [read.select,read.eq]) fn.mockReturnValue(read);
  for(const fn of [write.delete,write.eq,write.select]) fn.mockReturnValue(write);
  deps.auth.mockResolvedValue({ user: { id: "viewer" }, supabase: { from: () => ({ select: read.select, delete: write.delete }) } });
  const storage = { remove: vi.fn().mockResolvedValue({ error: null }) };
  deps.service.mockReturnValue({ storage: { from: () => storage } }); return { write, storage };
}
const request = () => new Request(`https://kebu.test/api/rooms/${roomId}/files?fileId=${fileId}`, { method: "DELETE" });
beforeEach(() => { vi.clearAllMocks(); });
describe("Private file and sharing deletion authorization", () => {
  it("does not call privileged storage deletion when RLS refuses the metadata delete", async () => {
    const { storage, write } = setup({ data: null, error: null }); expect((await DELETE(request(),context)).status).toBe(403);
    expect(storage.remove).not.toHaveBeenCalled(); expect(deps.service).not.toHaveBeenCalled(); expect(write.eq).toHaveBeenCalledWith("room_id",roomId);
  });
  it("does not call privileged storage deletion on database failure", async () => {
    const { storage } = setup({ data: null, error: { message: "internal" } }); expect((await DELETE(request(),context)).status).toBe(500); expect(storage.remove).not.toHaveBeenCalled();
  });
  it("only deletes storage after an authorized row is returned", async () => {
    const { storage } = setup({ data: { id: fileId }, error: null }); expect((await DELETE(request(),context)).status).toBe(200); expect(storage.remove).toHaveBeenCalledWith(["uploader/rooms/private.pdf"]);
  });
  it("does not claim an invisible Library share was removed", async () => {
    setup({ data: null, error: null }); expect((await removeShare(new Request(`https://kebu.test/api/library/shares?nodeId=${fileId}&userId=${roomId}`, { method: "DELETE" }))).status).toBe(403);
  });
  it.each([POST, DELETE])("blocks cross-origin Rooms mutations before auth", async route => {
    expect((await route(new Request("https://kebu.test/api", { method: "POST", headers: { Origin: "https://other.test" } }),context)).status).toBe(403); expect(deps.auth).not.toHaveBeenCalled();
  });
  it("blocks cross-origin mail sending before auth or provider access", async () => {
    expect((await sendMail(new Request("https://kebu.test/api/mail/send", { method: "POST", headers: { Origin: "https://other.test" } }))).status).toBe(403); expect(deps.auth).not.toHaveBeenCalled(); expect(deps.service).not.toHaveBeenCalled();
  });
});
