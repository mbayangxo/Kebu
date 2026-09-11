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

const DISPLAY_FONTS = [
  // Serif
  "Playfair Display",
  "Fraunces",
  "Cormorant Garamond",
  "Lora",
  "Merriweather",
  "DM Serif Display",
  "Libre Baskerville",
  "EB Garamond",
  // Sans-serif
  "Inter",
  "Jost",
  "Montserrat",
  "Poppins",
  "Raleway",
  "Syne",
  "DM Sans",
  "Plus Jakarta Sans",
  "Space Grotesk",
  "Work Sans",
  "Nunito",
  "Outfit",
  // Display / editorial
  "Oswald",
  "Bebas Neue",
  "Abril Fatface",
  "Bungee",
  // System
  "system-ui",
  "Georgia",
  "serif",
] as const;

const BODY_FONTS = [
  "Inter",
  "IBM Plex Sans",
  "DM Sans",
  "Jost",
  "Lato",
  "Open Sans",
  "Nunito",
  "Raleway",
  "Source Sans 3",
  "Noto Sans",
  "Karla",
  "Mulish",
  "Quicksand",
  "Cabin",
  "Barlow",
  "system-ui",
  "Georgia",
  "serif",
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

/** Shopify-style theme colors — primary, accent, background, text + May hero accent. */
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
        Full color control for the live site. Save to draft, then publish so visitors see the change.
      </p>
      <ColorField label="Primary" value={theme.primary} onChange={(primary) => onThemeChange({ primary })} />
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

/** Fonts + type scale (Shopify theme typography). */
export function BuilderTypographyPanel({
  theme,
  onThemeChange,
}: {
  theme: ThemeTokens;
  onThemeChange: (patch: Partial<ThemeTokens>) => void;
}) {
  const displayIsCustom = !(DISPLAY_FONTS as readonly string[]).includes(theme.fontDisplay);
  const bodyIsCustom = !(BODY_FONTS as readonly string[]).includes(theme.fontBody);

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BUILDER.faint }}>
        Typography
      </p>

      {/* Display / headings font */}
      <div>
        <p className="mb-1.5 text-[10px] uppercase tracking-wider">Display / headings</p>
        <select
          className="w-full rounded-lg px-2 py-2 text-xs"
          style={{ border: `1px solid ${BUILDER.border}` }}
          value={displayIsCustom ? "__custom__" : theme.fontDisplay}
          onChange={(e) => {
            if (e.target.value !== "__custom__") onThemeChange({ fontDisplay: e.target.value });
          }}
        >
          {DISPLAY_FONTS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
          <option value="__custom__">Custom Google Font…</option>
        </select>
        {(displayIsCustom) ? (
          <input
            className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
            style={{ border: `1px solid ${BUILDER.border}` }}
            value={theme.fontDisplay}
            onChange={(e) => onThemeChange({ fontDisplay: e.target.value })}
            placeholder="e.g. Dela Gothic One"
          />
        ) : null}
        {/* quick-pick custom entry */}
        {!displayIsCustom ? (
          <input
            className="mt-1 w-full rounded-lg px-2 py-1.5 text-[10px]"
            style={{ border: `1px dashed ${BUILDER.border}`, background: BUILDER.surfaceMuted }}
            placeholder="Or type any Google Font name…"
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              if (e.target.value.trim()) onThemeChange({ fontDisplay: e.target.value.trim() });
            }}
          />
        ) : null}
        {theme.fontDisplay && theme.fontDisplay !== "system-ui" && theme.fontDisplay !== "serif" ? (
          <link
            rel="stylesheet"
            href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.fontDisplay)}:wght@400;700&display=swap`}
          />
        ) : null}
        <p
          className="mt-1.5 truncate text-[18px] leading-tight"
          style={{ fontFamily: `"${theme.fontDisplay}", serif` }}
          aria-hidden
        >
          Aa — {theme.fontDisplay}
        </p>
      </div>

      {/* Body font */}
      <div>
        <p className="mb-1.5 text-[10px] uppercase tracking-wider">Body text</p>
        <select
          className="w-full rounded-lg px-2 py-2 text-xs"
          style={{ border: `1px solid ${BUILDER.border}` }}
          value={bodyIsCustom ? "__custom__" : theme.fontBody}
          onChange={(e) => {
            if (e.target.value !== "__custom__") onThemeChange({ fontBody: e.target.value });
          }}
        >
          {BODY_FONTS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
          <option value="__custom__">Custom Google Font…</option>
        </select>
        {bodyIsCustom ? (
          <input
            className="mt-1 w-full rounded-lg px-2 py-1.5 text-xs"
            style={{ border: `1px solid ${BUILDER.border}` }}
            value={theme.fontBody}
            onChange={(e) => onThemeChange({ fontBody: e.target.value })}
            placeholder="e.g. Noto Sans"
          />
        ) : null}
        {!bodyIsCustom ? (
          <input
            className="mt-1 w-full rounded-lg px-2 py-1.5 text-[10px]"
            style={{ border: `1px dashed ${BUILDER.border}`, background: BUILDER.surfaceMuted }}
            placeholder="Or type any Google Font name…"
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              if (e.target.value.trim()) onThemeChange({ fontBody: e.target.value.trim() });
            }}
          />
        ) : null}
        {theme.fontBody && theme.fontBody !== "system-ui" && theme.fontBody !== "serif" ? (
          <link
            rel="stylesheet"
            href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.fontBody)}:wght@400;700&display=swap`}
          />
        ) : null}
        <p
          className="mt-1.5 truncate text-[13px]"
          style={{ fontFamily: `"${theme.fontBody}", sans-serif` }}
          aria-hidden
        >
          The quick brown fox — {theme.fontBody}
        </p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider mb-1.5">Heading size</p>
        <div className="flex gap-1">
          {(["sm", "md", "lg", "xl"] as const).map((id) => {
            const on = (theme.headingScale ?? "md") === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onThemeChange({ headingScale: id })}
                className="flex-1 rounded-lg py-2 text-[10px] font-bold uppercase"
                style={{
                  background: on ? BUILDER.ink : BUILDER.surfaceMuted,
                  color: on ? "#fff" : BUILDER.ink,
                  border: `1px solid ${BUILDER.border}`,
                }}
                aria-pressed={on}
              >
                {id}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider mb-1.5">Body size</p>
        <div className="flex gap-1">
          {(["sm", "md", "lg"] as const).map((id) => {
            const on = (theme.bodySize ?? "md") === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onThemeChange({ bodySize: id })}
                className="flex-1 rounded-lg py-2 text-[10px] font-bold uppercase"
                style={{
                  background: on ? BUILDER.ink : BUILDER.surfaceMuted,
                  color: on ? "#fff" : BUILDER.ink,
                  border: `1px solid ${BUILDER.border}`,
                }}
                aria-pressed={on}
              >
                {id}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider mb-1.5">Letter spacing</p>
        <div className="flex gap-1">
          {(["tight", "normal", "wide"] as const).map((id) => {
            const on = (theme.letterSpacing ?? "normal") === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onThemeChange({ letterSpacing: id })}
                className="flex-1 rounded-lg py-2 text-[10px] font-bold uppercase"
                style={{
                  background: on ? BUILDER.ink : BUILDER.surfaceMuted,
                  color: on ? "#fff" : BUILDER.ink,
                  border: `1px solid ${BUILDER.border}`,
                }}
                aria-pressed={on}
              >
                {id}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider mb-1.5">Section spacing</p>
        <div className="flex gap-1">
          {(["compact", "comfortable", "airy"] as const).map((id) => {
            const on = theme.spacing === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onThemeChange({ spacing: id })}
                className="flex-1 rounded-lg py-2 text-[10px] font-bold uppercase"
                style={{
                  background: on ? BUILDER.ink : BUILDER.surfaceMuted,
                  color: on ? "#fff" : BUILDER.ink,
                  border: `1px solid ${BUILDER.border}`,
                }}
                aria-pressed={on}
              >
                {id}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
