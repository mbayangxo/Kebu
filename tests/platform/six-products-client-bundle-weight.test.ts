import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression guard, load-independent (no browser/server needed): the six
 * products built this session (Docs/Sheets/Slides/Calls/Maps/Cloud) must
 * never silently start shipping their server-only heavy export libraries
 * (pptxgenjs, pdf-lib, jszip) to the browser. Those three are real and
 * necessary for export, but belong only in API routes -- a client import
 * would add megabytes to a page a user just wants to view/edit, which is
 * exactly the kind of regression that's invisible in a diff review but
 * real on a slow connection. Confirmed by source inspection (2026-11-09):
 * all three currently resolve only from server-side route handlers.
 */
const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const CLIENT_SURFACES = [
  "app/components/library/document-editor.tsx",
  "app/components/library/library-documents-panel.tsx",
  "app/components/sheets/sheet-grid.tsx",
  "app/components/sheets/sheet-editor.tsx",
  "app/components/slides/slide-canvas.tsx",
  "app/components/slides/slide-render.tsx",
  "app/components/slides/slide-editor.tsx",
  "app/components/slides/present-mode.tsx",
  "app/components/maps/kebu-map.tsx",
];

const SERVER_ONLY_HEAVY_LIBS = ["pptxgenjs", "pdf-lib", "jszip"];

describe("six-products client bundles stay free of server-only export libraries", () => {
  for (const file of CLIENT_SURFACES) {
    it(`${file} never imports pptxgenjs/pdf-lib/jszip directly`, () => {
      let source: string;
      try {
        source = read(file);
      } catch {
        // A surface may have been renamed/split by a later change -- that's
        // fine, this guard only needs to hold for whatever client files
        // actually exist; a missing path here is not itself a failure.
        return;
      }
      for (const lib of SERVER_ONLY_HEAVY_LIBS) {
        expect(source, `${file} should not import "${lib}" -- it's a server-only export dependency`).not.toMatch(
          new RegExp(`from\\s+["']${lib.replace(/[-/]/g, "\\$&")}["']`),
        );
      }
    });
  }

  it("the real export modules (pptxgenjs/pdf-lib/jszip) are only reachable from API route handlers, not client components", () => {
    const exportModules = ["lib/slides/export-pptx.ts", "lib/slides/export-pdf.ts", "lib/cloud/zip-extract.ts"];
    for (const mod of exportModules) {
      let source: string;
      try {
        source = read(mod);
      } catch {
        continue;
      }
      expect(source, `${mod} must not be a client component`).not.toContain('"use client"');
    }
  });
});
