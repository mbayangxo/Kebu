"use client";

import type { BuilderElementSelection } from "@/lib/create/builder-selection";

export function BuilderElementInspector({
  selection,
  sectionProps,
  onPatch,
  onEditSection,
}: {
  selection: BuilderElementSelection;
  sectionProps: Record<string, unknown>;
  onPatch: (patch: Record<string, unknown>) => void;
  onEditSection: () => void;
}) {
  const storageKey = selection.elementId.startsWith("extra:")
    ? selection.elementId.slice("extra:".length)
    : selection.elementId;
  const scales =
    (sectionProps.layerScales as Record<string, number> | undefined) ?? {};
  const zIndexes =
    (sectionProps.layerZIndex as Record<string, number> | undefined) ?? {};
  const scale = typeof scales[storageKey] === "number" ? scales[storageKey]! : 1;
  const zIndex = typeof zIndexes[storageKey] === "number" ? zIndexes[storageKey]! : 10;

  const patchScale = (next: number) => {
    onPatch({
      layerScales: {
        ...scales,
        [storageKey]: Math.min(3, Math.max(0.15, next)),
      },
    });
  };

  const patchZ = (next: number) => {
    onPatch({
      layerZIndex: {
        ...zIndexes,
        [storageKey]: Math.min(80, Math.max(1, Math.round(next))),
      },
    });
  };

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="rounded-xl border border-black/10 bg-white p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-black/45">
          Selected {selection.kind}
        </p>
        <p className="mt-1 text-sm font-semibold text-black">{selection.label}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-black/50">
          Only controls for this object are shown here. Click another object to switch context.
        </p>
      </div>

      {selection.kind === "text" ? (
        <label className="block text-[11px] font-semibold text-black/65">
          Text
          <input
            className="mt-1.5 w-full rounded-lg border border-black/15 bg-white px-2.5 py-2 text-sm text-black outline-none focus:border-[#2C6ECB]"
            value={String(sectionProps.title ?? "")}
            onChange={(event) =>
              onPatch({
                title: event.target.value,
                brandLabel: event.target.value,
                titleAsText: true,
              })
            }
          />
        </label>
      ) : null}

      <label className="block text-[11px] font-semibold text-black/65">
        Object size
        <div className="mt-1.5 flex items-center gap-2">
          <input
            className="min-w-0 flex-1 accent-[#2C6ECB]"
            type="range"
            min="0.15"
            max="3"
            step="0.05"
            value={scale}
            onChange={(event) => patchScale(Number(event.target.value))}
          />
          <input
            className="w-[68px] rounded-lg border border-black/15 bg-white px-2 py-1.5 text-right text-xs"
            type="number"
            min="0.15"
            max="3"
            step="0.05"
            value={Number(scale.toFixed(2))}
            onChange={(event) => patchScale(Number(event.target.value))}
            aria-label="Object scale"
          />
        </div>
      </label>

      <label className="block text-[11px] font-semibold text-black/65">
        Layer depth
        <div className="mt-1.5 flex items-center gap-2">
          <input
            className="min-w-0 flex-1 accent-[#2C6ECB]"
            type="range"
            min="1"
            max="80"
            step="1"
            value={zIndex}
            onChange={(event) => patchZ(Number(event.target.value))}
          />
          <input
            className="w-[58px] rounded-lg border border-black/15 bg-white px-2 py-1.5 text-right text-xs"
            type="number"
            min="1"
            max="80"
            step="1"
            value={zIndex}
            onChange={(event) => patchZ(Number(event.target.value))}
            aria-label="Layer depth"
          />
        </div>
      </label>

      <button
        type="button"
        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-[12px] font-semibold text-black/70 hover:bg-black/[0.03]"
        onClick={onEditSection}
      >
        Edit whole section
      </button>
    </div>
  );
}
