"use client";

import type { BuilderElementSelection } from "@/lib/create/builder-selection";
import { SectionPhotoField } from "@/app/components/create/section-photo-field";
import { GalaxyBadge, GalaxyButton, GalaxyInspectorCard } from "@/app/components/galaxy/editor-primitives";

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
  const storageKey = selection.elementId.startsWith("extra:")
    ? selection.elementId.slice("extra:".length)
    : selection.elementId;
  const scales =
    (sectionProps.layerScales as Record<string, number> | undefined) ?? {};
  const zIndexes =
    (sectionProps.layerZIndex as Record<string, number> | undefined) ?? {};
  const scale = typeof scales[storageKey] === "number" ? scales[storageKey]! : 1;
  const zIndex = typeof zIndexes[storageKey] === "number" ? zIndexes[storageKey]! : 10;
  const opacityMap = (sectionProps.layerOpacity as Record<string, number> | undefined) ?? {};
  const rotationMap = (sectionProps.layerRotation as Record<string, number> | undefined) ?? {};
  const lockedLayers = Array.isArray(sectionProps.lockedLayers)
    ? (sectionProps.lockedLayers as string[])
    : [];
  const opacity = typeof opacityMap[storageKey] === "number" ? opacityMap[storageKey]! : 1;
  const rotation = typeof rotationMap[storageKey] === "number" ? rotationMap[storageKey]! : 0;
  const locked = lockedLayers.includes(storageKey);

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
        <p className="text-[11px] leading-relaxed text-black/50">
          Only controls for this object are shown here. Click another object to switch context.
        </p>
        {device !== "desktop" && responsiveOverrideActive ? (
          <button
            type="button"
            className="mt-3 text-[11px] font-semibold text-[#2C6ECB] hover:underline"
            onClick={() => onResetResponsive(responsiveKeys)}
          >
            Reset this object to desktop
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
                className="min-w-0 flex-1 accent-[#2C6ECB]"
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
                className="w-[76px] rounded-lg border border-black/15 bg-white px-2 py-1.5 text-right text-xs"
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
                className="mt-1.5 w-full rounded-lg border border-black/15 bg-white px-2.5 py-2 text-sm text-black"
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
                className="mt-1.5 w-full rounded-lg border border-black/15 bg-white px-2.5 py-2 text-sm text-black"
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
            className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-[12px] font-semibold text-black/70"
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
            className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-[12px] font-semibold text-red-700"
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
                    className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-[12px] font-semibold text-red-700"
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
                className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-[12px] font-semibold text-black/70"
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

          <label className="block text-[11px] font-semibold text-black/65">
            Font
            <input
              list="kebu-builder-fonts"
              className="mt-1.5 w-full rounded-lg border border-black/15 bg-white px-2.5 py-2 text-sm text-black outline-none focus:border-[#2C6ECB]"
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
                min="8"
                max="48"
                step="1"
                className="mt-1.5 w-full rounded-lg border border-black/15 bg-white px-2.5 py-2 text-sm text-black"
                value={Number(sectionProps.titleTextFontSize ?? 14)}
                onChange={(event) =>
                  onPatch({
                    titleTextFontSize: Math.min(48, Math.max(8, Number(event.target.value) || 14)),
                  })
                }
              />
            </label>
            <label className="block text-[11px] font-semibold text-black/65">
              Weight
              <select
                className="mt-1.5 w-full rounded-lg border border-black/15 bg-white px-2.5 py-2 text-sm text-black"
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
                className="mt-1.5 w-full rounded-lg border border-black/15 bg-white px-2.5 py-2 text-sm text-black"
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
                className="mt-1.5 w-full rounded-lg border border-black/15 bg-white px-2.5 py-2 text-sm text-black"
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
                className="min-w-0 flex-1 accent-[#2C6ECB]"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(event) =>
                  onPatch({
                    layerOpacity: {
                      ...opacityMap,
                      [storageKey]: Math.min(1, Math.max(0, Number(event.target.value))),
                    },
                  })
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
                className="min-w-0 flex-1 accent-[#2C6ECB]"
                type="range"
                min="-180"
                max="180"
                step="1"
                value={rotation}
                onChange={(event) =>
                  onPatch({
                    layerRotation: {
                      ...rotationMap,
                      [storageKey]: Math.min(180, Math.max(-180, Number(event.target.value))),
                    },
                  })
                }
              />
              <input
                className="w-[62px] rounded-lg border border-black/15 bg-white px-2 py-1.5 text-right text-xs"
                type="number"
                min="-180"
                max="180"
                step="1"
                value={rotation}
                onChange={(event) =>
                  onPatch({
                    layerRotation: {
                      ...rotationMap,
                      [storageKey]: Math.min(180, Math.max(-180, Number(event.target.value) || 0)),
                    },
                  })
                }
                aria-label="Layer rotation"
              />
            </div>
          </label>

          <button
            type="button"
            className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-[12px] font-semibold text-black/70"
            onClick={() =>
              onPatch({
                lockedLayers: locked
                  ? lockedLayers.filter((key) => key !== storageKey)
                  : [...new Set([...lockedLayers, storageKey])],
              })
            }
          >
            {locked ? "Unlock layer" : "Lock layer"}
          </button>
        </div>
      ) : null}

      {selection.elementId !== "siteFooter" && selection.elementId !== "heroCanvas" ? (
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
      ) : null}

      {selection.elementId !== "siteFooter" && selection.elementId !== "heroCanvas" ? (
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
