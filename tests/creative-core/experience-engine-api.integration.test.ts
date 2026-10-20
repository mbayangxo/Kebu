import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { emptyDocument, PAGE_A, uuidFor } from "./helpers";
import { documentVersions } from "@/lib/create/experience-engine";
const m = vi.hoisted(() => ({ auth: vi.fn(), rate: vi.fn(), configured: vi.fn(), model: vi.fn(), context: vi.fn(), meter: vi.fn(), service: vi.fn(), rpc: vi.fn(), insert: vi.fn(), read: vi.fn(), calls: [] as string[] }));
vi.mock("@/lib/create/experience-dna-access", () => ({ authorizeExperienceProject: m.auth }));
vi.mock("@/lib/api-guard", () => ({ builderRateLimit: m.rate }));
vi.mock("@/lib/create/experience-model-gateway", () => ({ experienceModelConfigured: m.configured, assertExperienceModelInput: (input: unknown) => { if (new TextEncoder().encode(JSON.stringify(input)).length > 60000) throw Error("Too large"); }, requestExperienceModel: m.model }));
vi.mock("@/lib/create/experience-engine-context", () => ({ loadExperienceContext: m.context, ExperienceContextError: class extends Error { constructor(message: string, readonly status: number) { super(message); } } }));
vi.mock("@/lib/billing/ai-metering", () => ({ getAiMeterStatus: m.meter }));
vi.mock("@/lib/opportunity/admin", () => ({ createServiceClient: m.service }));
import { GET, POST } from "@/app/api/projects/[id]/experience-engine/route";
const projectId = "11111111-1111-4111-8111-111111111111", refId = uuidFor(16);
const params = { params: Promise.resolve({ id: projectId }) };
const analysis = { version: 1, observations: [{ evidence: "Work", observation: "The source names work", inference: false }], uncertainties: [] };
const original = () => ({ id: refId, projectId, kind: "reference", createdAt: "2026-10-09T00:00:00.000Z", model: "controlled-model", label: "Source", excerpt: "Work for artists", analysis });
const request = (body: unknown, origin = "https://kebu.test") => new Request(`https://kebu.test/api/projects/${projectId}/experience-engine`, { method: "POST", headers: { "Content-Type": "application/json", origin, host: "kebu.test" }, body: JSON.stringify(body) });
function context() { const document = emptyDocument(); document.meta.documentSchemaVersion = "kcd-1"; return { document, record: { revision: 1, dna: { version: 1, goal: "Introduce work", audience: "Artists", visitorAction: "Understand the work", experience: "Editorial", references: [], pages: [{ slug: "home", title: "Home", purpose: "Introduce the work" }] } }, profile: null, source: { dnaRevision: 1, bindingRevision: 0, profileId: null, profileRevision: 0, versions: documentVersions(document) } }; }
beforeEach(() => {
  vi.clearAllMocks(); m.calls.length = 0;
  const query: Record<string, unknown> = {}; for (const name of ["select", "eq", "order", "in"]) query[name] = vi.fn(() => query); query.maybeSingle = m.read; query.limit = m.read; query.then = (resolve: (value: unknown) => void) => m.read().then(resolve);
  m.auth.mockResolvedValue({ user: { id: uuidFor(11) }, supabase: { from: vi.fn(() => query) } }); m.rate.mockReturnValue(null); m.configured.mockReturnValue(true); m.context.mockImplementation(async () => context()); m.read.mockResolvedValue({ data: [], error: null }); m.meter.mockResolvedValue({ limit: 5 }); m.service.mockReturnValue({ rpc: m.rpc, from: () => ({ insert: m.insert }) }); m.rpc.mockImplementation(async () => { m.calls.push("reserve"); return { data: true, error: null }; }); m.model.mockImplementation(async () => { m.calls.push("model"); return { output: analysis, model: "controlled-model", inputTokens: 10, outputTokens: 12 }; }); m.insert.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());
describe("Experience engine owner API", () => {
  it("denies cross-origin and unauthorized ownership without model/storage calls", async () => {
    expect((await POST(request({ kind: "reference", label: "Source", excerpt: "Work" }, "https://foreign.test"), params)).status).toBe(403);
    m.auth.mockResolvedValue({ error: NextResponse.json({ error: "Owner only" }, { status: 404 }) }); expect((await GET(new Request("https://kebu.test"), params)).status).toBe(404); expect(m.model).not.toHaveBeenCalled(); expect(m.insert).not.toHaveBeenCalled();
  });
  it("reports read errors and incompatible stored data instead of empty success", async () => {
    m.read.mockResolvedValueOnce({ error: { message: "Private diagnostic" }, data: null }); expect((await GET(new Request("https://kebu.test"), params)).status).toBe(503);
    m.read.mockResolvedValueOnce({ error: null, data: [{ id: refId, payload: { ...original(), projectId: uuidFor(88) } }] }); expect((await GET(new Request("https://kebu.test"), params)).status).toBe(422);
  });
  it("does not call the provider for invalid input, missing key or exhausted allowance", async () => {
    expect((await POST(request({ kind: "reference", label: "", excerpt: "Work" }), params)).status).toBe(400); m.configured.mockReturnValue(false); expect((await POST(request({ kind: "reference", label: "Source", excerpt: "Work" }), params)).status).toBe(503); m.configured.mockReturnValue(true); m.rpc.mockResolvedValueOnce({ data: false }); expect((await POST(request({ kind: "reference", label: "Source", excerpt: "Work" }), params)).status).toBe(402); expect(m.model).not.toHaveBeenCalled();
  });
  it("reserves before the provider and saves exact source provenance/actual usage", async () => {
    const result = await POST(request({ kind: "reference", label: "Source", excerpt: "Work for artists" }), params); expect(result.status).toBe(200); expect(m.calls).toEqual(["reserve", "model"]); const payload = (await result.json()).proposal; expect(payload).toMatchObject({ label: "Source", excerpt: "Work for artists", analysis, usage: { inputTokens: 10, outputTokens: 12 } }); expect(m.insert.mock.calls[0][0].payload).toEqual(payload);
  });
  it("refuses invented evidence/provider failure/storage failure without a native write or diagnostic leak", async () => {
    for (const failure of ["evidence", "provider", "storage"]) {
      m.model.mockResolvedValue({ output: failure === "evidence" ? { ...analysis, observations: [{ ...analysis.observations[0], evidence: "Invented" }] } : analysis, model: "controlled-model", inputTokens: 10, outputTokens: 12 });
      if (failure === "provider") m.model.mockRejectedValueOnce(Error("Private-secret-diagnostic")); m.insert.mockResolvedValue({ error: failure === "storage" ? { message: "Private-secret-diagnostic" } : null });
      const result = await POST(request({ kind: "reference", label: "Source", excerpt: "Work" }), params); expect(result.status).toBe(503); expect(await result.text()).not.toContain("Private-secret-diagnostic");
    }
  });
  it("owner review creates immutable provenance without a provider key or charge", async () => {
    m.configured.mockReturnValue(false); m.read.mockResolvedValue({ data: { payload: original() }, error: null });
    const edited = { ...analysis, observations: [{ ...analysis.observations[0], observation: "Owner correction" }] }; const result = await POST(request({ kind: "review", proposalId: refId, analysis: edited }), params); expect(result.status).toBe(200); expect((await result.json()).proposal).toMatchObject({ reviewedFrom: refId, excerpt: "Work for artists", analysis: edited }); expect(m.model).not.toHaveBeenCalled(); expect(m.rpc).not.toHaveBeenCalled();
  });
  it("compiles a native plan with exact proposal identity and refuses changed source", async () => {
    m.model.mockResolvedValue({ output: { version: 1, summary: "Editorial intro", warnings: [], pages: [{ slug: "home", title: "Home", purpose: "Introduce", nodes: [{ type: "section", parent: null, rationale: "Clear root", props: {} }, { type: "text", parent: 0, rationale: "Opening", props: { text: "Work", variant: "heading" }, a11y: { headingLevel: 1 } }] }] }, model: "controlled-model", inputTokens: 10, outputTokens: 12 });
    const input = { kind: "plan", scope: { kind: "page", pageId: PAGE_A, replace: false }, analysisIds: [] }; const result = await POST(request(input), params); expect(result.status).toBe(200); const payload = (await result.json()).proposal; expect(payload.transaction.txId).toBe(payload.id); expect(payload.transaction.origin).toBe("ai");
    m.context.mockResolvedValueOnce(context()).mockResolvedValueOnce({ ...context(), source: { ...context().source, dnaRevision: 2 } }); expect((await POST(request(input), params)).status).toBe(409);
  });
  it("refuses invalid scope before reserving and missing selected references before calling provider", async () => {
    expect((await POST(request({ kind: "plan", scope: { kind: "page", pageId: uuidFor(77), replace: true }, analysisIds: [] }), params)).status).toBe(400); expect(m.rpc).not.toHaveBeenCalled();
    expect((await POST(request({ kind: "plan", scope: { kind: "page", pageId: PAGE_A, replace: false }, analysisIds: [refId] }), params)).status).toBe(503); expect(m.model).not.toHaveBeenCalled();
  });
});
