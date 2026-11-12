import { describe, expect, it } from "vitest";
import { defaultCanvasDocument } from "@/lib/studio/canvas-document";
import { designDocumentToComposition } from "@/lib/studio/design-to-composition";

describe("Studio design scene transitions", () => {
  it("persists a transition on the canvas document and carries it into video", () => {
    const base = defaultCanvasDocument("instagram_post");
    const first = base.pages[0]!;
    const second = {
      ...first,
      id: "pg_second",
      name: "Second",
      transitionKind: "fade" as const,
      transitionDurationMs: 650,
      layers: first.layers.map((layer, index) => ({ ...layer, id: layer.id + "_2_" + index })),
    };
    const doc = {
      ...base,
      pages: [first, second],
    };

    const composition = designDocumentToComposition(doc);
    expect(composition.transitions).toHaveLength(1);
    expect(composition.transitions[0]?.kind).toBe("fade");
    expect(composition.transitions[0]?.durationMs).toBe(650);
  });

  it("does not invent transitions when the scene is a cut", () => {
    const base = defaultCanvasDocument("instagram_post");
    const first = base.pages[0]!;
    const second = {
      ...first,
      id: "pg_second",
      name: "Second",
      transitionKind: "cut" as const,
      layers: first.layers.map((layer, index) => ({ ...layer, id: layer.id + "_cut_" + index })),
    };
    const composition = designDocumentToComposition({ ...base, pages: [first, second] });
    expect(composition.transitions).toEqual([]);
  });
});
