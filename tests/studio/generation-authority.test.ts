import { NextRequest, NextResponse } from "next/server";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  auth: vi.fn(), meter: vi.fn(), generate: vi.fn(), campaignGenerate: vi.fn(),
  from: vi.fn(), insert: vi.fn(), eq: vi.fn(), missingCampaign: false,
}));
vi.mock("@/lib/create/auth", () => ({ requireUser: h.auth }));
vi.mock("@/lib/api-guard", () => ({ aiRateLimit: () => null, builderRateLimit: () => null }));
vi.mock("@/lib/account/server-workspace", () => ({ loadActiveWorkspaceScope: async () => ({ activeBusinessId: null }) }));
vi.mock("@/lib/billing/ai-metering", () => ({ assertAiGenerationAllowance: h.meter }));
vi.mock("@/lib/studio/ai-generate", async original => ({ ...await original<typeof import("@/lib/studio/ai-generate")>(), generateStudioCampaignWithAi: h.generate }));
vi.mock("@/lib/studio/campaign-project", async original => ({ ...await original<typeof import("@/lib/studio/campaign-project")>(), generateCampaignDesignPack: h.campaignGenerate }));
import { POST as generate } from "@/app/api/studio/generate/route";
import { POST as campaignGenerate } from "@/app/api/studio/campaigns/[id]/generate/route";

const campaign = { id: "campaign", owner_id: "session-owner", business_id: null, brand_kit_id: null, title: "Launch", brief: "Create a launch campaign", goal: "", mood: {}, design_ids: [], video_project_ids: [], meta: {}, status: "draft" };
const supabase = { from: h.from };
beforeEach(() => {
  vi.clearAllMocks(); h.missingCampaign = false;
  vi.stubEnv("ANTHROPIC_API_KEY", "isolated-key");
  h.auth.mockResolvedValue({ supabase, user: { id: "session-owner" } });
  h.meter.mockResolvedValue({ ok: true });
  h.generate.mockResolvedValue({ ok: true, designs: [{ title: "Launch", designType: "instagram_post", canvas: {} }], usedAi: true });
  h.campaignGenerate.mockResolvedValue({ designs: [{ title: "Launch", designType: "instagram_post", canvas: {} }], usedAi: true, fallback: false });
  h.from.mockImplementation((table: string) => {
    const result = { data: table === "create_designs" ? [{ id: "design", title: "Launch", design_type: "instagram_post" }] : campaign, error: null };
    const query = {
      select: vi.fn(() => query), insert: h.insert.mockImplementation(() => query), update: vi.fn(() => query),
      eq: h.eq.mockImplementation(() => query), is: vi.fn(() => query),
      maybeSingle: async () => ({ data: h.missingCampaign ? null : campaign, error: null }),
      single: async () => ({ data: Array.isArray(result.data) ? result.data[0] : result.data, error: null }),
      then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
    };
    return query;
  });
});
afterEach(() => vi.unstubAllEnvs());
const request = () => new NextRequest("http://localhost/api/studio/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: "Create a launch campaign for my business", userId: "forged-owner", owner_id: "forged-owner" }) });
const params = () => ({ params: Promise.resolve({ id: "campaign" }) });

describe("Studio generation authority and allowance", () => {
  it.each(["studio", "campaign"])("rejects a cross-origin %s request before authentication or usage work", async route => {
    const req = request();
    req.headers.set("origin", "https://untrusted.invalid");
    req.headers.set("host", "localhost");
    const response = route === "studio" ? await generate(req) : await campaignGenerate(req, params());
    expect(response.status).toBe(403);
    expect(h.auth).not.toHaveBeenCalled(); expect(h.meter).not.toHaveBeenCalled();
    expect(h.generate).not.toHaveBeenCalled(); expect(h.campaignGenerate).not.toHaveBeenCalled();
  });
  it("takes the generation owner from the session and reserves one attempt", async () => {
    expect((await generate(request())).status).toBe(200);
    expect(h.meter).toHaveBeenCalledExactlyOnceWith(supabase, "session-owner", { action: "studio_generate" });
    expect(h.generate).toHaveBeenCalledExactlyOnceWith(expect.not.objectContaining({ userId: "forged-owner" }), "session-owner");
  });
  it("does not generate or persist when allowance is refused", async () => {
    h.meter.mockResolvedValue({ ok: false, status: 402, error: "Allowance used", upgradeHint: "" });
    expect((await generate(request())).status).toBe(402);
    expect(h.generate).not.toHaveBeenCalled(); expect(h.insert).not.toHaveBeenCalled();
  });
  it("does not reserve a provider attempt for whitespace-only credentials", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "  ");
    h.generate.mockResolvedValue({ ok: true, designs: [{ title: "Launch", designType: "instagram_post", canvas: {} }], usedAi: false, fallback: true });
    const response = await generate(request());
    expect(await response.json()).toMatchObject({ usedAi: false, fallback: true });
    expect(h.meter).toHaveBeenCalledExactlyOnceWith(supabase, "session-owner", undefined);
  });
  it("requires a session before quota or provider work", async () => {
    h.auth.mockResolvedValue({ error: NextResponse.json({ error: "Sign in" }, { status: 401 }) });
    expect((await generate(request())).status).toBe(401);
    expect(h.meter).not.toHaveBeenCalled(); expect(h.generate).not.toHaveBeenCalled();
  });
  it("applies the same allowance to the campaign route and propagates its session owner", async () => {
    expect((await campaignGenerate(request(), params())).status).toBe(200);
    expect(h.meter).toHaveBeenCalledExactlyOnceWith(supabase, "session-owner", { action: "studio_generate" });
    expect(h.campaignGenerate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ userId: "session-owner", campaign: expect.objectContaining({ id: "campaign" }) }));
  });
  it("blocks the campaign provider and writes when allowance is exhausted", async () => {
    h.meter.mockResolvedValue({ ok: false, status: 402, error: "Allowance used", upgradeHint: "" });
    expect((await campaignGenerate(request(), params())).status).toBe(402);
    expect(h.campaignGenerate).not.toHaveBeenCalled(); expect(h.insert).not.toHaveBeenCalled();
  });
  it("does not reserve usage or generate an inaccessible campaign", async () => {
    h.missingCampaign = true;
    expect((await campaignGenerate(request(), params())).status).toBe(404);
    expect(h.meter).not.toHaveBeenCalled(); expect(h.campaignGenerate).not.toHaveBeenCalled();
  });
  it("keeps campaign local-engine responses explicit when no provider is configured", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", " ");
    h.campaignGenerate.mockResolvedValue({ designs: [{ title: "Launch", designType: "instagram_post", canvas: {} }], usedAi: false, fallback: true });
    const response = await campaignGenerate(request(), params());
    expect(await response.json()).toMatchObject({ usedAi: false, fallback: true });
    expect(h.meter).toHaveBeenCalledExactlyOnceWith(supabase, "session-owner", undefined);
  });
});
