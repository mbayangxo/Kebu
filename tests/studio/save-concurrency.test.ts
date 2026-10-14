import { beforeEach, describe, expect, it, vi } from "vitest";
const dependencies = vi.hoisted(() => ({ auth: vi.fn(), access: vi.fn(), workspace: vi.fn(), readiness: vi.fn() }));
vi.mock("@/lib/create/auth", () => ({ requireUser: dependencies.auth }));
vi.mock("@/lib/studio/design-access", () => ({ resolveStudioDesignAccess: dependencies.access }));
vi.mock("@/lib/account/server-workspace", () => ({ loadActiveWorkspaceScope: dependencies.workspace }));
vi.mock("@/lib/kebu-id/recalculate-hooks", () => ({ recalculateReadinessForBusiness: dependencies.readiness }));
import { PATCH, DELETE } from "@/app/api/create/designs/[id]/route";
import { PATCH as patchVideo } from "@/app/api/studio/video/[id]/route";
const timestamp = "2026-10-13T18:00:00.000Z";
const context = { params: Promise.resolve({ id: "design-1" }) };
const request = (body: unknown) => new Request("https://kebu.test/api/create/designs/design-1", {
  method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
function database(result: { data: unknown; error: unknown }) {
  const read = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), maybeSingle: vi.fn() };
  const write = { update: vi.fn(), delete: vi.fn(), eq: vi.fn(), is: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() };
  for (const fn of [read.select, read.eq, read.is]) fn.mockReturnValue(read);
  read.maybeSingle.mockResolvedValue({ data: { id: "design-1", business_id: null, updated_at: timestamp }, error: null });
  for (const fn of [write.update, write.delete, write.eq, write.is, write.select]) fn.mockReturnValue(write);
  write.maybeSingle.mockResolvedValue(result);
  const supabase = { from: vi.fn(() => ({ select: read.select, update: write.update, delete: write.delete })) };
  dependencies.auth.mockResolvedValue({ user: { id: "owner" }, supabase });
  return { read, write };
}
beforeEach(() => {
  vi.clearAllMocks();
  dependencies.access.mockResolvedValue({ role: "owner", canEdit: true, canDelete: true });
  dependencies.workspace.mockResolvedValue({ activeBusinessId: null });
});
describe("Studio atomic save guards", () => {
  it("puts the observed revision on the design update itself", async () => {
    const { write } = database({ data: { id: "design-1", updated_at: timestamp }, error: null });
    expect((await PATCH(request({ title: "New title", expectedUpdatedAt: timestamp }), context)).status).toBe(200);
    expect(write.eq).toHaveBeenCalledWith("updated_at", timestamp);
  });
  it("accepts exact UTC-offset database revisions", async () => {
    const { write } = database({ data: { id: "design-1", updated_at: timestamp }, error: null });
    const revision = "2026-10-13T18:00:00.000+00:00";
    expect((await PATCH(request({ title: "Offset save", expectedUpdatedAt: revision }), context)).status).toBe(200);
    expect(write.eq).toHaveBeenCalledWith("updated_at", revision);
  });
  it("protects design updates even when a client omits its version", async () => {
    const { write } = database({ data: { id: "design-1", updated_at: timestamp }, error: null });
    expect((await PATCH(request({ title: "New title" }), context)).status).toBe(200);
    expect(write.eq).toHaveBeenCalledWith("updated_at", timestamp);
  });
  it("returns a recoverable conflict when the version changes between reading and writing", async () => {
    database({ data: null, error: null });
    const response = await PATCH(request({ title: "Late edit", expectedUpdatedAt: timestamp }), context);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "studio_version_conflict" });
    expect(dependencies.readiness).not.toHaveBeenCalled();
  });
  it("retains sub-millisecond client revision precision in the database predicate", async () => {
    const { write, read } = database({ data: null, error: null });
    read.maybeSingle.mockResolvedValue({ data: { id: "design-1", business_id: null, updated_at: "2026-10-13T18:00:00.000456Z" }, error: null });
    const revision = "2026-10-13T18:00:00.000123Z";
    const response = await PATCH(request({ title: "Late edit", expectedUpdatedAt: revision }), context);
    expect(response.status).toBe(409);
    expect(write.eq).toHaveBeenCalledWith("updated_at", revision);
  });
  it("refuses an already-stale design before writing", async () => {
    const { write } = database({ data: null, error: null });
    expect((await PATCH(request({ title: "Late edit", expectedUpdatedAt: "2026-10-12T18:00:00.000Z" }), context)).status).toBe(409);
    expect(write.update).not.toHaveBeenCalled();
  });
  it("keeps a failed deletion from reporting success", async () => {
    database({ data: null, error: { message: "private" } });
    const response = await DELETE(new Request("https://kebu.test/design-1", { method: "DELETE" }), context);
    expect(response.status).toBe(503);
    expect(dependencies.readiness).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain("private");
  });
  it("returns success only for a confirmed deletion", async () => {
    database({ data: { id: "design-1" }, error: null });
    expect((await DELETE(new Request("https://kebu.test/design-1", { method: "DELETE" }), context)).status).toBe(200);
  });
  it("keeps video version and workspace predicates on the write", async () => {
    const { write } = database({ data: null, error: null });
    const response = await patchVideo(request({ title: "Late video", expectedUpdatedAt: timestamp }), context);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "studio_video_version_conflict" });
    expect(write.eq).toHaveBeenCalledWith("updated_at", timestamp);
    expect(write.is).toHaveBeenCalledWith("business_id", null);
  });
});
