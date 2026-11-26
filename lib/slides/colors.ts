/** Shared hex-color parsing for Slides export (PDF vector drawing + PPTX). */
export function parseHexColor(value: string | undefined, fallback = "#000000"): { r: number; g: number; b: number } {
  const hex = (value && /^#?[0-9a-f]{6}$/i.test(value.replace("#", "")) ? value : fallback).replace("#", "");
  return {
    r: parseInt(hex.slice(0, 2), 16) / 255,
    g: parseInt(hex.slice(2, 4), 16) / 255,
    b: parseInt(hex.slice(4, 6), 16) / 255,
  };
}

/** Strips the leading '#' for libraries (pptxgenjs) that want bare RRGGBB. */
export function hexNoHash(value: string | undefined, fallback = "000000"): string {
  const hex = (value ?? "").replace("#", "");
  return /^[0-9a-f]{6}$/i.test(hex) ? hex.toUpperCase() : fallback;
}
