"use client";

import { BUILDER } from "@/lib/create/builder-ui";
import type { ThemeTokens } from "@/lib/create/website-schema";

const SWATCHES = [
  "#E9006B",
  "#FF5500",
  "#00C851",
  "#0F0D33",
  "#FAFAF8",
  "#111111",
  "#E8D5A3",
  "#2563EB",
] as const;

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-[10px] uppercase tracking-wider">
      {label}
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={value.startsWith("#") && value.length >= 7 ? value.slice(0, 7) : "#E9006B"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-lg border border-black/10 bg-transparent p-0.5"
          aria-label={`${label} color picker`}
        />
        <input
          className="flex-1 rounded-lg px-2 py-1.5 text-xs font-mono"
          style={{ border: `1px solid ${BUILDER.border}` }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            className="h-6 w-6 rounded-full border border-black/10"
            style={{ background: c }}
            aria-label={`Use ${c}`}
            onClick={() => onChange(c)}
          />
        ))}
      </div>
    </label>
  );
}

export function BuilderColorPanel({
  theme,
  heroAccent,
  onThemeChange,
  onHeroAccentChange,
}: {
  theme: ThemeTokens;
  heroAccent?: string;
  onThemeChange: (patch: Partial<ThemeTokens>) => void;
  onHeroAccentChange?: (color: string) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed" style={{ color: BUILDER.muted }}>
        Site-wide colors — accent shows on buttons and highlights. Motion hero accent updates the pink on May-style
        layouts.
      </p>
      <ColorField label="Accent" value={theme.accent} onChange={(accent) => onThemeChange({ accent })} />
      <ColorField label="Background" value={theme.background} onChange={(background) => onThemeChange({ background })} />
      <ColorField label="Text" value={theme.text} onChange={(text) => onThemeChange({ text })} />
      {onHeroAccentChange ? (
        <ColorField
          label="Motion hero accent"
          value={heroAccent ?? theme.accent}
          onChange={onHeroAccentChange}
        />
      ) : null}
    </div>
  );
}
