"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { kebuSitePreviewPath, liveSiteUrl } from "@/lib/create/site-urls";
import { KEBU } from "@/lib/kebu-brand";

export type MySiteProject = {
  id: string;
  title: string;
  status: string;
  subdomain?: string | null;
  project_type: string;
  updated_at: string;
  published_at?: string | null;
};

type Device = "desktop" | "tablet" | "mobile";

const DEVICE: Record<
  Device,
  { label: string; width: number; height: number; frameMax: string; scale: number; minH: number }
> = {
  desktop: { label: "Desktop", width: 1280, height: 900, frameMax: "100%", scale: 0.28, minH: 300 },
  tablet: { label: "Tablet", width: 768, height: 1024, frameMax: "420px", scale: 0.36, minH: 380 },
  mobile: { label: "Mobile", width: 390, height: 844, frameMax: "240px", scale: 0.42, minH: 320 },
};

function previewSrc(p: MySiteProject): string | null {
  if (p.subdomain?.trim()) {
    return kebuSitePreviewPath(p.subdomain) ?? `/sites/${p.subdomain.trim().toLowerCase()}`;
  }
  return `/create/${p.id}/preview?embed=1`;
}

function DeviceToggle({
  value,
  onChange,
}: {
  value: Device;
  onChange: (d: Device) => void;
}) {
  return (
    <div
      className="inline-flex rounded-full p-0.5 gap-0.5"
      style={{ background: "rgba(10,10,10,0.06)", border: `1px solid ${KEBU.border}` }}
      role="group"
      aria-label="Preview size"
    >
      {(Object.keys(DEVICE) as Device[]).map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors"
          style={{
            background: value === d ? KEBU.black : "transparent",
            color: value === d ? KEBU.white : KEBU.muted,
          }}
          aria-pressed={value === d}
        >
          {DEVICE[d].label}
        </button>
      ))}
    </div>
  );
}

