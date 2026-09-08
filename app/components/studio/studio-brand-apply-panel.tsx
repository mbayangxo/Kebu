"use client";

import { useCallback, useEffect, useState } from "react";
import type { BrandKitRow } from "@/lib/studio/brand-kit";
import type { CanvasDocument } from "@/lib/studio/canvas-document";
import {
  applyAestheticToCanvas,
  applyBrandKitToCanvas,
} from "@/lib/studio/brand-apply";
import { STUDIO_FONTS_CATALOG } from "@/lib/studio/fonts-catalog";

type AestheticChip = {
  id: string;
  name: string;
  tagline: string;
  accent: string;
  background: string;
};

/**
 * Apply saved brand kit or site aesthetic look onto the open canvas design.
 */
export function StudioBrandApplyPanel({
  document: doc,
  pageId,
  businessId,
  onApply,
  readOnly,
}: {
  document: CanvasDocument;
  pageId: string;
  businessId?: string | null;
  onApply: (next: CanvasDocument) => void;
  readOnly?: boolean;
}) {
  const [kits, setKits] = useState<BrandKitRow[]>([]);
  const [aesthetics, setAesthetics] = useState<AestheticChip[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const q = businessId ? `?businessId=${businessId}` : "";
    const [kitRes, fontRes] = await Promise.all([
      fetch(`/api/studio/brand-kit${q}`, { credentials: "include" }),
      fetch("/api/studio/fonts", { credentials: "include" }),
    ]);
    const kitData = await kitRes.json().catch(() => ({}));
    const fontData = await fontRes.json().catch(() => ({}));
    if (kitRes.ok) setKits((kitData.kits ?? []) as BrandKitRow[]);
    if (fontRes.ok) setAesthetics((fontData.aesthetics ?? []) as AestheticChip[]);
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function applyKit(kit: BrandKitRow) {
    if (readOnly) return;
    setBusy(true);
    setNote(null);
    try {
      onApply(applyBrandKitToCanvas(doc, kit, pageId));
      setNote(`Applied “${kit.name}” to this design.`);
    } finally {
      setBusy(false);
    }
  }

  function applyLook(id: string, name: string) {
    if (readOnly) return;
    setBusy(true);
    setNote(null);
    try {
      onApply(applyAestheticToCanvas(doc, id, pageId));
      setNote(`Applied “${name}” aesthetic.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 text-xs">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2">Fonts</p>
        <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
          {STUDIO_FONTS_CATALOG.slice(0, 8).map((f) => (
            <div
              key={f.id}
              className="rounded-lg border border-black/10 px-2 py-1.5"
              style={{ fontFamily: f.stack }}
              title={f.role}
            >
              <span className="font-semibold">{f.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-1 opacity-50">Full catalog in text layer → Font.</p>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2">
          Brand kits
        </p>
        {kits.length === 0 ? (
          <p className="opacity-60">Save a brand kit in Brand panel, then apply it here.</p>
        ) : (
          <ul className="space-y-1.5">
            {kits.map((k) => (
              <li key={k.id}>
                <button
                  type="button"
                  disabled={busy || readOnly}
                  onClick={() => void applyKit(k)}
                  className="w-full flex items-center gap-2 rounded-lg border border-black/10 px-2 py-2 text-left hover:border-orange-400 disabled:opacity-40"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: k.accent_color }}
                  />
                  <span className="font-semibold truncate">{k.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2">
          Aesthetic looks
        </p>
        <ul className="space-y-1.5">
          {aesthetics.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                disabled={busy || readOnly}
                onClick={() => applyLook(a.id, a.name)}
                className="w-full flex items-center gap-2 rounded-lg border border-black/10 px-2 py-2 text-left hover:border-orange-400 disabled:opacity-40"
              >
                <span
                  className="w-6 h-6 rounded-md shrink-0 border border-black/10"
                  style={{ background: `linear-gradient(135deg, ${a.background}, ${a.accent})` }}
                />
                <span>
                  <span className="block font-semibold">{a.name}</span>
                  <span className="block opacity-50 truncate">{a.tagline}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {note ? <p className="text-orange-700 font-semibold">{note}</p> : null}
    </div>
  );
}
