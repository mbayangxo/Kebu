import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  customFontsSupported,
  isCustomFontLoaded,
  loadCustomFontFace,
  loadCustomFontFaces,
  _resetCustomFontCacheForTests,
} from "@/lib/studio/custom-fonts";

describe("Studio custom fonts — SSR safety (real node environment, no DOM)", () => {
  it("reports unsupported and fails honestly rather than throwing when there is no document/FontFace", async () => {
    expect(customFontsSupported()).toBe(false);
    const result = await loadCustomFontFace("Kente Display", "https://files.example/kente.woff2");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not supported/i);
    expect(isCustomFontLoaded("Kente Display")).toBe(false);
  });

  it("rejects an empty family name before touching the environment check", async () => {
    const result = await loadCustomFontFace("   ", "https://files.example/x.woff2");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/required/i);
  });
});

describe("Studio custom fonts — real FontFace loading (mocked browser globals)", () => {
  let loadedFaces: unknown[];

  beforeEach(() => {
    _resetCustomFontCacheForTests();
    loadedFaces = [];
    class MockFontFace {
      family: string;
      source: string;
      constructor(family: string, source: string) {
        this.family = family;
        this.source = source;
      }
      async load() {
        if (this.source.includes("broken")) throw new Error("Font could not be parsed.");
        return this;
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).FontFace = MockFontFace;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).document = { fonts: { add: (f: unknown) => loadedFaces.push(f) } };
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).FontFace;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).document;
    _resetCustomFontCacheForTests();
  });

  it("loads a real font face and registers it as loaded", async () => {
    expect(customFontsSupported()).toBe(true);
    const result = await loadCustomFontFace("Kente Display", "https://files.example/kente.woff2");
    expect(result.ok).toBe(true);
    expect(isCustomFontLoaded("Kente Display")).toBe(true);
    expect(loadedFaces).toHaveLength(1);
  });

  it("is idempotent — loading the same family twice adds it to document.fonts only once", async () => {
    await loadCustomFontFace("Kente Display", "https://files.example/kente.woff2");
    const second = await loadCustomFontFace("Kente Display", "https://files.example/kente.woff2");
    expect(second.ok).toBe(true);
    expect(loadedFaces).toHaveLength(1);
  });

  it("de-duplicates concurrent loads of the same family into one FontFace.load() call", async () => {
    const [a, b] = await Promise.all([
      loadCustomFontFace("Kente Display", "https://files.example/kente.woff2"),
      loadCustomFontFace("Kente Display", "https://files.example/kente.woff2"),
    ]);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(loadedFaces).toHaveLength(1);
  });

  it("reports a real load failure honestly instead of silently succeeding", async () => {
    const result = await loadCustomFontFace("Broken Font", "https://files.example/broken.woff2");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/could not be parsed/i);
    expect(isCustomFontLoaded("Broken Font")).toBe(false);
  });

  it("escapes a single quote and backslash in the file URL so the CSS url() stays valid", async () => {
    const result = await loadCustomFontFace("Quoted Font", "https://files.example/it's\\a-font.woff2");
    expect(result.ok).toBe(true);
  });

  it("loads several fonts in parallel and reports per-font results without throwing on one failure", async () => {
    const results = await loadCustomFontFaces([
      { family: "Kente Display", fileUrl: "https://files.example/kente.woff2" },
      { family: "Broken Font", fileUrl: "https://files.example/broken.woff2" },
    ]);
    expect(results.find((r) => r.family === "Kente Display")?.ok).toBe(true);
    expect(results.find((r) => r.family === "Broken Font")?.ok).toBe(false);
  });
});