export function SitePreviewCard({
  project,
  device: controlledDevice,
  hideLocalToggle = false,
}: {
  project: MySiteProject;
  device?: Device;
  hideLocalToggle?: boolean;
}) {
  const [localDevice, setLocalDevice] = useState<Device>("desktop");
  const device = controlledDevice ?? localDevice;
  const [loadFrame, setLoadFrame] = useState(false);
  const [frameReady, setFrameReady] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);

  const published = Boolean(project.published_at) || project.status === "published";
  const src = useMemo(() => previewSrc(project), [project]);
  const live = liveSiteUrl(project.subdomain);
  const cfg = DEVICE[device];

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
      { rootMargin: "180px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setFrameReady(false);
  }, [device, src]);

  return (
    <article
      className="rounded-2xl overflow-hidden flex flex-col bg-white transition-shadow hover:shadow-lg"
      style={{ border: `1px solid ${KEBU.border}` }}
    >
      <div
        className="flex items-center justify-between gap-2 px-3 py-2"
        style={{ background: KEBU.cream, borderBottom: `1px solid ${KEBU.border}` }}
      >
        <div className="min-w-0 flex items-center gap-2">
          <span
            className="shrink-0 w-2 h-2 rounded-full"
            style={{ background: published ? "#00C851" : KEBU.orange }}
            aria-hidden
          />
          <p className="text-[11px] font-bold truncate" style={{ color: KEBU.black }}>
            {project.title}
          </p>
        </div>
        {hideLocalToggle ? (
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
            {cfg.label}
          </span>
        ) : (
          <DeviceToggle value={device} onChange={setLocalDevice} />
        )}
      </div>

      <div
        ref={hostRef}
        className="relative flex items-start justify-center overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #E8E4DE 0%, #D4CFC6 100%)",
          minHeight: cfg.minH,
          padding: device === "desktop" ? "12px 8px 0" : "20px 12px 16px",
        }}
      >
        {!frameReady ? (
          <div className="absolute inset-0 flex items-center justify-center z-[1]">
            <div
              className="w-9 h-9 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: `${KEBU.orange}55`, borderTopColor: KEBU.orange }}
            />
          </div>
        ) : null}

        <div
          className="relative z-[2] overflow-hidden bg-white shadow-xl transition-all duration-300"
          style={{
            width: cfg.frameMax,
            maxWidth: "100%",
            borderRadius: device === "mobile" ? 28 : device === "tablet" ? 18 : 10,
            border: device === "desktop" ? `1px solid ${KEBU.border}` : `3px solid ${KEBU.black}`,
            aspectRatio: `${cfg.width} / ${Math.min(cfg.height, device === "desktop" ? 800 : cfg.height)}`,
          }}
        >
          {device === "desktop" ? (
            <div
              className="h-6 flex items-center gap-1.5 px-2"
              style={{ background: "#F3F0EB", borderBottom: `1px solid ${KEBU.border}` }}
            >
              <span className="w-2 h-2 rounded-full bg-[#FF5F57]" />
              <span className="w-2 h-2 rounded-full bg-[#FEBC2E]" />
              <span className="w-2 h-2 rounded-full bg-[#28C840]" />
              <span className="ml-2 flex-1 h-3.5 rounded-full bg-white/80 text-[8px] text-black/40 px-2 truncate font-mono leading-[14px]">
                {src ?? "preview"}
              </span>
            </div>
          ) : (
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-[3] w-16 h-1 rounded-full bg-black/25" aria-hidden />
          )}

          <div className="relative overflow-hidden" style={{ height: device === "desktop" ? 260 : "100%" }}>
            {loadFrame && src ? (
              <iframe
                key={`${project.id}-${device}-${src}`}
                src={src}
                title={`${project.title} live preview`}
                className="absolute top-0 left-0 border-0 origin-top-left pointer-events-none bg-white"
                style={{
                  width: cfg.width,
                  height: cfg.height,
                  transform: `scale(${cfg.scale})`,
                  opacity: frameReady ? 1 : 0,
                  transition: "opacity 0.3s ease",
                }}
                loading="lazy"
                tabIndex={-1}
                onLoad={() => setFrameReady(true)}
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center text-center px-4"
                style={{
                  background: `linear-gradient(135deg, ${KEBU.black}, ${KEBU.orange})`,
                  color: KEBU.white,
                }}
              >
                <p className="font-bold text-sm" style={{ fontFamily: "var(--font-fraunces)" }}>
                  {project.title}
                </p>
              </div>
            )}
          </div>
        </div>

        <Link
          href={`/create/${project.id}`}
          className="absolute inset-0 z-[4]"
          aria-label={`Edit ${project.title}`}
        />
      </div>

      <div className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: published ? "rgba(0,200,81,0.15)" : "rgba(0,0,0,0.06)",
              color: published ? "#009E40" : KEBU.muted,
            }}
          >
            {published ? "Live" : "Draft"}
          </span>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: KEBU.muted }}>
            {project.project_type}
          </span>
          <span className="text-[10px] ml-auto" style={{ color: KEBU.muted }}>
            Updated {new Date(project.updated_at).toLocaleDateString()}
          </span>
        </div>
        {src ? (
          <p className="text-xs font-mono truncate" style={{ color: KEBU.muted }}>
            {live ?? src.replace("?embed=1", "")}
          </p>
        ) : (
          <p className="text-xs" style={{ color: KEBU.muted }}>
            Set a site address to get a live preview URL.
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href={`/create/${project.id}`}
            className="rounded-full px-4 py-2 text-xs font-bold text-white"
            style={{ background: KEBU.black }}
          >
            Edit site
          </Link>
          <Link
            href={`/create/sites/${project.id}`}
            className="rounded-full px-4 py-2 text-xs font-bold"
            style={{ background: KEBU.orange, color: KEBU.white }}
          >
            Domain &amp; SEO
          </Link>
          {live ? (
            <a
              href={live}
              target="_blank"
              rel="noreferrer"
              className="rounded-full px-4 py-2 text-xs font-bold border"
              style={{ borderColor: KEBU.border }}
            >
              Open live
            </a>
          ) : src ? (
            <a
              href={src.replace("?embed=1", "")}
              target="_blank"
              rel="noreferrer"
              className="rounded-full px-4 py-2 text-xs font-bold border"
              style={{ borderColor: KEBU.border }}
            >
              Full preview
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function MySitesGrid({
  projects,
  compact = false,
}: {
  projects: MySiteProject[];
  /** Smaller header when embedded on /create hub */
  compact?: boolean;
}) {
  const [globalDevice, setGlobalDevice] = useState<Device>("desktop");

  return (
    <div className={compact ? "" : "max-w-6xl mx-auto px-4 sm:px-6 py-10"}>
      <div className={`flex flex-wrap items-end justify-between gap-4 ${compact ? "mb-4" : "mb-8"}`}>
        <div>
          {!compact ? (
            <>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: KEBU.orange }}>
                Builder
              </p>
              <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
                My sites
              </h1>
              <p className="text-sm mt-2 max-w-xl" style={{ color: KEBU.muted }}>
                Live visual preview of each site — desktop, tablet, or mobile.
              </p>
            </>
          ) : (
            <h2 className="text-lg font-bold">My sites</h2>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DeviceToggle value={globalDevice} onChange={setGlobalDevice} />
          {!compact ? (
            <>
              <Link
                href="/create/domains"
                className="inline-flex rounded-full px-5 py-2.5 text-sm font-bold border"
                style={{ borderColor: KEBU.border }}
              >
                Domains
              </Link>
              <Link
                href="/create/new"
                className="inline-flex rounded-full px-5 py-2.5 text-sm font-bold text-white"
                style={{ background: KEBU.orange }}
              >
                + New site
              </Link>
            </>
          ) : (
            <Link href="/create/sites" className="text-sm font-bold underline" style={{ color: KEBU.orange }}>
              View all →
            </Link>
          )}
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-black/15 p-12 text-center bg-white">
          <p className="text-lg font-semibold mb-2">No sites yet</p>
          <p className="text-sm mb-6" style={{ color: KEBU.muted }}>
            Pick a template or start blank — your first site takes a few minutes.
          </p>
          <Link href="/create/new" className="font-bold underline" style={{ color: KEBU.orange }}>
            Create your first site
          </Link>
        </div>
      ) : (
        <div className={`grid gap-6 ${compact ? "sm:grid-cols-2" : "lg:grid-cols-2"}`}>
          {projects.map((p) => (
            <SitePreviewCard key={p.id} project={p} device={globalDevice} hideLocalToggle />
          ))}
        </div>
      )}
    </div>
  );
}
