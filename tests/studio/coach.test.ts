import { describe, expect, it } from "vitest";
import {
  buildStudioTeachingLessons,
  coachForCreationMode,
} from "@/lib/studio/coach";
import { canvasDocumentSchema, defaultCanvasDocument } from "@/lib/studio/canvas-document";
import { fallbackStudioCampaignPack } from "@/lib/studio/ai-generate";

describe("Studio Teach me coach", () => {
  it("create_for_me has no lessons", () => {
    const coach = coachForCreationMode("create_for_me", {
      designType: "instagram_post",
      businessName: "Baobab",
      headline: "Launch",
    });
    expect(coach?.mode).toBe("create_for_me");
    expect(coach?.lessons).toHaveLength(0);
  });

  it("teach_me explains real design choices", () => {
    const lessons = buildStudioTeachingLessons({
      designType: "flyer",
      businessName: "Baobab Glow",
      headline: "New collection",
      backgroundColor: "#0F0D33",
      accentColor: "#E05A2B",
      prompt: "Luxury Senegalese skincare launch campaign",
    });
    expect(lessons.length).toBeGreaterThanOrEqual(5);
    expect(lessons.some((l) => l.topic === "hierarchy")).toBe(true);
    expect(lessons.some((l) => l.why.includes("Baobab") || l.title.includes("Baobab"))).toBe(true);
  });

  it("fallback pack attaches teach coach when requested", () => {
    const pack = fallbackStudioCampaignPack({
      prompt: "Launch campaign for skincare in Dakar markets",
      businessName: "Baobab",
      creationMode: "teach_me",
    });
    expect(pack.designs[0]!.canvas.coach?.mode).toBe("teach_me");
    expect(pack.designs[0]!.canvas.coach?.lessons.length).toBeGreaterThan(0);
    expect(canvasDocumentSchema.safeParse(pack.designs[0]!.canvas).success).toBe(true);
  });

  it("schema accepts coach on existing docs", () => {
    const doc = defaultCanvasDocument("poster");
    const withCoach = {
      ...doc,
      coach: coachForCreationMode("teach_me", {
        designType: "poster",
        businessName: "X",
        headline: "Hello",
      }),
    };
    expect(canvasDocumentSchema.safeParse(withCoach).success).toBe(true);
  });
});
