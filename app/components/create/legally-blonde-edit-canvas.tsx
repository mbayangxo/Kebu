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
import { SiteThemeFonts } from "@/app/components/create/site-theme-fonts";
import { cssFontStack } from "@/lib/create/site-theme-fonts";
import type { BuilderElementKind, BuilderElementSelection } from "@/lib/create/builder-selection";
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
  zIndex?: number;
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
  selectedElement,
  onSelectSection,
  onSelectElement,
  onNavigatePage,
}: {
  props: Record<string, unknown>;
  projectId?: string;
  siteBase?: string;
  currentSlug?: string;
  fillCanvas?: boolean;
  onPatch: (patch: Record<string, unknown>) => void;
  selectedElement?: BuilderElementSelection | null;
  onSelectSection?: () => void;
  onSelectElement?: (element: Omit<BuilderElementSelection, "sectionId">) => void;
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
  const layerOpacity = (props.layerOpacity as Record<string, number>) ?? {};
  const layerRotation = (props.layerRotation as Record<string, number>) ?? {};
  const lockedLayers = Array.isArray(props.lockedLayers) ? (props.lockedLayers as string[]) : [];

  function toggleLayerLocked(key: string) {
    onPatch({
      lockedLayers: lockedLayers.includes(key)
        ? lockedLayers.filter((item) => item !== key)
        : [...new Set([...lockedLayers, key])],
    });
  }

  function hideLayer(key: string) {
    onPatch({
      hiddenLayers: [...new Set([...hiddenLayers, key])],
      ...(key === "backgroundLayer" ? { backgroundHidden: true } : {}),
    });
    setSelectedKey(null);
    setSelectedExtraId(null);
    setEditingTitle(false);
  }

  function stepLayer(key: string, delta: -1 | 1) {
    const current = typeof layerZ[key] === "number" ? layerZ[key]! : 10;
    const next = Math.min(80, Math.max(1, current + delta));
    const extras = extraCutouts.map((cut) =>
      cut.id === key ? { ...cut, zIndex: next } : cut,
    );
    onPatch({
      layerZIndex: { ...layerZ, [key]: next },
      ...(extras.some((cut) => cut.id === key) ? { extraCutouts: extras } : {}),
    });
  }

  function duplicateLayer(key: string, source: EditableCutoutSlot | ExtraCut) {
    const nextId = `dup-${Date.now()}`;
    const position = positions[key] ?? {
      leftPct: source.leftPct,
      topPct: source.topPct,
    };
    const currentScale = scales[key] ?? 1;
    const duplicate: ExtraCut = {
      id: nextId,
      src: source.src,
      alt: `${"label" in source ? source.label : source.alt || "Cutout"} copy`,
      href: "href" in source ? source.href : layerLinks[key] ?? "",
      leftPct: Math.min(90, position.leftPct + 3),
      topPct: Math.min(90, position.topPct + 3),
      widthPct: Math.max(4, source.widthPct * currentScale),
      rotate: source.rotate ?? 0,
      zIndex: Math.min(80, (typeof layerZ[key] === "number" ? layerZ[key]! : 10) + 1),
    };
    onPatch({
      extraCutouts: [...extraCutouts, duplicate],
      layerScales: { ...scales, [nextId]: 1 },
      layerZIndex: { ...layerZ, [nextId]: duplicate.zIndex ?? 11 },
      layerPositions: {
        ...positions,
        [nextId]: { leftPct: duplicate.leftPct, topPct: duplicate.topPct },
      },
    });
    setSelectedExtraId(nextId);
    setSelectedKey(null);
    setEditingTitle(false);
    selectElement(`extra:${nextId}`, "cutout", duplicate.alt || "Cutout copy");
  }

  function bumpLayer(key: string, dir: "front" | "back") {
    // Collect z-indexes of ALL other layers so we can truly move to front/back
    const allSlotKeys = DEFAULT_SLOTS.map((s) => s.key);
    const allExtraIds = Array.isArray(props.extraCutouts)
      ? (props.extraCutouts as { id?: string }[]).map((c) => c.id ?? "")
      : [];
    const otherKeys = [...allSlotKeys, ...allExtraIds].filter((k) => k && k !== key);
    const othersZ = otherKeys.map((k) => (typeof layerZ[k] === "number" ? layerZ[k]! : 10));
    const maxOther = othersZ.length > 0 ? Math.max(...othersZ) : 10;
    const minOther = othersZ.length > 0 ? Math.min(...othersZ) : 10;
    // Bring to Front = above everyone; Send to Back = below everyone
    const next = dir === "front" ? Math.min(79, maxOther + 10) : Math.max(1, minOther - 1);
    const nextMap = { ...layerZ, [key]: next };
    const extras = Array.isArray(props.extraCutouts)
      ? (props.extraCutouts as { id?: string; zIndex?: number }[]).map((c) =>
          c.id === key ? { ...c, zIndex: next } : c,
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
  const titleTypography = {
    fontFamily: String(props.titleTextFontFamily ?? "Impact"),
    fontSize: Math.min(48, Math.max(8, Number(props.titleTextFontSize ?? 14))),
    fontWeight: Math.min(900, Math.max(400, Number(props.titleTextFontWeight ?? 900))),
    letterSpacing: Math.min(0.5, Math.max(-0.05, Number(props.titleTextLetterSpacing ?? 0.12))),
    lineHeight: Math.min(2, Math.max(0.8, Number(props.titleTextLineHeight ?? 1.15))),
    color: String(props.titleTextColor ?? "#ffffff"),
  };
  const parallax = props.scrollMode !== "viewport";
  const sectionMinHeightPx = Math.min(
    1800,
    Math.max(360, Number(props.sectionMinHeightPx ?? 720)),
  );
  const extraCutouts = Array.isArray(props.extraCutouts)
    ? (props.extraCutouts as ExtraCut[])
    : [];

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedExtraId, setSelectedExtraId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [snapGuide, setSnapGuide] = useState({ x: false, y: false });

  useEffect(() => {
    if (!selectedElement) {
      setSelectedKey(null);
      setSelectedExtraId(null);
      setEditingTitle(false);
      return;
    }
    if (selectedElement.kind === "cutout" && selectedElement.elementId.startsWith("extra:")) {
      setSelectedExtraId(selectedElement.elementId.slice("extra:".length));
      setSelectedKey(null);
      return;
    }
    setSelectedKey(selectedElement.elementId);
    setSelectedExtraId(null);
  }, [selectedElement]);
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

  function selectElement(elementId: string, kind: BuilderElementKind, label: string) {
    onSelectElement?.({ elementId, kind, label });
  }

  function defaultMotion(key: string): LayerMotion {
    const preset = MAYLECOR_DEFAULT_LAYER_MOTIONS[key as keyof typeof MAYLECOR_DEFAULT_LAYER_MOTIONS];
    if (preset) return preset;
    return key === "titleLogo" ? "spin" : "none";
  }

  const artboard = (
      <div
        className="relative w-full flex-1 overflow-hidden"
        style={{
          minHeight: sectionMinHeightPx,
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
          selectElement("backgroundLayer", "background", "Background");
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
              titleTypography={titleTypography}
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
              opacity={typeof layerOpacity[slot.key] === "number" ? layerOpacity[slot.key]! : 1}
              rotation={typeof layerRotation[slot.key] === "number" ? layerRotation[slot.key]! : slot.rotate ?? 0}
              locked={lockedLayers.includes(slot.key)}
              onBringFront={() => bumpLayer(slot.key, "front")}
              onBringForward={() => stepLayer(slot.key, 1)}
              onSendBackward={() => stepLayer(slot.key, -1)}
              onSendBack={() => bumpLayer(slot.key, "back")}
              onDuplicate={() => duplicateLayer(slot.key, slot)}
              onToggleLock={() => toggleLayerLocked(slot.key)}
              onHide={() => hideLayer(slot.key)}
              onSelect={() => {
                setSelectedKey(slot.key);
                setSelectedExtraId(null);
                selectElement(
                  slot.key,
                  slot.key === "titleLogo" && titleAsText ? "text" : "image",
                  slot.label,
                );
              }}
              onStartTitleEdit={() => {
                setSelectedKey(slot.key);
                setEditingTitle(true);
                onPatch({ titleAsText: true });
                selectElement(slot.key, "text", slot.label);
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
              onSnapGuide={setSnapGuide}
            />
          );
        })}

        {extraCutouts
          .filter((c) => c.src && !hiddenLayers.includes(c.id))
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
                opacity={typeof layerOpacity[cut.id] === "number" ? layerOpacity[cut.id]! : 1}
                rotation={typeof layerRotation[cut.id] === "number" ? layerRotation[cut.id]! : cut.rotate ?? 0}
                locked={lockedLayers.includes(cut.id)}
                onBringFront={() => bumpLayer(cut.id, "front")}
                onBringForward={() => stepLayer(cut.id, 1)}
                onSendBackward={() => stepLayer(cut.id, -1)}
                onSendBack={() => bumpLayer(cut.id, "back")}
                onDuplicate={() => duplicateLayer(cut.id, cut)}
                onToggleLock={() => toggleLayerLocked(cut.id)}
                onHide={() => hideLayer(cut.id)}
                onSelect={() => {
                  setSelectedExtraId(cut.id);
                  setSelectedKey(null);
                  setEditingTitle(false);
                  selectElement(`extra:${cut.id}`, "cutout", cut.alt || "Cutout");
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
                onSnapGuide={setSnapGuide}
              />
            );
          })}

        {snapGuide.x ? (
          <div
            className="pointer-events-none absolute bottom-0 top-0 z-[90] w-px bg-[#2C6ECB]/80"
            style={{ left: "50%" }}
            aria-hidden
          />
        ) : null}
        {snapGuide.y ? (
          <div
            className="pointer-events-none absolute left-0 right-0 z-[90] h-px bg-[#2C6ECB]/80"
            style={{ top: "50%" }}
            aria-hidden
          />
        ) : null}

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

        <button
          type="button"
          aria-label="Resize hero section height"
          className="absolute bottom-0 left-1/2 z-[95] h-3 w-20 -translate-x-1/2 translate-y-1/2 cursor-ns-resize rounded-full border border-white/80 bg-[#2C6ECB] shadow"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            selectElement("heroCanvas", "control", "Hero section");
            const startY = event.clientY;
            const startHeight = sectionMinHeightPx;
            const onMove = (moveEvent: MouseEvent) => {
              const next = Math.min(
                1800,
                Math.max(360, Math.round(startHeight + (moveEvent.clientY - startY))),
              );
              onPatch({ sectionMinHeightPx: next });
            };
            const onUp = () => {
              window.removeEventListener("mousemove", onMove);
              window.removeEventListener("mouseup", onUp);
            };
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
          }}
        />
      </div>
  );

  return (
    /* Fill the builder main pane edge-to-edge (Shopify-style) — no aspect-ratio strip. */
    <div
      className="relative flex min-h-0 w-full flex-1 flex-col bg-[#FFE4F0]"
    >
      <SiteThemeFonts
        fontDisplay={String(props.displayFont ?? "Oswald")}
        fontBody="system-ui"
        extraFamilies={[titleTypography.fontFamily]}
      />

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
  titleTypography,
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
  opacity = 1,
  rotation,
  locked = false,
  onBringFront,
  onBringForward,
  onSendBackward,
  onSendBack,
  onDuplicate,
  onToggleLock,
  onHide,
  onSnapGuide,
}: {
  slot: EditableCutoutSlot;
  titleText: string | null;
  titleEditing: boolean;
  titleInputRef?: React.RefObject<HTMLInputElement | null>;
  accentColor: string;
  titleTypography?: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    letterSpacing: number;
    lineHeight: number;
    color: string;
  };
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
  opacity?: number;
  rotation?: number;
  locked?: boolean;
  onBringFront?: () => void;
  onBringForward?: () => void;
  onSendBackward?: () => void;
  onSendBack?: () => void;
  onDuplicate?: () => void;
  onToggleLock?: () => void;
  onHide?: () => void;
  onSnapGuide?: (guide: { x: boolean; y: boolean }) => void;
}) {
  const moved = useRef(false);
  const [pulsing, setPulsing] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [ctxMenu]);

  const baseRotate = rotation ?? slot.rotate ?? 0;
  const scrollTransform =
    scrollProgress > 0 && !pauseMotion
      ? cutoutScrollTransform(slot.key, scrollProgress, baseRotate)
      : baseRotate
        ? `rotate(${baseRotate}deg)`
        : undefined;

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const t = e.target as HTMLElement;
    if (t.dataset?.resize === "1" || t.closest?.("[data-resize='1']")) return;
    if (locked) {
      e.stopPropagation();
      onSelect();
      return;
    }
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
      let nextLeft = Math.min(90, Math.max(-5, originLeft + dx));
      let nextTop = Math.min(90, Math.max(-5, originTop + dy));
      const widthPct = (el.getBoundingClientRect().width / rect.width) * 100;
      const heightPct = (el.getBoundingClientRect().height / rect.height) * 100;
      const snapX = Math.abs(nextLeft + widthPct / 2 - 50) <= 1.2;
      const snapY = Math.abs(nextTop + heightPct / 2 - 50) <= 1.2;
      if (snapX) nextLeft = 50 - widthPct / 2;
      if (snapY) nextTop = 50 - heightPct / 2;
      lastLeft = nextLeft;
      lastTop = nextTop;
      onSnapGuide?.({ x: snapX, y: snapY });
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
      onSnapGuide?.({ x: false, y: false });
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
    if (locked) return;
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
        opacity,
        outline: selected || titleEditing ? "2px solid #FF5500" : undefined,
        outlineOffset: 3,
      }}
      onPointerDown={onPointerDown}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
        setCtxMenu({ x: e.clientX, y: e.clientY });
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (titleText !== null) onStartTitleEdit?.();
        else onReplaceImage?.();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (!selected && !titleEditing) return;
        if (locked) return;
        if ((event.key === "Delete" || event.key === "Backspace") && onDelete) {
          event.preventDefault();
          onDelete();
          return;
        }
        const step = event.shiftKey ? 5 : 1;
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          onMoved(Math.max(-5, leftPct - step), topPct);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          onMoved(Math.min(90, leftPct + step), topPct);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          onMoved(leftPct, Math.max(-5, topPct - step));
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          onMoved(leftPct, Math.min(90, topPct + step));
        }
      }}
      aria-label={
        titleText !== null
          ? "Drag to move · corners to resize · click to type"
          : href.trim()
            ? `Drag to move ${slot.label} · click Open to follow link`
            : `Drag to move ${slot.label} · corners to resize · double-click to change photo`
      }
    >
      {/* Right-click context menu — position: fixed so it escapes overflow:hidden */}
      {ctxMenu ? (
        <div
          data-chip-toolbar="1"
          className="fixed z-[200] flex min-w-[168px] flex-col overflow-hidden rounded-xl bg-white py-1 shadow-2xl"
          style={{ left: ctxMenu.x + 4, top: ctxMenu.y - 4 }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {titleText !== null ? (
            <CtxItem onClick={() => { onStartTitleEdit?.(); setCtxMenu(null); }}>Type name</CtxItem>
          ) : (
            <CtxItem onClick={() => { onReplaceImage?.(); setCtxMenu(null); }}>Replace photo</CtxItem>
          )}
          {href.trim() ? (
            <CtxItem onClick={() => { onOpenLink?.(); setCtxMenu(null); }}>Open link</CtxItem>
          ) : null}
          {onDuplicate ? (
            <CtxItem onClick={() => { onDuplicate(); setCtxMenu(null); }}>Duplicate</CtxItem>
          ) : null}
          {onToggleLock ? (
            <CtxItem onClick={() => { onToggleLock(); setCtxMenu(null); }}>
              {locked ? "Unlock" : "Lock"}
            </CtxItem>
          ) : null}
          {onHide ? (
            <CtxItem onClick={() => { onHide(); setCtxMenu(null); }}>Hide</CtxItem>
          ) : null}
          {onBringFront ? (
            <CtxItem onClick={() => { onBringFront(); setCtxMenu(null); }}>Bring to Front</CtxItem>
          ) : null}
          {onBringForward ? (
            <CtxItem onClick={() => { onBringForward(); setCtxMenu(null); }}>Bring Forward</CtxItem>
          ) : null}
          {onSendBackward ? (
            <CtxItem onClick={() => { onSendBackward(); setCtxMenu(null); }}>Send Backward</CtxItem>
          ) : null}
          {onSendBack ? (
            <CtxItem onClick={() => { onSendBack(); setCtxMenu(null); }}>Send to Back</CtxItem>
          ) : null}
          {onDelete ? (
            <CtxItem danger onClick={() => { onDelete(); setCtxMenu(null); }}>Delete</CtxItem>
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
            {/* Center content — name text always visible; input swaps in when editing */}
            <div className="absolute inset-0 z-20 flex items-center justify-center p-[22%]">
              {titleEditing ? (
                <div
                  data-title-edit="1"
                  className="w-full"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <input
                    ref={titleInputRef}
                    autoFocus
                    className="w-full bg-transparent text-center uppercase caret-white outline-none"
                    style={{
                      color: titleTypography?.color ?? "#ffffff",
                      fontFamily: titleTypography?.fontFamily
                        ? cssFontStack(titleTypography.fontFamily)
                        : "Impact, Arial Black, Helvetica, sans-serif",
                      fontSize: `${titleTypography?.fontSize ?? 14}px`,
                      fontWeight: titleTypography?.fontWeight ?? 900,
                      letterSpacing: `${titleTypography?.letterSpacing ?? 0.12}em`,
                      lineHeight: titleTypography?.lineHeight ?? 1.15,
                      textShadow: "0 1px 8px rgba(0,0,0,0.55)",
                    }}
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
              ) : (
                <p
                  className="pointer-events-none w-full break-words text-center font-black uppercase text-white"
                  style={{
                    color: titleTypography?.color ?? "#ffffff",
                    fontSize: `${titleTypography?.fontSize ?? 14}px`,
                    letterSpacing: `${titleTypography?.letterSpacing ?? 0.12}em`,
                    lineHeight: titleTypography?.lineHeight ?? 1.15,
                    fontWeight: titleTypography?.fontWeight ?? 900,
                    textShadow: "0 1px 8px rgba(0,0,0,0.55)",
                    fontFamily: titleTypography?.fontFamily
                      ? cssFontStack(titleTypography.fontFamily)
                      : "Impact, Arial Black, Helvetica, sans-serif",
                  }}
                >
                  {titleText || "MAY LECOR"}
                </p>
              )}
            </div>
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
      {(selected || titleEditing) && !locked ? (
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
      ) : null}
    </div>
  );
}

function CtxItem({
  onClick,
  danger = false,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[12px] font-semibold tracking-tight hover:bg-gray-50 active:bg-gray-100"
      style={{ color: danger ? "#DC2626" : "#111111" }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
