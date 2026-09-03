"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { GalleryTemplate } from "@/lib/create/template-gallery";
import { KEBU } from "@/lib/kebu-brand";

function PreviewSkeleton({ accent, gradient }: { accent: string; gradient?: string }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: gradient ?? `linear-gradient(160deg, ${accent}33, ${KEBU.black})`,
      }}
    >
      <div className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
    </div>
  );
}

function StaticTemplateVisual({ template }: { template: GalleryTemplate }) {
  const visual = template.cardVisual;
  if (!visual) return null;

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: visual.previewGradient ?? `linear-gradient(160deg, ${template.accent}55, #0a0a0a)`,
        }}
      />
      {visual.previewImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={visual.previewImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        />
      ) : null}
      {visual.previewImageSecondary ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={visual.previewImageSecondary}
          alt=""
          className="absolute bottom-[8%] right-[6%] z-10 w-[42%] rotate-6 object-cover shadow-2xl ring-2 ring-white/80"
        />
      ) : null}
      {template.slug === "agency-kdirection" ? (
        <div className="absolute inset-x-[10%] top-[18%] z-10 flex flex-wrap justify-center gap-1.5 opacity-95">
          {["HOME", "ARTISTS", "CONTACT"].map((label) => (
            <span
              key={label}
              className="rounded-full px-2 py-0.5 text-[7px] font-bold tracking-wider text-black"
              style={{ background: "#FFF86B" }}
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}
      {template.slug === "showcase-legally-blonde" ? (
        <div
          className="absolute left-[8%] top-[12%] z-10 max-w-[55%] text-[11px] font-black uppercase leading-none tracking-tight text-[#e9006b]"
          style={{ fontFamily: "Georgia, serif" }}
        >
          Russian cutouts
        </div>
      ) : null}
    </div>
  );
}

export function TemplatePreviewCard({
  template,
  selectionMode = false,
  selected = false,
  onSelect,
  onHover,
  onHoverEnd,
  visualOnly = false,
}: {
  template: GalleryTemplate;
  selectionMode?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onHover?: () => void;
  onHoverEnd?: () => void;
  visualOnly?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [loadFrame, setLoadFrame] = useState(false);
  const [frameReady, setFrameReady] = useState(false);

  useEffect(() => {
    if (template.cardVisual?.previewImage || template.cardVisual?.previewGradient) {
      setFrameReady(true);
    }
  }, [template.cardVisual]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoadFrame(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const border = selected
    ? `3px solid ${KEBU.orange}`
    : visualOnly
      ? `2px solid ${KEBU.black}`
      : selectionMode
        ? "2px solid rgba(10,10,10,0.08)"
        : "1px solid rgba(10,10,10,0.1)";

  const iframeScale = visualOnly ? 0.22 : 0.26;
  const useStaticHero = Boolean(template.cardVisual?.previewImage || template.cardVisual?.previewGradient);
  const showIframe = loadFrame && !useStaticHero;

  return (
    <article
      className="group rounded-2xl overflow-hidden flex flex-col transition-all hover:-translate-y-1"
      style={{
        border,
        background: KEBU.white,
        boxShadow: selected
          ? "0 16px 40px rgba(255,85,0,0.25)"
          : visualOnly
            ? "4px 4px 0 rgba(10,10,10,1)"
            : "0 10px 28px rgba(255,85,0,0.07)",
      }}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
    >
      <div
        ref={hostRef}
        className="relative overflow-hidden bg-[#0A0A0A]"
        style={{ aspectRatio: visualOnly ? "9/14" : "10/13" }}
      >
        {template.cardVisual ? <StaticTemplateVisual template={template} /> : null}
        {!frameReady && !useStaticHero ? (
          <PreviewSkeleton accent={template.accent} gradient={template.cardVisual?.previewGradient} />
        ) : null}
        {showIframe ? (
          <iframe
            src={template.previewPath}
            title={`${template.name} live preview`}
            className="absolute top-0 left-0 border-0 pointer-events-none origin-top-left"
            style={{
              width: "1280px",
              height: "2000px",
              transform: `scale(${iframeScale})`,
              opacity: frameReady ? 1 : 0,
              transition: "opacity 0.35s ease",
            }}
            loading="lazy"
            tabIndex={-1}
            onLoad={() => setFrameReady(true)}
          />
        ) : null}
        {useStaticHero ? (
          <iframe
            src={template.previewPath}
            title={`${template.name} live preview`}
            className="absolute top-0 left-0 border-0 pointer-events-none origin-top-left opacity-0"
            style={{ width: "1px", height: "1px" }}
            tabIndex={-1}
            onLoad={() => setFrameReady(true)}
            aria-hidden
          />
        ) : null}

        {selectionMode ? (
          <button
            type="button"
            onClick={onSelect}
            className="absolute inset-0 z-[5] cursor-pointer"
            aria-label={`Select ${template.name}`}
            aria-pressed={selected}
          />
        ) : (
          <Link
            href={template.demoPath}
            className="absolute inset-0 z-[5]"
            aria-label={`Full preview of ${template.name}`}
          />
        )}

        <div
          className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
          style={{
            background: "linear-gradient(to top, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.5) 45%, transparent 100%)",
            minHeight: visualOnly ? "42%" : "38%",
          }}
        />

        <div className="absolute inset-x-0 bottom-0 z-20 p-4 pointer-events-none">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: KEBU.orange }}>
            {template.groupLabel}
          </p>
          <h3
            className={`font-black text-white leading-tight ${visualOnly ? "text-lg" : "text-base"}`}
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            {template.name}
          </h3>
          {!visualOnly && !selectionMode ? (
            <p className="text-[11px] mt-1 line-clamp-2 text-white/70">{template.description}</p>
          ) : null}
        </div>

        <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none group-hover:pointer-events-auto p-4">
          <Link
            href={template.demoPath}
            className="rounded-full px-5 py-2.5 text-[10px] font-black uppercase tracking-wider bg-white text-black shadow-lg"
          >
            Full preview
          </Link>
          {selectionMode ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.();
              }}
              className="rounded-full px-5 py-2.5 text-[10px] font-black uppercase tracking-wider shadow-lg"
              style={{ background: KEBU.orange, color: KEBU.white }}
            >
              {selected ? "Selected" : "Use this"}
            </button>
          ) : (
            <Link
              href={template.usePath}
              className="rounded-full px-5 py-2.5 text-[10px] font-black uppercase tracking-wider shadow-lg"
              style={{ background: KEBU.orange, color: KEBU.white }}
            >
              Start with this
            </Link>
          )}
        </div>

        {selected ? (
          <span
            className="absolute top-3 right-3 z-20 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full"
            style={{ background: KEBU.orange, color: KEBU.white }}
          >
            Selected
          </span>
        ) : (
          <span
            className="absolute top-3 left-3 z-20 text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-full opacity-90"
            style={{ background: template.cardVisual?.badge ? template.accent : KEBU.red, color: KEBU.white }}
          >
            {template.cardVisual?.badge ?? "Live preview"}
          </span>
        )}
      </div>

      {!visualOnly ? (
        <div className="p-4 flex-1 flex flex-col">
          {selectionMode ? (
            <button
              type="button"
              onClick={onSelect}
              className="w-full inline-flex items-center justify-center rounded-full py-2.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: selected ? KEBU.black : KEBU.orange,
                color: KEBU.white,
              }}
            >
              {selected ? "Selected" : "Use this template"}
            </button>
          ) : (
            <Link
              href={template.usePath}
              className="inline-flex items-center justify-center rounded-full py-2.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: KEBU.black, color: KEBU.white }}
            >
              Start with this template
            </Link>
          )}
        </div>
      ) : null}
    </article>
  );
}
