"use client";

import type { BuilderElementSelection } from "@/lib/create/builder-selection";
import { SectionPhotoField } from "@/app/components/create/section-photo-field";
import { PanelSection } from "@/app/components/create/builder-panel-section";
import { GalaxyBadge, GalaxyButton, GalaxyInspectorCard } from "@/app/components/galaxy/editor-primitives";
import { BUILDER_FONT_OPTIONS, BUILDER_FONT_WEIGHT_OPTIONS } from "@/lib/create/builder-fonts";
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
  const { scale, widthScale, heightScale, crop, zIndex, opacity, rotation, locked, hidden } = presentation;
  const motionMap =
    sectionProps.layerMotions && typeof sectionProps.layerMotions === "object" && !Array.isArray(sectionProps.layerMotions)
      ? (sectionProps.layerMotions as Record<string, string>)
      : {};
  const motion = motionMap[storageKey] ?? "none";
  const durationMap =
    sectionProps.layerMotionDuration && typeof sectionProps.layerMotionDuration === "object" && !Array.isArray(sectionProps.layerMotionDuration)
      ? (sectionProps.layerMotionDuration as Record<string, number>)
      : {};
  const delayMap =
    sectionProps.layerMotionDelay && typeof sectionProps.layerMotionDelay === "object" && !Array.isArray(sectionProps.layerMotionDelay)
      ? (sectionProps.layerMotionDelay as Record<string, number>)
      : {};
  const motionDuration = Number(durationMap[storageKey] ?? (motion === "spin" ? 14000 : motion === "float" ? 3200 : motion === "bob" ? 2400 : motion === "pulse" ? 2200 : 650));
  const motionDelay = Number(delayMap[storageKey] ?? 0);
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
          "layerWidthScale",
          "layerHeightScale",
          "layerCrop",
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
                "layerWidthScale",
                "layerHeightScale",
                "layerCrop",
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
    <div className="px-3 py-2">
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
        <p className="text-[9px] leading-relaxed text-black/40">Only this object is being edited.</p>
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
                className="mt-1.5 min-h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs text-black"
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
                className="mt-1.5 min-h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs text-black"
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
            className="min-h-9 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[10px] font-semibold text-black/65"
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
            className="min-h-9 w-full rounded-lg border border-red-100 bg-white px-3 py-2 text-[10px] font-semibold text-red-700"
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
                    className="min-h-9 w-full rounded-lg border border-red-100 bg-white px-3 py-2 text-[10px] font-semibold text-red-700"
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
                className="min-h-9 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[10px] font-semibold text-black/65"
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
        <PanelSection title="Typography" defaultOpen group="builder-element-inspector">
          <label className="block text-[11px] font-semibold text-black/65">
            Text
            <input
              className="mt-1.5 min-h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs text-black outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/15"
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
              className="mt-1.5 min-h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs text-black outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/15"
              value={String(sectionProps.titleTextFontFamily ?? "Impact")}
              onChange={(event) => onPatch({ titleTextFontFamily: event.target.value })}
            />
            <datalist id="kebu-builder-fonts">
              {BUILDER_FONT_OPTIONS.map((font) => <option key={font} value={font} />)}
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
                className="mt-1.5 min-h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs text-black"
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
                className="mt-1.5 min-h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs text-black"
                value={String(sectionProps.titleTextFontWeight ?? 900)}
                onChange={(event) => onPatch({ titleTextFontWeight: Number(event.target.value) })}
              >
                {BUILDER_FONT_WEIGHT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
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
                className="mt-1.5 min-h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs text-black"
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
                className="mt-1.5 min-h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs text-black"
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
        </PanelSection>
      ) : null}

      {selection.elementId !== "siteFooter" && selection.elementId !== "heroCanvas" ? (
        <PanelSection title="Appearance" group="builder-element-inspector">
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
            className="min-h-9 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[10px] font-semibold text-black/65"
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
        </PanelSection>
      ) : null}

      {canPositionLayer ? (
        <PanelSection title="Position" group="builder-element-inspector">
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] font-semibold text-black/65">
              X %
              <input
                type="number"
                min="-20"
                max="110"
                step="0.5"
                className="mt-1.5 min-h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs text-black"
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
                className="mt-1.5 min-h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs text-black"
                value={Number(position.topPct ?? 0)}
                onChange={(event) => patchPosition("topPct", Number(event.target.value) || 0)}
              />
            </label>
          </div>
          <p className="text-[10px] leading-relaxed text-black/45">
            Drag on the canvas for visual placement. These values give precise per-device positioning.
          </p>
        </PanelSection>
      ) : null}

      {selection.elementId !== "siteFooter" && selection.elementId !== "heroCanvas" ? (
        <PanelSection title="Size" group="builder-element-inspector">
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

          {selection.kind === "image" || selection.kind === "cutout" ? (
            <div className="space-y-3 border-t border-black/[.06] pt-3">
              <p className="text-[10px] leading-relaxed text-black/45">
                Shape the photo independently. Width and height do not have to stay locked together.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[11px] font-semibold text-black/65">
                  Width
                  <input
                    type="range" min="0.15" max="3" step="0.05"
                    className="mt-1.5 w-full accent-[#FF6A00]"
                    value={widthScale}
                    onChange={(event) => onPatch(patchBuilderLayerPresentation(sectionProps, storageKey, { widthScale: Number(event.target.value) }))}
                  />
                  <span className="text-[9px] text-black/40">{Math.round(widthScale * 100)}%</span>
                </label>
                <label className="block text-[11px] font-semibold text-black/65">
                  Height
                  <input
                    type="range" min="0.15" max="3" step="0.05"
                    className="mt-1.5 w-full accent-[#FF6A00]"
                    value={heightScale}
                    onChange={(event) => onPatch(patchBuilderLayerPresentation(sectionProps, storageKey, { heightScale: Number(event.target.value) }))}
                  />
                  <span className="text-[9px] text-black/40">{Math.round(heightScale * 100)}%</span>
                </label>
              </div>
              <label className="block text-[11px] font-semibold text-black/65">
                Crop empty edges
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="range" min="0" max="45" step="1"
                    className="min-w-0 flex-1 accent-[#FF6A00]"
                    value={crop}
                    onChange={(event) => onPatch(patchBuilderLayerPresentation(sectionProps, storageKey, { crop: Number(event.target.value) }))}
                  />
                  <span className="w-10 text-right text-[10px] text-black/45">{Math.round(crop)}%</span>
                </div>
              </label>
              <button
                type="button"
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-[11px] font-semibold text-black/60"
                onClick={() => onPatch(patchBuilderLayerPresentation(sectionProps, storageKey, { widthScale: 1, heightScale: 1, crop: 0 }))}
              >
                Reset shape
              </button>
            </div>
          ) : null}
        </PanelSection>
      ) : null}

      {selection.elementId !== "siteFooter" && selection.elementId !== "heroCanvas" ? (
        <PanelSection title="Arrange & motion" group="builder-element-inspector">
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
              className="mt-1.5 min-h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs text-black"
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
              <option value="fade">Fade</option>
              <option value="rise">Rise</option>
              <option value="slide-left">Slide from right</option>
              <option value="slide-right">Slide from left</option>
              <option value="pop">Pop</option>
              <option value="blur-in">Blur in</option>
              <option value="float">Float</option>
              <option value="bob">Bob</option>
              <option value="pulse">Pulse</option>
              <option value="spin">Spin</option>
            </select>
          </label>
          {motion !== "none" ? (
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[10px] font-semibold text-black/55">
                Duration
                <input
                  type="number" min="100" max="20000" step="50"
                  className="mt-1.5 min-h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 text-xs"
                  value={motionDuration}
                  onChange={(event) => onPatch({ layerMotionDuration: { ...durationMap, [storageKey]: Math.min(20000, Math.max(100, Number(event.target.value) || 650)) } })}
                />
              </label>
              <label className="block text-[10px] font-semibold text-black/55">
                Delay
                <input
                  type="number" min="0" max="5000" step="50"
                  className="mt-1.5 min-h-9 w-full rounded-lg border border-black/10 bg-white px-2.5 text-xs"
                  value={motionDelay}
                  onChange={(event) => onPatch({ layerMotionDelay: { ...delayMap, [storageKey]: Math.min(5000, Math.max(0, Number(event.target.value) || 0)) } })}
                />
              </label>
            </div>
          ) : null}
          <button
            type="button"
            className="min-h-9 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-[10px] font-semibold text-black/65"
            onClick={() =>
              onPatch(patchBuilderLayerPresentation(sectionProps, storageKey, { hidden: !hidden }))
            }
          >
            {hidden ? "Show layer" : "Hide layer"}
          </button>
        </PanelSection>
      ) : null}

      {selection.elementId !== "siteFooter" && selection.elementId !== "heroCanvas" ? (
      <PanelSection title="Layer depth" group="builder-element-inspector">
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
      </PanelSection>
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
