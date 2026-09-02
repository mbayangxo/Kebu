"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { SiteImageUpload } from "@/app/components/create/site-image-upload";
import {
  applyCollageLayoutPatch,
  builderDeviceFromWidth,
  labelBuilderDevice,
  resolveCollagePhotoForDevice,
  type BuilderDevice,
  type CollagePhotoWithDevices,
} from "@/lib/create/builder-device";

type KdEditor = {
  onPatchSection?: (sectionId: string, patch: Record<string, unknown>) => void;
  editDevice?: BuilderDevice;
};

type SocialLink = { label: string; iconUrl: string; href: string };
type NavLink = { label: string; href: string };
export type KdirectionCollagePhoto = CollagePhotoWithDevices;

function useActiveDevice(forced?: BuilderDevice): BuilderDevice {
  const [live, setLive] = useState<BuilderDevice>(forced ?? "desktop");
  useEffect(() => {
    if (forced) {
      setLive(forced);
      return;
    }
    const update = () => setLive(builderDeviceFromWidth(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [forced]);
  return forced ?? live;
}

function resolveHref(href: string, siteBase: string): string {
  if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("#")) return href;
  if (!siteBase) return href.startsWith("/") ? href : `/${href}`;
  if (href === "/" || href === "") return siteBase || "/";
  return `${siteBase}${href.startsWith("/") ? href : `/${href}`}`;
}

function WixNav({
  links,
  siteBase,
  buttonBg,
  showHomeIcon,
}: {
  links: NavLink[];
  siteBase: string;
  buttonBg: string;
  showHomeIcon?: boolean;
}) {
  return (
    <nav
      className="relative z-30 flex flex-wrap items-center justify-center gap-1 px-2 py-3 sm:gap-2 sm:px-6 sm:py-4"
      aria-label="Site"
    >
      {showHomeIcon !== false ? (
        <a
          href={resolveHref("/", siteBase)}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1e293b] text-white sm:h-9 sm:w-9"
          aria-label="Home"
          title="Home"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 3.2 3 11h2.5v9h5v-6h3v6h5v-9H21L12 3.2z" />
          </svg>
        </a>
      ) : null}
      {links.map((link) => (
        <a
          key={`${link.label}-${link.href}`}
          href={resolveHref(link.href, siteBase)}
          className="rounded-full px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-black sm:px-4 sm:py-2 sm:text-[10px] sm:tracking-[0.14em]"
          style={{ background: buttonBg || "#FFF86B", fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}

function Wordmark({
  line1,
  line2,
  showMirror,
  color,
  mirrorColor,
  fontFamily,
  editable,
  onChangeLine1,
  onChangeLine2,
}: {
  line1: string;
  line2: string;
  showMirror: boolean;
  color: string;
  mirrorColor: string;
  fontFamily: string;
  editable?: boolean;
  onChangeLine1?: (v: string) => void;
  onChangeLine2?: (v: string) => void;
}) {
  const display = fontFamily || "Oswald, sans-serif";
  const spaced = (s: string) => (s || "DIRECTION").split("").join(" ");

  return (
    <h1
      className="relative z-10 text-center leading-[0.9] select-none"
      style={{ fontFamily: display, fontWeight: 500 }}
      aria-label={`${line1}-${line2}`}
    >
      <span
        className="block text-[clamp(2.75rem,11vw,7.5rem)] tracking-[0.02em]"
        style={{ color }}
        contentEditable={editable}
        suppressContentEditableWarning
        onBlur={(e) => onChangeLine1?.(e.currentTarget.textContent?.trim() || "K")}
        onClick={(e) => editable && e.stopPropagation()}
      >
        {line1 || "K"}
      </span>
      <span
        className="block text-[clamp(1.35rem,6.5vw,5rem)] tracking-[0.18em] sm:tracking-[0.28em]"
        style={{ color }}
        contentEditable={editable}
        suppressContentEditableWarning
        onBlur={(e) =>
          onChangeLine2?.(e.currentTarget.textContent?.replace(/\s+/g, "").trim() || "DIRECTION")
        }
        onClick={(e) => editable && e.stopPropagation()}
      >
        {editable ? line2 || "DIRECTION" : spaced(line2)}
      </span>
      {showMirror ? (
        <>
          <span
            aria-hidden
            className="block scale-y-[-1] text-[clamp(1.35rem,6.5vw,5rem)] tracking-[0.18em] opacity-90 sm:tracking-[0.28em]"
            style={{ color: mirrorColor || "#F5C4B8" }}
          >
            {spaced(line2)}
          </span>
          <span
            aria-hidden
            className="block scale-y-[-1] text-[clamp(2.75rem,11vw,7.5rem)] tracking-[0.02em] opacity-90"
            style={{ color: mirrorColor || "#F5C4B8" }}
          >
            {line1 || "K"}
          </span>
        </>
      ) : null}
    </h1>
  );
}

function DraggablePhoto({
  photo,
  index,
  altFallback,
  editing,
  selected,
  onSelect,
  onMoved,
}: {
  photo: KdirectionCollagePhoto;
  index: number;
  altFallback: string;
  editing: boolean;
  selected: boolean;
  onSelect: () => void;
  onMoved: (topPct: number, leftPct: number) => void;
}) {
  const dragging = useRef(false);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!editing) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    const parent = e.currentTarget.offsetParent as HTMLElement | null;
    if (!parent) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const originLeft = photo.leftPct;
    const originTop = photo.topPct;
    const el = e.currentTarget;
    dragging.current = true;
    let lastLeft = originLeft;
    let lastTop = originTop;

    function onMove(ev: PointerEvent) {
      if (!dragging.current) return;
      const rect = parent!.getBoundingClientRect();
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      lastLeft = Math.min(92, Math.max(-8, originLeft + dx));
      lastTop = Math.min(92, Math.max(-8, originTop + dy));
      el.style.left = `${lastLeft}%`;
      el.style.top = `${lastTop}%`;
    }
    function onUp() {
      dragging.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      onMoved(lastTop, lastLeft);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      className={`absolute overflow-hidden shadow-2xl ${editing ? "cursor-grab active:cursor-grabbing" : ""} ${
        selected ? "ring-2 ring-[#FF5500] ring-offset-2" : ""
      }`}
      style={{
        top: `${photo.topPct}%`,
        left: `${photo.leftPct}%`,
        width: `${photo.widthPct}%`,
        transform: `rotate(${photo.rotate}deg)`,
        zIndex: photo.zIndex ?? 3,
        touchAction: editing ? "none" : undefined,
      }}
      onPointerDown={onPointerDown}
      onClick={(e) => {
        if (!editing) return;
        e.stopPropagation();
        onSelect();
      }}
      role={editing ? "button" : undefined}
      tabIndex={editing ? 0 : undefined}
      aria-label={editing ? `Move photo ${index + 1}` : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        alt={photo.alt || altFallback || "Collage"}
        className="pointer-events-none block aspect-[3/4] w-full object-cover"
        draggable={false}
      />
      {editing ? (
        <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
          Drag · {index + 1}
        </span>
      ) : null}
    </div>
  );
}

export type KdirectionHomeProps = {
  brandLine1: string;
  brandLine2: string;
  showMirrorLogo?: boolean;
  mission: string;
  backgroundImage: string;
  backgroundCss?: string;
  showOverlay?: boolean;
  overlayOpacity?: number;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  logoColor?: string;
  logoMirrorColor?: string;
  displayFont?: string;
  navButtonBg?: string;
  logoImage?: string;
  showHomeIcon?: boolean;
  showArrows?: boolean;
  featuredArtistName: string;
  featuredArtistImage: string;
  featuredArtistHref: string;
  newsCardLabel: string;
  newsCardHref: string;
  brandCardLabel: string;
  brandCardHref: string;
  collagePhotos?: KdirectionCollagePhoto[];
  navLinks: NavLink[];
  socialLinks: SocialLink[];
  footerText: string;
  motionEnabled?: boolean;
};

export function KdirectionHomeLayout({
  props,
  siteBase = "",
  sectionId,
  editor,
  projectId,
}: {
  props: KdirectionHomeProps;
  siteBase?: string;
  sectionId?: string;
  editor?: KdEditor;
  projectId?: string;
}) {
  const editing = Boolean(editor?.onPatchSection && sectionId);
  const device = useActiveDevice(editor?.editDevice);
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const font = props.displayFont || "Oswald";
  const fontStack = font.includes(",") ? font : `${font}, sans-serif`;
  const bg =
    props.backgroundCss?.trim() ||
    (props.backgroundImage
      ? undefined
      : `linear-gradient(165deg, ${props.gradientFrom} 0%, ${props.gradientVia} 42%, ${props.gradientTo} 100%)`);
  const rawPhotos = (props.collagePhotos ?? []).filter((p) => p?.src);
  const photos = rawPhotos
    .map((photo, index) => ({
      index,
      raw: photo,
      layout: resolveCollagePhotoForDevice(photo, device),
    }))
    .filter((p) => !p.layout.hidden);

  function patch(next: Record<string, unknown>) {
    if (!sectionId || !editor?.onPatchSection) return;
    editor.onPatchSection(sectionId, next);
  }

  function updatePhotoLayout(
    index: number,
    layoutPatch: Partial<{ rotate: number; topPct: number; leftPct: number; widthPct: number; hidden: boolean }>,
  ) {
    const next = [...(props.collagePhotos ?? [])];
    if (!next[index]) return;
    next[index] = applyCollageLayoutPatch(next[index]!, device, layoutPatch);
    patch({ collagePhotos: next });
  }

  function updatePhotoSrc(index: number, src: string) {
    const next = [...(props.collagePhotos ?? [])];
    if (!next[index]) return;
    next[index] = { ...next[index]!, src };
    patch({ collagePhotos: next });
  }

  const editorPanelStyle: CSSProperties = {
    position: "absolute",
    right: 12,
    top: 72,
    zIndex: 40,
    width: 260,
    maxHeight: "70vh",
    overflow: "auto",
    background: "rgba(255,255,255,0.96)",
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 16,
    padding: 12,
    boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
  };

  return (
    <div
      id="top"
      className="relative min-h-screen overflow-hidden text-black"
      style={{
        background: bg,
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700&display=swap`}
      />

      {props.backgroundImage ? (
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${props.backgroundImage})`,
            opacity: props.showOverlay ? 0.45 : 1,
          }}
          aria-hidden
        />
      ) : null}
      {props.showOverlay ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `rgba(0,0,0,${Math.min(0.85, Math.max(0, Number(props.overlayOpacity ?? 0)))})` }}
          aria-hidden
        />
      ) : null}

      <WixNav
        links={props.navLinks ?? []}
        siteBase={siteBase}
        buttonBg={props.navButtonBg || "#FFF86B"}
        showHomeIcon={props.showHomeIcon !== false}
      />

      {props.showArrows !== false ? (
        <div className="relative z-20 flex justify-center gap-6 py-1" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="text-white/90"
              style={{ transform: i === 1 || i === 2 ? "translateY(-6px)" : undefined, fontSize: 10 }}
            >
              ▲
            </span>
          ))}
        </div>
      ) : null}

      {editing ? (
        <p className="relative z-30 mx-auto max-w-lg px-4 text-center text-[10px] font-bold uppercase tracking-wider text-black/70">
          Editing {labelBuilderDevice(device)} layout · drag photos for this device only · publish keeps all three
        </p>
      ) : null}

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl flex-col items-center justify-center px-3 pb-16 pt-4 sm:px-4">
        <div
          className="relative w-full max-w-3xl py-4 sm:py-8"
          style={{ minHeight: device === "mobile" ? "22rem" : device === "tablet" ? "26rem" : "28rem" }}
        >
          {props.logoImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={props.logoImage}
              alt={props.brandLine2 || "Logo"}
              className="relative z-20 mx-auto mb-4 h-12 w-auto object-contain sm:h-20"
            />
          ) : null}

          <Wordmark
            line1={props.brandLine1}
            line2={props.brandLine2}
            showMirror={props.showMirrorLogo !== false}
            color={props.logoColor || "#fff"}
            mirrorColor={props.logoMirrorColor || "#F5C4B8"}
            fontFamily={fontStack}
            editable={editing}
            onChangeLine1={(v) => patch({ brandLine1: v.slice(0, 12) })}
            onChangeLine2={(v) => patch({ brandLine2: v.slice(0, 40) })}
          />

          {photos.map(({ index, layout }) => (
            <DraggablePhoto
              key={`photo-${index}-${device}`}
              photo={{
                src: layout.src,
                alt: layout.alt,
                rotate: layout.rotate,
                topPct: layout.topPct,
                leftPct: layout.leftPct,
                widthPct: layout.widthPct,
                zIndex: layout.zIndex,
              }}
              index={index}
              altFallback={props.featuredArtistName}
              editing={editing}
              selected={selectedPhoto === index}
              onSelect={() => setSelectedPhoto(index)}
              onMoved={(topPct, leftPct) => updatePhotoLayout(index, { topPct, leftPct })}
            />
          ))}
        </div>

        {props.mission ? (
          <p
            className="relative z-20 mt-2 max-w-md text-center text-sm text-black/80"
            contentEditable={editing}
            suppressContentEditableWarning
            onBlur={(e) => patch({ mission: e.currentTarget.textContent ?? "" })}
            onClick={(e) => editing && e.stopPropagation()}
          >
            {props.mission}
          </p>
        ) : editing ? (
          <button
            type="button"
            className="relative z-20 mt-2 text-[10px] font-bold uppercase tracking-wider text-black/50 underline"
            onClick={(e) => {
              e.stopPropagation();
              patch({ mission: "A recording label focused on cultivating and supporting talent." });
            }}
          >
            + Add mission text
          </button>
        ) : null}

        {/* Social icons row (editable links live in sidebar + here for visibility) */}
        {(props.socialLinks ?? []).length > 0 ? (
          <div className="relative z-20 mt-6 flex flex-wrap items-center justify-center gap-3">
            {(props.socialLinks ?? []).map((link) => (
              <a
                key={`${link.label}-${link.href}`}
                href={link.href || "#"}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                title={link.label}
                className="opacity-90 hover:opacity-100"
                onClick={(e) => editing && e.preventDefault()}
              >
                {link.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={link.iconUrl} alt={link.label} className="h-8 w-8 object-contain" />
                ) : (
                  <span className="text-[10px] font-bold uppercase">{link.label}</span>
                )}
              </a>
            ))}
          </div>
        ) : null}
      </main>

      {props.footerText ? (
        <p
          className="absolute bottom-0 left-0 z-20 w-full bg-black/55 px-4 py-2 text-left text-[10px] uppercase tracking-widest text-white"
          contentEditable={editing}
          suppressContentEditableWarning
          onBlur={(e) => patch({ footerText: e.currentTarget.textContent ?? "" })}
          onClick={(e) => editing && e.stopPropagation()}
        >
          {props.footerText}
        </p>
      ) : null}

      {editing && projectId && selectedPhoto !== null && (props.collagePhotos ?? [])[selectedPhoto] ? (
        <div style={editorPanelStyle} onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#FF5500]">
            Photo {selectedPhoto + 1} · {labelBuilderDevice(device)}
          </p>
          <p className="mt-1 text-[10px] text-black/60">
            Layout changes here apply to {labelBuilderDevice(device)} only. Upload replaces the image on all devices.
          </p>
          <div className="mt-2">
            <SiteImageUpload
              projectId={projectId}
              kind="section"
              label="Replace photo / cutout"
              value={String((props.collagePhotos ?? [])[selectedPhoto]?.src ?? "")}
              onChange={(url) => updatePhotoSrc(selectedPhoto, url)}
            />
          </div>
          <label className="mt-2 block text-[9px] uppercase">
            Rotate ({labelBuilderDevice(device)})
            <input
              type="range"
              min={-45}
              max={45}
              value={resolveCollagePhotoForDevice((props.collagePhotos ?? [])[selectedPhoto]!, device).rotate}
              className="mt-1 w-full"
              onChange={(e) => updatePhotoLayout(selectedPhoto, { rotate: Number(e.target.value) })}
            />
          </label>
          <label className="mt-2 block text-[9px] uppercase">
            Size ({labelBuilderDevice(device)})
            <input
              type="range"
              min={8}
              max={45}
              value={resolveCollagePhotoForDevice((props.collagePhotos ?? [])[selectedPhoto]!, device).widthPct}
              className="mt-1 w-full"
              onChange={(e) => updatePhotoLayout(selectedPhoto, { widthPct: Number(e.target.value) })}
            />
          </label>
          {device !== "desktop" ? (
            <label className="mt-2 flex items-center gap-2 text-[9px] uppercase">
              <input
                type="checkbox"
                checked={
                  resolveCollagePhotoForDevice((props.collagePhotos ?? [])[selectedPhoto]!, device).hidden === true
                }
                onChange={(e) => updatePhotoLayout(selectedPhoto, { hidden: e.target.checked })}
              />
              Hide on {labelBuilderDevice(device)}
            </label>
          ) : null}
          <button
            type="button"
            className="mt-3 w-full rounded-full border border-black/15 px-3 py-1.5 text-[10px] font-bold uppercase"
            onClick={() => {
              const next = (props.collagePhotos ?? []).filter((_, i) => i !== selectedPhoto);
              patch({ collagePhotos: next });
              setSelectedPhoto(null);
            }}
          >
            Remove photo (all devices)
          </button>
          <button
            type="button"
            className="mt-2 w-full rounded-full bg-[#0F0D33] px-3 py-1.5 text-[10px] font-bold uppercase text-white"
            onClick={() => setSelectedPhoto(null)}
          >
            Done
          </button>
        </div>
      ) : null}
    </div>
  );
}

