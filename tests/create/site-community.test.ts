import { describe, expect, it } from "vitest";
import {
  siteCommunityPostBodySchema,
  siteCommunityModerationSchema,
  threadCommunityPosts,
} from "@/lib/create/site-community";

describe("site community — post schema", () => {
  it("accepts a plain top-level post", () => {
    const parsed = siteCommunityPostBodySchema.safeParse({ body: "hello fans" });
    expect(parsed.success).toBe(true);
  });

  it("rejects an empty post body", () => {
    expect(siteCommunityPostBodySchema.safeParse({ body: "" }).success).toBe(false);
  });

  it("rejects a body over 2000 characters", () => {
    expect(siteCommunityPostBodySchema.safeParse({ body: "x".repeat(2001) }).success).toBe(false);
  });

  it("rejects a non-UUID parentId", () => {
    expect(
      siteCommunityPostBodySchema.safeParse({ body: "reply", parentId: "not-a-uuid" }).success,
    ).toBe(false);
  });

  it("moderation schema requires an explicit boolean", () => {
    expect(siteCommunityModerationSchema.safeParse({ isHidden: true }).success).toBe(true);
    expect(siteCommunityModerationSchema.safeParse({ isHidden: "yes" }).success).toBe(false);
    expect(siteCommunityModerationSchema.safeParse({}).success).toBe(false);
  });
});

describe("site community — threading", () => {
  const base = {
    is_hidden: false,
    user_id: "u1",
  };

  it("nests replies under their parent and sorts replies oldest-first", () => {
    const rows = [
      { id: "p1", parent_id: null, role: "creator", display_name: "May", body: "new single!", ...base, created_at: "2026-01-01T00:00:00Z" },
      { id: "r2", parent_id: "p1", role: "member", display_name: "Fan B", body: "second", ...base, created_at: "2026-01-01T00:02:00Z" },
      { id: "r1", parent_id: "p1", role: "member", display_name: "Fan A", body: "first", ...base, created_at: "2026-01-01T00:01:00Z" },
    ];
    const threaded = threadCommunityPosts(rows, "u1");
    expect(threaded).toHaveLength(1);
    expect(threaded[0]!.id).toBe("p1");
    expect(threaded[0]!.replies.map((r) => r.id)).toEqual(["r1", "r2"]);
  });

  it("sorts top-level posts newest-first", () => {
    const rows = [
      { id: "old", parent_id: null, role: "member", display_name: "Fan", body: "old post", ...base, created_at: "2026-01-01T00:00:00Z" },
      { id: "new", parent_id: null, role: "member", display_name: "Fan", body: "new post", ...base, created_at: "2026-01-02T00:00:00Z" },
    ];
    const threaded = threadCommunityPosts(rows, "u1");
    expect(threaded.map((p) => p.id)).toEqual(["new", "old"]);
  });

  it("marks isMine only for the viewer's own posts", () => {
    const rows = [
      { id: "mine", parent_id: null, role: "member", display_name: "Me", body: "mine", is_hidden: false, user_id: "viewer", created_at: "2026-01-01T00:00:00Z" },
      { id: "theirs", parent_id: null, role: "member", display_name: "Other", body: "theirs", is_hidden: false, user_id: "someone-else", created_at: "2026-01-01T00:00:01Z" },
    ];
    const threaded = threadCommunityPosts(rows, "viewer");
    const mine = threaded.find((p) => p.id === "mine");
    const theirs = threaded.find((p) => p.id === "theirs");
    expect(mine?.isMine).toBe(true);
    expect(theirs?.isMine).toBe(false);
  });
});
