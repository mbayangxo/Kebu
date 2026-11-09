/**
 * Shared safe-image-fetch boundary for both Slides exporters.
 *
 * An image layer's `imageUrl` is editor-supplied (anyone who can edit the
 * deck, not just the owner), so the bytes behind it are attacker-controlled
 * input from this feature's own trust boundary. This fetches with a byte
 * cap and timeout, then sniffs the real magic bytes itself and only ever
 * tells callers "this is a PNG" / "this is a JPEG" for the two formats we
 * actually support -- never runs a generic/auto-detecting image parser
 * against the bytes. Callers (PDF export's embedPng/embedJpg, PPTX export's
 * addImage with a data: URI) only ever receive bytes this function has
 * already classified as one of those two formats.
 */
const FETCH_TIMEOUT_MS = 8000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export type FetchedImage = { bytes: Uint8Array; kind: "png" | "jpg" };

export async function fetchImageBytes(url: string): Promise<FetchedImage | null> {
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
