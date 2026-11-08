import { describe, expect, it } from "vitest";
import { PDFDocument, PDFName } from "pdf-lib";
import JSZip from "jszip";
import { blankSlide, blankLayer } from "@/lib/slides/schema";
import { buildSlidesPdf } from "@/lib/slides/export-pdf";
import { buildSlidesPptx } from "@/lib/slides/export-pptx";

function deckOf(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const slide = blankSlide(`s${i}`, `Slide ${i + 1}`);
    const text = blankLayer(`t${i}`, "text", { x: 960, y: 200 });
    const rect = blankLayer(`r${i}`, "rect", { x: 960, y: 600 });
    return { ...slide, layers: [{ ...text, text: `Hello slide ${i + 1}` }, rect] };
  });
}

describe("Slides PDF export (lib/slides/export-pdf.ts)", () => {
  it("produces a real, parseable multi-page PDF with one page per slide", async () => {
    const bytes = await buildSlidesPdf(deckOf(3), 1920, 1080);
    expect(Buffer.from(bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(3);
  });

  it("renders real vector text, not a rasterized image -- the page has an embedded font resource, which only exists when drawText actually ran", async () => {
    const bytes = await buildSlidesPdf(deckOf(1), 1920, 1080);
    const doc = await PDFDocument.load(bytes);
    const page = doc.getPage(0);
    const fontDict = page.node.Resources()?.get(PDFName.of("Font"));
    expect(fontDict).toBeDefined();
  });

  it("falls back to a placeholder rather than throwing when an image URL doesn't resolve", async () => {
    const slide = blankSlide("s1");
    const image = blankLayer("img1", "image", { x: 960, y: 540 });
    const deck = [{ ...slide, layers: [{ ...image, imageUrl: "https://example.invalid/does-not-exist.png" }] }];
    const bytes = await buildSlidesPdf(deck, 1920, 1080);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });
});

describe("Slides PPTX export (lib/slides/export-pptx.ts)", () => {
  it("produces a real, openable OOXML .pptx with one slide per deck slide", async () => {
    const bytes = await buildSlidesPptx(deckOf(2), 1920, 1080);
    const zip = await JSZip.loadAsync(bytes);
    expect(Object.keys(zip.files)).toContain("[Content_Types].xml");
    expect(Object.keys(zip.files)).toContain("ppt/slides/slide1.xml");
    expect(Object.keys(zip.files)).toContain("ppt/slides/slide2.xml");
    expect(Object.keys(zip.files)).not.toContain("ppt/slides/slide3.xml");
  });

  it("the real slide XML contains the real text content, not a placeholder", async () => {
    const bytes = await buildSlidesPptx(deckOf(1), 1920, 1080);
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(xml).toContain("Hello slide 1");
  });

  it("an image layer renders as a labeled placeholder, not an embedded image (deliberate scope limit, see export-pptx.ts header comment)", async () => {
    const slide = blankSlide("s1");
    const image = blankLayer("img1", "image", { x: 960, y: 540 });
    const bytes = await buildSlidesPptx([{ ...slide, layers: [{ ...image, imageUrl: "https://example.test/a.png" }] }], 1920, 1080);
    const zip = await JSZip.loadAsync(bytes);
    const names = Object.keys(zip.files);
    // pptxgenjs's template always ships an empty "ppt/media/" directory
    // entry; a real embedded image would add an actual file under it.
    expect(names.some((n) => /^ppt\/media\/.+\.\w+$/.test(n))).toBe(false);
    const xml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(xml).toContain("see PDF export");
  });
});
