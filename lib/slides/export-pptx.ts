/**
 * Real .pptx export for Slides, via pptxgenjs -- a genuine OOXML deck
 * (verified by unzipping the output and reading ppt/slides/slideN.xml),
 * openable in PowerPoint/Keynote/Google Slides, not a renamed/fake file.
 *
 * Deliberate scope limit: image layers are NOT embedded here. pptxgenjs's
 * addImage path resolves to a transitive dependency on `image-size`
 * (currently pinned by pptxgenjs to a version with a known high-severity
 * DoS -- GHSA-5p2g-fcmc-qvqq / GHSA-w3rx-r6r6-pgpr: a crafted JXL/HEIF/ICNS
 * file makes its format sniffer loop forever), and the bytes it would sniff
 * come from an editor-supplied imageUrl -- i.e. attacker-controlled input
 * from this route's own trust boundary (any editor of the deck, not just
 * the owner). PDF export avoids this by sniffing magic bytes itself and
 * only ever calling a format-specific embedder (embedPng/embedJpg), never
 * an auto-detecting one; pptxgenjs's addImage offers no such narrow entry
 * point. Rather than ship a real DoS vector or a silently-broken image
 * embed, an image layer renders as a labeled placeholder in the .pptx;
 * the same deck's PDF export still embeds the real image.
 */
import pptxgen from "pptxgenjs";
import type { Slide, SlideLayer } from "@/lib/slides/schema";
import { hexNoHash } from "@/lib/slides/colors";

const PX_PER_INCH = 96;
const MAX_LAYOUT_INCHES = 20;

function addLayer(slide: pptxgen.Slide, layer: SlideLayer, scaleToInches: (px: number) => number) {
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
    slide.addShape("rect", { x, y, w, h, fill: { color: "E5E5E5" }, line: { type: "none" } });
    slide.addText("Image (see PDF export)", { x, y, w, h, align: "center", valign: "middle", fontSize: 10, color: "888888" });
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
      addLayer(pSlide, layer, scaleToInches);
    }
  }

  const buffer = await pptx.write({ outputType: "nodebuffer" });
  return buffer as Uint8Array;
}
