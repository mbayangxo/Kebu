vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => { throw new Error("Unexpected privileged client in boundary test"); }) }));
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), project: vi.fn(), hosting: vi.fn(), activate: vi.fn(), publish: vi.fn(), rate: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/create/auth", () => ({ requireUser: mocks.auth, logCreate: vi.fn() }));
vi.mock("@/lib/api-guard", () => ({ builderRateLimit: mocks.rate }));
vi.mock("@/lib/billing/subscriptions", () => ({ projectHasLiveHosting: mocks.hosting, ensureFreeHostingEntitlement: mocks.activate }));
vi.mock("@/lib/create/go-live", () => ({ goLiveWebsiteProject: mocks.publish }));
vi.mock("@/lib/kebu-id/create-registration", () => ({ recalculateAndStoreReadiness: vi.fn() }));
import { POST } from "@/app/api/projects/[id]/publish/route";
import { replaceWebsiteDefinition } from "@/lib/create/persist-site";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { uuidFor } from "./helpers";
const projectId = uuidFor(1, 0x94);
let db: { from: ReturnType<typeof vi.fn> };
beforeEach(() => {
  vi.clearAllMocks(); mocks.rate.mockReturnValue(null); mocks.hosting.mockResolvedValue(true);
  const query = { select: vi.fn(), eq: vi.fn(), maybeSingle: mocks.project };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
  db = { from: vi.fn().mockReturnValue(query) };
  mocks.auth.mockResolvedValue({ supabase: db, user: { id: "owner" } });
  mocks.project.mockResolvedValue({ data: { id: projectId, owner_id: "owner", document_schema_version: "kcd-1", subdomain: "local-fixture" }, error: null });
  mocks.publish.mockResolvedValue({ ok: true, publicPath: "/sites/local-fixture" });
});
const request = () => new Request("https://kebu.test", { method: "POST", headers: { origin: "https://kebu.test", host: "kebu.test" }, body: "{}" });
describe("no silent legacy publish/replacement fallback", () => {
  it("blocks KCD publish before hosting activation or legacy go-live unless QA-native publishing is explicitly enabled", async () => {
    expect((await POST(request(), { params: Promise.resolve({ id: projectId }) }))?.status).toBe(409);
    expect(mocks.hosting).not.toHaveBeenCalled(); expect(mocks.activate).not.toHaveBeenCalled(); expect(mocks.publish).not.toHaveBeenCalled();
  });
  it("retains the legacy publisher for existing 3B projects", async () => {
    const result = await mocks.project(); result.data.document_schema_version = null;
    expect((await POST(request(), { params: Promise.resolve({ id: projectId }) }))?.status).toBe(200);
    expect(mocks.publish).toHaveBeenCalledTimes(1);
  });
  it("refuses whole-site replacement before deleting any KCD rows", async () => {
    const result = await replaceWebsiteDefinition({ supabase: db as unknown as SupabaseClient, user: { id: "owner" }, projectId, definition: {} as WebsiteDefinition });
    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(db.from).toHaveBeenCalledTimes(1); expect(db.from).toHaveBeenCalledWith("projects");
  });
});

afterEach(()=>vi.unstubAllEnvs());
it("allows QA-native publishing through the owned, billed route and returns conflict status",async()=>{
 vi.stubEnv("KEBU_KCD_RENDER","all");vi.stubEnv("KEBU_KCD_OPERATIONS","all");vi.stubEnv("VERCEL_ENV","preview");vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","https://qa.test");
 mocks.publish.mockResolvedValue({ok:false,status:409,error:"Draft changed"});
 expect((await POST(request(),{params:Promise.resolve({id:projectId})})).status).toBe(409);expect(mocks.hosting).toHaveBeenCalled();expect(mocks.publish).toHaveBeenCalled();
});
