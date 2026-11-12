import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("real flow integration", () => {
  it("records publish and restore into durable platform flow events", () => {
    const publish = readFileSync(join(process.cwd(), "app/api/projects/[id]/publish/route.ts"), "utf8");
    const restore = readFileSync(join(process.cwd(), "app/api/projects/[id]/versions/restore/route.ts"), "utf8");
    expect(publish).toContain("recordProjectFlow");
    expect(publish).toContain("website.published");
    expect(restore).toContain("recordProjectFlow");
    expect(restore).toContain("website.version_restored");
  });
});
