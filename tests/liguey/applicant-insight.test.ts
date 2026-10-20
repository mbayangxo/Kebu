import { beforeEach, describe, expect, it, vi } from "vitest";

const yandeStructured = vi.hoisted(() => vi.fn());
vi.mock("@/lib/yande/gateway", () => ({ yandeStructured }));

import { generateApplicantInsight } from "@/lib/liguey/applicant-insight";

const baseInput = {
  listing: { title: "Community translator", description: "Translate community notices.", requirements: "Wolof and French.", employmentType: "contract", locationType: "remote" },
  applicant: { headline: "Wolof-French translator", bio: "Six years of informal translation.", skills: ["translation"], languages: ["Wolof", "French"], experience: [] },
  coverNote: "I would love to help.",
  userId: "11111111-1111-4111-8111-111111111111",
};

beforeEach(() => vi.clearAllMocks());

describe("generateApplicantInsight", () => {
  it("calls the shared Yande gateway with the right feature tag, caller, schema data — and never fabricates a score", async () => {
    yandeStructured.mockResolvedValue({
      output: {
        summary: "Strong informal translation background matching the listing's language needs.",
        strengths: ["Fluent in both required languages", "Multi-year informal experience"],
        questionsToAsk: ["Can you share an example of a past translation?"],
        caution: "",
      },
      model: "test-model",
      inputTokens: 10,
      outputTokens: 20,
    });

    const result = await generateApplicantInsight(baseInput);

    expect(yandeStructured).toHaveBeenCalledWith(expect.objectContaining({
      feature: "liguey_applicant_insight",
      userId: baseInput.userId,
      data: { listing: baseInput.listing, applicant: baseInput.applicant, coverNote: baseInput.coverNote },
    }));
    expect(result.summary).toContain("informal translation");
    expect(result.strengths).toHaveLength(2);
    expect(result.model).toBe("test-model");
    expect(result).not.toHaveProperty("score");
    expect(result).not.toHaveProperty("matchPercentage");
  });

  it("surfaces a real gateway error rather than swallowing it", async () => {
    yandeStructured.mockRejectedValue(new Error("Yande is not configured on this server yet (missing AI key)."));
    await expect(generateApplicantInsight(baseInput)).rejects.toThrow("Yande is not configured");
  });
});
