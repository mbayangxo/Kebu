import { describe, expect, it } from "vitest";
import { defaultCanvasDocument } from "@/lib/studio/canvas-document";

describe("S15 export pack (browser-gated)", () => {
  it("export helpers refuse Node (need document)", async () => {
    const { exportCanvasPagesZipBlob, exportCanvasPagesPdfBlob } = await import(
      "@/lib/studio/export-pack"
    );
    const doc = defaultCanvasDocument("instagram_post");
    const zip = await exportCanvasPagesZipBlob(doc);
    const pdf = await exportCanvasPagesPdfBlob(doc);
    expect("error" in zip && zip.error).toMatch(/browser/i);
    expect("error" in pdf && pdf.error).toMatch(/browser/i);
  });
});
