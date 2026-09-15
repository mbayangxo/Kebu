"use client";

import { useEffect, useMemo, useState } from "react";

export type ProductVariantOption = {
  id: string;
  name: string;
  option1: string;
  option2: string;
  option3: string;
  priceLabel: string;
  imageUrl?: string;
};

function variantLabel(v: ProductVariantOption): string {
  const parts = [v.option1, v.option2, v.option3].filter((p) => p.trim());
  return parts.length ? parts.join(" / ") : v.name;
}

// Maps color name keywords (FR + EN) to hex values
const COLOR_MAP: Record<string, string> = {
  rouge: "#E53E3E", red: "#E53E3E",
  bleu: "#3182CE", blue: "#3182CE",
  vert: "#38A169", green: "#38A169",
  noir: "#1A202C", black: "#1A202C",
  blanc: "#F0F0EE", white: "#F0F0EE",
  jaune: "#D69E2E", yellow: "#D69E2E",
  rose: "#ED64A6", pink: "#ED64A6",
  violet: "#805AD5", purple: "#805AD5",
  marron: "#92400E", brown: "#92400E",
  orange: "#ED8936",
  gris: "#718096", grey: "#718096", gray: "#718096",
  beige: "#D4B896",
  marine: "#1B3A5C",
  bordeaux: "#7B1C2C", burgundy: "#7B1C2C",
  doré: "#B7A136", dore: "#B7A136", gold: "#B7A136",
  argent: "#C0C0C0", silver: "#C0C0C0",
};

/** If any part of the option text matches a color name, return that hex. */
export function detectColorSwatch(text: string): string | null {
  const lower = text.toLowerCase().trim();
  // direct match
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];
  // prefix match (e.g. "Noir / L" → "noir")
  for (const [key, hex] of Object.entries(COLOR_MAP)) {
    if (lower.startsWith(key) || lower.includes(` ${key}`) || lower.includes(`/${key}`) || lower.includes(`/ ${key}`)) {
      return hex;
    }
  }
  return null;
}

/** Swatch circle shown when the variant is purely a color. */
function ColorSwatch({ hex, active }: { hex: string; active: boolean }) {
  const isLight = hex === "#F0F0EE" || hex === "#D4B896" || hex === "#C0C0C0" || hex === "#B7A136";
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{
        width: 20,
        height: 20,
        background: hex,
        border: active
          ? "2.5px solid #111"
          : isLight
            ? "1.5px solid rgba(0,0,0,0.2)"
            : "1.5px solid transparent",
        outline: active ? "2px solid #fff" : "none",
        outlineOffset: "-3px",
        boxShadow: active ? "0 0 0 2.5px #111" : undefined,
      }}
      aria-hidden
    />
  );
}

export function PublicProductVariantPicker({
  variants,
  defaultPriceLabel,
  onChange,
}: {
  variants: ProductVariantOption[];
  defaultPriceLabel?: string;
  onChange: (selection: { variantId: string; variantName: string; priceLabel: string; imageUrl?: string }) => void;
}) {
  const [selectedId, setSelectedId] = useState(variants[0]?.id ?? "");

  const selected = useMemo(
    () => variants.find((v) => v.id === selectedId) ?? variants[0],
    [variants, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    onChange({
      variantId: selected.id,
      variantName: variantLabel(selected),
      priceLabel: selected.priceLabel || defaultPriceLabel || "",
      imageUrl: selected.imageUrl,
    });
  }, [selected, defaultPriceLabel, onChange]);

  if (!variants.length) return null;
  if (variants.length === 1) return null;

  // Check if every variant is purely a color option (option1 only, no option2/3)
  const isPureColor = variants.every((v) => !v.option2.trim() && !v.option3.trim() && detectColorSwatch(v.option1));

  function pick(id: string) {
    setSelectedId(id);
  }

  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">
        {isPureColor ? "Color" : "Variant"}
      </p>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const label = variantLabel(v);
          const active = v.id === selectedId;
          const colorHex = isPureColor ? detectColorSwatch(v.option1) : null;

          if (colorHex) {
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => pick(v.id)}
                title={label}
                aria-label={`${label}${active ? " (selected)" : ""}`}
                className="transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                style={{ borderRadius: "50%" }}
              >
                <ColorSwatch hex={colorHex} active={active} />
              </button>
            );
          }

          return (
            <button
              key={v.id}
              type="button"
              onClick={() => pick(v.id)}
              className="rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors"
              style={{
                background: active ? "#111" : "#fff",
                color: active ? "#fff" : "#333",
                borderColor: active ? "#111" : "rgba(0,0,0,0.15)",
              }}
            >
              {label}
              {v.priceLabel && !active ? (
                <span className="ml-1 opacity-60 font-normal">{v.priceLabel}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      {/* Show selected color name when in pure-color mode */}
      {isPureColor && selected ? (
        <p className="text-[10px] opacity-50">{variantLabel(selected)}</p>
      ) : null}
    </div>
  );
}
