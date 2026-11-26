import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Studio media and chrome refinement", () => {
  it("Media uses Galaxy hierarchy and no nested favorite button", () => {
    const source = readFileSync(join(process.cwd(), "app/components/studio/studio-uploads-library.tsx"), "utf8");
    expect(source).toContain('title="Media"');
    expect(source).toContain("GalaxyEmptyState");
    expect(source).not.toContain('aria-label={u.favorite?"Unfavorite":"Favorite"}');
  });

  it("toolbar uses real icons", () => {
    const source = readFileSync(join(process.cwd(), "app/components/studio/studio-canvas-editor.tsx"), "utf8");
    expect(source).toContain('name="duplicate"');
    expect(source).toContain('name="trash"');
    expect(source).toContain("align-${t.label}");
  });

  it("the page strip respects safe area", () => {
    const source = readFileSync(join(process.cwd(), "app/components/studio/studio-canvas-editor.tsx"), "utf8");
    expect(source).toContain("env(safe-area-inset-bottom)");
    // Pressed-state semantics and native activation are verified in the actual
    // 390px/834px "workspace panel taps" browser cases, including cancellation,
    // drag rejection, repeated taps and keyboard activation. The buttons may
    // be composed without spelling their state expression inline in this file.
  });
});
