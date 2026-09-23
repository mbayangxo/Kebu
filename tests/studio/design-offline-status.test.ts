import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Studio design offline save status", () => {
  const page = readFileSync(join(process.cwd(), "app/studio/[id]/page.tsx"), "utf8");

  it("does not claim a server save while disconnected", () => {
    expect(page).toContain('setSaveState("offline")');
    expect(page).toContain('setSyncState("offline")');
    expect(page).toContain("Offline · saved on this device");
  });

  it("keeps Saved reserved for acknowledged or deliberately resolved server state", () => {
    const offlineBranch = page.slice(
      page.indexOf('if (typeof navigator !== "undefined" && !navigator.onLine)'),
      page.indexOf('setSaveState("saving")'),
    );
    expect(offlineBranch).not.toContain('setSaveState("saved")');
    expect(offlineBranch).toContain('setSaveState("offline")');
  });
});
