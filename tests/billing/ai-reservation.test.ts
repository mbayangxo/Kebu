import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ rpc: vi.fn(), tier: vi.fn(), service: vi.fn() }));
vi.mock("@/lib/billing/enforce-limits", () => ({ resolveOwnerBestTier: state.tier }));
vi.mock("@/lib/opportunity/admin", () => ({ createServiceClient: state.service }));
import { assertAiGenerationAllowance } from "@/lib/billing/ai-metering";
import type { SupabaseClient } from "@supabase/supabase-js";
const owner = "11111111-1111-4111-8111-111111111111";
const site = "33333333-3333-4333-8333-333333333333";
function client(count = 0) {
  const query = { select: vi.fn(), eq: vi.fn(), gte: vi.fn() };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
  query.gte.mockResolvedValue({ count, error: null });
  return { from: vi.fn(() => query) } as unknown as SupabaseClient;
}
describe("AI reservation before model work", () => {
  beforeEach(() => { vi.clearAllMocks(); state.tier.mockResolvedValue("free"); state.service.mockReturnValue({ rpc: state.rpc }); state.rpc.mockResolvedValue({ data: true, error: null }); });
  it("returns the RPC's authoritative rejection even when the earlier count had room", async () => {
    state.rpc.mockResolvedValue({ data: false, error: null });
    expect(await assertAiGenerationAllowance(client(), owner, { action: "website_ai_generate" })).toMatchObject({ ok: false, status: 402 });
  });
  it("binds an improve attempt to the authenticated owner and owned project", async () => {
    expect(await assertAiGenerationAllowance(client(), owner, { action: "website_ai_improve", projectId: site })).toMatchObject({ ok: true });
    expect(state.rpc).toHaveBeenCalledWith("reserve_account_ai_generation", { p_owner: owner, p_project: site, p_id: expect.any(String), p_limit: 10, p_action: "website_ai_improve" });
  });
  it("fails closed when metering is unavailable", async () => {
    state.service.mockReturnValue(null);
    expect(await assertAiGenerationAllowance(client(), owner, { action: "studio_generate" })).toMatchObject({ ok: false, status: 503 });
    expect(state.rpc).not.toHaveBeenCalled();
    state.service.mockReturnValue({ rpc: state.rpc }); state.rpc.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    expect(await assertAiGenerationAllowance(client(), owner, { action: "studio_generate" })).toMatchObject({ ok: false, status: 503 });
  });
  it("does not reserve for a deterministic non-model fallback or an exhausted meter", async () => {
    expect(await assertAiGenerationAllowance(client(), owner)).toMatchObject({ ok: true });
    expect(await assertAiGenerationAllowance(client(10), owner, { action: "studio_generate" })).toMatchObject({ ok: false, status: 402 });
    expect(state.rpc).not.toHaveBeenCalled();
  });
});
