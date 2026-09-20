import { describe, expect, it } from "vitest";
import { retryDelaySeconds } from "@/lib/platform/jobs";
import { resolveFeatureFlag, stableRolloutBucket } from "@/lib/platform/feature-flags";

describe("platform durability primitives", () => {
  it("backs jobs off exponentially with a one-hour ceiling", () => {
    expect(retryDelaySeconds(1)).toBe(15);
    expect(retryDelaySeconds(2)).toBe(30);
    expect(retryDelaySeconds(20)).toBeLessThanOrEqual(3600);
  });

  it("keeps rollout assignment deterministic", () => {
    expect(stableRolloutBucket("builder.v2", "user-1")).toBe(stableRolloutBucket("builder.v2", "user-1"));
    expect(resolveFeatureFlag({ enabled: false, rolloutPercent: 100, flagKey: "x", subjectId: "u" })).toBe(false);
    expect(resolveFeatureFlag({ enabled: true, rolloutPercent: 0, flagKey: "x", subjectId: "u", override: true })).toBe(true);
  });
});
