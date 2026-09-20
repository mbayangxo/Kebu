import { describe, expect, it } from "vitest";
import { emptyCanvasDocument, newLayerId, updatePage } from "@/lib/studio/canvas-document";
import { designDocumentToComposition } from "@/lib/studio/design-to-composition";
import { syncSourceDesignIntoComposition } from "@/lib/studio/source-design-sync";

describe("Studio source design sync", () => {
  it("refreshes semantic design payload while preserving video timing and motion", () => {
    let source = emptyCanvasDocument({ designType: "instagram_post" });
    const page = source.pages[0]!;
    const layerId = newLayerId();
    source = updatePage(source, page.id, {
      layers: [{
        id: layerId,
        type: "text",
        name: "Headline",
        x: 60,
        y: 80,
        width: 600,
        height: 160,
        rotation: 0,
        opacity: 1,
        locked: false,
        text: "First",
        fontSize: 64,
        color: "#111111",
      }],
    });

    const initial = designDocumentToComposition(source);
    const linked = initial.clips[0]!;
    const editedVideo = {
      ...initial,
      clips: [{ ...linked, startMs: 4500, x: 250, scale: 1.25 }],
      keyframes: [{ id: "kf_1", clipId: linked.id, property: "scale" as const, timeMs: 300, value: 1.4, easing: "ease_out" as const }],
    };

    const changed = updatePage(source, page.id, {
      layers: [{
        ...source.pages[0]!.layers[0]!,
        text: "Changed in Design",
        fontSize: 88,
        color: "#FF6A00",
        width: 720,
      }],
    });

    const result = syncSourceDesignIntoComposition(editedVideo, changed);
    const refreshed = result.composition.clips.find((clip) => clip.id === linked.id)!;

    expect(refreshed.startMs).toBe(4500);
    expect(refreshed.x).toBe(250);
    expect(refreshed.scale).toBe(1.25);
    expect(refreshed.designWidth).toBe(720);
    expect(refreshed.designLayer?.text).toBe("Changed in Design");
    expect(refreshed.designLayer?.fontSize).toBe(88);
    expect(result.composition.keyframes).toHaveLength(1);
    expect(result.summary.updated).toBe(1);
  });

  it("adds new source layers and removes deleted linked layers without touching unrelated clips", () => {
    let source = emptyCanvasDocument({ designType: "instagram_post" });
    const page = source.pages[0]!;
    const firstId = newLayerId();
    source = updatePage(source, page.id, {
      layers: [{
        id: firstId,
        type: "rect",
        name: "Block",
        x: 10,
        y: 10,
        width: 200,
        height: 200,
        rotation: 0,
        opacity: 1,
        locked: false,
        fill: "#111111",
      }],
    });

    const initial = designDocumentToComposition(source);
    const unrelated = {
      ...initial.clips[0]!,
      id: "manual_clip",
      sourceDesignLayerId: null,
      sourceDesignPageId: null,
      name: "Manual overlay",
    };
    const current = { ...initial, clips: [...initial.clips, unrelated] };

    const secondId = newLayerId();
    const changed = updatePage(source, page.id, {
      layers: [{
        id: secondId,
        type: "text",
        name: "Replacement",
        x: 20,
        y: 20,
        width: 300,
        height: 100,
        rotation: 0,
        opacity: 1,
        locked: false,
        text: "New",
      }],
    });

    const result = syncSourceDesignIntoComposition(current, changed);
    expect(result.composition.clips.some((clip) => clip.id === "manual_clip")).toBe(true);
    expect(result.composition.clips.some((clip) => clip.sourceDesignLayerId === firstId)).toBe(false);
    expect(result.composition.clips.some((clip) => clip.sourceDesignLayerId === secondId)).toBe(true);
    expect(result.summary.removed).toBe(1);
    expect(result.summary.added).toBe(1);
  });
});
