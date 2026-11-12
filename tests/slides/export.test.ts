import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PDFDocument, PDFName } from "pdf-lib";
import JSZip from "jszip";
import { blankSlide, blankLayer } from "@/lib/slides/schema";
import { buildSlidesPdf } from "@/lib/slides/export-pdf";
import { buildSlidesPptx } from "@/lib/slides/export-pptx";
import { fetchImageBytes } from "@/lib/slides/fetch-image";

// The export tests below use RFC 2606 reserved test hostnames
// (example.test/example.invalid) that don't really resolve, so the real
// SSRF host-validation in lib/slides/fetch-image.ts needs a DNS double so
// those fixtures can stand in for "some real public image host" without
// doing a real network lookup. Each test controls the result explicitly.
const dnsDeps = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: dnsDeps.lookup }));

const PUBLIC_ADDR = [{ address: "93.184.216.34", family: 4 }];

beforeEach(() => {
  dnsDeps.lookup.mockResolvedValue(PUBLIC_ADDR);
});

// A minimal real 1x1 PNG (not a fixture claiming to be one -- these are the
// actual bytes of a valid, decodable PNG file).
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const TINY_PNG_BYTES = Uint8Array.from(Buffer.from(TINY_PNG_BASE64, "base64"));

function mockFetchOnce(bytes: Uint8Array, init?: { ok?: boolean }) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: init?.ok ?? true,
      body: {},
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

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
    dnsDeps.lookup.mockRejectedValueOnce(new Error("ENOTFOUND"));
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

  it("embeds a real image into ppt/media when the URL resolves to a valid PNG", async () => {
    mockFetchOnce(TINY_PNG_BYTES);
    const slide = blankSlide("s1");
    const image = blankLayer("img1", "image", { x: 960, y: 540 });
    const bytes = await buildSlidesPptx([{ ...slide, layers: [{ ...image, imageUrl: "https://example.test/a.png" }] }], 1920, 1080);
    const zip = await JSZip.loadAsync(bytes);
    const names = Object.keys(zip.files);
    const mediaFile = names.find((n) => /^ppt\/media\/.+\.\w+$/.test(n));
    expect(mediaFile).toBeDefined();
    // The embedded bytes are the real PNG we handed it, not a placeholder --
    // read them back out of the zip and check the real PNG magic bytes.
    const embedded = await zip.file(mediaFile!)!.async("uint8array");
    expect(Array.from(embedded.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
    const xml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(xml).not.toContain("Image unavailable");
  });

  it("falls back to a placeholder rather than throwing when an image URL doesn't resolve", async () => {
    dnsDeps.lookup.mockRejectedValueOnce(new Error("ENOTFOUND"));
    const slide = blankSlide("s1");
    const image = blankLayer("img1", "image", { x: 960, y: 540 });
    const bytes = await buildSlidesPptx([{ ...slide, layers: [{ ...image, imageUrl: "https://example.invalid/does-not-exist.png" }] }], 1920, 1080);
    const zip = await JSZip.loadAsync(bytes);
    expect(Object.keys(zip.files).some((n) => /^ppt\/media\/.+\.\w+$/.test(n))).toBe(false);
    const xml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(xml).toContain("Image unavailable");
  });

  it("rejects a buffer that isn't a real PNG/JPEG before it ever reaches pptxgenjs's image handling -- the vulnerability class this guards against", async () => {
    // Shaped like the kind of input GHSA-5p2g-fcmc-qvqq/GHSA-w3rx-r6r6-pgpr
    // describe (a non-PNG/JPEG container an auto-detecting sniffer would
    // try to parse) -- our own magic-byte check must reject this itself,
    // never handing it to pptxgenjs at all.
    const adversarial = new Uint8Array(64).fill(0x41); // "AAAA..." -- no valid image magic bytes
    mockFetchOnce(adversarial);
    const slide = blankSlide("s1");
    const image = blankLayer("img1", "image", { x: 960, y: 540 });
    const bytes = await buildSlidesPptx([{ ...slide, layers: [{ ...image, imageUrl: "https://example.test/evil.bin" }] }], 1920, 1080);
    const zip = await JSZip.loadAsync(bytes);
    expect(Object.keys(zip.files).some((n) => /^ppt\/media\/.+\.\w+$/.test(n))).toBe(false);
    const xml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(xml).toContain("Image unavailable");
  });

  it("rejects an oversized buffer (the byte cap applies here too, same as PDF export)", async () => {
    const oversized = new Uint8Array(8 * 1024 * 1024 + 1);
    oversized[0] = 0x89; oversized[1] = 0x50; oversized[2] = 0x4e; oversized[3] = 0x47; // valid PNG magic, but too big
    mockFetchOnce(oversized);
    const slide = blankSlide("s1");
    const image = blankLayer("img1", "image", { x: 960, y: 540 });
    const bytes = await buildSlidesPptx([{ ...slide, layers: [{ ...image, imageUrl: "https://example.test/huge.png" }] }], 1920, 1080);
    const zip = await JSZip.loadAsync(bytes);
    expect(Object.keys(zip.files).some((n) => /^ppt\/media\/.+\.\w+$/.test(n))).toBe(false);
  });

  it("the shipped pptxgenjs runtime never requires an image-sizing dependency (regression tripwire for the fix's documented premise)", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const require = await import("node:module").then((m) => m.createRequire(import.meta.url));
    const pptxgenEntryPath = require.resolve("pptxgenjs");
    const pptxgenDir = path.dirname(pptxgenEntryPath).endsWith("dist")
      ? path.dirname(pptxgenEntryPath)
      : path.join(path.dirname(pptxgenEntryPath), "dist");
    const dist = fs.readFileSync(path.join(pptxgenDir, "pptxgen.cjs.js"), "utf8");
    // The only two require() calls in the bundle: jszip (real, active) and
    // a `require('sizeof')` that only exists inside a commented-out,
    // "FIXME: currently unused" function. If a future pptxgenjs version
    // reinstates that path as live code, this assertion catches it so the
    // header comment's safety claim gets re-reviewed rather than going stale.
    const liveRequireCalls = dist
      .replace(/\/\*[\s\S]*?\*\//g, "") // strip block comments
      .match(/require\(['"][^'"]+['"]\)/g) ?? [];
    expect(liveRequireCalls.every((call) => call.includes("jszip"))).toBe(true);
  });
});

