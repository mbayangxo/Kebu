"use client";

import type { BuilderElementSelection } from "@/lib/create/builder-selection";
import { GalaxyBadge, GalaxyButton } from "@/app/components/galaxy/editor-primitives";

type LayerRow = {
  elementId: string;
  kind: BuilderElementSelection["kind"];
  label: string;
  storageKey: string;
};

const BUILTIN_LAYERS: LayerRow[] = [
  { elementId: "backgroundLayer", kind: "background", label: "Background", storageKey: "backgroundLayer" },
  { elementId: "titleLogo", kind: "text", label: "Name circle", storageKey: "titleLogo" },
  { elementId: "cutoutLeft", kind: "image", label: "Left cutout", storageKey: "cutoutLeft" },
  { elementId: "cutoutAccent", kind: "image", label: "Center cutout", storageKey: "cutoutAccent" },
  { elementId: "cutoutRight", kind: "image", label: "Right cutout", storageKey: "cutoutRight" },
  { elementId: "cutoutSparkle", kind: "image", label: "Sparkle", storageKey: "cutoutSparkle" },
];

export function BuilderLayersPanel({
  sectionId,
  props,
  selectedElement,
  onSelect,
  onPatch,
}: {
  sectionId: string;
  props: Record<string, unknown>;
  selectedElement: BuilderElementSelection | null;
  onSelect: (selection: BuilderElementSelection) => void;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  const hidden = Array.isArray(props.hiddenLayers) ? (props.hiddenLayers as string[]) : [];
  const locked = Array.isArray(props.lockedLayers) ? (props.lockedLayers as string[]) : [];
  const extras = Array.isArray(props.extraCutouts)
    ? (props.extraCutouts as Array<{ id?: string; alt?: string; src?: string }>)
    : [];

  const rows: LayerRow[] = [
    ...BUILTIN_LAYERS.filter((row) => {
      if (row.storageKey === "backgroundLayer") return true;
      if (row.storageKey === "titleLogo" && props.titleAsText === true) return true;
      return Boolean(String(props[row.storageKey] ?? "").trim());
    }),
    ...extras
      .filter((item) => item.id && item.src)
      .map((item) => ({
        elementId: `extra:${item.id}`,
        kind: "cutout" as const,
        label: item.alt?.trim() || "Cutout",
        storageKey: String(item.id),
      })),
  ];

  function toggleHidden(key: string) {
    const currentlyHidden =
      key === "backgroundLayer"
        ? props.backgroundHidden === true || hidden.includes(key)
        : hidden.includes(key);
    const next = currentlyHidden
      ? hidden.filter((item) => item !== key)
      : [...new Set([...hidden, key])];
    onPatch({
      hiddenLayers: next,
      ...(key === "backgroundLayer" ? { backgroundHidden: !currentlyHidden } : {}),
    });
  }

  function toggleLocked(key: string) {
    onPatch({
      lockedLayers: locked.includes(key)
        ? locked.filter((item) => item !== key)
        : [...new Set([...locked, key])],
    });
  }

  return (
    <div className="space-y-3 px-3 py-3">
      <div>
        <p className="text-[13px] font-semibold text-black">Layers</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-black/50">
          Select, hide, or lock objects without hunting for them on the canvas.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
        {rows.map((row, index) => {
          const active =
            selectedElement?.sectionId === sectionId &&
            selectedElement.elementId === row.elementId;
          const isHidden =
            row.storageKey === "backgroundLayer"
              ? props.backgroundHidden === true || hidden.includes(row.storageKey)
              : hidden.includes(row.storageKey);
          const isLocked = locked.includes(row.storageKey);

          return (
            <div
              key={row.elementId}
              className="flex items-center gap-2 px-2.5 py-2"
              style={{
                borderTop: index === 0 ? undefined : "1px solid rgba(0,0,0,0.06)",
                background: active ? "#F3F6FF" : "#fff",
              }}
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() =>
                  onSelect({
                    sectionId,
                    elementId: row.elementId,
                    kind: row.kind,
                    label: row.label,
                  })
                }
              >
                <span className="block truncate text-[12px] font-semibold text-black/80">
                  {row.label}
                </span>
                <span className="mt-0.5 block text-[9px] uppercase tracking-wide text-black/40">
                  {row.kind}
                </span>
              </button>

              {isLocked ? <GalaxyBadge>Locked</GalaxyBadge> : null}

              <button
                type="button"
                className="rounded-md px-2 py-1 text-[10px] font-semibold text-black/55 hover:bg-black/[0.04]"
                onClick={() => toggleHidden(row.storageKey)}
                aria-label={isHidden ? `Show ${row.label}` : `Hide ${row.label}`}
              >
                {isHidden ? "Show" : "Hide"}
              </button>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-[10px] font-semibold text-black/55 hover:bg-black/[0.04]"
                onClick={() => toggleLocked(row.storageKey)}
                aria-label={isLocked ? `Unlock ${row.label}` : `Lock ${row.label}`}
              >
                {isLocked ? "Unlock" : "Lock"}
              </button>
            </div>
          );
        })}
      </div>

      <GalaxyButton
        className="w-full"
        onClick={() =>
          onSelect({
            sectionId,
            elementId: "heroCanvas",
            kind: "control",
            label: "Hero section",
          })
        }
      >
        Edit section height
      </GalaxyButton>
    </div>
  );
}
