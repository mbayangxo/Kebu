export type StudioMediaAdjustments = {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  grayscale?: number;
  blur?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeMediaAdjustments(input: StudioMediaAdjustments): Required<StudioMediaAdjustments> {
  return {
    brightness: clamp(Number.isFinite(input.brightness) ? input.brightness! : 1, 0, 2),
    contrast: clamp(Number.isFinite(input.contrast) ? input.contrast! : 1, 0, 2),
    saturation: clamp(Number.isFinite(input.saturation) ? input.saturation! : 1, 0, 3),
    grayscale: clamp(Number.isFinite(input.grayscale) ? input.grayscale! : 0, 0, 1),
    blur: clamp(Number.isFinite(input.blur) ? input.blur! : 0, 0, 40),
  };
}

export function mediaFilterCss(input: StudioMediaAdjustments): string | undefined {
  const value = normalizeMediaAdjustments(input);
  const parts: string[] = [];
  if (Math.abs(value.brightness - 1) > 0.001) parts.push("brightness(" + value.brightness + ")");
  if (Math.abs(value.contrast - 1) > 0.001) parts.push("contrast(" + value.contrast + ")");
  if (Math.abs(value.saturation - 1) > 0.001) parts.push("saturate(" + value.saturation + ")");
  if (value.grayscale > 0.001) parts.push("grayscale(" + value.grayscale + ")");
  if (value.blur > 0.001) parts.push("blur(" + value.blur + "px)");
  return parts.length ? parts.join(" ") : undefined;
}
