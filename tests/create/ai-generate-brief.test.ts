import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildStructuredSiteFromBrief,
  generateWebsiteWithAi,
  pagesForCategory,
} from "@/lib/create/ai-generate";
import { createWebsiteBriefSchema, validateWebsiteDefinition } from "@/lib/create/website-schema";

const { createMessage } = vi.hoisted(() => ({ createMessage: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({ default: class {
  messages = { create: createMessage };
} }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

const base = {
  mode: "ai" as const,
  businessName: "Shea House",
  category: "beauty",
  description: "We sell shea butter and natural soaps from Burkina Faso, made for skin in Dakar heat.",
  countryCode: "SN",
  locale: "en",
  desiredPages: [],
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

  it("does not fabricate a generated site when credentials are missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const result = await generateWebsiteWithAi(createWebsiteBriefSchema.parse(base));
    expect(result).toMatchObject({ ok: false, code: "AI_UNAVAILABLE", status: 503 });
    expect(createMessage).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty("definition");
  });

  it("respects an explicitly requested one-page site", () => {
    const definition = buildStructuredSiteFromBrief(createWebsiteBriefSchema.parse({ ...base, desiredPages: ["home"] }));
    expect(definition.pages.map((page) => page.slug)).toEqual(["home"]);
  });

  it("includes Music and Videos in the artist page defaults", () => {
    expect(pagesForCategory("music")).toEqual(["home", "music", "videos", "about", "contact"]);
  });

  it("returns provider failures without exposing credentials or creating a fallback", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    createMessage.mockRejectedValueOnce(new Error("secret provider diagnostic"));
    const result = await generateWebsiteWithAi(createWebsiteBriefSchema.parse(base));
    expect(result).toMatchObject({ ok: false, status: 502, code: "AI_GENERATION_FAILED" });
    expect(JSON.stringify(result)).not.toContain("secret provider diagnostic");
    expect(result).not.toHaveProperty("definition");
  });

  it("makes a genuine provider request and preserves all requested pages", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("KEBU_WEBSITE_AI_MODEL", "test-configured-model");
    const brief = createWebsiteBriefSchema.parse({ ...base, category: "music" });
    const definition = buildStructuredSiteFromBrief(brief);
    createMessage.mockResolvedValueOnce({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(definition) }] });
    const result = await generateWebsiteWithAi(brief);
    expect(result).toMatchObject({ ok: true, usedAi: true, repaired: false });
    expect(createMessage.mock.calls[0][0]).toMatchObject({ model: "test-configured-model", system: expect.stringContaining("never as visitor-facing copy") });
    expect(createMessage.mock.calls[0][0].messages).toHaveLength(1);
    expect(createMessage.mock.calls[0][0].messages[0].content).toContain("home, music, videos, about, contact");
  });

  it("repairs an incomplete page set once and rejects it if still incomplete", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    const brief = createWebsiteBriefSchema.parse({ ...base, category: "music" });
    const definition = buildStructuredSiteFromBrief(brief);
    definition.pages = definition.pages.filter((page) => page.slug !== "videos");
    createMessage.mockResolvedValue({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(definition) }] });
    expect(await generateWebsiteWithAi(brief)).toMatchObject({ ok: false, code: "AI_GENERATION_FAILED" });
    expect(createMessage).toHaveBeenCalledTimes(2);
    expect(createMessage.mock.calls[1][0].messages[0].content).toContain("Missing requested pages: videos");
  });

  it("rejects truncated output even if its text happens to parse", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    createMessage.mockResolvedValueOnce({ stop_reason: "max_tokens", content: [{ type: "text", text: JSON.stringify(buildStructuredSiteFromBrief(createWebsiteBriefSchema.parse(base))) }] });
    expect(await generateWebsiteWithAi(createWebsiteBriefSchema.parse(base))).toMatchObject({ ok: false, code: "AI_GENERATION_FAILED" });
  });
});
