import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const h = vi.hoisted(() => ({
  persist: vi.fn(), generate: vi.fn(), configured: vi.fn(), meter: vi.fn(), seed: vi.fn(),
}));
vi.mock("@/lib/create/auth", () => ({ requireUser: vi.fn(async () => ({ supabase: {}, user: { id: "owner" } })), logCreate: vi.fn() }));
vi.mock("@/lib/api-guard", () => ({ aiRateLimit: () => null }));
vi.mock("@/lib/admin/assert-admin-cookie", () => ({ assertSameOriginMutation: () => null }));
vi.mock("@/lib/create/business-access", () => ({ assertBusinessEditor: vi.fn() }));
vi.mock("@/lib/create/persist-site", () => ({ persistWebsiteDefinition: h.persist }));
vi.mock("@/lib/billing/enforce-limits", () => ({ assertOwnerWebsiteLimit: async () => ({ ok: true }) }));
vi.mock("@/lib/billing/ai-metering", () => ({ assertAiGenerationAllowance: h.meter }));
vi.mock("@/lib/create/ensure-templates", () => ({ ensureTemplatesSeeded: h.seed }));
vi.mock("@/lib/billing/subscriptions", () => ({ templateRequiresPurchase: vi.fn(), userOwnsTemplate: vi.fn() }));
vi.mock("@/lib/create/ai-generate", async (original) => ({ ...await original<typeof import("@/lib/create/ai-generate")>(), generateWebsiteWithAi: h.generate, websiteAiConfigured: h.configured }));
import { POST } from "@/app/api/projects/create-website/route";
import { buildStructuredSiteFromBrief } from "@/lib/create/ai-generate";
import { createWebsiteBriefSchema } from "@/lib/create/website-schema";
const brief = createWebsiteBriefSchema.parse({ mode: "ai", businessName: "May Lècor", category: "music", description: "Design an artist site. Do not use these instructions as copy.", countryCode: "SN", desiredPages: ["home", "music", "videos", "about", "contact"] });
function request(mode = "ai") { return new NextRequest("http://localhost/api/projects/create-website", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...brief, mode }) }); }
beforeEach(() => {
  vi.clearAllMocks(); h.configured.mockReturnValue(true); h.meter.mockResolvedValue({ ok: true });
  h.persist.mockResolvedValue({ ok: true, project: { id: "draft-id" } });
});
describe("website creation generation boundary", () => {
  it("does not seed, reserve usage or persist a project when AI is unconfigured", async () => {
    h.configured.mockReturnValue(false);
    const response = await POST(request());
    expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ code: "AI_UNAVAILABLE" });
    expect(h.meter).not.toHaveBeenCalled(); expect(h.seed).not.toHaveBeenCalled();
    expect(h.generate).not.toHaveBeenCalled(); expect(h.persist).not.toHaveBeenCalled();
  });
  it("returns a provider failure and keeps persistence untouched", async () => {
    h.generate.mockResolvedValue({ ok: false, status: 502, code: "AI_GENERATION_FAILED", error: "Could not finish." });
    const response = await POST(request());
    expect(response.status).toBe(502); expect(h.persist).not.toHaveBeenCalled();
    expect((await response.json()).error).toContain("One AI attempt was reserved");
    expect(h.meter).toHaveBeenCalledWith({}, "owner", { action: "website_ai_generate" });
  });
  it("persists validated generated pages only as a draft", async () => {
    h.generate.mockResolvedValue({ ok: true, definition: buildStructuredSiteFromBrief(brief), usedAi: true, repaired: false });
    const response = await POST(request());
    expect(response.status).toBe(201); expect(await response.json()).toMatchObject({ usedAi: true, usedFallback: false });
    expect(h.persist.mock.calls[0][0].definition.pages.map((page: {slug: string}) => page.slug)).toEqual(brief.desiredPages);
    expect(h.persist.mock.calls[0][0].meta.source).toBe("ai");
  });
  it("keeps explicit blank creation available without AI or AI metering", async () => {
    h.configured.mockReturnValue(false);
    expect((await POST(request("blank"))).status).toBe(201);
    expect(h.generate).not.toHaveBeenCalled(); expect(h.meter).not.toHaveBeenCalled(); expect(h.persist).toHaveBeenCalledOnce();
  });
});
