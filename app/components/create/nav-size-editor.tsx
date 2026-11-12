"use client";

import {
  NAV_SIZE_PRESETS,
  type NavLayoutPreset,
  type NavSizePreset,
} from "@/lib/create/nav-chrome-size";
import { GalaxySegmentedControl } from "@/app/components/galaxy/editor-primitives";

const LAYOUT_OPTIONS: readonly { value: NavLayoutPreset; label: string; hint: string }[] = [
  { value: "top", label: "Top", hint: "Horizontal navigation" },
  { value: "hamburger", label: "Menu", hint: "Drawer navigation" },
  { value: "side", label: "Side", hint: "Vertical navigation" },
];

export function NavSizeEditor({
  scale,
  size,
  layout = "top",
  logoAlign = "left",
  onChange,
}: {
  scale: number;
  size: NavSizePreset;
  layout?: NavLayoutPreset;
  logoAlign?: "left" | "center" | "right";
  onChange: (patch: {
    navScale?: number;
    navSize?: NavSizePreset;
    navLayout?: NavLayoutPreset;
    logoAlign?: "left" | "center" | "right";
  }) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[10px] font-semibold text-black/55">Layout</p>
        <div className="grid grid-cols-3 gap-1">
          {LAYOUT_OPTIONS.map((option) => {
            const active = layout === option.value;
            return (
              <button
                key={option.value}
                type="button"
                title={option.hint}
                aria-pressed={active}
                className="rounded-lg border px-2 py-2 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
                style={{ borderColor: active ? "#FF6A00" : "rgba(0,0,0,.10)", background: active ? "rgba(255,106,0,.08)" : "#fff" }}
                onClick={() => onChange({ navLayout: option.value })}
              >
                <span className="block text-[10px] font-semibold text-black">{option.label}</span>
                <span className="mt-0.5 block text-[8px] leading-tight text-black/40">{option.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {layout !== "side" ? (
        <GalaxySegmentedControl
          label="Logo position"
          value={logoAlign}
          options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ] as const}
          onChange={(value) => onChange({ logoAlign: value })}
        />
      ) : null}

      <label className="block text-[10px] font-semibold text-black/55">
        Navigation height
        <select
          className="mt-1.5 min-h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 text-xs font-semibold text-black outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/15"
          value={size}
          onChange={(event) => onChange({ navSize: event.target.value as NavSizePreset })}
        >
          {NAV_SIZE_PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {preset === "fullscreen" ? "Full width" : preset === "compact" ? "Compact" : preset === "large" ? "Large" : "Comfortable"}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-[10px] font-semibold text-black/55">
        Fine scale
        <div className="mt-2 flex items-center gap-2">
          <input
            type="range"
            min={0.7}
            max={2.2}
            step={0.05}
            value={scale}
            className="min-w-0 flex-1 accent-[#FF6A00]"
            onChange={(event) => onChange({ navScale: Number(event.target.value) })}
          />
          <span className="w-12 text-right text-[10px] font-bold text-black/45">{scale.toFixed(2)}×</span>
        </div>
      </label>

      <div className="grid grid-cols-3 gap-1">
        <button type="button" className="min-h-8 rounded-lg border border-black/10 bg-white text-[9px] font-bold" onClick={() => onChange({ navScale: 0.85, navSize: "compact" })}>Smaller</button>
        <button type="button" className="min-h-8 rounded-lg border border-black/10 bg-white text-[9px] font-bold" onClick={() => onChange({ navScale: 1, navSize: "comfortable" })}>Reset</button>
        <button type="button" className="min-h-8 rounded-lg border border-black/10 bg-white text-[9px] font-bold" onClick={() => onChange({ navScale: 1.35, navSize: "large" })}>Larger</button>
      </div>
      <p className="text-[9px] leading-relaxed text-black/40">You can also drag the lower edge of the navigation directly on the canvas.</p>
    </div>
  );
}
