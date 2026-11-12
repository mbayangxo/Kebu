import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

/**
 * MapLibre GL's tile-parsing worker, served same-origin so it works under
 * our CSP (`worker-src 'self' blob:`) and so Kebu Maps has no runtime
 * dependency on a third-party CDN for a core piece of functionality.
 * Turbopack's `new Worker(new URL(..., import.meta.url))` bundling for this
 * worker doesn't resolve correctly in dev — see lib/maps/provider.ts's
 * sibling comment on config.WORKER_URL in kebu-map.tsx. Read directly from
 * the installed package rather than vendoring a copy, so this can never
 * drift from the maplibre-gl version actually in package.json.
 */
export async function GET() {
  const file = path.join(process.cwd(), "node_modules", "maplibre-gl", "dist", "maplibre-gl-worker.mjs");
  const body = await readFile(file, "utf8");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
