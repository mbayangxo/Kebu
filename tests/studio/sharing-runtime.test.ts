import { beforeEach, describe, expect, it, vi } from "vitest";
const deps = vi.hoisted(() => ({ auth: vi.fn(), access: vi.fn() }));
vi.mock("@/lib/create/auth", () => ({ requireUser: deps.auth }));
vi.mock("@/lib/studio/design-access", () => ({ resolveStudioDesignAccess: deps.access }));
import { POST as invite } from "@/app/api/create/designs/[id]/collaborators/route";
import { POST as comment } from "@/app/api/create/designs/[id]/comments/route";
import { DELETE as revoke } from "@/app/api/create/designs/[id]/collaborators/[collabId]/route";
const context = { params: Promise.resolve({ id: "design", collabId: "collaborator" }) };
function db(result: { data: unknown; error: unknown }) {
  const write = { update: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn().mockResolvedValue(result) };
  for (const fn of [write.update, write.eq, write.select]) fn.mockReturnValue(write);
  deps.auth.mockResolvedValue({ user: { id: "owner" }, supabase: { from: () => write } }); return write;
}
beforeEach(() => { vi.clearAllMocks(); deps.access.mockResolvedValue({ canShare: true }); });
describe("Studio collaboration write receipts", () => {
  it.each([invite, comment])("refuses cross-origin writes before auth", async mutation => {
    const response = await mutation(new Request("https://kebu.test/api", { method: "POST", headers: { Origin: "https://other.test" } }), context);
    expect(response.status).toBe(403); expect(deps.auth).not.toHaveBeenCalled();
  });
  it("does not report a missing or invisible collaborator as revoked", async () => {
    const write = db({ data: null, error: null }); const response = await revoke(new Request("https://kebu.test/api", { method: "DELETE" }), context);
    expect(response.status).toBe(404); expect(write.eq).toHaveBeenCalledWith("design_id", "design"); expect(write.eq).toHaveBeenCalledWith("id", "collaborator");
  });
  it("confirms successful revocation", async () => {
    db({ data: { id: "collaborator" }, error: null }); const response = await revoke(new Request("https://kebu.test/api", { method: "DELETE" }), context);
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ ok: true });
  });
  it("refuses nonowners without attempting an update", async () => {
    const write = db({ data: { id: "collaborator" }, error: null }); deps.access.mockResolvedValue({ canShare: false });
    expect((await revoke(new Request("https://kebu.test/api", { method: "DELETE" }), context)).status).toBe(403); expect(write.update).not.toHaveBeenCalled();
  });
});