export type KdirectionPageProps = {
  title: string;
  subtitle?: string;
  body: string;
  heroImage: string;
  backgroundImage?: string;
  backgroundCss?: string;
  showOverlay?: boolean;
  overlayOpacity?: number;
  displayFont?: string;
  navButtonBg?: string;
  showHomeIcon?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
  navLinks: NavLink[];
  socialLinks: SocialLink[];
  footerText: string;
};

export function KdirectionPageLayout({
  props,
  siteBase = "",
  sectionId,
  editor,
  projectId,
}: {
  props: KdirectionPageProps;
  siteBase?: string;
  sectionId?: string;
  editor?: KdEditor;
  projectId?: string;
}) {
  const editing = Boolean(editor?.onPatchSection && sectionId);
  const overlay = props.showOverlay === true;
  const opacity = Math.min(0.85, Math.max(0, Number(props.overlayOpacity ?? 0.35)));
  const font = props.displayFont || "Oswald";
  const bg = props.backgroundCss?.trim() || "#0a0a0a";

  function patch(next: Record<string, unknown>) {
    if (!sectionId || !editor?.onPatchSection) return;
    editor.onPatchSection(sectionId, next);
  }

  return (
    <div className="relative min-h-screen text-white" style={{ background: bg }}>
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600;700&display=swap`}
      />
      {props.backgroundImage ? (
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${props.backgroundImage})` }}
          aria-hidden
        />
      ) : null}
      {overlay && props.backgroundImage ? (
        <div className="pointer-events-none absolute inset-0" style={{ background: `rgba(0,0,0,${opacity})` }} aria-hidden />
      ) : null}

      <WixNav
        links={props.navLinks ?? []}
        siteBase={siteBase}
        buttonBg={props.navButtonBg || "#FFF86B"}
        showHomeIcon={props.showHomeIcon !== false}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-4 py-12 sm:px-8">
        <p
          className="text-5xl tracking-[0.14em] text-white sm:text-6xl"
          style={{ fontFamily: `${font}, sans-serif`, fontWeight: 500 }}
        >
          K
        </p>
        <h1
          className="mt-2 text-3xl tracking-[0.2em] uppercase sm:text-4xl"
          style={{ fontFamily: `${font}, sans-serif`, fontWeight: 500 }}
          contentEditable={editing}
          suppressContentEditableWarning
          onBlur={(e) => patch({ title: e.currentTarget.textContent?.trim() || props.title })}
          onClick={(e) => editing && e.stopPropagation()}
        >
          {props.title}
        </h1>
        {props.subtitle ? <p className="mt-3 text-white/70">{props.subtitle}</p> : null}
        {props.heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.heroImage} alt="" className="mt-8 w-full max-h-[28rem] object-cover shadow-xl" />
        ) : null}
        {editing && projectId ? (
          <div className="mt-4" onClick={(e) => e.stopPropagation()}>
            <SiteImageUpload
              projectId={projectId}
              kind="section"
              label="Page hero photo"
              value={props.heroImage || ""}
              onChange={(url) => patch({ heroImage: url })}
            />
          </div>
        ) : null}
        <p
          className="mt-8 text-base leading-relaxed text-white/90 whitespace-pre-wrap"
          contentEditable={editing}
          suppressContentEditableWarning
          onBlur={(e) => patch({ body: e.currentTarget.textContent ?? "" })}
          onClick={(e) => editing && e.stopPropagation()}
        >
          {props.body}
        </p>
        {props.ctaLabel && props.ctaHref ? (
          <a
            href={resolveHref(props.ctaHref, siteBase)}
            className="mt-8 inline-flex rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black"
            style={{ background: props.navButtonBg || "#FFF86B" }}
            onClick={(e) => editing && e.preventDefault()}
          >
            {props.ctaLabel}
          </a>
        ) : null}
      </main>
      {props.footerText ? (
        <p className="px-4 pb-6 text-left text-[10px] uppercase tracking-widest text-white/70">{props.footerText}</p>
      ) : null}
    </div>
  );
}
