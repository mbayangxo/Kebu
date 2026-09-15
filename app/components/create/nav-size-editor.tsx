"use client";

import {
  NAV_SIZE_PRESETS,
  type NavLayoutPreset,
  type NavSizePreset,
} from "@/lib/create/nav-chrome-size";

const LAYOUT_OPTIONS: { value: NavLayoutPreset; label: string; hint: string }[] = [
  { value: "top", label: "Top bar", hint: "Horizontal links across the top" },
  { value: "hamburger", label: "Hamburger ☰", hint: "Menu icon only — opens a drawer on click" },
  { value: "side", label: "Side nav", hint: "Vertical list pinned to the left" },
];

/** Layout + size + logo alignment controls for site navigation. */
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
    <div className="space-y-2 rounded-lg p-2" style={{ border: "1px solid #EEE", background: "#FAFAF8" }}>
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#FF5500" }}>
        Navigation style
      </p>

      {/* Layout */}
      <div className="grid grid-cols-3 gap-1">
        {LAYOUT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            title={opt.hint}
            className="rounded-lg px-1.5 py-2 text-[9px] font-bold uppercase tracking-wide leading-tight"
            style={{
              background: layout === opt.value ? "#0F0D33" : "#fff",
              color: layout === opt.value ? "#fff" : "#0F0D33",
              border: "1px solid #DDE0F0",
            }}
            aria-pressed={layout === opt.value}
            onClick={() => onChange({ navLayout: opt.value })}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Logo position — not relevant for side nav */}
      {layout !== "side" && (
        <>
          <p className="text-[10px] font-bold uppercase tracking-wider pt-1" style={{ color: "#FF5500" }}>
            Logo position
          </p>
          <div className="grid grid-cols-3 gap-1">
            {(["left", "center", "right"] as const).map((align) => (
              <button
                key={align}
                type="button"
                className="rounded-lg py-1.5 text-[9px] font-bold uppercase tracking-wide"
                style={{
                  background: logoAlign === align ? "#FF5500" : "#fff",
                  color: logoAlign === align ? "#fff" : "#0F0D33",
                  border: "1px solid #DDE0F0",
                }}
                aria-pressed={logoAlign === align}
                onClick={() => onChange({ logoAlign: align })}
              >
                {align}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Nav bar height */}
      <p className="text-[10px] font-bold uppercase tracking-wider pt-1" style={{ color: "#FF5500" }}>
        Nav bar height
      </p>
      <p className="text-[9px] leading-relaxed opacity-60">
        Drag the slider or tap a preset. You can also drag the bottom edge of the nav bar directly on the canvas.
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
          Taller
        </button>
        <button
          type="button"
          className="rounded-full px-2 py-1 text-[9px] font-bold uppercase text-white"
          style={{ background: "#0F0D33" }}
          onClick={() => onChange({ navScale: 1.5, navSize: "fullscreen" })}
        >
          Full width
        </button>
      </div>
    </div>
  );
}
