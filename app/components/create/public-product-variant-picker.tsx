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
    <div className="mt-2 space-y-1">
      <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Variant</label>
      <select
        value={selectedId}
        onChange={(e) => pick(e.target.value)}
        className="w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-xs"
      >
        {variants.map((v) => (
          <option key={v.id} value={v.id}>
            {variantLabel(v)}
            {v.priceLabel ? ` — ${v.priceLabel}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
