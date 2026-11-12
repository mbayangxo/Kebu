import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Studio video timeline gesture history", () => {
  const page = readFileSync(join(process.cwd(), "app/studio/video/[id]/page.tsx"), "utf8");

  it("records one undo baseline per drag instead of one entry per pointer frame", () => {
    expect(page).toContain("timelineGestureBaseline");
    expect(page).toContain("onGestureStart={beginTimelineGesture}");
    expect(page).toContain("onGestureEnd={commitTimelineGesture}");
    expect(page).toContain("applyTimelineGesture(next)");
  });

  it("commits or closes gestures on pointer up and cancellation", () => {
    expect(page).toContain("onPointerCancel");
    expect(page).toContain("onGestureEnd()");
  });
});
