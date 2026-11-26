import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildStructuredSiteFromBrief } from "@/lib/create/ai-generate";
import { aiImproveBriefSchema, createWebsiteBriefSchema } from "@/lib/create/website-schema";
const h = vi.hoisted(() => ({ auth: vi.fn(), meter: vi.fn(), generate: vi.fn(), snapshot: vi.fn(), replace: vi.fn(), project: vi.fn() }));
vi.mock("@/lib/create/auth", () => ({ requireUser: h.auth, logCreate: vi.fn() }));
vi.mock("@/lib/api-guard", () => ({ aiRateLimit: () => null }));
vi.mock("@/lib/billing/ai-metering", () => ({ assertAiGenerationAllowance: h.meter }));
vi.mock("@/lib/create/ai-improve", () => ({ improveWebsiteWithAi: h.generate }));
vi.mock("@/lib/create/persist-site", () => ({ buildSnapshotFromDb: h.snapshot, replaceWebsiteDefinition: h.replace }));
import { POST as legacyPreview } from "@/app/api/projects/[id]/ai-improve/route";
import { POST as preview } from "@/app/api/projects/[id]/ai-improve/preview/route";
import { POST as apply } from "@/app/api/projects/[id]/ai-improve/apply/route";

const owner = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const definition = buildStructuredSiteFromBrief(createWebsiteBriefSchema.parse({ mode: "blank", businessName: "Test artist", category: "music", countryCode: "SN", locale: "en", description: "A portfolio for approved work and supplied artist facts.", desiredPages: ["home"] }));
const supabase = { from: () => {
  const query = { select: () => query, eq: () => query, maybeSingle: h.project };
  return query;
} };
const params = () => ({ params: Promise.resolve({ id: projectId }) });
const request = (body: unknown = { instruction: "Make the headline clearer.", userId: "forged-owner" }, origin = "https://kebu.test") => new NextRequest(`https://kebu.test/api/projects/${projectId}/ai-improve`, { method: "POST", headers: { "Content-Type": "application/json", host: "kebu.test", origin }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("ANTHROPIC_API_KEY", "isolated-key");
  h.auth.mockResolvedValue({ supabase, user: { id: owner } });
  h.project.mockResolvedValue({ data: { id: projectId, owner_id: owner, title: "Test artist" }, error: null });
  h.snapshot.mockResolvedValue(structuredClone(definition)); h.meter.mockResolvedValue({ ok: true });
  h.generate.mockResolvedValue({ ok: true, definition: structuredClone(definition), repaired: false });
  h.replace.mockResolvedValue({ ok: true });
});
afterEach(() => vi.unstubAllEnvs());

describe("AI improvement preview and confirmation boundaries", () => {
  it.each([["legacy", legacyPreview], ["preview", preview]] as const)("%s attributes generation to the owner and only returns a preview", async (_name, handler) => {
    const result = await handler(request(), params());
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ ok: true, preview: true });
    expect(h.generate).toHaveBeenCalledExactlyOnceWith(definition, aiImproveBriefSchema.parse({ instruction: "Make the headline clearer." }), owner);
    expect(h.meter).toHaveBeenCalledExactlyOnceWith(supabase, owner, { action: "website_ai_improve", projectId });
    expect(h.replace).not.toHaveBeenCalled();
  });
  it.each([["legacy", legacyPreview], ["preview", preview], ["apply", apply]] as const)("%s rejects cross-origin requests before auth, usage or persistence", async (_name, handler) => {
    const result = await handler(request({ definition }, "https://untrusted.invalid"), params());
    expect(result.status).toBe(403);
    expect(h.auth).not.toHaveBeenCalled(); expect(h.meter).not.toHaveBeenCalled();
    expect(h.generate).not.toHaveBeenCalled(); expect(h.replace).not.toHaveBeenCalled();
  });
  it.each([["legacy", legacyPreview], ["preview", preview]] as const)("%s refuses missing credentials without a usage reservation", async (_name, handler) => {
    vi.stubEnv("ANTHROPIC_API_KEY", " ");
    const result = await handler(request(), params());
    expect(result.status).toBe(503);
    expect(await result.text()).not.toContain("ANTHROPIC_API_KEY");
    expect(h.meter).not.toHaveBeenCalled(); expect(h.generate).not.toHaveBeenCalled();
  });
  it.each([["legacy", legacyPreview], ["preview", preview]] as const)("%s refuses exhausted allowance before provider work", async (_name, handler) => {
    h.meter.mockResolvedValue({ ok: false, status: 402, error: "Allowance used", upgradeHint: "" });
    expect((await handler(request(), params())).status).toBe(402);
    expect(h.generate).not.toHaveBeenCalled(); expect(h.replace).not.toHaveBeenCalled();
  });
  it.each([["legacy", legacyPreview], ["preview", preview]] as const)("%s requires a signed-in owner", async (_name, handler) => {
    h.auth.mockResolvedValue({ error: NextResponse.json({ error: "Sign in" }, { status: 401 }) });
    expect((await handler(request(), params())).status).toBe(401);
    expect(h.meter).not.toHaveBeenCalled(); expect(h.generate).not.toHaveBeenCalled();
  });
  it.each([["legacy", legacyPreview], ["preview", preview]] as const)("%s rejects another owner's project before loading or charging it", async (_name, handler) => {
    h.project.mockResolvedValue({ data: { id: projectId, owner_id: "other-owner" }, error: null });
    expect((await handler(request(), params())).status).toBe(404);
    expect(h.snapshot).not.toHaveBeenCalled(); expect(h.meter).not.toHaveBeenCalled(); expect(h.generate).not.toHaveBeenCalled();
  });
  it("does not persist a provider failure", async () => {
    h.generate.mockResolvedValue({ ok: false, error: "Could not complete these changes." });
    const response = await preview(request(), params());
    expect(response.status).toBe(502);
    expect(await response.text()).toContain("One AI attempt was reserved");
    expect(h.replace).not.toHaveBeenCalled();
  });
});
