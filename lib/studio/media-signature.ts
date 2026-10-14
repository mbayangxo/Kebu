/** Container signatures only; this does not certify that the entire media decodes. */
export function sniffStudioMedia(bytes: Uint8Array, claimed: string): string | null {
  const prefix = (...values: number[]) => values.every((value, i) => bytes[i] === value);
  const textAt = (start: number, length: number) => String.fromCharCode(...bytes.slice(start, start + length));
  if (prefix(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (prefix(0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10)) return "image/png";
  if (["GIF87a", "GIF89a"].includes(textAt(0, 6))) return "image/gif";
  if (textAt(0, 4) === "RIFF") {
    if (textAt(8, 4) === "WAVE") return "audio/wav";
    if (textAt(8, 4) === "WEBP") return "image/webp";
    return null;
  }
  if (textAt(4, 4) === "ftyp") {
    return claimed.startsWith("video/") ? "video/mp4" : "audio/mp4";
  }
  if (textAt(0, 4) === "OggS") return claimed.startsWith("video/") ? "video/ogg" : "audio/ogg";
  if (textAt(0, 3) === "ID3") return "audio/mpeg";
  // ADTS (AAC) precedes the broader MPEG frame sync check.
  if (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xf6) === 0xf0) return "audio/aac";
  if (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0) return "audio/mpeg";
  // EBML is binary: UTF-8 decoding replaces these bytes and cannot match this signature.
  if (prefix(0x1a, 0x45, 0xdf, 0xa3)) return claimed.startsWith("audio/") ? "audio/webm" : "video/webm";
  return null;
}
