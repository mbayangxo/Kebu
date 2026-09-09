import { describe, expect, it } from "vitest";
import {
  shouldRecordAutoVersion,
  STUDIO_VERSION_AUTO_MIN_GAP_MS,
  versionsToKeep,
} from "@/lib/studio/design-versions";

describe("Studio design versions (S18)", () => {
  it("gates auto checkpoints by min gap", () => {
    expect(shouldRecordAutoVersion(null)).toBe(true);
    const now = Date.now();
    expect(shouldRecordAutoVersion(new Date(now - 1000).toISOString(), now)).toBe(false);
    expect(
      shouldRecordAutoVersion(new Date(now - STUDIO_VERSION_AUTO_MIN_GAP_MS - 1).toISOString(), now),
    ).toBe(true);
  });

  it("prunes to cap keeping newest first", () => {
    const ids = Array.from({ length: 45 }, (_, i) => `v${i}`);
    const { keep, drop } = versionsToKeep(ids, 40);
    expect(keep).toHaveLength(40);
    expect(drop).toHaveLength(5);
    expect(keep[0]).toBe("v0");
  });
});
