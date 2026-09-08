import { describe, expect, it } from "vitest";
import {
  addCanvasPage,
  alignLayers,
  canvasDocumentSchema,
  defaultCanvasDocument,
  deleteCanvasPage,
  duplicateCanvasPage,
  duplicateLayer,
  groupLayers,
  newLayerId,
  parseCanvasDocument,
  ungroupLayers,
} from "@/lib/studio/canvas-document";

describe("Studio Canva editor helpers", () => {
  it("duplicates a layer with new id and offset", () => {
    const doc = defaultCanvasDocument("instagram_post", { businessName: "Test" });
    const layer = doc.layers[0]!;
    const copy = duplicateLayer(layer);
    expect(copy.id).not.toBe(layer.id);
    expect(copy.x).toBe(layer.x + 24);
    expect(copy.y).toBe(layer.y + 24);
    expect(copy.name).toMatch(/copy/);
  });

  it("accepts image craft flip and fit fields", () => {
    const doc = defaultCanvasDocument("instagram_post");
    const withFlip = {
      ...doc,
      layers: [
        {
          id: newLayerId(),
          type: "image" as const,
          name: "Photo",
          x: 0,
          y: 0,
          width: 200,
          height: 200,
          rotation: 0,
          opacity: 1,
          locked: false,
          imageUrl: "https://example.com/a.jpg",
          flipX: true,
          flipY: false,
          objectFit: "contain" as const,
        },
      ],
      pages: [
        {
          ...doc.pages[0]!,
          layers: [
            {
              id: newLayerId(),
              type: "image" as const,
              name: "Photo",
              x: 0,
              y: 0,
              width: 200,
              height: 200,
              rotation: 0,
              opacity: 1,
              locked: false,
              imageUrl: "https://example.com/a.jpg",
              flipX: true,
              objectFit: "contain" as const,
            },
          ],
        },
      ],
    };
    expect(canvasDocumentSchema.safeParse(withFlip).success).toBe(true);
  });
});

describe("Studio multi-page + align/group", () => {
  it("migrates v1 flat document to v2 pages", () => {
    const v1 = {
      version: 1,
      width: 1080,
      height: 1080,
      backgroundColor: "#0F0D33",
      layers: [
        {
          id: "ly_a",
          type: "text",
          name: "Headline",
          x: 40,
          y: 40,
          width: 400,
          height: 60,
          rotation: 0,
          opacity: 1,
          locked: false,
          text: "Hello",
          fontSize: 32,
          color: "#fff",
        },
      ],
    };
    const doc = parseCanvasDocument(v1, "instagram_post");
    expect(doc.version).toBe(2);
    expect(doc.pages).toHaveLength(1);
    expect(doc.pages[0]!.layers).toHaveLength(1);
    expect(doc.pages[0]!.layers[0]!.text).toBe("Hello");
    expect(doc.layers[0]!.text).toBe("Hello");
  });

  it("adds, duplicates, and deletes pages (min 1)", () => {
    let doc = defaultCanvasDocument("poster");
    expect(doc.pages).toHaveLength(1);
    const firstId = doc.pages[0]!.id;

    const added = addCanvasPage(doc, "Page 2");
    doc = added.doc;
    expect(doc.pages).toHaveLength(2);
    expect(doc.pages[1]!.name).toBe("Page 2");
    expect(added.pageId).toBe(doc.pages[1]!.id);

    const dup = duplicateCanvasPage(doc, firstId);
    expect(dup).not.toBeNull();
    doc = dup!.doc;
    expect(doc.pages).toHaveLength(3);
    expect(doc.pages[1]!.name).toMatch(/copy/);
    expect(doc.pages[1]!.layers.length).toBe(doc.pages[0]!.layers.length);
    expect(doc.pages[1]!.layers[0]!.id).not.toBe(doc.pages[0]!.layers[0]!.id);

    const afterDelete = deleteCanvasPage(doc, dup!.pageId);
    expect(afterDelete).not.toBeNull();
    doc = afterDelete!;
    expect(doc.pages).toHaveLength(2);

    // Cannot delete last remaining page after reducing to 1
    const one = deleteCanvasPage(doc, doc.pages[1]!.id)!;
    expect(one.pages).toHaveLength(1);
    expect(deleteCanvasPage(one, one.pages[0]!.id)).toBeNull();
  });

  it("aligns selected layers to the left", () => {
    const layers = [
      {
        id: "a",
        type: "rect" as const,
        name: "A",
        x: 100,
        y: 10,
        width: 50,
        height: 40,
        rotation: 0,
        opacity: 1,
        locked: false,
        fill: "#E05A2B",
      },
      {
        id: "b",
        type: "rect" as const,
        name: "B",
        x: 200,
        y: 20,
        width: 80,
        height: 40,
        rotation: 0,
        opacity: 1,
        locked: false,
        fill: "#0F0D33",
      },
    ];
    const next = alignLayers(layers, ["a", "b"], "left", { width: 900, height: 1200 });
    expect(next.find((l) => l.id === "a")!.x).toBe(100);
    expect(next.find((l) => l.id === "b")!.x).toBe(100);
  });

  it("groups and ungroups layers", () => {
    const doc = defaultCanvasDocument("flyer");
    const ids = doc.layers.slice(0, 2).map((l) => l.id);
    const grouped = groupLayers(doc.layers, ids);
    const gid = grouped.find((l) => l.id === ids[0])!.groupId;
    expect(gid).toBeTruthy();
    expect(grouped.find((l) => l.id === ids[1])!.groupId).toBe(gid);

    const ungrouped = ungroupLayers(grouped, ids);
    expect(ungrouped.find((l) => l.id === ids[0])!.groupId).toBeNull();
    expect(ungrouped.find((l) => l.id === ids[1])!.groupId).toBeNull();
  });
});
