import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const state = vi.hoisted(() => ({ auth: vi.fn(), meter: vi.fn(), model: vi.fn() }));
vi.mock("@/lib/create/auth", () => ({ requireUser: state.auth }));
vi.mock("@/lib/api-guard", () => ({ aiRateLimit: () => null }));
vi.mock("@/lib/billing/ai-metering", () => ({ assertAiGenerationAllowance: state.meter }));
vi.mock("@/lib/studio/ai-generate", () => ({
  studioGenerateBriefSchema: { safeParse: (data: unknown) => ({ success: true, data }) },
  generateStudioCampaignWithAi: state.model,
}));
import { POST } from "@/app/api/studio/generate/route";
const request = () => new NextRequest("http://localhost/api/studio/generate", { method: "POST", body: JSON.stringify({ prompt: "Create a campaign for my business" }) });
beforeEach(() => { vi.clearAllMocks(); state.auth.mockResolvedValue({ supabase: {}, user: { id: "owner" } }); });
afterEach(() => vi.unstubAllEnvs());
it("does not call the model after an atomic quota rejection", async () => {
  vi.stubEnv("ANTHROPIC_API_KEY", "test-only-placeholder");
  state.meter.mockResolvedValue({ ok: false, status: 402, error: "Allowance used", upgradeHint: "" });
  expect((await POST(request())).status).toBe(402);
  expect(state.meter).toHaveBeenCalledWith({}, "owner", { action: "studio_generate" });
  expect(state.model).not.toHaveBeenCalled();
});
it("does not ask for a provider reservation when no model is configured", async () => {
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  state.meter.mockResolvedValue({ ok: false, status: 503, error: "Usage unavailable", upgradeHint: "" });
  expect((await POST(request())).status).toBe(503);
  expect(state.meter).toHaveBeenCalledWith({}, "owner", undefined);
  expect(state.model).not.toHaveBeenCalled();
});
