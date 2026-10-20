"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type LibraryEntry = {
  id: string;
  asset: {
    id: string;
    kind: "photo" | "font" | "pattern" | "texture";
    name: string;
    fileUrl: string;
    previewUrl: string | null;
  };
};

/** Acquired (free) Creative Assets Marketplace items, ready to drop onto the canvas. */
export function StudioMarketplaceLibraryPanel({
  onPickImage,
  readOnly,
}: {
  onPickImage: (url: string, name: string) => void;
  readOnly?: boolean;
}) {
  const [items, setItems] = useState<LibraryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/studio/creative-assets/library", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setItems(Array.isArray(data.items) ? data.items : []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load your marketplace library."));
  }, []);

  const usable = (items ?? []).filter((i) => i.asset.kind === "photo" || i.asset.kind === "pattern" || i.asset.kind === "texture");
  const fonts = (items ?? []).filter((i) => i.asset.kind === "font");

  return (
    <div className="space-y-2 border-t border-white/10 pt-3">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-black uppercase tracking-wider text-white/60">Your marketplace library</p>
        <Link href="/studio/assets/marketplace" className="text-[9px] font-bold text-orange-400">Browse →</Link>
      </div>
      {error ? <p className="text-[9px] text-red-400">{error}</p> : null}
      {items === null ? (
        <p className="text-[9px] text-white/40">Loading…</p>
      ) : usable.length === 0 && fonts.length === 0 ? (
        <p className="text-[9px] text-white/40">Nothing added yet. Visit the marketplace to pick up free photos, patterns and textures.</p>
      ) : (
        <>
          {usable.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {usable.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  disabled={readOnly}
                  title={entry.asset.name}
                  onClick={() => onPickImage(entry.asset.fileUrl, entry.asset.name)}
                  className="flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#17181B] hover:border-orange-400 disabled:opacity-40"
                >
                  {entry.asset.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.asset.previewUrl} alt={entry.asset.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="px-1 text-center text-[8px] font-bold text-white/60">{entry.asset.name}</span>
                  )}
                </button>
              ))}
            </div>
          ) : null}
          {fonts.length > 0 ? (
            <p className="text-[9px] text-white/40">
              Fonts in your library: {fonts.map((f) => f.asset.name).join(", ")}. Custom font rendering in the editor is coming soon.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
