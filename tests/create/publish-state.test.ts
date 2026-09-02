import { describe, expect, it } from "vitest";
import { computePublishState } from "@/lib/create/publish-state";

describe("computePublishState", () => {
  it("marks never-published projects as draft with unpublished changes", () => {
    const state = computePublishState({
      projectUpdatedAt: "2026-01-01T00:00:00.000Z",
      pages: [],
      sections: [],
      liveDeployment: null,
    });
    expect(state.isLive).toBe(false);
    expect(state.hasUnpublishedChanges).toBe(true);
  });

  it("detects edits after publish", () => {
    const state = computePublishState({
      projectUpdatedAt: "2026-01-02T00:00:00.000Z",
      pages: [],
      sections: [{ updated_at: "2026-01-03T00:00:00.000Z" }],
      liveDeployment: {
        published_at: "2026-01-02T00:00:00.000Z",
        public_path: "/sites/demo",
      },
    });
    expect(state.isLive).toBe(true);
    expect(state.hasUnpublishedChanges).toBe(true);
  });

  it("is in sync when draft matches last publish time", () => {
    const state = computePublishState({
      projectUpdatedAt: "2026-01-02T00:00:00.000Z",
      pages: [{ updated_at: "2026-01-02T00:00:00.000Z" }],
      sections: [{ updated_at: "2026-01-01T00:00:00.000Z" }],
      liveDeployment: {
        published_at: "2026-01-02T00:00:00.000Z",
        public_path: "/sites/demo",
      },
    });
    expect(state.isLive).toBe(true);
    expect(state.hasUnpublishedChanges).toBe(false);
  });
});
