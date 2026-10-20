import { afterEach, describe, expect, it, vi } from "vitest";
import { generateApplicantInsight } from "@/lib/liguey/applicant-insight";

const ORIGINAL_KEY = process.env.ANTHROPIC_API_KEY;
const ORIGINAL_BASE_URL = process.env.ANTHROPIC_BASE_URL;

const baseInput = {
  listing: { title: "Community translator", description: "Translate community notices.", requirements: "Wolof and French.", employmentType: "contract", locationType: "remote" },
  applicant: { headline: "Wolof-French translator", bio: "Six years of informal translation.", skills: ["translation"], languages: ["Wolof", "French"], experience: [] },
  coverNote: "I would love to help.",
};

function messageWithText(text: string) {
  return { content: [{ type: "text", text }] };
}

afterEach(() => {
  vi.restoreAllMocks();
  if (ORIGINAL_KEY === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = ORIGINAL_KEY;
  if (ORIGINAL_BASE_URL === undefined) delete process.env.ANTHROPIC_BASE_URL; else process.env.ANTHROPIC_BASE_URL = ORIGINAL_BASE_URL;
});

describe("generateApplicantInsight", () => {
  it("refuses to fake a result when Yande is not configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(generateApplicantInsight(baseInput)).rejects.toThrow("Yande is not configured for this environment.");
  });

  it("parses a real, well-formed response and never fabricates a numeric score", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const create = vi.fn().mockResolvedValue(messageWithText(JSON.stringify({
      summary: "Strong informal translation background matching the listing's language needs.",
      strengths: ["Fluent in both required languages", "Multi-year informal experience"],
      questionsToAsk: ["Can you share an example of a past translation?"],
      caution: "",
    })));
    vi.doMock("@anthropic-ai/sdk", () => ({ default: class { messages = { create }; } }));
    vi.resetModules();
    const { generateApplicantInsight: freshGenerate } = await import("@/lib/liguey/applicant-insight");
    const result = await freshGenerate(baseInput);
    expect(result.summary).toContain("informal translation");
    expect(result.strengths).toHaveLength(2);
    expect(result).not.toHaveProperty("score");
    expect(result).not.toHaveProperty("matchPercentage");
    vi.doUnmock("@anthropic-ai/sdk");
  });

  it("retries once on malformed JSON, then fails closed without a fake fallback", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const create = vi.fn()
      .mockResolvedValueOnce(messageWithText("not json at all"))
      .mockResolvedValueOnce(messageWithText("still not json"));
    vi.doMock("@anthropic-ai/sdk", () => ({ default: class { messages = { create }; } }));
    vi.resetModules();
    const { generateApplicantInsight: freshGenerate } = await import("@/lib/liguey/applicant-insight");
    await expect(freshGenerate(baseInput)).rejects.toThrow(/unusable response/);
    expect(create).toHaveBeenCalledTimes(2);
    vi.doUnmock("@anthropic-ai/sdk");
  });

  it("surfaces a real provider error rather than swallowing it", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const create = vi.fn().mockRejectedValue(new Error("rate limited"));
    vi.doMock("@anthropic-ai/sdk", () => ({ default: class { messages = { create }; } }));
    vi.resetModules();
    const { generateApplicantInsight: freshGenerate } = await import("@/lib/liguey/applicant-insight");
    await expect(freshGenerate(baseInput)).rejects.toThrow("rate limited");
    vi.doUnmock("@anthropic-ai/sdk");
  });
});
