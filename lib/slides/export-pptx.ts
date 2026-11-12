/**
 * Real .pptx export for Slides, via pptxgenjs -- a genuine OOXML deck
 * (verified by unzipping the output and reading ppt/slides/slideN.xml),
 * openable in PowerPoint/Keynote/Google Slides, not a renamed/fake file.
 *
 * Image layers ARE embedded here -- this used to ship a placeholder
 * instead, over concern that pptxgenjs's addImage path reaches a
 * transitive `image-size` dependency with an unpatched high-severity DoS
 * (GHSA-5p2g-fcmc-qvqq / GHSA-w3rx-r6r6-pgpr) against attacker-controlled
 * bytes (an image layer's imageUrl is editor-supplied -- any editor of the
 * deck, not just the owner). Direct inspection of the installed
 * pptxgenjs@4.0.1 bundle (node_modules/pptxgenjs/dist/pptxgen.cjs.js)
 * shows that concern doesn't apply to how we call it:
 *   - The only function that ever calls into a size-sniffing dependency,
 *     `getSizeFromImage` (which does `require('sizeof')` -- note: not
 *     even the same package name as the declared `image-size`
 *     dependency), is entirely commented out and marked
 *     "FIXME: currently unused". It is dead code in this version; nothing
 *     in the shipped runtime ever requires `image-size` or `sizeof`.
 *   - Separately, and durably regardless of future pptxgenjs versions:
 *     `addImageDefinition` only measures an image itself "when no
 *     intWidth/intHeight params passed" (see its own FIXME comment) --
 *     we always pass explicit w/h from the layer's own stored
 *     dimensions, so even a reinstated auto-sizing path would never run
 *     for our calls.
 *   - And as defense in depth beyond either of those: we never hand
 *     pptxgenjs a raw fetched URL at all. The bytes are fetched and
 *     magic-byte-sniffed by the same shared boundary PDF export uses
 *     (fetch-image.ts: timeout, byte cap, PNG/JPEG-only), then handed to
 *     addImage as a `data:` base64 URI -- so even a future
 *     auto-detecting parser inside pptxgenjs would only ever see bytes
 *     this module already classified as a real PNG or JPEG, never
 *     unvalidated attacker input.
 * A URL that isn't actually PNG/JPEG, is too large, or fails to fetch
 * still renders the labeled placeholder rather than failing the export.
 */
import pptxgen from "pptxgenjs";
import type { Slide, SlideLayer } from "@/lib/slides/schema";
import { hexNoHash } from "@/lib/slides/colors";
import { fetchImageBytes } from "@/lib/slides/fetch-image";

const PX_PER_INCH = 96;
const MAX_LAYOUT_INCHES = 20;

async function addLayer(slide: pptxgen.Slide, layer: SlideLayer, scaleToInches: (px: number) => number) {
  const x = scaleToInches(layer.x);
  const y = scaleToInches(layer.y);
  const w = scaleToInches(layer.width);
  const h = scaleToInches(layer.height);
  const rotate = layer.rotation || undefined;
  const transparency = layer.opacity !== undefined ? Math.round((1 - layer.opacity) * 100) : undefined;

  if (layer.type === "text") {
    slide.addText(layer.text ?? "", {
      x, y, w, h, rotate,
      fontSize: Math.max(1, Math.round((layer.fontSize ?? 24) * 0.75)),
      fontFace: layer.fontFamily || undefined,
      bold: layer.fontWeight === "bold",
      italic: layer.fontStyle === "italic",
      align: layer.textAlign ?? "left",
      color: hexNoHash(layer.color, "111111"),
      transparency,
      valign: "top",
    });
    return;
  }

  if (layer.type === "rect" || layer.type === "ellipse") {
    slide.addShape(layer.type === "ellipse" ? "ellipse" : "rect", {
      x, y, w, h, rotate,
      fill: layer.fill ? { color: hexNoHash(layer.fill), transparency } : { type: "none" },
      line: layer.strokeWidth ? { color: hexNoHash(layer.stroke, "000000"), width: layer.strokeWidth } : { type: "none" },
      rectRadius: layer.type === "rect" && layer.cornerRadius ? Math.min(0.5, layer.cornerRadius / PX_PER_INCH) : undefined,
    });
    return;
  }

  if (layer.type === "line") {
    slide.addShape("line", {
      x, y, w, h: h || 0.01, rotate,
      line: { color: hexNoHash(layer.stroke, "111111"), width: Math.max(0.25, (layer.strokeWidth ?? 2) * 0.75) },
    });
    return;
  }

  if (layer.type === "image") {
    const fetched = layer.imageUrl ? await fetchImageBytes(layer.imageUrl) : null;
    if (fetched) {
      const mime = fetched.kind === "png" ? "image/png" : "image/jpeg";
      const base64 = Buffer.from(fetched.bytes).toString("base64");
      slide.addImage({ data: `${mime};base64,${base64}`, x, y, w, h, rotate, transparency });
      return;
    }
    slide.addShape("rect", { x, y, w, h, fill: { color: "E5E5E5" }, line: { type: "none" } });
    slide.addText("Image unavailable", { x, y, w, h, align: "center", valign: "middle", fontSize: 10, color: "888888" });
  }
}

export async function buildSlidesPptx(slides: Slide[], deckWidth: number, deckHeight: number): Promise<Uint8Array> {
  const pptx = new pptxgen();
  const scale = Math.min(1, MAX_LAYOUT_INCHES / (deckWidth / PX_PER_INCH));
  const layoutWidth = Math.max(1, (deckWidth / PX_PER_INCH) * scale);
  const layoutHeight = Math.max(1, (deckHeight / PX_PER_INCH) * scale);
  const scaleToInches = (px: number) => (px / PX_PER_INCH) * scale;

  pptx.defineLayout({ name: "KEBU_DECK", width: layoutWidth, height: layoutHeight });
  pptx.layout = "KEBU_DECK";

  for (const slide of slides) {
    const pSlide = pptx.addSlide();
    pSlide.background = { color: hexNoHash(slide.backgroundColor, "FFFFFF") };
    for (const layer of slide.layers) {
      await addLayer(pSlide, layer, scaleToInches);
    }
  }

  const buffer = await pptx.write({ outputType: "nodebuffer" });
  return buffer as Uint8Array;
}
