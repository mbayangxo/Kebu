import { describe, expect, it } from "vitest";
import { commentPreview, createCommentSchema } from "@/lib/studio/design-comments";
import { liveCursorColorForUser } from "@/lib/studio/live-cursors";

describe("Studio comments (S20)", () => {
  it("validates comment body", () => {
    expect(createCommentSchema.parse({ body: "  Looks good  " }).body).toBe("Looks good");
    expect(() => createCommentSchema.parse({ body: "" })).toThrow();
    expect(commentPreview("a".repeat(100)).endsWith("…")).toBe(true);
  });
});

describe("Studio live cursors (S9b)", () => {
  it("assigns stable colors per user id", () => {
    const a = liveCursorColorForUser("user-a");
    const b = liveCursorColorForUser("user-a");
    expect(a).toBe(b);
    expect(a.startsWith("#")).toBe(true);
  });
});
