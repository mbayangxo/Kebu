import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const yandeChat = vi.hoisted(() => vi.fn());
vi.mock("@/lib/yande/gateway", () => ({ yandeChat }));
import {
  buildStructuredSiteFromBrief,
  generateWebsiteWithAi,
  pagesForCategory,
} from "@/lib/create/ai-generate";
import { createWebsiteBriefSchema, validateWebsiteDefinition } from "@/lib/create/website-schema";

const base = {
  mode: "ai" as const,
  businessName: "Shea House",
  category: "beauty",
  description: "We sell shea butter and natural soaps from Burkina Faso, made for skin in Dakar heat.",
  countryCode: "SN",
  locale: "en",
  desiredPages: ["home"],
};

describe("words-to-site brief", () => {
  it("maps fashion/beauty to a shop + about + contact site", () => {
    expect(pagesForCategory("beauty")).toEqual(["home", "shop", "about", "contact"]);
    expect(pagesForCategory("services")).toEqual(["home", "services", "about", "contact"]);
  });

  it("builds a valid multi-page website-v1 from words (no LLM)", () => {
    const brief = createWebsiteBriefSchema.parse(base);
    const def = buildStructuredSiteFromBrief(brief);
    const validated = validateWebsiteDefinition(def);
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    expect(validated.data.pages.map((p) => p.slug)).toEqual(["home", "shop", "about", "contact"]);
    expect(validated.data.pages.every((p) => p.sections.some((s) => s.type === "navigation"))).toBe(true);
  });

  it("falls back to structured pages when Anthropic key is missing", async () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const brief = createWebsiteBriefSchema.parse(base);
    const result = await generateWebsiteWithAi(brief);
    if (prev) process.env.ANTHROPIC_API_KEY = prev;
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.usedAi).toBe(false);
    expect(result.fallback).toBe(true);
    expect(result.definition.pages.length).toBeGreaterThanOrEqual(3);
  });
});

describe("words-to-site via Yande (real gateway call, mocked SDK response)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("calls the shared gateway with the opus model and extended thinking, and uses the returned site as-is when it validates", async () => {
    const brief = createWebsiteBriefSchema.parse(base);
    const validSite = buildStructuredSiteFromBrief(brief);
    yandeChat.mockResolvedValue({ reply: "```json\n" + JSON.stringify(validSite) + "\n```", model: "claude-opus-4-8", inputTokens: 10, outputTokens: 20 });

    const result = await generateWebsiteWithAi(brief, "user-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.usedAi).toBe(true);
    expect(result.repaired).toBe(false);

    expect(yandeChat).toHaveBeenCalledTimes(1);
    expect(yandeChat).toHaveBeenCalledWith(expect.objectContaining({
      feature: "builder_site_generate", userId: "user-1", model: "claude-opus-4-8", thinking: true, maxTokens: 8000,
    }));
  });

  it("retries once with the validation error on invalid output, then succeeds", async () => {
    const brief = createWebsiteBriefSchema.parse(base);
    const validSite = buildStructuredSiteFromBrief(brief);
    yandeChat
      .mockResolvedValueOnce({ reply: JSON.stringify({ schemaVersion: "website-v1" }), model: "claude-opus-4-8", inputTokens: 1, outputTokens: 1 })
      .mockResolvedValueOnce({ reply: JSON.stringify(validSite), model: "claude-opus-4-8", inputTokens: 1, outputTokens: 1 });

    const result = await generateWebsiteWithAi(brief);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.usedAi).toBe(true);
    expect(result.repaired).toBe(true);
    expect(yandeChat).toHaveBeenCalledTimes(2);
    expect(yandeChat.mock.calls[1][0].userMessage).toContain("PREVIOUS OUTPUT FAILED VALIDATION");
  });

  it("falls back to a real structured site, never a fake AI claim, when the gateway keeps failing", async () => {
    const brief = createWebsiteBriefSchema.parse(base);
    yandeChat.mockRejectedValue(new Error("Yande request failed."));
    const result = await generateWebsiteWithAi(brief);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.usedAi).toBe(false);
    expect(result.fallback).toBe(true);
  });
});
