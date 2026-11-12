import { describe, expect, it } from "vitest";
import { creativeTextGraphemes, wrapCreativeText } from "@/lib/creative-core/text-layout";
import { canvasLayerSchema, parseCanvasDocument, emptyCanvasDocument } from "@/lib/studio/canvas-document";

const measure = (text: string) => creativeTextGraphemes(text).length;
describe("creative text layout", () => {
  it("retains repeated, leading and trailing spaces through wrapping", () => {
    const text = "  First  second  ";
    const lines = wrapCreativeText(text, 10, measure);
    expect(lines).toEqual(["  First  ", "second  "]);
    expect(lines.join("")).toBe(text);
  });
  it("retains explicit blank lines and terminal newlines", () => {
    expect(wrapCreativeText("First\n\nSecond\n", 20, measure)).toEqual(["First", "", "Second", ""]);
  });
  it("wraps long words without splitting emoji or combining marks", () => {
    const text = "👨‍👩‍👧‍👦e\u0301日本語";
    expect(wrapCreativeText(text, 2, measure)).toEqual(["👨‍👩‍👧‍👦e\u0301", "日本", "語"]);
  });
  it("wraps using measured glyph widths rather than character counts", () => {
    const width = (text: string) => [...text].reduce((sum, c) => sum + (c === "W" ? 4 : 1), 0);
    expect(wrapCreativeText("WW ii", 5, width)).toEqual(["W", "W ", "ii"]);
  });
  it.each([0, -1, Infinity, NaN])("rejects invalid layout width %s", width => {
    expect(() => wrapCreativeText("Hello", width, measure)).toThrow(RangeError);
  });
  it("preserves authored whitespace through the persisted canvas schema", () => {
    const doc = emptyCanvasDocument({ width: 640, height: 640 });
    const layer = canvasLayerSchema.parse({ id: "text", type: "text", text: "  First  \n  Second  ", x: 0, y: 0, width: 200, height: 100 });
    doc.layers = [layer]; doc.pages[0]!.layers = [layer];
    expect(parseCanvasDocument(JSON.parse(JSON.stringify(doc))).pages[0]!.layers[0]!.text).toBe(layer.text);
  });
});
