/**
 * Real custom font loading for Studio text layers — the uploaded/marketplace
 * counterpart to fonts-catalog.ts's curated Google Fonts (which load via a
 * single <link rel="stylesheet"> to the Google Fonts CSS2 API and can't serve
 * an arbitrary uploaded font file). Uses the browser FontFace API directly.
 *
 * SSR-safe by design: `typeof document === "undefined"` during server
 * rendering (and in this repo's node-environment unit tests), so every
 * export here checks for that and degrades to a clear, honest result
 * instead of throwing.
 */

const loaded = new Set<string>();
const loading = new Map<string, Promise<{ ok: boolean; error?: string }>>();

export function customFontsSupported(): boolean {
  return typeof document !== "undefined" && typeof FontFace !== "undefined";
}

export function isCustomFontLoaded(family: string): boolean {
  return loaded.has(family);
}

/** Load one font file into this page's font set, so `font-family: "<family>"` actually renders it. Idempotent and de-duplicated across concurrent calls for the same family. */
export async function loadCustomFontFace(family: string, fileUrl: string): Promise<{ ok: boolean; error?: string }> {
  const name = family.trim();
  if (!name) return { ok: false, error: "Font family name is required." };
  if (!customFontsSupported()) {
    return { ok: false, error: "Custom fonts are not supported in this environment." };
  }
  if (loaded.has(name)) return { ok: true };

  const inFlight = loading.get(name);
  if (inFlight) return inFlight;

  const task = (async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      // CSS single-quoted string escaping — backslash and the quote itself only.
      const cssUrl = fileUrl.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      const face = new FontFace(name, `url('${cssUrl}')`);
      const loadedFace = await face.load();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (document.fonts as any).add(loadedFace);
      loaded.add(name);
      return { ok: true };
    } catch (cause) {
      return { ok: false, error: cause instanceof Error ? cause.message : "Could not load this font." };
    } finally {
      loading.delete(name);
    }
  })();

  loading.set(name, task);
  return task;
}

/** Load every acquired font in parallel; never throws, reports per-font failures. */
export async function loadCustomFontFaces(
  fonts: { family: string; fileUrl: string }[],
): Promise<{ family: string; ok: boolean; error?: string }[]> {
  return Promise.all(
    fonts.map(async (f) => {
      const result = await loadCustomFontFace(f.family, f.fileUrl);
      return { family: f.family, ...result };
    }),
  );
}

/** Test-only: clear the module-level cache between isolated scenarios. */
export function _resetCustomFontCacheForTests(): void {
  loaded.clear();
  loading.clear();
}
