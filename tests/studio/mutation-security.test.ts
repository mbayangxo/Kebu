import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Studio mutation route security", () => {
  it("protects media uploads with same-origin validation", () => {
    const source = readFileSync(join(process.cwd(), "app/api/studio/upload/route.ts"), "utf8");
    expect(source).toContain("assertSameOriginMutation(req)");
    expect(source).toContain("if (originBlocked) return originBlocked");
  });

  it("accepts every persisted Studio edit mode without escaped source artifacts", () => {
    const source = readFileSync(join(process.cwd(), "app/api/studio/video/[id]/route.ts"), "utf8");
    expect(source).toContain('"storyboard"');
    expect(source).not.toContain("optional(),\\\\n");
  });
});
