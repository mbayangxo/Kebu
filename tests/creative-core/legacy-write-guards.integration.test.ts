import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), access: vi.fn(), db: vi.fn(), rate: vi.fn() }));
vi.mock("@/lib/create/auth", () => ({ requireUser: mocks.auth, logCreate: vi.fn() }));
vi.mock("@/lib/create/project-access", () => ({ assertProjectEditorAccess: mocks.access, dbForProjectAccess: mocks.db }));
vi.mock("@/lib/api-guard", () => ({ builderRateLimit: mocks.rate }));
import { POST as add, PATCH as patch, DELETE as remove } from "@/app/api/projects/[id]/sections/route";
import { POST as reorder } from "@/app/api/projects/[id]/sections/reorder/route";
import { POST as batch } from "@/app/api/projects/[id]/sections/batch/route";
import { POST as addPage, PATCH as patchPage, DELETE as removePage } from "@/app/api/projects/[id]/pages/route";
import { rejectLegacySectionWrite } from "@/lib/create/kcd-write-guard";
import { uuidFor } from "./helpers";
const projectId = uuidFor(1, 0x82);
beforeEach(() => {
  vi.clearAllMocks(); mocks.rate.mockReturnValue(null);
  mocks.auth.mockResolvedValue({ supabase: {}, user: { id: "owner" } });
  mocks.access.mockResolvedValue({ via: "owner", project: { id: projectId, document_schema_version: "kcd-1" } });
  mocks.db.mockReturnValue({ from: vi.fn(() => { throw new Error("Legacy write reached storage"); }) });
});
describe("opted-in project mutation boundary", () => {
  it.each([["add", add], ["patch", patch], ["delete", remove], ["reorder", reorder], ["batch", batch], ["page add", addPage], ["page patch", patchPage], ["page delete", removePage]] as const)("refuses legacy %s before reading/writing sections", async (_name, handler) => {
    const request = new Request(`https://kebu.test/api/projects/${projectId}/sections`, { method: "POST", headers: { origin: "https://kebu.test", host: "kebu.test" }, body: "{}" });
    const response = await handler(request, { params: Promise.resolve({ id: projectId }) });
    expect(response?.status).toBe(409);
    expect((await response!.json()).error).toMatch(/operation editing/);
  });
  it("keeps absent/null 3B opt-in unchanged", () => {
    expect(rejectLegacySectionWrite({ id: projectId })).toBeNull();
    expect(rejectLegacySectionWrite({ document_schema_version: null })).toBeNull();
  });
  it("does not reveal the opt-in state before authorization", async () => {
    mocks.access.mockResolvedValue(null);
    expect((await add(new Request("https://kebu.test", { method: "POST" }), { params: Promise.resolve({ id: projectId }) }))?.status).toBe(404);
  });
});
