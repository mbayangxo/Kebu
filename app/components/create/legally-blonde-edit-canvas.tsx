"use client";

/**
 * Builder-only cutout canvas for May Lecor / Legally Blonde.
 * Never uses the black preview chrome or Tilda absolute calc (those look empty/black in a narrow editor).
 */
import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { SiteImageUpload } from "@/app/components/create/site-image-upload";
import { LEGALLY_BLONDE_ASSETS } from "@/lib/create/legally-blonde-defaults";

export type EditableCutoutSlot = {
  key: string;
  label: string;
  src: string;
  topPct: number;
  leftPct: number;
  widthPct: number;
  rotate?: number;
};

const DEFAULT_SLOTS: Omit<EditableCutoutSlot, "src">[] = [
  { key: "cutoutLeft", label: "Left cutout", topPct: 28, leftPct: 18, widthPct: 16, rotate: -6 },
  { key: "cutoutAccent", label: "Center cutout", topPct: 32, leftPct: 40, widthPct: 18, rotate: -4 },
  { key: "cutoutRight", label: "Right cutout", topPct: 28, leftPct: 66, widthPct: 16, rotate: 6 },
  { key: "cutoutSparkle", label: "Sparkle", topPct: 18, leftPct: 38, widthPct: 20, rotate: 0 },
  { key: "titleLogo", label: "Logo", topPct: 42, leftPct: 22, widthPct: 56, rotate: 0 },
];

export function LegallyBlondeEditCanvas({
  props,
  projectId,
  onPatch,
  onSelectSection,
}: {
  props: Record<string, unknown>;
  projectId?: string;
  onPatch: (patch: Record<string, unknown>) => void;
  onSelectSection?: () => void;
}) {
  const bg =
    String(props.backgroundLayer ?? "").trim() || LEGALLY_BLONDE_ASSETS.backgroundLayer;
  const moves = (props.layerMoves as Record<string, { dx?: number; dy?: number }>) ?? {};

  const slots: EditableCutoutSlot[] = DEFAULT_SLOTS.map((slot) => {
    const raw = String(props[slot.key] ?? "").trim();
    const fallback = LEGALLY_BLONDE_ASSETS[slot.key as keyof typeof LEGALLY_BLONDE_ASSETS];
    return {
      ...slot,
      src: raw || (typeof fallback === "string" ? fallback : ""),
    };
  }).filter((s) => s.src);

  function patchMove(key: string, dx: number, dy: number) {
    onPatch({
      layerMoves: {
        ...moves,
        [key]: { dx, dy },
      },
    });
  }

  return (
    <div className="w-full" onClick={() => onSelectSection?.()}>
      <p
        className="mb-2 rounded-full px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider"
        style={{ background: "#FF5500", color: "#fff" }}
      >
        Edit cutouts — pink canvas · click · upload · drag
      </p>

      <div
        className="relative mx-auto w-full overflow-hidden rounded-2xl"
        style={{
          aspectRatio: "12 / 7",
          width: "100%",
          maxWidth: "100%",
          /* Always pink even if the photo fails to load — never black */
          backgroundColor: "#E9006B",
          backgroundImage: `url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          boxShadow: "0 12px 40px rgba(233,0,107,0.35)",
        }}
      >
        {slots.map((slot) => {
          const move = moves[slot.key];
          const dxPct = ((move?.dx ?? 0) / 12) * 1;
          const dyPct = ((move?.dy ?? 0) / 7) * 1;
          return (
            <CutoutChip
              key={slot.key}
              slot={slot}
              leftPct={slot.leftPct + dxPct}
              topPct={slot.topPct + dyPct}
              onSelect={() => onSelectSection?.()}
              onMoved={(leftPct, topPct) => {
                patchMove(
                  slot.key,
                  Math.round((leftPct - slot.leftPct) * 12),
                  Math.round((topPct - slot.topPct) * 7),
                );
              }}
            />
          );
        })}
      </div>

      {projectId ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {DEFAULT_SLOTS.map((slot) => {
            const value = String(props[slot.key] ?? "");
            const fallback = LEGALLY_BLONDE_ASSETS[slot.key as keyof typeof LEGALLY_BLONDE_ASSETS];
            return (
              <div key={slot.key} className="rounded-xl border border-black/10 bg-white p-3">
                <SiteImageUpload
                  projectId={projectId}
                  kind="section"
                  label={slot.label}
                  value={value || (typeof fallback === "string" ? fallback : "")}
                  onChange={(url) => onPatch({ [slot.key]: url })}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="rounded-full px-2 py-1 text-[9px] font-bold uppercase"
                    style={{ border: "1px solid #DDE0F0" }}
                    onClick={() =>
                      onPatch({
                        [slot.key]:
                          typeof fallback === "string" ? fallback : LEGALLY_BLONDE_ASSETS.cutoutLeft,
                      })
                    }
                  >
                    Reset Russian
                  </button>
                  <button
                    type="button"
                    className="rounded-full px-2 py-1 text-[9px] font-bold uppercase text-red-600"
                    style={{ border: "1px solid #DDE0F0" }}
                    onClick={() => onPatch({ [slot.key]: "" })}
                  >
                    Hide
                  </button>
                </div>
              </div>
            );
          })}
          <div className="rounded-xl border border-black/10 bg-white p-3 sm:col-span-2">
            <SiteImageUpload
              projectId={projectId}
              kind="section"
              label="Background (pink Russian layer)"
              value={String(props.backgroundLayer ?? LEGALLY_BLONDE_ASSETS.backgroundLayer)}
              onChange={(url) => onPatch({ backgroundLayer: url })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CutoutChip({
  slot,
  leftPct,
  topPct,
  onSelect,
  onMoved,
}: {
  slot: EditableCutoutSlot;
  leftPct: number;
  topPct: number;
  onSelect: () => void;
  onMoved: (leftPct: number, topPct: number) => void;
}) {
  const dragging = useRef(false);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    const parent = e.currentTarget.offsetParent as HTMLElement | null;
    if (!parent) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const originLeft = leftPct;
    const originTop = topPct;
    const el = e.currentTarget;
    dragging.current = true;
    let lastLeft = originLeft;
    let lastTop = originTop;

    const onMove = (ev: PointerEvent) => {
      if (!dragging.current) return;
      const rect = parent.getBoundingClientRect();
      lastLeft = Math.min(85, Math.max(0, originLeft + ((ev.clientX - startX) / rect.width) * 100));
      lastTop = Math.min(85, Math.max(0, originTop + ((ev.clientY - startY) / rect.height) * 100));
      el.style.left = `${lastLeft}%`;
      el.style.top = `${lastTop}%`;
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      onMoved(lastLeft, lastTop);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      className="absolute cursor-grab active:cursor-grabbing"
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        width: `${slot.widthPct}%`,
        transform: `rotate(${slot.rotate ?? 0}deg)`,
        zIndex: 5,
        touchAction: "none",
        filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.25))",
      }}
      onPointerDown={onPointerDown}
      role="button"
      tabIndex={0}
      aria-label={`Move ${slot.label}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={slot.src} alt={slot.label} className="h-auto w-full select-none" draggable={false} />
      <span className="mt-1 block rounded bg-black/70 px-1 py-0.5 text-center text-[8px] font-bold uppercase tracking-wider text-white">
        {slot.label}
      </span>
    </div>
  );
}
