import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), access: vi.fn(), dbFor: vi.fn(), seed: vi.fn(), chrome: vi.fn(), protocol: vi.fn() }));
vi.mock("@/lib/create/auth", () => ({ requireUser: mocks.auth, logCreate: vi.fn() }));
vi.mock("@/lib/create/project-access", () => ({ assertProjectEditorAccess: mocks.access, dbForProjectAccess: mocks.dbFor }));
vi.mock("@/lib/create/ensure-project-pages", () => ({ ensureProjectPagesBeforePublish: mocks.seed }));
vi.mock("@/lib/create/site-chrome", async (original) => ({ ...await original<typeof import("@/lib/create/site-chrome")>(), loadOrBootstrapSiteChrome: mocks.chrome }));
import { GET } from "@/app/api/projects/[id]/route";
import { PAGE_A, uuidFor } from "./helpers";

const projectId = uuidFor(1, 0x93);
const queries: Record<string, Record<string, ReturnType<typeof vi.fn>>> = {};
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("KEBU_KCD_RENDER", "all"); vi.stubEnv("VERCEL_ENV", "development");
  const project = { id: projectId, title: "Draft", document_schema_version: "kcd-1", owner_id: "owner", site_password_hash: "must-not-leak" };
  mocks.auth.mockResolvedValue({ supabase: {}, user: { id: "owner" } });
  mocks.access.mockResolvedValue({ project, via: "owner" }); mocks.seed.mockResolvedValue({ synced: false }); mocks.chrome.mockResolvedValue({ enabled: false });
  const data: Record<string, unknown> = {
    project_pages: [{ id: PAGE_A, slug: "home", title: "Home", sort_order: 0, layout_version: 4 }],
    project_sections: [{ id: uuidFor(2, 0x93), page_id: PAGE_A, section_type: "hero", sort_order: 0, props: { heading: "Saved" }, parent_id: null, order_key: "V", node_version: 7, type_version: 1 }],
    deployments: null,
  };
  mocks.protocol.mockResolvedValue({ data: 3, error: null });
  const db = { rpc: mocks.protocol, from: vi.fn((table: string) => {
    const query: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of ["select", "eq", "in", "is", "order", "limit", "returns"]) query[method] = vi.fn(() => query);
    query.maybeSingle = vi.fn(async () => ({ data: data[table], error: null }));
    query.then = vi.fn((resolve) => Promise.resolve({ data: data[table], error: null }).then(resolve));
    queries[table] = query; return query;
  }) };
  mocks.dbFor.mockReturnValue(db);
});
afterEach(() => vi.unstubAllEnvs());
describe("operation project loading", () => {
  it("preserves storage versions/placement and never resyncs a KCD draft from seeds", async () => {
    const response = await GET(new Request("https://kebu.test"), { params: Promise.resolve({ id: projectId }) });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.project.document_schema_version).toBe("kcd-1");
    expect(payload.project.site_password_hash).toBeUndefined();
    expect(payload.sections[0]).toMatchObject({ node_version: 7, type_version: 1, order_key: "V", parent_id: null });
    expect(payload.pages[0].layout_version).toBe(4);
    expect(mocks.seed).not.toHaveBeenCalled();
    expect(queries.project_pages.select).toHaveBeenCalledWith(expect.stringContaining("kcd_unknown"));
    expect(queries.project_sections.is).not.toHaveBeenCalled();
    expect(queries.project_sections.select).toHaveBeenCalledWith(expect.stringContaining("node_version"));
  });
  it.each([2, null])("preserves S4 reading before page protocol %s is installed", async (protocol) => {
    mocks.protocol.mockResolvedValue({ data: protocol, error: protocol === null ? { message: "Not installed" } : null });
    expect((await GET(new Request("https://kebu.test"), { params: Promise.resolve({ id: projectId }) })).status).toBe(200);
    expect(queries.project_pages.select).toHaveBeenCalledWith(expect.stringContaining("layout_version"));
    expect(queries.project_pages.select).not.toHaveBeenCalledWith(expect.stringContaining("kcd_unknown"));
    expect(queries.project_pages.select).not.toHaveBeenCalledWith(expect.stringContaining("order_key"));
  });
  it("retains the original 3B root-only query and explicit seed path", async () => {
    const access = await mocks.access(); access.project.document_schema_version = null;
    const response = await GET(new Request("https://kebu.test"), { params: Promise.resolve({ id: projectId }) });
    expect(response.status).toBe(200); expect(mocks.seed).toHaveBeenCalledTimes(1); expect(mocks.protocol).not.toHaveBeenCalled();
    expect(queries.project_sections.is).toHaveBeenCalledWith("parent_id", null);
    expect(queries.project_sections.select).not.toHaveBeenCalledWith(expect.stringContaining("node_version"));
  });
});
