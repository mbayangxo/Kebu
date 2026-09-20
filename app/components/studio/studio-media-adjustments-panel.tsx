"use client";

import type { CanvasLayer } from "@/lib/studio/canvas-document";

const CONTROLS = [
  { key: "brightness", label: "Brightness", min: 0, max: 200, divisor: 100, neutral: 1 },
  { key: "contrast", label: "Contrast", min: 0, max: 200, divisor: 100, neutral: 1 },
  { key: "saturation", label: "Saturation", min: 0, max: 300, divisor: 100, neutral: 1 },
  { key: "grayscale", label: "Grayscale", min: 0, max: 100, divisor: 100, neutral: 0 },
  { key: "blur", label: "Blur", min: 0, max: 40, divisor: 1, neutral: 0 },
] as const;

type AdjustmentKey = (typeof CONTROLS)[number]["key"];

export function StudioMediaAdjustmentsPanel({
  layer,
  onChange,
}: {
  layer: CanvasLayer;
  onChange: (patch: Partial<CanvasLayer>) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-50 pt-2">
        Adjust
      </p>
      {CONTROLS.map((control) => {
        const raw = layer[control.key] as number | undefined;
        const value = raw ?? control.neutral;
        const sliderValue = control.key === "blur" ? value : Math.round(value * control.divisor);
        return (
          <label key={control.key} className="block font-semibold">
            <span className="flex items-center justify-between gap-2">
              <span>{control.label}</span>
              <span className="text-[10px] font-normal opacity-45">
                {control.key === "blur" ? Math.round(value) + "px" : Math.round(value * 100) + "%"}
              </span>
            </span>
            <input
              type="range"
              min={control.min}
              max={control.max}
              step={1}
              value={sliderValue}
              onChange={(event) =>
                onChange({
                  [control.key]: control.key === "blur"
                    ? Number(event.target.value)
                    : Number(event.target.value) / control.divisor,
                } as Partial<Record<AdjustmentKey, number>>)
              }
              className="mt-1 w-full"
            />
          </label>
        );
      })}
      <button
        type="button"
        className="text-[11px] underline"
        onClick={() =>
          onChange({
            brightness: 1,
            contrast: 1,
            saturation: 1,
            grayscale: 0,
            blur: 0,
          })
        }
      >
        Reset adjustments
      </button>
    </div>
  );
}