describe("fetchImageBytes SSRF guard (lib/slides/fetch-image.ts)", () => {
  it("rejects a literal loopback IP URL without ever calling fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await fetchImageBytes("https://127.0.0.1/admin");
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a literal link-local/cloud-metadata IP URL without ever calling fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await fetchImageBytes("https://169.254.169.254/latest/meta-data/");
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a hostname that resolves to a private IP, without the private address ever being dialed by a mocked fetch that would otherwise succeed", async () => {
    dnsDeps.lookup.mockResolvedValue([{ address: "10.1.2.3", family: 4 }]);
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, body: {}, status: 200, arrayBuffer: async () => TINY_PNG_BYTES.buffer });
    vi.stubGlobal("fetch", fetchSpy);
    const result = await fetchImageBytes("https://internal.example.test/secret.png");
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("still fetches and classifies a well-formed public image correctly (the fix must not break the legitimate case)", async () => {
    mockFetchOnce(TINY_PNG_BYTES);
    const result = await fetchImageBytes("https://example.test/a.png");
    expect(result).toEqual({ bytes: TINY_PNG_BYTES, kind: "png" });
  });

  it("follows a same-origin-looking redirect to a public host, but rejects when the redirect target resolves to a private IP", async () => {
    const redirectThenBlocked = vi
      .fn()
      .mockResolvedValueOnce({ status: 302, ok: false, headers: new Headers({ location: "https://internal.example.test/secret.png" }) });
    vi.stubGlobal("fetch", redirectThenBlocked);
    // The redirect target resolves privately; the initial host resolves publicly (default mock).
    dnsDeps.lookup.mockImplementation(async (hostname: string) =>
      hostname === "internal.example.test" ? [{ address: "192.168.1.1", family: 4 }] : PUBLIC_ADDR,
    );
    const result = await fetchImageBytes("https://example.test/redirect-me.png");
    expect(result).toBeNull();
    // Only the first hop should ever be dialed -- the blocked redirect target must never be fetched.
    expect(redirectThenBlocked).toHaveBeenCalledTimes(1);
  });

  it("follows a redirect to a genuinely public host and still embeds the real image", async () => {
    const redirectThenOk = vi
      .fn()
      .mockResolvedValueOnce({ status: 301, ok: false, headers: new Headers({ location: "https://cdn.example.test/a.png" }) })
      .mockResolvedValueOnce({ ok: true, body: {}, status: 200, arrayBuffer: async () => TINY_PNG_BYTES.buffer });
    vi.stubGlobal("fetch", redirectThenOk);
    const result = await fetchImageBytes("https://example.test/redirect-me.png");
    expect(result).toEqual({ bytes: TINY_PNG_BYTES, kind: "png" });
    expect(redirectThenOk).toHaveBeenCalledTimes(2);
  });
});
