import { beforeEach, describe, expect, it, vi } from "vitest";
const deps = vi.hoisted(() => ({ auth: vi.fn(), access: vi.fn(), checkpoint: vi.fn(), readiness: vi.fn(), workspace: vi.fn() }));
vi.mock("@/lib/create/auth", () => ({ requireUser: deps.auth }));
vi.mock("@/lib/studio/design-access", () => ({ resolveStudioDesignAccess: deps.access }));
vi.mock("@/lib/studio/design-version-store", () => ({ insertDesignVersion: deps.checkpoint }));
vi.mock("@/lib/kebu-id/recalculate-hooks", () => ({ recalculateReadinessForBusiness: deps.readiness }));
vi.mock("@/lib/account/server-workspace", () => ({ loadActiveWorkspaceScope: deps.workspace }));
import { POST as restore } from "@/app/api/create/designs/[id]/versions/restore/route";
import { POST as named } from "@/app/api/create/designs/[id]/versions/route";
import { POST as refresh } from "@/app/api/studio/video/[id]/refresh-source-design/route";
import { defaultCanvasDocument } from "@/lib/studio/canvas-document";
import { emptyStudioComposition } from "@/lib/studio/composition";
const revision = "2026-10-13T18:00:00.000123Z", versionId = "11111111-1111-4111-8111-111111111111";
const context = { params: Promise.resolve({ id: "design" }) };
const request = (body: unknown, origin?: string) => new Request("https://kebu.test/api/history", {
  method: "POST", headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(body),
});
function db(writeResult: { data: unknown; error: unknown } = { data: { id: "design", updated_at: revision, composition: emptyStudioComposition({ width: 640, height: 640 }) }, error: null }) {
  const read = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), maybeSingle: vi.fn() };
  const write = { update: vi.fn(), eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() };
  for (const fn of [read.select, read.eq, read.is]) fn.mockReturnValue(read);
  for (const fn of [write.update, write.eq, write.select]) fn.mockReturnValue(write);
  const canvas = defaultCanvasDocument("poster");
  read.maybeSingle.mockResolvedValue({ data: { id: "design", canvas, business_id: null, design_type: "poster", updated_at: revision, composition: emptyStudioComposition({ width: 640, height: 640 }), source_design_id: "design" }, error: null });
  write.maybeSingle.mockResolvedValue(writeResult);
  deps.auth.mockResolvedValue({ user: { id: "owner" }, supabase: { from: vi.fn(() => ({ select: read.select, update: write.update })) } });
  return { read, write };
}
beforeEach(() => {
  vi.clearAllMocks(); deps.access.mockResolvedValue({ canEdit: true });
  deps.checkpoint.mockResolvedValue({ id: "checkpoint" }); deps.workspace.mockResolvedValue({ activeBusinessId: null });
});
describe("Studio history and source refresh mutations", () => {
  it("requires a client revision before restoring", async () => {
    const { write } = db(); expect((await restore(request({ versionId }), context)).status).toBe(400);
    expect(write.update).not.toHaveBeenCalled(); expect(deps.checkpoint).not.toHaveBeenCalled();
  });
  it("preserves a checkpoint and uses the precise revision on the restore write", async () => {
    const { write } = db(); expect((await restore(request({ versionId, expectedUpdatedAt: revision }), context)).status).toBe(200);
    expect(deps.checkpoint).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ source: "pre_restore" }));
    expect(write.eq).toHaveBeenCalledWith("updated_at", revision);
  });
  it("cancels restoration when the safety checkpoint fails", async () => {
    const { write } = db(); deps.checkpoint.mockResolvedValue({ error: "internal", status: 503 });
    const result = await restore(request({ versionId, expectedUpdatedAt: revision }), context);
    expect(result.status).toBe(503); expect(write.update).not.toHaveBeenCalled(); expect(await result.text()).not.toContain("internal");
  });
  it("does not overwrite a design changed during the restore request", async () => {
    db({ data: null, error: null }); const response = await restore(request({ versionId, expectedUpdatedAt: revision }), context);
    expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ code: "studio_version_conflict" }); expect(deps.readiness).not.toHaveBeenCalled();
  });
  it("refuses restore for a viewer", async () => {
    const { write } = db(); deps.access.mockResolvedValue({ canEdit: false });
    expect((await restore(request({ versionId, expectedUpdatedAt: revision }), context)).status).toBe(403); expect(write.update).not.toHaveBeenCalled();
  });
  it("rejects cross-origin named saves before querying authentication", async () => {
    db(); expect((await named(request({ label: "Snapshot" }, "https://other.test"), context)).status).toBe(403); expect(deps.auth).not.toHaveBeenCalled();
  });
  it("does not name an outdated snapshot", async () => {
    db(); expect((await named(request({ label: "Snapshot", expectedUpdatedAt: "2026-10-12T18:00:00Z" }), context)).status).toBe(409); expect(deps.checkpoint).not.toHaveBeenCalled();
  });
  it("refuses malformed named-save JSON", async () => {
    db(); expect((await named(new Request("https://kebu.test/api/history", { method: "POST", body: "{" }), context)).status).toBe(400); expect(deps.checkpoint).not.toHaveBeenCalled();
  });
  it("puts the precise observed video revision on the linked-source write", async () => {
    const { write } = db(); expect((await refresh(request({ expectedUpdatedAt: revision }), context)).status).toBe(200); expect(write.eq).toHaveBeenCalledWith("updated_at", revision);
  });
  it("reports refresh races as recoverable conflicts", async () => {
    db({ data: null, error: null }); const response = await refresh(request({ expectedUpdatedAt: revision }), context);
    expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ code: "studio_video_version_conflict" });
  });
});
