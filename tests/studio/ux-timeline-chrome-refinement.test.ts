import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Studio dark creative chrome and timeline", () => {
  it("timeline has semantic tracks and a strong playhead", () => {
    const source = readFileSync(join(process.cwd(), "app/components/studio/studio-timeline-panel.tsx"), "utf8");
    expect(source).toContain("Scenes");
    expect(source).toContain("Audio");
    expect(source).toContain('bg-[#FF6A00]');
    expect(source).toContain("overflow-x-auto");
  });

  it("timeline keeps audio analysis and beat snap behavior", () => {
    const source = readFileSync(join(process.cwd(), "app/components/studio/studio-timeline-panel.tsx"), "utf8");
    expect(source).toContain("analyzeMusicFromUrl");
    expect(source).toContain("snapTimeToBeat");
    expect(source).toContain("snapToBeats");
  });

  it("editor chrome matches the approved immersive Studio surface", () => {
    const source = readFileSync(join(process.cwd(), "app/components/studio/studio-canvas-editor.tsx"), "utf8");
    expect(source).toContain('bg-[#101113]');
    expect(source).toContain("border-white/[.08]");
    expect(source).toContain("text-white/60");
    expect(source).toContain("text-red-700/70");
    expect(source).toContain('bg-[#17181B]');
  });

  it("editor media accepts an offline URL resolver instead of persisting blob URLs", () => {
    const source = readFileSync(join(process.cwd(), "app/components/studio/studio-canvas-editor.tsx"), "utf8");
    expect(source).toContain("resolveMediaUrl");
    expect(source).toContain("resolveMediaUrl(layer.imageUrl)");
    expect(source).toContain("resolveMediaUrl(layer.videoUrl)");
    expect(source).toContain("resolveMediaUrl(layer.frameMediaUrl)");
  });
});
