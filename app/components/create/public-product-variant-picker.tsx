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

  function pick(id: string) {
    setSelectedId(id);
  }

  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Variant</p>
      <div className="flex flex-wrap gap-1.5">
        {variants.map((v) => {
          const label = variantLabel(v);
          const active = v.id === selectedId;
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
    </div>
  );
}
