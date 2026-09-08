"use client";

import {
  NAV_LAYOUT_PRESETS,
  NAV_SIZE_PRESETS,
  type NavLayoutPreset,
  type NavSizePreset,
} from "@/lib/create/nav-chrome-size";

/** Layout (top vs side) + size slider for site navigation. */
export function NavSizeEditor({
  scale,
  size,
  layout = "top",
  onChange,
}: {
  scale: number;
  size: NavSizePreset;
  layout?: NavLayoutPreset;
  onChange: (patch: {
    navScale?: number;
    navSize?: NavSizePreset;
    navLayout?: NavLayoutPreset;
  }) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg p-2" style={{ border: "1px solid #EEE", background: "#FAFAF8" }}>
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#FF5500" }}>
        Navigation style
      </p>
      <div className="grid grid-cols-2 gap-1">
        {NAV_LAYOUT_PRESETS.map((opt) => (
          <button
            key={opt}
            type="button"
            className="rounded-lg px-2 py-2 text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: layout === opt ? "#0F0D33" : "#fff",
              color: layout === opt ? "#fff" : "#0F0D33",
              border: "1px solid #DDE0F0",
            }}
            aria-pressed={layout === opt}
            onClick={() => onChange({ navLayout: opt })}
          >
            {opt === "top" ? "Regular (top)" : "Side nav"}
          </button>
        ))}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider pt-1" style={{ color: "#FF5500" }}>
        Nav size — shorter or larger
      </p>
      <label className="block text-[9px] uppercase tracking-wider text-black/50">
        Preset
        <select
          className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
          style={{ border: "1px solid #DDE0F0" }}
          value={size}
          onChange={(e) => onChange({ navSize: e.target.value as NavSizePreset })}
        >
          {NAV_SIZE_PRESETS.map((p) => (
            <option key={p} value={p}>
              {p === "fullscreen"
                ? "Full width (edge to edge)"
                : p === "compact"
                  ? "Compact (shorter)"
                  : p === "large"
                    ? "Large"
                    : "Comfortable"}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-[9px] uppercase tracking-wider text-black/50">
        Scale ({scale.toFixed(2)}×) — drag smaller or bigger
        <input
          type="range"
          min={0.7}
          max={2.2}
          step={0.05}
          value={scale}
          className="mt-1 w-full"
          onChange={(e) => onChange({ navScale: Number(e.target.value) })}
        />
      </label>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          className="rounded-full px-2 py-1 text-[9px] font-bold uppercase"
          style={{ border: "1px solid #DDE0F0" }}
          onClick={() => onChange({ navScale: 0.85, navSize: "compact" })}
        >
          Shorter
        </button>
        <button
          type="button"
          className="rounded-full px-2 py-1 text-[9px] font-bold uppercase"
          style={{ border: "1px solid #DDE0F0" }}
          onClick={() => onChange({ navScale: 1, navSize: "comfortable" })}
        >
          Reset
        </button>
        <button
          type="button"
          className="rounded-full px-2 py-1 text-[9px] font-bold uppercase"
          style={{ border: "1px solid #DDE0F0" }}
          onClick={() => onChange({ navScale: 1.35, navSize: "large" })}
        >
          Larger
        </button>
        <button
          type="button"
          className="rounded-full px-2 py-1 text-[9px] font-bold uppercase text-white"
          style={{ background: "#0F0D33" }}
          onClick={() => onChange({ navScale: 1.5, navSize: "fullscreen" })}
        >
          Full screen width
        </button>
      </div>
    </div>
  );
}
