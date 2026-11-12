import JSZip from "jszip";
import {
  MAX_DEPLOYMENT_ASSET_BYTES,
  MAX_DEPLOYMENT_BUNDLE_BYTES,
  MAX_DEPLOYMENT_FILE_COUNT,
  isAllowedDeploymentExtension,
  mimeFromExtension,
} from "@/lib/cloud/constants";

export type ExtractedAsset = {
  relativePath: string;
  buffer: Buffer;
  mimeType: string;
  size: number;
};

export type ZipExtractResult =
  | { ok: true; files: ExtractedAsset[]; totalBytes: number }
  | { ok: false; error: string };

/**
 * Validates and extracts a static-site zip bundle entry by entry.
 *
 * Two independent defenses, since JSZip has no public pre-decompression size
 * check: (1) each entry's own declared uncompressed size (JSZip's internal
 * `_data.uncompressedSize`, read defensively — not officially public API, so
 * never trusted alone) is checked before calling `.async()` where available;
 * (2) a running total is enforced during iteration regardless, so even an
 * entry with no readable pre-check still aborts extraction the moment the
 * cumulative real byte count crosses the cap, rather than after the whole
 * zip has been pulled into memory.
 */
export async function extractDeploymentZip(
  zipBuffer: Buffer,
  remainingQuotaBytes: number,
): Promise<ZipExtractResult> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipBuffer);
  } catch {
    return { ok: false, error: "Not a valid zip file." };
  }

  const cap = Math.min(MAX_DEPLOYMENT_BUNDLE_BYTES, Math.max(0, remainingQuotaBytes));
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);

  if (entries.length === 0) {
    return { ok: false, error: "Zip has no files." };
  }
  if (entries.length > MAX_DEPLOYMENT_FILE_COUNT) {
    return { ok: false, error: `Too many files (${entries.length}); max ${MAX_DEPLOYMENT_FILE_COUNT}.` };
  }

  const files: ExtractedAsset[] = [];
  let totalBytes = 0;

  for (const entry of entries) {
    const relativePath = sanitizeZipEntryPath(entry.name);
    if (!relativePath) {
      return { ok: false, error: `Rejected unsafe path in zip: "${entry.name}".` };
    }
    if (!isAllowedDeploymentExtension(relativePath)) {
      return { ok: false, error: `Unsupported file type: "${relativePath}". Static web assets only.` };
    }

    const declaredSize = readDeclaredUncompressedSize(entry);
    if (declaredSize !== null) {
      if (declaredSize > MAX_DEPLOYMENT_ASSET_BYTES) {
        return { ok: false, error: `"${relativePath}" exceeds the ${MAX_DEPLOYMENT_ASSET_BYTES} byte per-file limit.` };
      }
      if (totalBytes + declaredSize > cap) {
        return { ok: false, error: "Bundle exceeds your remaining storage quota." };
      }
    }

    const buffer = await entry.async("nodebuffer");

    if (buffer.length > MAX_DEPLOYMENT_ASSET_BYTES) {
      return { ok: false, error: `"${relativePath}" exceeds the ${MAX_DEPLOYMENT_ASSET_BYTES} byte per-file limit.` };
    }

    totalBytes += buffer.length;
    if (totalBytes > cap) {
      return { ok: false, error: "Bundle exceeds your remaining storage quota." };
    }

    files.push({
      relativePath,
      buffer,
      mimeType: mimeFromExtension(relativePath),
      size: buffer.length,
    });
  }

  if (!files.some((f) => f.relativePath === "index.html")) {
    return { ok: false, error: "Bundle must include an index.html at its root." };
  }

  return { ok: true, files, totalBytes };
}

/**
 * Rejects zip-slip / path traversal (`..`, absolute paths, backslashes,
 * empty segments, null bytes) and returns a normalized forward-slash
 * relative path, or null if the entry is unsafe. This path only ever
 * becomes a Supabase Storage object key suffix (never resolved against a
 * real filesystem), but a traversal-like segment is still rejected outright
 * rather than "sanitized" — an entry like `../other-deployment/evil.html`
 * must fail the upload, not silently become `other-deployment/evil.html`
 * and risk colliding with a different deployment's asset path.
 */
export function sanitizeZipEntryPath(rawName: string): string | null {
  if (!rawName || rawName.includes("\0")) return null;
  const normalized = rawName.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.endsWith("/")) return null;
  const segments = normalized.split("/");
  for (const seg of segments) {
    if (seg === "" || seg === "." || seg === "..") return null;
    if (seg.length > 255) return null;
  }
  if (segments.length > 32) return null;
  return segments.join("/");
}

function readDeclaredUncompressedSize(entry: JSZip.JSZipObject): number | null {
  const internal = entry as unknown as { _data?: { uncompressedSize?: number } };
  const size = internal._data?.uncompressedSize;
  return typeof size === "number" && Number.isFinite(size) && size >= 0 ? size : null;
}
