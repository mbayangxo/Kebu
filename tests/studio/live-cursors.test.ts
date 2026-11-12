import { describe, expect, it } from "vitest";
import { LIVE_CURSOR_COLORS, liveCursorColorForUser, presenceStateToPeers } from "@/lib/studio/live-cursors";

describe("presenceStateToPeers", () => {
  it("excludes the caller's own presence entry", () => {
    const state = {
      "user-a": [{ userId: "user-a", label: "Me", color: "#000", x: 0.1, y: 0.2, updatedAt: 1 }],
      "user-b": [{ userId: "user-b", label: "Collaborator B", color: "#111", x: 0.4, y: 0.5, updatedAt: 2 }],
    };
    const peers = presenceStateToPeers(state, "user-a");
    expect(peers).toHaveLength(1);
    expect(peers[0]!.userId).toBe("user-b");
  });

  it("drops entries with a missing or non-string userId instead of rendering a broken cursor", () => {
    const state = {
      k1: [{ label: "No id" }],
      k2: [{ userId: 42, label: "Numeric id" }],
      k3: [{ userId: "user-c", label: "Real" }],
    } as unknown as Record<string, Array<Record<string, unknown>>>;
    const peers = presenceStateToPeers(state, "self");
    expect(peers).toHaveLength(1);
    expect(peers[0]!.userId).toBe("user-c");
  });

  it("falls back to a deterministic color and default position/label when metadata is malformed", () => {
    const state = { k: [{ userId: "user-d" }] };
    const peers = presenceStateToPeers(state, "self");
    expect(peers).toHaveLength(1);
    expect(peers[0]).toMatchObject({
      userId: "user-d",
      label: "Collaborator",
      x: 0.5,
      y: 0.5,
      color: liveCursorColorForUser("user-d"),
    });
  });

  it("handles multiple presence keys for the same user (e.g. multi-tab) without duplicating badly", () => {
    const state = {
      k1: [{ userId: "user-e", x: 0.1, y: 0.1 }],
      k2: [{ userId: "user-e", x: 0.9, y: 0.9 }],
    };
    const peers = presenceStateToPeers(state, "self");
    expect(peers).toHaveLength(2);
    expect(peers.every((p) => p.userId === "user-e")).toBe(true);
  });

  it("returns an empty list for an empty presence state", () => {
    expect(presenceStateToPeers({}, "self")).toEqual([]);
  });
});

describe("liveCursorColorForUser", () => {
  it("is deterministic for the same user id", () => {
    expect(liveCursorColorForUser("same-user")).toBe(liveCursorColorForUser("same-user"));
  });

  it("always returns one of the defined palette colors", () => {
    for (const id of ["a", "bb", "ccc", "dddd", "user-123", ""]) {
      expect(LIVE_CURSOR_COLORS).toContain(liveCursorColorForUser(id));
    }
  });
});
