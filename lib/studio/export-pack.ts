import JSZip from "jszip";
import type { CanvasDocument } from "@/lib/studio/canvas-document";
import { downloadBlob, exportCanvasToPngDataUrlAsync } from "@/lib/studio/canvas-document";

function dataUrlToUint8(dataUrl: string): Uint8Array {
  const b64 = dataUrl.split(",")[1] ?? "";
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Multi-page PNG ZIP (S15). */
export async function exportCanvasPagesZipBlob(
  doc: CanvasDocument,
  scale = 1,
): Promise<{ blob: Blob } | { error: string }> {
  if (typeof document === "undefined") return { error: "Export needs a browser." };
  const zip = new JSZip();
  let i = 0;
  for (const page of doc.pages) {
    i += 1;
    const dataUrl = await exportCanvasToPngDataUrlAsync(doc, scale, page.id);
    if (!dataUrl) return { error: `Could not render page ${i}.` };
    const name = `${String(i).padStart(2, "0")}-${(page.name || "page").replace(/[^\w.-]+/g, "_").slice(0, 40)}.png`;
    zip.file(name, dataUrlToUint8(dataUrl));
  }
  const blob = await zip.generateAsync({ type: "blob" });
  return { blob };
}

/**
 * Multi-page PDF embedding JPEG frames (S15).
 * Each page is one full-bleed image.
 */
export async function exportCanvasPagesPdfBlob(
  doc: CanvasDocument,
  scale = 0.75,
): Promise<{ blob: Blob } | { error: string }> {
  if (typeof document === "undefined") return { error: "Export needs a browser." };

  const pages: { width: number; height: number; jpeg: Uint8Array }[] = [];
  for (const page of doc.pages) {
    const dataUrl = await exportCanvasToPngDataUrlAsync(doc, scale, page.id);
    if (!dataUrl) return { error: `Could not render “${page.name}”.` };
    const jpegUrl = await pngDataUrlToJpegDataUrl(dataUrl, 0.92);
    if (!jpegUrl) return { error: "Could not encode JPEG for PDF." };
    pages.push({
      width: Math.round(page.width * scale),
      height: Math.round(page.height * scale),
      jpeg: dataUrlToUint8(jpegUrl),
    });
  }

  try {
    const pdf = buildJpegPagesPdf(pages);
    const copy = new Uint8Array(pdf.byteLength);
    copy.set(pdf);
    return { blob: new Blob([copy], { type: "application/pdf" }) };
  } catch {
    return { error: "Could not build PDF." };
  }
}

export function downloadStudioExport(blob: Blob, filename: string) {
  downloadBlob(blob, filename);
}

async function pngDataUrlToJpegDataUrl(pngDataUrl: string, quality: number): Promise<string | null> {
  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => resolve(null);
    el.src = pngDataUrl;
  });
  if (!img) return null;
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0);
  return c.toDataURL("image/jpeg", quality);
}

function buildJpegPagesPdf(pages: { width: number; height: number; jpeg: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let pos = 0;
  const write = (data: string | Uint8Array) => {
    const b = typeof data === "string" ? enc.encode(data) : data;
    chunks.push(b);
    pos += b.length;
  };

  write("%PDF-1.4\n");
  const offsets: number[] = [0];
  const startObj = () => {
    offsets.push(pos);
    return offsets.length - 1;
  };

  const pageRefs: string[] = [];
  for (let i = 0; i < pages.length; i++) {
    pageRefs.push(`${5 + 3 * i} 0 R`);
  }

  startObj();
  write(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

  startObj();
  write(`2 0 obj\n<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pages.length} >>\nendobj\n`);

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i]!;
    const imgNum = 3 + 3 * i;
    const contentNum = 4 + 3 * i;
    const pageNum = 5 + 3 * i;

    startObj();
    write(
      `${imgNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`,
    );
    write(p.jpeg);
    write(`\nendstream\nendobj\n`);

    const content = `q\n${p.width} 0 0 ${p.height} 0 0 cm\n/Im${i} Do\nQ\n`;
    const contentBytes = enc.encode(content);
    startObj();
    write(`${contentNum} 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
    write(contentBytes);
    write(`\nendstream\nendobj\n`);

    startObj();
    write(
      `${pageNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.width} ${p.height}] /Contents ${contentNum} 0 R /Resources << /XObject << /Im${i} ${imgNum} 0 R >> >> >>\nendobj\n`,
    );
  }

  const xrefPos = pos;
  write(`xref\n0 ${offsets.length}\n`);
  write(`0000000000 65535 f \n`);
  for (let i = 1; i < offsets.length; i++) {
    write(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  write(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);

  const out = new Uint8Array(pos);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}
