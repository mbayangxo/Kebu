import { describe, expect, it } from "vitest";
import { generatePublicAfriqueId, isPublicAfriqueIdFormat } from "@/lib/afrique-id/public-id";
import { eligibilityStatusLabel } from "@/lib/afrique-id/types";

describe("generatePublicAfriqueId", () => {
  it("normalizes country and uses AFRI prefix", () => {
    const id = generatePublicAfriqueId("sn");
    expect(id).toMatch(/^AFRI-SN-01-[A-Z0-9]{6}$/);
    expect(isPublicAfriqueIdFormat(id)).toBe(true);
  });

  it("rejects invalid country codes", () => {
    expect(() => generatePublicAfriqueId("SEN")).toThrow();
  });

  it("generates distinct ids", () => {
    const a = generatePublicAfriqueId("NG");
    const b = generatePublicAfriqueId("NG");
    expect(a).not.toBe(b);
  });
});

describe("eligibilityStatusLabel", () => {
  it("labels unverified plainly", () => {
    expect(eligibilityStatusLabel("unverified")).toBe("Not verified yet");
  });
});
