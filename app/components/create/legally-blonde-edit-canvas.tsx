"use client";

/**
 * Shopify-style May Lecor / Legally Blonde canvas.
 * - Click background → OS file picker (no form box)
 * - Click name circle → type ON the circle
 * - Click a photo (without dragging) → replace via file picker
 * - No orange inspector panels sitting under the site
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  CircularBrandRing,
  layerMotionClass,
  type LayerMotion,
} from "@/app/components/create/circular-brand-ring";
import { LEGALLY_BLONDE_ASSETS } from "@/lib/create/legally-blonde-defaults";
import {
  MAYLECOR_FIGURE_ASSETS,
  MAYLECOR_LOCAL_ASSETS,
} from "@/lib/create/maylecor-defaults";
import { uploadProjectAsset } from "@/lib/create/upload-project-asset";
import { MaylecorMotionChrome } from "@/app/components/create/maylecor-motion-chrome";
import { sanitizeMaylecorNavLinks } from "@/lib/create/maylecor-nav";
import { cutoutScrollTransform, MAYLECOR_DEFAULT_LAYER_MOTIONS } from "@/lib/create/maylecor-cutout-motion";
import {
  cutoutHrefToPageSlug,
  normalizeCutoutHref,
  resolveCutoutHref,
} from "@/lib/create/cutout-links";
import { parseNavLayout, type NavSizePreset } from "@/lib/create/nav-chrome-size";
import "./artist-motion.css";
import "./legally-blonde-tilda.css";

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
  { key: "cutoutLeft", label: "Left cutout", topPct: 20, leftPct: 4, widthPct: 28, rotate: -4 },
  { key: "cutoutAccent", label: "Center cutout", topPct: 14, leftPct: 30, widthPct: 40, rotate: 0 },
  { key: "cutoutRight", label: "Right cutout", topPct: 22, leftPct: 68, widthPct: 26, rotate: 5 },
  { key: "cutoutSparkle", label: "Sparkle", topPct: 12, leftPct: 42, widthPct: 14, rotate: 0 },
  { key: "titleLogo", label: "Name circle", topPct: 36, leftPct: 30, widthPct: 38, rotate: 0 },
];

/** May Lecor hero — never fall back to Russian / Elle stock cutouts or Cyrillic logo. */
function looksLikeMaylecorHero(props: Record<string, unknown>): boolean {
  const blob = [
    props.chromeLogo,
    props.titleLogo,
    props.cutoutLeft,
    props.cutoutAccent,
    props.seedRevision,
    props.brandLabel,
    props.title,
  ]
    .map((v) => String(v ?? ""))
    .join(" ")
    .toLowerCase();
  return (
    blob.includes("maylecor") ||
    blob.includes("may lecor") ||
    blob.includes("may lècor") ||
    blob.includes("logo-circle-seal") ||
    blob.includes("may-figure") ||
    blob.includes("may-cutout") ||
    Boolean(props.seedRevision)
  );
}

function slotFallbackSrc(key: string, props: Record<string, unknown>): string {
  if (looksLikeMaylecorHero(props)) {
    if (key === "titleLogo") return MAYLECOR_LOCAL_ASSETS.logoCircleSeal;
    if (key === "cutoutLeft") return MAYLECOR_FIGURE_ASSETS.cutoutLeft;
    if (key === "cutoutRight") return MAYLECOR_FIGURE_ASSETS.cutoutRight;
    if (key === "cutoutAccent") return MAYLECOR_FIGURE_ASSETS.cutoutAccent;
    if (key === "heroPhoto") return MAYLECOR_FIGURE_ASSETS.heroPhoto;
    // Russian glitter / MacBook — blank unless the founder uploaded something.
    if (key === "cutoutSparkle" || key === "macbook" || key === "sparkleGif") return "";
  }
  const fallback = LEGALLY_BLONDE_ASSETS[key as keyof typeof LEGALLY_BLONDE_ASSETS];
  return typeof fallback === "string" ? fallback : "";
}

