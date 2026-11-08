/**
 * Real PDF export for Slides: one page per slide, built with pdf-lib's
 * vector drawing primitives (drawText/drawRectangle/drawEllipse/drawLine),
 * not a rasterized screenshot -- the exported PDF has real selectable text
 * and real vector shapes, openable in any PDF viewer.
 *
 * Image layers: the source is a URL the editor doesn't control (anyone who
 * can edit the deck can set it), so embedding it safely means more than
 * "fetch and hand to a decoder". We fetch with a timeout and a byte cap,
 * then sniff the real magic bytes ourselves and only call pdf-lib's
 * format-specific embedPng/embedJpg (never a format-sniffing "embed
 * whatever this is" call) -- this avoids running an auto-detecting image
 * parser against attacker-controlled bytes. A URL that isn't actually a
 * PNG/JPEG, is too large, or fails to fetch renders a labeled placeholder
 * instead of silently failing the whole export.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Slide, SlideLayer } from "@/lib/slides/schema";
import { parseHexColor } from "@/lib/slides/colors";

const FETCH_TIMEOUT_MS = 8000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

async function fetchImageBytes(url: string): Promise<{ bytes: Uint8Array; kind: "png" | "jpg" } | null> {
  if (!/^https:\/\//i.test(url)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok || !res.body) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGE_BYTES) return null;
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { bytes: buf, kind: "png" };
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { bytes: buf, kind: "jpg" };
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function wrapLines(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    lines.push(current);
  }
  return lines;
}

async function drawLayer(page: PDFPage, layer: SlideLayer, font: PDFFont, fontBold: PDFFont, pageHeight: number, scale: number) {
  // PDF origin is bottom-left; the deck's layer coordinates are top-left.
  const x = layer.x * scale;
  const topY = pageHeight - layer.y * scale;
  const width = layer.width * scale;
  const height = layer.height * scale;
  const bottomY = topY - height;
  const opacity = layer.opacity ?? 1;

  if (layer.type === "rect" || layer.type === "ellipse") {
    const fillColor = layer.fill ? rgb(...(Object.values(parseHexColor(layer.fill)) as [number, number, number])) : undefined;
    const strokeColor = layer.stroke ? rgb(...(Object.values(parseHexColor(layer.stroke)) as [number, number, number])) : undefined;
    const strokeWidth = (layer.strokeWidth ?? 0) * scale;
    if (layer.type === "ellipse") {
      page.drawEllipse({
        x: x + width / 2, y: bottomY + height / 2, xScale: width / 2, yScale: height / 2,
        color: fillColor, borderColor: strokeColor, borderWidth: strokeWidth || undefined, opacity,
      });
    } else {
      page.drawRectangle({
        x, y: bottomY, width, height, color: fillColor, borderColor: strokeColor,
        borderWidth: strokeWidth || undefined, opacity,
      });
    }
    return;
  }

  if (layer.type === "line") {
    const strokeColor = rgb(...(Object.values(parseHexColor(layer.stroke, "#111111")) as [number, number, number]));
    page.drawLine({
      start: { x, y: topY }, end: { x: x + width, y: topY - height },
      thickness: Math.max(1, (layer.strokeWidth ?? 2) * scale), color: strokeColor, opacity,
    });
    return;
  }

  if (layer.type === "text") {
    const size = (layer.fontSize ?? 24) * scale;
    const useFont = layer.fontWeight === "bold" ? fontBold : font;
    const color = rgb(...(Object.values(parseHexColor(layer.color, "#111111")) as [number, number, number]));
    const lines = wrapLines(layer.text ?? "", useFont, size, width);
    let cursorY = topY - size;
    for (const line of lines) {
      if (cursorY < bottomY - size) break;
      const lineWidth = useFont.widthOfTextAtSize(line, size);
      const lineX = layer.textAlign === "center" ? x + (width - lineWidth) / 2 : layer.textAlign === "right" ? x + width - lineWidth : x;
      page.drawText(line, { x: lineX, y: cursorY, size, font: useFont, color, opacity });
      cursorY -= size * 1.25;
    }
    return;
  }

  if (layer.type === "image") {
    const fetched = layer.imageUrl ? await fetchImageBytes(layer.imageUrl) : null;
    if (fetched) {
      try {
        const doc = page.doc;
        const image = fetched.kind === "png" ? await doc.embedPng(fetched.bytes) : await doc.embedJpg(fetched.bytes);
        page.drawImage(image, { x, y: bottomY, width, height, opacity });
        return;
      } catch {
        // falls through to placeholder below
      }
    }
    page.drawRectangle({ x, y: bottomY, width, height, color: rgb(0.9, 0.9, 0.9), opacity });
    page.drawText("Image unavailable", { x: x + 8, y: bottomY + height / 2, size: Math.min(14, height / 4), font, color: rgb(0.5, 0.5, 0.5) });
  }
}

/** One PDF page per slide, real vector content throughout. */
export async function buildSlidesPdf(slides: Slide[], deckWidth: number, deckHeight: number): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Scale the artboard down to a conventional page size so text/line widths
  // stay legible rather than producing a 1920x1080-point oversized page.
  const scale = 720 / Math.max(deckWidth, 1);
  const pageWidth = deckWidth * scale;
  const pageHeight = deckHeight * scale;

  for (const slide of slides) {
    const page = pdf.addPage([pageWidth, pageHeight]);
    const bg = parseHexColor(slide.backgroundColor, "#FFFFFF");
    page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: rgb(bg.r, bg.g, bg.b) });
    for (const layer of slide.layers) {
      await drawLayer(page, layer, font, fontBold, pageHeight, scale);
    }
  }

  return pdf.save();
}
