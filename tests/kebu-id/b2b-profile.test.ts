import { describe, expect, it } from "vitest";
import { b2bProfileSchema } from "@/lib/kebu-id/b2b-profile";

describe("B2B profile schema", () => {
  it("accepts a minimal wholesale profile", () => {
    const parsed = b2bProfileSchema.parse({
      headline: "Wholesale fabrics — Dakar",
      about: "We supply wax print to retailers across West Africa.",
      isPublished: true,
    });
    expect(parsed.headline).toContain("Wholesale");
  });
});