type LayerPos = { leftPct: number; topPct: number };
type ExtraCut = {
  id: string;
  src: string;
  alt?: string;
  href?: string;
  topPct: number;
  leftPct: number;
  widthPct: number;
  rotate?: number;
};

type UploadTarget =
  | { kind: "background" }
  | { kind: "slot"; key: string }
  | { kind: "extra"; id: string };

export function LegallyBlondeEditCanvas({
  props,
  projectId,
  siteBase = "",
  currentSlug = "home",
  fillCanvas = true,
  onPatch,
  onSelectSection,
  onNavigatePage,
}: {
  props: Record<string, unknown>;
  projectId?: string;
  siteBase?: string;
  currentSlug?: string;
  fillCanvas?: boolean;
  onPatch: (patch: Record<string, unknown>) => void;
  onSelectSection?: () => void;
  onNavigatePage?: (slug: string) => void;
}) {
  const hiddenLayers = Array.isArray(props.hiddenLayers)
    ? (props.hiddenLayers as string[])
    : [];
  const bgHidden =
    props.backgroundHidden === true || hiddenLayers.includes("backgroundLayer");
  const bgRaw = String(props.backgroundLayer ?? "").trim();
  const bg = bgHidden ? "" : bgRaw;
  const moves = (props.layerMoves as Record<string, { dx?: number; dy?: number }>) ?? {};
  const positions = (props.layerPositions as Record<string, LayerPos>) ?? {};
  const scales = (props.layerScales as Record<string, number>) ?? {};
  const motions = (props.layerMotions as Record<string, LayerMotion>) ?? {};
  const layerLinks = (props.layerLinks as Record<string, string>) ?? {};
  const layerZ = (props.layerZIndex as Record<string, number>) ?? {};

  function bumpLayer(key: string, dir: "front" | "back") {
    const current = typeof layerZ[key] === "number" ? layerZ[key]! : 10;
    const next = dir === "front" ? Math.min(80, current + 10) : Math.max(1, current - 10);
    const nextMap = { ...layerZ, [key]: next };
    const extras = Array.isArray(props.extraCutouts)
      ? (props.extraCutouts as { id?: string; zIndex?: number }[]).map((c) =>
          c.id === key ? { ...c, zIndex: Math.min(40, next) } : c,
        )
      : props.extraCutouts;
    onPatch({
      layerZIndex: nextMap,
      ...(Array.isArray(extras) ? { extraCutouts: extras } : {}),
    });
  }
  const titleAsText = props.titleAsText === true;
  const title = String(props.title ?? "MAY LECOR");
  const accent = String(props.accentColor ?? "#E9006B");
  const parallax = props.scrollMode !== "viewport";
  const extraCutouts = Array.isArray(props.extraCutouts)
    ? (props.extraCutouts as ExtraCut[])
    : [];

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedExtraId, setSelectedExtraId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<UploadTarget | null>(null);
  const titleFieldRef = useRef<HTMLInputElement>(null);

  const slots: EditableCutoutSlot[] = DEFAULT_SLOTS.map((slot) => {
    if (hiddenLayers.includes(slot.key)) return { ...slot, src: "" };
    if (slot.key === "titleLogo" && titleAsText) {
      return { ...slot, src: "__title_text__" };
    }
    const raw = String(props[slot.key] ?? "").trim();
    // Never paint Russian Elle cutouts / Cyrillic seal on a May Lecor hero.
    const russianStock =
      raw.includes("/templates/legally-blonde/") ||
      raw.includes("tildacdn.com") ||
      raw.includes("Group_557");
    const useMay = looksLikeMaylecorHero(props);
    const src =
      raw && !(useMay && russianStock) ? raw : slotFallbackSrc(slot.key, props);
    return {
      ...slot,
      src,
    };
  }).filter((s) => Boolean(s.src));

  function resolveSlotPos(slot: Omit<EditableCutoutSlot, "src">): LayerPos {
    if (positions[slot.key]) return positions[slot.key]!;
    const move = moves[slot.key];
    return {
      leftPct: slot.leftPct + (move?.dx ?? 0) / 12,
      topPct: slot.topPct + (move?.dy ?? 0) / 7,
    };
  }

  function saveLayerLink(key: string, href: string) {
    const next = normalizeCutoutHref(href);
    if (!next) {
      const { [key]: _removed, ...rest } = layerLinks;
      onPatch({ layerLinks: rest });
      return;
    }
    onPatch({ layerLinks: { ...layerLinks, [key]: next } });
  }

  function openCutoutLink(href: string) {
    const h = normalizeCutoutHref(href);
    if (!h) return;
    const pageSlug = cutoutHrefToPageSlug(h);
    if (pageSlug && onNavigatePage) {
      onNavigatePage(pageSlug);
      return;
    }
    const resolved = resolveCutoutHref(h, siteBase);
    if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
      window.open(resolved, "_blank", "noopener,noreferrer");
      return;
    }
    if (resolved.startsWith("/")) {
      window.location.assign(resolved);
    }
  }

  function saveSlotPos(key: string, leftPct: number, topPct: number) {
    onPatch({
      layerPositions: {
        ...positions,
        [key]: { leftPct, topPct },
      },
    });
  }

  function openUpload(target: UploadTarget) {
    if (!projectId) {
      setToast("Save the project first, then upload.");
      return;
    }
    uploadTarget.current = target;
    fileRef.current?.click();
  }

  async function onFilePicked(file: File) {
    if (!projectId || !uploadTarget.current) return;
    const target = uploadTarget.current;
    uploadTarget.current = null;
    setBusy(true);
    setToast("Uploading…");
    const result = await uploadProjectAsset(projectId, file, "section");
    setBusy(false);
    if (!result.ok) {
      setToast(result.error);
      return;
    }
    if (target.kind === "background") {
      onPatch({
        backgroundLayer: result.url,
        backgroundHidden: false,
        hiddenLayers: hiddenLayers.filter((k) => k !== "backgroundLayer"),
      });
    } else if (target.kind === "slot") {
      onPatch({
        [target.key]: result.url,
        hiddenLayers: hiddenLayers.filter((k) => k !== target.key),
        ...(target.key === "titleLogo" ? { titleAsText: false } : {}),
      });
      setEditingTitle(false);
    } else {
      onPatch({
        extraCutouts: extraCutouts.map((c) =>
          c.id === target.id ? { ...c, src: result.url } : c,
        ),
      });
    }
    setToast(null);
  }

  useEffect(() => {
    if (!parallax) return;
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const total = el.scrollHeight - el.clientHeight;
      setScrollProgress(total > 0 ? Math.min(1, Math.max(0, el.scrollTop / total)) : 0);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [parallax]);

  useEffect(() => {
    if (!toast || toast === "Uploading…") return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (editingTitle) {
      window.setTimeout(() => titleFieldRef.current?.focus(), 20);
    }
  }, [editingTitle]);

  function defaultMotion(key: string): LayerMotion {
    const preset = MAYLECOR_DEFAULT_LAYER_MOTIONS[key as keyof typeof MAYLECOR_DEFAULT_LAYER_MOTIONS];
    if (preset) return preset;
    return key === "titleLogo" ? "spin" : "none";
  }

  const artboard = (
      <div
        className={
          fillCanvas
            ? "relative h-full min-h-0 w-full flex-1 overflow-hidden"
            : "relative min-h-[72vh] w-full overflow-hidden"
        }
        style={{
          backgroundColor: String(props.accentColor ?? "#E9006B"),
          backgroundImage: bg ? `url(${bg})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          touchAction: "none",
          cursor: busy ? "wait" : "default",
        }}
        onClick={(e) => {
          if (e.target !== e.currentTarget) return;
          setSelectedKey(null);
          setSelectedExtraId(null);
          setEditingTitle(false);
          onSelectSection?.();
        }}
        onDoubleClick={(e) => {
          if (e.target !== e.currentTarget) return;
          openUpload({ kind: "background" });
        }}
      >
        <MaylecorMotionChrome
          siteBase={siteBase}
          brandLabel={String(props.brandLabel ?? props.title ?? "MAY LECOR")}
          titleLogo={
            props.showChromeLogo === false
              ? undefined
              : String(props.chromeLogo ?? "").trim() ||
                "/templates/maylecor/logo-stacked.png"
          }
          showChromeLogo={props.showChromeLogo !== false}
          currentSlug={currentSlug}
          accentColor={accent}
          contained
          overlayOnSite
          navLinks={sanitizeMaylecorNavLinks(
            Array.isArray(props.navLinks)
              ? (props.navLinks as {
                  label?: string;
                  href?: string;
                  iconUrl?: string;
                  showLabel?: boolean;
                }[])
              : undefined,
          )}
          navDisplay={
            props.navDisplay === "icons" || props.navDisplay === "photos"
              ? props.navDisplay
              : "text"
          }
          socialLinks={
            Array.isArray(props.socialLinks)
              ? (props.socialLinks as { label: string; iconUrl: string; href: string }[])
              : undefined
          }
          navScale={typeof props.navScale === "number" ? props.navScale : 1}
          navSize={(props.navSize as NavSizePreset | undefined) ?? "comfortable"}
          navLayout={parseNavLayout(props.navLayout)}
          onNavigate={onNavigatePage}
        />

        {slots.map((slot) => {
          const pos = resolveSlotPos(slot);
          const scale = scales[slot.key] ?? (slot.key === "titleLogo" ? 0.75 : 1);
          const isTitle = slot.key === "titleLogo" && titleAsText;
          return (
            <CutoutChip
              key={slot.key}
              slot={{ ...slot, widthPct: Math.max(4, slot.widthPct * scale) }}
              titleText={isTitle ? title || "MAY LECOR" : null}
              titleEditing={isTitle && editingTitle}
              titleInputRef={titleFieldRef}
              accentColor={accent}
              selected={selectedKey === slot.key}
              leftPct={pos.leftPct}
              topPct={pos.topPct}
              motion={motions[slot.key] ?? defaultMotion(slot.key)}
              href={layerLinks[slot.key] ?? ""}
              scrollProgress={parallax ? scrollProgress : 0}
              pauseMotion={Boolean(selectedKey || selectedExtraId || editingTitle)}
              siteBase={siteBase}
              onNavigatePage={onNavigatePage}
              onLinkChange={(href) => saveLayerLink(slot.key, href)}
              onOpenLink={() => openCutoutLink(layerLinks[slot.key] ?? "")}
              zIndex={typeof layerZ[slot.key] === "number" ? layerZ[slot.key]! : 10}
              onBringFront={() => bumpLayer(slot.key, "front")}
              onSendBack={() => bumpLayer(slot.key, "back")}
              onSelect={() => {
                setSelectedKey(slot.key);
                setSelectedExtraId(null);
                onSelectSection?.();
              }}
              onStartTitleEdit={() => {
                setSelectedKey(slot.key);
                setEditingTitle(true);
                onPatch({ titleAsText: true });
                onSelectSection?.();
              }}
              onEndTitleEdit={() => setEditingTitle(false)}
              onTitleChange={(v) => onPatch({ title: v, brandLabel: v, titleAsText: true })}
              onReplaceImage={() => {
                if (isTitle) {
                  setEditingTitle(true);
                  return;
                }
                openUpload({ kind: "slot", key: slot.key });
              }}
              onDelete={() => {
                onPatch({
                  hiddenLayers: [...new Set([...hiddenLayers, slot.key])],
                  ...(slot.key === "titleLogo" ? {} : { [slot.key]: "" }),
                });
                setSelectedKey(null);
                setEditingTitle(false);
              }}
              onMoved={(leftPct, topPct) => saveSlotPos(slot.key, leftPct, topPct)}
              onScaled={(nextScale) => {
                onPatch({
                  layerScales: {
                    ...scales,
                    [slot.key]: Math.min(3, Math.max(0.15, Number(nextScale.toFixed(2)))),
                  },
                });
              }}
              baseWidthPct={slot.widthPct}
              scale={scale}
            />
          );
        })}

        {extraCutouts
          .filter((c) => c.src)
          .map((cut) => {
            const scale = scales[cut.id] ?? 1;
            const pos = positions[cut.id] ?? { leftPct: cut.leftPct, topPct: cut.topPct };
            return (
              <CutoutChip
                key={cut.id}
                slot={{
                  key: cut.id,
                  label: cut.alt || "Cutout",
                  src: cut.src,
                  topPct: cut.topPct,
                  leftPct: cut.leftPct,
                  widthPct: Math.max(4, cut.widthPct * scale),
                  rotate: cut.rotate,
                }}
                titleText={null}
                titleEditing={false}
                accentColor={accent}
                selected={selectedExtraId === cut.id}
                leftPct={pos.leftPct}
                topPct={pos.topPct}
                motion={motions[cut.id] ?? "none"}
                href={cut.href ?? ""}
                scrollProgress={parallax ? scrollProgress : 0}
                pauseMotion={Boolean(selectedKey || selectedExtraId || editingTitle)}
                siteBase={siteBase}
                onNavigatePage={onNavigatePage}
                onLinkChange={(href) => {
                  onPatch({
                    extraCutouts: extraCutouts.map((c) =>
                      c.id === cut.id ? { ...c, href: normalizeCutoutHref(href) } : c,
                    ),
                  });
                }}
                onOpenLink={() => openCutoutLink(cut.href ?? "")}
                zIndex={typeof layerZ[cut.id] === "number" ? layerZ[cut.id]! : 10}
                onBringFront={() => bumpLayer(cut.id, "front")}
                onSendBack={() => bumpLayer(cut.id, "back")}
                onSelect={() => {
                  setSelectedExtraId(cut.id);
                  setSelectedKey(null);
                  setEditingTitle(false);
                  onSelectSection?.();
                }}
                onReplaceImage={() => openUpload({ kind: "extra", id: cut.id })}
                onDelete={() => {
                  onPatch({
                    extraCutouts: extraCutouts.filter((c) => c.id !== cut.id),
                  });
                  setSelectedExtraId(null);
                }}
                onMoved={(leftPct, topPct) => {
                  onPatch({
                    extraCutouts: extraCutouts.map((c) =>
                      c.id === cut.id ? { ...c, leftPct, topPct } : c,
                    ),
                    layerPositions: {
                      ...positions,
                      [cut.id]: { leftPct, topPct },
                    },
                  });
                }}
                onScaled={(nextScale) => {
                  onPatch({
                    layerScales: {
                      ...scales,
                      [cut.id]: Math.min(3, Math.max(0.15, Number(nextScale.toFixed(2)))),
                    },
                  });
                }}
                baseWidthPct={cut.widthPct}
                scale={scale}
              />
            );
          })}

        {parallax ? (
          <div className="pointer-events-none absolute bottom-3 right-3 z-[80] rounded-full bg-black/55 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-white/90">
            Scroll to move cutouts
          </div>
        ) : null}

        <div className="pointer-events-auto absolute bottom-3 left-3 z-[85] flex flex-wrap gap-1.5">
          <button
            type="button"
            className="rounded-full bg-black/75 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white shadow"
            onClick={(e) => {
              e.stopPropagation();
              openUpload({ kind: "background" });
            }}
          >
            {bg ? "Change background" : "Add background"}
          </button>
          {bg ? (
            <button
              type="button"
              className="rounded-full bg-black/75 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white shadow"
              onClick={(e) => {
                e.stopPropagation();
                onPatch({
                  backgroundLayer: "",
                  backgroundHidden: true,
                  hiddenLayers: [...new Set([...hiddenLayers, "backgroundLayer"])],
                });
              }}
            >
              Remove background
            </button>
          ) : null}
        </div>

        {toast ? (
          <div className="pointer-events-none absolute left-1/2 top-3 z-[90] -translate-x-1/2 rounded-full bg-black/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
            {toast}
          </div>
        ) : null}
      </div>
  );

  return (
    /* Fill the builder main pane edge-to-edge (Shopify-style) — no aspect-ratio strip. */
    <div
      className={
        fillCanvas
          ? "relative flex h-full min-h-0 w-full flex-1 flex-col bg-[#FFE4F0]"
          : "relative flex min-h-[72vh] w-full flex-col bg-[#FFE4F0]"
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFilePicked(f);
          e.target.value = "";
        }}
      />

      {parallax ? (
        <div
          ref={scrollerRef}
          className="lb-editor-parallax-scroll relative min-h-0 w-full flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="lb-editor-scroll-scene">
            <div className="lb-editor-scroll-pin">{artboard}</div>
          </div>
        </div>
      ) : (
        artboard
      )}
    </div>
  );
}

function CutoutChip({
  slot,
  titleText,
  titleEditing,
  titleInputRef,
  accentColor,
  selected,
  leftPct,
  topPct,
  scale,
  baseWidthPct,
  motion,
  href = "",
  scrollProgress = 0,
  pauseMotion,
  siteBase,
  onNavigatePage,
  onLinkChange,
  onOpenLink,
  onSelect,
  onMoved,
  onScaled,
  onTitleChange,
  onStartTitleEdit,
  onEndTitleEdit,
  onReplaceImage,
  onDelete,
  zIndex = 10,
  onBringFront,
  onSendBack,
}: {
  slot: EditableCutoutSlot;
  titleText: string | null;
  titleEditing: boolean;
  titleInputRef?: React.RefObject<HTMLInputElement | null>;
  accentColor: string;
  selected: boolean;
  leftPct: number;
  topPct: number;
  scale: number;
  baseWidthPct: number;
  motion: LayerMotion;
  href?: string;
  scrollProgress?: number;
  pauseMotion: boolean;
  siteBase?: string;
  onNavigatePage?: (slug: string) => void;
  onLinkChange?: (href: string) => void;
  onOpenLink?: () => void;
  onSelect: () => void;
  onMoved: (leftPct: number, topPct: number) => void;
  onScaled: (scale: number) => void;
  onTitleChange?: (value: string) => void;
  onStartTitleEdit?: () => void;
  onEndTitleEdit?: () => void;
  onReplaceImage?: () => void;
  onDelete?: () => void;
  zIndex?: number;
  onBringFront?: () => void;
  onSendBack?: () => void;
}) {
  const moved = useRef(false);
  const [pulsing, setPulsing] = useState(false);

  const baseRotate = slot.rotate ?? 0;
  const scrollTransform =
    scrollProgress > 0 && !pauseMotion
      ? cutoutScrollTransform(slot.key, scrollProgress, baseRotate)
      : baseRotate
        ? `rotate(${baseRotate}deg)`
        : undefined;

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const t = e.target as HTMLElement;
    if (t.dataset?.resize === "1" || t.closest?.("[data-resize='1']")) return;
    if (t.closest?.("[data-chip-toolbar='1']")) return;
    if (t.closest?.("[data-link-field='1']")) return;
    if (titleEditing && t.closest?.("[data-title-edit='1']")) return;

    if (e.altKey && href.trim()) {
      onOpenLink?.();
      return;
    }

    e.stopPropagation();
    e.preventDefault();
    onSelect();

    const parent = e.currentTarget.offsetParent as HTMLElement | null;
    if (!parent) return;
    const el = e.currentTarget;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const originLeft = leftPct;
    const originTop = topPct;
    moved.current = false;
    let lastLeft = originLeft;
    let lastTop = originTop;

    const onMove = (ev: PointerEvent) => {
      const rect = parent.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      if (Math.abs(dx) + Math.abs(dy) > 0.6) moved.current = true;
      lastLeft = Math.min(90, Math.max(-5, originLeft + dx));
      lastTop = Math.min(90, Math.max(-5, originTop + dy));
      el.style.left = `${lastLeft}%`;
      el.style.top = `${lastTop}%`;
    };

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      try {
        el.releasePointerCapture(ev.pointerId);
      } catch {
        /* ignore */
      }
      if (moved.current) {
        onMoved(lastLeft, lastTop);
        return;
      }
      /* Click (no drag): select · pulse cutout · type on name circle. */
      if (titleText !== null) {
        onStartTitleEdit?.();
      } else if (href.trim()) {
        onOpenLink?.();
      } else {
        setPulsing(true);
        window.setTimeout(() => setPulsing(false), 360);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function onCornerResize(
    e: ReactPointerEvent<HTMLButtonElement>,
    corner: "nw" | "ne" | "sw" | "se",
  ) {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    const chip = e.currentTarget.parentElement as HTMLElement | null;
    const parent = chip?.offsetParent as HTMLElement | null;
    if (!parent || !chip) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const startScale = scale;
    const startLeft = leftPct;
    const startTop = topPct;
    const startW = baseWidthPct * startScale;
    const parentRect = () => parent.getBoundingClientRect();

    const onMove = (ev: PointerEvent) => {
      const rect = parentRect();
      if (rect.width < 1 || rect.height < 1) return;
      const dxPct = ((ev.clientX - startX) / rect.width) * 100;
      const dyPct = ((ev.clientY - startY) / rect.height) * 100;
      // Use the dominant axis so mouse expand/shrink feels natural
      const signed =
        corner === "se" || corner === "ne"
          ? dxPct
          : corner === "sw" || corner === "nw"
            ? -dxPct
            : 0;
      const signedY =
        corner === "se" || corner === "sw"
          ? dyPct
          : corner === "ne" || corner === "nw"
            ? -dyPct
            : 0;
      const delta = Math.abs(signed) > Math.abs(signedY) ? signed : signedY;
      const nextW = Math.min(70, Math.max(6, startW + delta));
      const nextScale = nextW / Math.max(1, baseWidthPct);
      onScaled(Math.min(3, Math.max(0.15, Number(nextScale.toFixed(3)))));

      // Anchor opposite corner when resizing from NW/NE/SW
      if (corner === "nw" || corner === "sw") {
        const dw = nextW - startW;
        chip.style.left = `${startLeft - dw}%`;
      }
      if (corner === "nw" || corner === "ne") {
        const dh = ((nextW - startW) / Math.max(1, startW)) * (startW * 0.7);
        chip.style.top = `${startTop - dh}%`;
      }
      chip.style.width = `${nextW}%`;
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      const finalW = parseFloat(chip.style.width) || startW;
      const finalScale = finalW / Math.max(1, baseWidthPct);
      onScaled(Math.min(3, Math.max(0.15, Number(finalScale.toFixed(3)))));
      if (corner === "nw" || corner === "sw" || corner === "ne") {
        const left = parseFloat(chip.style.left);
        const top = parseFloat(chip.style.top);
        if (!Number.isNaN(left) && !Number.isNaN(top)) {
          onMoved(Math.min(90, Math.max(-5, left)), Math.min(90, Math.max(-5, top)));
        }
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  const handleClass =
    "absolute z-50 h-3.5 w-3.5 rounded-sm border-2 border-white bg-[#FF5500] shadow-md hover:scale-110";

  return (
    <div
      className="absolute cursor-grab active:cursor-grabbing select-none"
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        width: `${slot.widthPct}%`,
        transform: scrollTransform,
        zIndex: selected || titleEditing ? Math.max(zIndex, 40) : zIndex,
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.25))",
        outline: selected || titleEditing ? "2px solid #FF5500" : undefined,
        outlineOffset: 3,
      }}
      onPointerDown={onPointerDown}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (titleText !== null) onStartTitleEdit?.();
        else onReplaceImage?.();
      }}
      role="button"
      tabIndex={0}
      aria-label={
        titleText !== null
          ? "Drag to move · corners to resize · click to type"
          : href.trim()
            ? `Drag to move ${slot.label} · click Open to follow link`
            : `Drag to move ${slot.label} · corners to resize · double-click to change photo`
      }
    >
      {(selected || titleEditing) && (onReplaceImage || onDelete || onLinkChange) ? (
        <div
          data-chip-toolbar="1"
          className="absolute -top-14 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-1"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-1 whitespace-nowrap">
            {titleText !== null ? (
              <button
                type="button"
                className="rounded-md bg-[#0F0D33] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white shadow"
                onClick={() => onStartTitleEdit?.()}
              >
                Type
              </button>
            ) : (
              <button
                type="button"
                className="rounded-md bg-[#0F0D33] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white shadow"
                onClick={() => onReplaceImage?.()}
              >
                Change
              </button>
            )}
            {href.trim() ? (
              <button
                type="button"
                className="rounded-md bg-[#E9006B] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white shadow"
                onClick={() => onOpenLink?.()}
              >
                Open
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                className="rounded-md bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-red-600 shadow"
                onClick={() => onDelete()}
              >
                Delete
              </button>
            ) : null}
            {onBringFront ? (
              <button
                type="button"
                className="rounded-md bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#0F0D33] shadow"
                onClick={() => onBringFront()}
                title="Bring to front"
              >
                Front
              </button>
            ) : null}
            {onSendBack ? (
              <button
                type="button"
                className="rounded-md bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#0F0D33] shadow"
                onClick={() => onSendBack()}
                title="Send to back"
              >
                Back
              </button>
            ) : null}
          </div>
          {onLinkChange ? (
            <p className="max-w-[220px] text-center text-[8px] font-semibold uppercase tracking-wider text-white/80">
              Set link in left Sections panel
            </p>
          ) : null}
        </div>
      ) : null}

      <div
        className={`relative ${layerMotionClass(motion, !pauseMotion && !selected && !titleEditing)} ${pulsing ? "lb-cutout-pulse" : ""}`}
      >
        {titleText !== null ? (
          <div className="relative">
            <CircularBrandRing
              text={titleText}
              color={accentColor}
              spinning={!selected && !titleEditing}
            />
            {titleEditing ? (
              <div
                data-title-edit="1"
                className="absolute inset-0 z-20 flex items-center justify-center p-[22%]"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <input
                  ref={titleInputRef}
                  autoFocus
                  className="w-full bg-transparent text-center text-[11px] font-black uppercase tracking-[0.14em] text-white caret-white outline-none sm:text-sm"
                  style={{ textShadow: "0 1px 8px rgba(0,0,0,0.55)" }}
                  value={titleText}
                  placeholder="YOUR NAME"
                  aria-label="Type your name"
                  onChange={(e) => onTitleChange?.(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Escape") {
                      e.preventDefault();
                      onEndTitleEdit?.();
                    }
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={slot.src}
            alt={slot.label}
            className="pointer-events-none h-auto w-full select-none"
            draggable={false}
          />
        )}
      </div>

      {/* Shopify-style corner handles — drag with the mouse to make bigger / smaller */}
      {(selected || titleEditing) ? (
        <>
          <button
            type="button"
            data-resize="1"
            aria-label="Resize top-left"
            className={`${handleClass} -left-1.5 -top-1.5 cursor-nwse-resize`}
            style={{ touchAction: "none" }}
            onPointerDown={(e) => onCornerResize(e, "nw")}
          />
          <button
            type="button"
            data-resize="1"
            aria-label="Resize top-right"
            className={`${handleClass} -right-1.5 -top-1.5 cursor-nesw-resize`}
            style={{ touchAction: "none" }}
            onPointerDown={(e) => onCornerResize(e, "ne")}
          />
          <button
            type="button"
            data-resize="1"
            aria-label="Resize bottom-left"
            className={`${handleClass} -bottom-1.5 -left-1.5 cursor-nesw-resize`}
            style={{ touchAction: "none" }}
            onPointerDown={(e) => onCornerResize(e, "sw")}
          />
          <button
            type="button"
            data-resize="1"
            aria-label="Resize bottom-right"
            className={`${handleClass} -bottom-1.5 -right-1.5 cursor-nwse-resize`}
            style={{ touchAction: "none" }}
            onPointerDown={(e) => onCornerResize(e, "se")}
          />
        </>
      ) : (
        <button
          type="button"
          data-resize="1"
          aria-label={`Scale ${slot.label}`}
          className="absolute -bottom-1 -right-1 z-40 h-4 w-4 cursor-nwse-resize rounded-sm border-2 border-white bg-[#FF5500]/80 shadow"
          style={{ touchAction: "none" }}
          onPointerDown={(e) => onCornerResize(e, "se")}
        />
      )}
    </div>
  );
}
