import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const yandeChat = vi.hoisted(() => vi.fn());
vi.mock("@/lib/yande/gateway", () => ({ yandeChat }));
import { improveWebsiteWithAi } from "@/lib/create/ai-improve";
import { buildStructuredSiteFromBrief } from "@/lib/create/ai-generate";
import { aiImproveBriefSchema, createWebsiteBriefSchema } from "@/lib/create/website-schema";

const brief = createWebsiteBriefSchema.parse({
  mode: "ai",
  businessName: "Shea House",
  category: "beauty",
  description: "We sell shea butter and natural soaps.",
  countryCode: "SN",
  locale: "en",
  desiredPages: ["home"],
});
const current = buildStructuredSiteFromBrief(brief);
const improveBrief = aiImproveBriefSchema.parse({ mode: "rewrite", instruction: "Make the headline punchier." });

describe("improveWebsiteWithAi via the shared Yande gateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("refuses to fake an improvement when AI is not configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await improveWebsiteWithAi(current, improveBrief);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("not set up");
    expect(yandeChat).not.toHaveBeenCalled();
  });

  it("calls the shared gateway with the opus model and extended thinking, threading the real user id", async () => {
    const improved = { ...current, title: "Shea House — Rewritten" };
    yandeChat.mockResolvedValue({ reply: JSON.stringify(improved), model: "claude-opus-4-8", inputTokens: 10, outputTokens: 20 });

    const result = await improveWebsiteWithAi(current, improveBrief, "user-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.definition.title).toBe("Shea House — Rewritten");
    expect(result.repaired).toBe(false);

    expect(yandeChat).toHaveBeenCalledWith(expect.objectContaining({
      feature: "builder_site_improve", userId: "user-1", model: "claude-opus-4-8", thinking: true, maxTokens: 8000,
    }));
  });

  it("retries once with the validation error, then fails closed rather than fabricating a result", async () => {
    yandeChat.mockResolvedValue({ reply: JSON.stringify({ schemaVersion: "website-v1" }), model: "claude-opus-4-8", inputTokens: 1, outputTokens: 1 });
    const result = await improveWebsiteWithAi(current, improveBrief);
    expect(result.ok).toBe(false);
    expect(yandeChat).toHaveBeenCalledTimes(2);
    expect(yandeChat.mock.calls[1][0].userMessage).toContain("PREVIOUS OUTPUT FAILED VALIDATION");
  });

  it("surfaces a real gateway failure rather than silently returning the unmodified site", async () => {
    yandeChat.mockRejectedValue(new Error("Yande request failed."));
    const result = await improveWebsiteWithAi(current, improveBrief);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("Yande request failed.");
  });
});
