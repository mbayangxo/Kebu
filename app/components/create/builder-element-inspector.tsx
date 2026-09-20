"use client";

import type { BuilderElementSelection } from "@/lib/create/builder-selection";
import { SectionPhotoField } from "@/app/components/create/section-photo-field";
import { GalaxyBadge, GalaxyButton, GalaxyInspectorCard } from "@/app/components/galaxy/editor-primitives";
import {
  builderLayerStorageKey,
  patchBuilderLayerPresentation,
  patchBuilderLayerStack,
  readBuilderLayerPresentation,
} from "@/lib/create/builder-layer-model";

export function BuilderElementInspector({
  selection,
  sectionProps,
  onPatch,
  onEditSection,
  projectId,
  device,
  responsiveOverrideActive,
  onResetResponsive,
  onAskAi,
}: {
  selection: BuilderElementSelection;
  sectionProps: Record<string, unknown>;
  onPatch: (patch: Record<string, unknown>) => void;
  onEditSection: () => void;
  projectId: string;
  device: "desktop" | "tablet" | "mobile";
  responsiveOverrideActive: boolean;
  onResetResponsive: (keys: readonly string[]) => void;
  onAskAi: () => void;
}) {
  const storageKey = builderLayerStorageKey(selection.elementId);
  const presentation = readBuilderLayerPresentation(sectionProps, storageKey);
  const { scale, zIndex, opacity, rotation, locked, hidden } = presentation;
  const motionMap =
    sectionProps.layerMotions && typeof sectionProps.layerMotions === "object" && !Array.isArray(sectionProps.layerMotions)
      ? (sectionProps.layerMotions as Record<string, string>)
      : {};
  const motion = motionMap[storageKey] ?? "none";
  const positionMap =
    sectionProps.layerPositions && typeof sectionProps.layerPositions === "object" && !Array.isArray(sectionProps.layerPositions)
      ? (sectionProps.layerPositions as Record<string, { leftPct?: number; topPct?: number }>)
      : {};
  const position = positionMap[storageKey] ?? {};
  const canPositionLayer =
    selection.kind === "image" || selection.kind === "cutout" || selection.kind === "text";
  const patchPosition = (axis: "leftPct" | "topPct", value: number) =>
    onPatch({
      layerPositions: {
        ...positionMap,
        [storageKey]: {
          ...position,
          [axis]: Math.min(110, Math.max(-20, value)),
        },
      },
    });

  const responsiveKeys =
    selection.elementId === "titleLogo"
      ? [
          "title",
          "titleAsText",
          "titleTextFontFamily",
          "titleTextFontSize",
          "titleTextFontWeight",
          "titleTextLetterSpacing",
          "titleTextLineHeight",
          "titleTextColor",
          "layerScales",
          "layerZIndex",
          "layerOpacity",
          "layerRotation",
          "layerPositions",
          "lockedLayers",
        ]
      : selection.elementId === "heroCanvas"
        ? ["sectionMinHeightPx"]
        : selection.elementId === "siteFooter"
          ? ["embeddedFooterPaddingTop", "embeddedFooterPaddingBottom"]
          : selection.kind === "background"
            ? ["backgroundLayer", "backgroundHidden"]
            : [
                "extraCutouts",
                "layerScales",
                "layerZIndex",
                "layerOpacity",
                "layerRotation",
                "layerPositions",
                "hiddenLayers",
                "lockedLayers",
              ];

  const patchScale = (next: number) =>
    onPatch(patchBuilderLayerPresentation(sectionProps, storageKey, { scale: next }));

  const patchZ = (next: number) =>
    onPatch(patchBuilderLayerPresentation(sectionProps, storageKey, { zIndex: next }));

  return (
    <div className="space-y-3 px-3 py-3">
      <GalaxyInspectorCard
        eyebrow={`Selected ${selection.kind}`}
        title={selection.label}
        meta={
          device !== "desktop" ? (
            <GalaxyBadge>
              {responsiveOverrideActive ? `${device} override` : "Inherited"}
            </GalaxyBadge>
          ) : null
        }
      >
        <p className="text-[10px] leading-relaxed text-black/45">Editing only this object.</p>
        {device !== "desktop" && responsiveOverrideActive ? (
          <button
            type="button"
            className="mt-2 rounded-md px-2 py-1 text-[10px] font-semibold text-[#C95000] hover:bg-[#FFF2E8]"
            onClick={() => onResetResponsive(responsiveKeys)}
          >
            Reset responsive changes
          </button>
        ) : null}
      </GalaxyInspectorCard>

      {selection.elementId === "heroCanvas" ? (
        <div className="space-y-3">
          <p className="text-[11px] leading-relaxed text-black/55">
            Drag the blue handle at the bottom of the hero or set an exact height for this device.
          </p>
          <label className="block text-[11px] font-semibold text-black/65">
            Section height
            <div className="mt-1.5 flex items-center gap-2">
              <input
                className="min-w-0 flex-1 accent-[#FF6A00]"
                type="range"
                min="360"
                max="1800"
                step="10"
                value={Number(sectionProps.sectionMinHeightPx ?? 720)}
                onChange={(event) =>
                  onPatch({
                    sectionMinHeightPx: Math.min(
                      1800,
                      Math.max(360, Number(event.target.value) || 720),
                    ),
                  })
                }
              />
              <input
                className="w-[76px] rounded-md border border-black/10 bg-white px-2 py-1.5 text-right text-xs"
                type="number"
                min="360"
                max="1800"
                step="10"
                value={Number(sectionProps.sectionMinHeightPx ?? 720)}
                onChange={(event) =>
                  onPatch({
                    sectionMinHeightPx: Math.min(
                      1800,
                      Math.max(360, Number(event.target.value) || 720),
                    ),
                  })
                }
                aria-label="Hero section height"
              />
            </div>
          </label>
        </div>
      ) : null}

      {selection.elementId === "siteFooter" ? (
        <div className="space-y-3">
          <p className="text-[11px] leading-relaxed text-black/55">
            Drag the blue handles on the footer itself, or use these exact spacing values.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] font-semibold text-black/65">
              Top spacing
              <input
                type="number"
                min="8"
                max="160"
                step="1"
                className="mt-1.5 w-full rounded-md border border-black/10 bg-white px-2.5 py-2 text-sm text-black"
                value={Number(sectionProps.embeddedFooterPaddingTop ?? 20)}
                onChange={(event) =>
                  onPatch({
                    embeddedFooterPaddingTop: Math.min(
                      160,
                      Math.max(8, Number(event.target.value) || 20),
                    ),
                  })
                }
              />
            </label>
            <label className="block text-[11px] font-semibold text-black/65">
              Bottom spacing
              <input
                type="number"
                min="8"
                max="160"
                step="1"
                className="mt-1.5 w-full rounded-md border border-black/10 bg-white px-2.5 py-2 text-sm text-black"
                value={Number(sectionProps.embeddedFooterPaddingBottom ?? 20)}
                onChange={(event) =>
                  onPatch({
                    embeddedFooterPaddingBottom: Math.min(
                      160,
                      Math.max(8, Number(event.target.value) || 20),
                    ),
                  })
                }
              />
            </label>
          </div>
        </div>
      ) : null}

      {selection.kind === "background" ? (
        <div className="space-y-3">
          <SectionPhotoField
            projectId={projectId}
            label="Background image"
            value={String(sectionProps.backgroundLayer ?? "")}
            onChange={(url) =>
              onPatch({
                backgroundLayer: url,
                backgroundHidden: false,
                hiddenLayers: Array.isArray(sectionProps.hiddenLayers)
                  ? (sectionProps.hiddenLayers as string[]).filter((key) => key !== "backgroundLayer")
                  : [],
              })
            }
          />
          <button
            type="button"
            className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-[12px] font-semibold text-black/70"
            onClick={() =>
              onPatch({
                backgroundHidden: sectionProps.backgroundHidden !== true,
              })
            }
          >
            {sectionProps.backgroundHidden === true ? "Show background" : "Hide background"}
          </button>
          <button
            type="button"
            className="w-full rounded-md border border-red-100 bg-white px-3 py-2 text-[12px] font-semibold text-red-700"
            onClick={() =>
              onPatch({
                backgroundLayer: "",
                backgroundHidden: true,
              })
            }
          >
            Remove background
          </button>
        </div>
      ) : null}

      {selection.kind === "image" || selection.kind === "cutout" ? (
        <div className="space-y-3">
          {selection.elementId.startsWith("extra:") ? (
            (() => {
              const extraId = selection.elementId.slice("extra:".length);
              const extras = Array.isArray(sectionProps.extraCutouts)
                ? (sectionProps.extraCutouts as Array<Record<string, unknown>>)
                : [];
              const index = extras.findIndex((item) => String(item.id ?? "") === extraId);
              const current = index >= 0 ? extras[index] : null;
              if (!current) return null;
              return (
                <>
                  <SectionPhotoField
                    projectId={projectId}
                    label="Replace cutout"
                    value={String(current.src ?? "")}
                    onChange={(url) => {
                      const next = [...extras];
                      next[index] = { ...current, src: url };
                      onPatch({ extraCutouts: next });
                    }}
                  />
                  <button
                    type="button"
                    className="w-full rounded-md border border-red-100 bg-white px-3 py-2 text-[12px] font-semibold text-red-700"
                    onClick={() =>
                      onPatch({
                        extraCutouts: extras.filter(
                          (item) => String(item.id ?? "") !== extraId,
                        ),
                      })
                    }
                  >
                    Delete cutout
                  </button>
                </>
              );
            })()
          ) : (
            <>
              <SectionPhotoField
                projectId={projectId}
                label={`Replace ${selection.label}`}
                value={String(sectionProps[storageKey] ?? "")}
                onChange={(url) => {
                  const hidden = Array.isArray(sectionProps.hiddenLayers)
                    ? (sectionProps.hiddenLayers as string[])
                    : [];
                  onPatch({
                    [storageKey]: url,
                    hiddenLayers: hidden.filter((key) => key !== storageKey),
                  });
                }}
              />
              <button
                type="button"
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-[12px] font-semibold text-black/70"
                onClick={() => {
                  const hidden = Array.isArray(sectionProps.hiddenLayers)
                    ? (sectionProps.hiddenLayers as string[])
                    : [];
                  const isHidden = hidden.includes(storageKey);
                  onPatch({
                    hiddenLayers: isHidden
                      ? hidden.filter((key) => key !== storageKey)
                      : [...new Set([...hidden, storageKey])],
                  });
                }}
              >
                {Array.isArray(sectionProps.hiddenLayers) &&
                (sectionProps.hiddenLayers as string[]).includes(storageKey)
                  ? "Show layer"
                  : "Hide layer"}
              </button>
            </>
          )}
        </div>
      ) : null}

      {selection.kind === "text" ? (
        <div className="space-y-3">
          <label className="block text-[11px] font-semibold text-black/65">
            Text
            <input
              className="mt-1.5 w-full rounded-md border border-black/10 bg-white px-2.5 py-2 text-sm text-black outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/15"
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

          <label className="block text-[11px] font-semibold text-black/65">
            Font
            <input
              list="kebu-builder-fonts"
              className="mt-1.5 w-full rounded-md border border-black/10 bg-white px-2.5 py-2 text-sm text-black outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/15"
              value={String(sectionProps.titleTextFontFamily ?? "Impact")}
              onChange={(event) => onPatch({ titleTextFontFamily: event.target.value })}
            />
            <datalist id="kebu-builder-fonts">
              <option value="Impact" />
              <option value="Arial Black" />
              <option value="Helvetica" />
              <option value="Georgia" />
              <option value="Playfair Display" />
              <option value="Fraunces" />
              <option value="Oswald" />
              <option value="Bebas Neue" />
              <option value="Syne" />
              <option value="system-ui" />
            </datalist>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] font-semibold text-black/65">
              Font size
              <input
                type="number"
                min="6"
                max="240"
                step="1"
                className="mt-1.5 w-full rounded-md border border-black/10 bg-white px-2.5 py-2 text-sm text-black"
                value={Number(sectionProps.titleTextFontSize ?? 14)}
                onChange={(event) =>
                  onPatch({
                    titleTextFontSize: Math.min(240, Math.max(6, Number(event.target.value) || 14)),
                  })
                }
              />
            </label>
            <label className="block text-[11px] font-semibold text-black/65">
              Weight
              <select
                className="mt-1.5 w-full rounded-md border border-black/10 bg-white px-2.5 py-2 text-sm text-black"
                value={String(sectionProps.titleTextFontWeight ?? 900)}
                onChange={(event) => onPatch({ titleTextFontWeight: Number(event.target.value) })}
              >
                <option value="400">Regular</option>
                <option value="500">Medium</option>
                <option value="600">Semibold</option>
                <option value="700">Bold</option>
                <option value="800">Extra bold</option>
                <option value="900">Black</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] font-semibold text-black/65">
              Letter spacing
              <input
                type="number"
                min="-0.05"
                max="0.5"
                step="0.01"
                className="mt-1.5 w-full rounded-md border border-black/10 bg-white px-2.5 py-2 text-sm text-black"
                value={Number(sectionProps.titleTextLetterSpacing ?? 0.12)}
                onChange={(event) =>
                  onPatch({
                    titleTextLetterSpacing: Math.min(
                      0.5,
                      Math.max(-0.05, Number(event.target.value) || 0),
                    ),
                  })
                }
              />
            </label>
            <label className="block text-[11px] font-semibold text-black/65">
              Line height
              <input
                type="number"
                min="0.8"
                max="2"
                step="0.05"
                className="mt-1.5 w-full rounded-md border border-black/10 bg-white px-2.5 py-2 text-sm text-black"
                value={Number(sectionProps.titleTextLineHeight ?? 1.15)}
                onChange={(event) =>
                  onPatch({
                    titleTextLineHeight: Math.min(
                      2,
                      Math.max(0.8, Number(event.target.value) || 1.15),
                    ),
                  })
                }
              />
            </label>
          </div>

          <label className="flex items-center justify-between gap-3 text-[11px] font-semibold text-black/65">
            Text color
            <input
              type="color"
              className="h-9 w-12 cursor-pointer rounded border border-black/10 bg-white p-1"
              value={String(sectionProps.titleTextColor ?? "#ffffff")}
              onChange={(event) => onPatch({ titleTextColor: event.target.value })}
              aria-label="Text color"
            />
          </label>
        </div>
      ) : null}

      {selection.elementId !== "siteFooter" && selection.elementId !== "heroCanvas" ? (
        <div className="space-y-3">
          <label className="block text-[11px] font-semibold text-black/65">
            Opacity
            <div className="mt-1.5 flex items-center gap-2">
              <input
                className="min-w-0 flex-1 accent-[#FF6A00]"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(event) =>
                  onPatch(
                    patchBuilderLayerPresentation(sectionProps, storageKey, {
                      opacity: Number(event.target.value),
                    }),
                  )
                }
              />
              <span className="w-10 text-right text-[11px] text-black/55">
                {Math.round(opacity * 100)}%
              </span>
            </div>
          </label>

          <label className="block text-[11px] font-semibold text-black/65">
            Rotation
            <div className="mt-1.5 flex items-center gap-2">
              <input
                className="min-w-0 flex-1 accent-[#FF6A00]"
                type="range"
                min="-180"
                max="180"
                step="1"
                value={rotation}
                onChange={(event) =>
                  onPatch(
                    patchBuilderLayerPresentation(sectionProps, storageKey, {
                      rotation: Number(event.target.value),
                    }),
                  )
                }
              />
              <input
                className="w-[62px] rounded-md border border-black/10 bg-white px-2 py-1.5 text-right text-xs"
                type="number"
                min="-180"
                max="180"
                step="1"
                value={rotation}
                onChange={(event) =>
                  onPatch(
                    patchBuilderLayerPresentation(sectionProps, storageKey, {
                      rotation: Number(event.target.value) || 0,
                    }),
                  )
                }
                aria-label="Layer rotation"
              />
            </div>
          </label>

          <button
            type="button"
            className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-[12px] font-semibold text-black/70"
            onClick={() =>
              onPatch(
                patchBuilderLayerPresentation(sectionProps, storageKey, {
                  locked: !locked,
                }),
              )
            }
          >
            {locked ? "Unlock layer" : "Lock layer"}
          </button>
        </div>
      ) : null}

      {canPositionLayer ? (
        <div className="space-y-2 rounded-xl border border-black/10 bg-black/[0.02] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-black/45">Position</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] font-semibold text-black/65">
              X %
              <input
                type="number"
                min="-20"
                max="110"
                step="0.5"
                className="mt-1.5 w-full rounded-md border border-black/10 bg-white px-2.5 py-2 text-sm text-black"
                value={Number(position.leftPct ?? 0)}
                onChange={(event) => patchPosition("leftPct", Number(event.target.value) || 0)}
              />
            </label>
            <label className="block text-[11px] font-semibold text-black/65">
              Y %
              <input
                type="number"
                min="-20"
                max="110"
                step="0.5"
                className="mt-1.5 w-full rounded-md border border-black/10 bg-white px-2.5 py-2 text-sm text-black"
                value={Number(position.topPct ?? 0)}
                onChange={(event) => patchPosition("topPct", Number(event.target.value) || 0)}
              />
            </label>
          </div>
          <p className="text-[10px] leading-relaxed text-black/45">
            Drag on the canvas for visual placement. These values give precise per-device positioning.
          </p>
        </div>
      ) : null}

      {selection.elementId !== "siteFooter" && selection.elementId !== "heroCanvas" ? (
      <label className="block text-[11px] font-semibold text-black/65">
        Object size
        <div className="mt-1.5 flex items-center gap-2">
          <input
            className="min-w-0 flex-1 accent-[#FF6A00]"
            type="range"
            min="0.15"
            max="3"
            step="0.05"
            value={scale}
            onChange={(event) => patchScale(Number(event.target.value))}
          />
          <input
            className="w-[68px] rounded-md border border-black/10 bg-white px-2 py-1.5 text-right text-xs"
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
      ) : null}

      {selection.elementId !== "siteFooter" && selection.elementId !== "heroCanvas" ? (
        <div className="space-y-3 rounded-xl border border-black/10 bg-black/[0.02] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-black/45">Arrange</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              ["front", "Bring to front"],
              ["forward", "Bring forward"],
              ["backward", "Send backward"],
              ["back", "Send to back"],
            ] as const).map(([action, label]) => (
              <button
                key={action}
                type="button"
                className="rounded-lg border border-black/10 bg-white px-2 py-2 text-[11px] font-semibold text-black/65"
                onClick={() => onPatch(patchBuilderLayerStack(sectionProps, storageKey, action))}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="block text-[11px] font-semibold text-black/65">
            Animation
            <select
              className="mt-1.5 w-full rounded-md border border-black/10 bg-white px-2.5 py-2 text-sm text-black"
              value={motion}
              onChange={(event) =>
                onPatch({
                  layerMotions: {
                    ...motionMap,
                    [storageKey]: event.target.value,
                  },
                })
              }
            >
              <option value="none">None</option>
              <option value="float">Float</option>
              <option value="bob">Bob</option>
              <option value="spin">Spin</option>
            </select>
          </label>
          <button
            type="button"
            className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-[12px] font-semibold text-black/70"
            onClick={() =>
              onPatch(patchBuilderLayerPresentation(sectionProps, storageKey, { hidden: !hidden }))
            }
          >
            {hidden ? "Show layer" : "Hide layer"}
          </button>
        </div>
      ) : null}

      {selection.elementId !== "siteFooter" && selection.elementId !== "heroCanvas" ? (
      <label className="block text-[11px] font-semibold text-black/65">
        Layer depth
        <div className="mt-1.5 flex items-center gap-2">
          <input
            className="min-w-0 flex-1 accent-[#FF6A00]"
            type="range"
            min="1"
            max="80"
            step="1"
            value={zIndex}
            onChange={(event) => patchZ(Number(event.target.value))}
          />
          <input
            className="w-[58px] rounded-md border border-black/10 bg-white px-2 py-1.5 text-right text-xs"
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
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <GalaxyButton variant="primary" onClick={onAskAi}>
          Ask Yande
        </GalaxyButton>
        <GalaxyButton onClick={onEditSection}>Edit section</GalaxyButton>
      </div>
    </div>
  );
}
