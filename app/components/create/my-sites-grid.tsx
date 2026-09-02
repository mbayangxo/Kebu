"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const DEVICES: {
  id: Device;
  label: string;
  width: number;
  height: number;
  radius: number;
  flex: string;
}[] = [
  { id: "desktop", label: "Desktop", width: 1280, height: 800, radius: 10, flex: "1 1 42%" },
  { id: "tablet", label: "Tablet", width: 768, height: 1024, radius: 16, flex: "1 1 28%" },
  { id: "mobile", label: "Mobile", width: 390, height: 844, radius: 24, flex: "0 0 140px" },
];

type HealthState = {
  status: "checking" | "ok" | "slow" | "fail" | "missing";
  loadMs: number | null;
  httpStatus: number | null;
  message: string;
};

function previewSrc(p: MySiteProject): string | null {
  if (p.subdomain?.trim()) {
    return kebuSitePreviewPath(p.subdomain) ?? `/sites/${p.subdomain.trim().toLowerCase()}`;
  }
  return `/create/${p.id}/preview?embed=1`;
}

function speedLabel(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function healthTone(status: HealthState["status"]): { bg: string; color: string; label: string } {
  switch (status) {
    case "ok":
      return { bg: "rgba(0,200,81,0.15)", color: "#009E40", label: "Healthy" };
    case "slow":
      return { bg: "rgba(255,85,0,0.15)", color: "#C2410C", label: "Slow" };
    case "fail":
      return { bg: "#FFF1F0", color: "#8B1E1E", label: "Failing" };
    case "missing":
      return { bg: "rgba(0,0,0,0.06)", color: KEBU.muted, label: "No preview" };
    default:
      return { bg: "rgba(0,0,0,0.06)", color: KEBU.muted, label: "Checking…" };
  }
}

/** One device frame — iframe at real device size, scaled to fit the card slot (contain). */
function DeviceFrame({
  device,
  src,
  title,
  onFrameLoad,
  onFrameError,
  active,
}: {
  device: (typeof DEVICES)[number];
  src: string | null;
  title: string;
  onFrameLoad: (ms: number) => void;
  onFrameError: () => void;
  active: boolean;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);
  const [ready, setReady] = useState(false);
  const startRef = useRef<number | null>(null);

  const chromeH = device.id === "desktop" ? 28 : 14;

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      // Fit the full device viewport into the slot width (realistic, never overflow the frame).
      setScale(w / device.width);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [device.width]);

  useEffect(() => {
    setReady(false);
    startRef.current = null;
  }, [src, device.id]);

  const viewH = Math.round(device.height * scale);

  return (
    <div
      className="flex flex-col min-w-0"
      style={{
        flex: device.flex,
        maxWidth: device.id === "mobile" ? 168 : device.id === "tablet" ? 280 : undefined,
        minWidth: device.id === "desktop" ? 200 : device.id === "tablet" ? 160 : 120,
      }}
    >
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] mb-1.5 text-center" style={{ color: KEBU.muted }}>
        {device.label}
        <span className="normal-case tracking-normal font-medium opacity-70"> · {device.width}px</span>
      </p>
      <div
        ref={shellRef}
        className="relative w-full overflow-hidden bg-white shadow-md"
        style={{
          height: viewH + chromeH,
          borderRadius: device.radius,
          border: `2px solid ${KEBU.black}`,
          background: "#fff",
          aspectRatio: undefined,
        }}
      >
        {device.id === "desktop" ? (
          <div
            className="flex items-center gap-1 px-2"
            style={{ height: chromeH, background: "#F3F0EB", borderBottom: `1px solid ${KEBU.border}` }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF5F57]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FEBC2E]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#28C840]" />
            <span
              className="ml-2 flex-1 rounded-sm px-1.5 text-[7px] truncate"
              style={{ background: "#fff", color: KEBU.muted, lineHeight: `${chromeH - 10}px` }}
            >
              {title}
            </span>
          </div>
        ) : (
          <div className="flex justify-center items-center" style={{ height: chromeH }}>
            <span className="w-10 h-1 rounded-full bg-black/20" aria-hidden />
          </div>
        )}

        <div className="relative overflow-hidden" style={{ height: viewH, width: "100%" }}>
          {!ready && active && src ? (
            <div className="absolute inset-0 z-[1] flex items-center justify-center bg-white/80">
              <div
                className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${KEBU.orange}55`, borderTopColor: KEBU.orange }}
              />
            </div>
          ) : null}

          {active && src ? (
            <iframe
              key={`${src}-${device.id}`}
              src={src}
              title={`${title} ${device.label} preview`}
              className="absolute top-0 left-0 border-0 origin-top-left pointer-events-none bg-white"
              style={{
                width: device.width,
                height: device.height,
                transform: `scale(${scale})`,
                opacity: ready ? 1 : 0,
              }}
              tabIndex={-1}
              loading="lazy"
              onLoad={() => {
                const started = startRef.current ?? performance.now();
                const ms = Math.max(0, Math.round(performance.now() - started));
                setReady(true);
                onFrameLoad(ms);
              }}
              onError={() => {
                setReady(false);
                onFrameError();
              }}
              ref={(node) => {
                if (node && startRef.current == null) startRef.current = performance.now();
              }}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center text-center px-2"
              style={{ background: `linear-gradient(135deg, ${KEBU.black}, ${KEBU.orange})`, color: "#fff" }}
            >
              <p className="text-[10px] font-bold">{title}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SiteHealthCard({ project }: { project: MySiteProject }) {
  const published = Boolean(project.published_at) || project.status === "published";
  const src = useMemo(() => previewSrc(project), [project]);
  const live = liveSiteUrl(project.subdomain);
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [health, setHealth] = useState<HealthState>({
    status: src ? "checking" : "missing",
    loadMs: null,
    httpStatus: null,
    message: src ? "Checking how this site loads…" : "Set a site address to preview.",
  });
  const frameLoads = useRef<number[]>([]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Probe the live URL for HTTP status + TTFB (same-origin).
  useEffect(() => {
    if (!visible || !src) return;
    let cancelled = false;
    const started = performance.now();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);

    (async () => {
      try {
        const res = await fetch(src, {
          credentials: "include",
          signal: controller.signal,
          cache: "no-store",
        });
        if (cancelled) return;
        const ms = Math.round(performance.now() - started);
        if (!res.ok) {
          setHealth({
            status: "fail",
            loadMs: ms,
            httpStatus: res.status,
            message: `Page returned ${res.status}. Open the editor and fix broken pages or publish again.`,
          });
          return;
        }
        if (ms >= 3500) {
          setHealth({
            status: "slow",
            loadMs: ms,
            httpStatus: res.status,
            message: `Took ${speedLabel(ms)} to respond — compress images, remove heavy embeds, or publish a lighter home page.`,
          });
          return;
        }
        setHealth((prev) => ({
          status: prev.status === "fail" ? "fail" : ms >= 2000 ? "slow" : "ok",
          loadMs: prev.loadMs != null ? Math.max(prev.loadMs, ms) : ms,
          httpStatus: res.status,
          message:
            ms >= 2000
              ? `Server responded in ${speedLabel(ms)}. Still a bit slow for mobile networks — tighten media.`
              : `Responded in ${speedLabel(ms)}. Looking good.`,
        }));
      } catch {
        if (cancelled) return;
        setHealth({
          status: "fail",
          loadMs: null,
          httpStatus: null,
          message: "Could not reach this preview. Check publish status, subdomain, or try again.",
        });
      } finally {
        window.clearTimeout(timeout);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [visible, src]);

  const onFrameLoad = useCallback((ms: number) => {
    frameLoads.current.push(ms);
    const worst = Math.max(...frameLoads.current);
    setHealth((prev) => {
      if (prev.status === "fail") return prev;
      if (worst >= 5000) {
        return {
          status: "slow",
          loadMs: worst,
          httpStatus: prev.httpStatus,
          message: `Preview painted in ${speedLabel(worst)} — heavy for visitors on slow data. Compress images and trim scripts.`,
        };
      }
      if (worst >= 2500 || prev.status === "slow") {
        return {
          status: "slow",
          loadMs: Math.max(prev.loadMs ?? 0, worst),
          httpStatus: prev.httpStatus,
          message: prev.message.includes("slow")
            ? prev.message
            : `Preview took ${speedLabel(worst)}. Fine-tune images for Africa mobile speeds.`,
        };
      }
      return {
        status: "ok",
        loadMs: Math.max(prev.loadMs ?? 0, worst),
        httpStatus: prev.httpStatus ?? 200,
        message: `Preview ready in ${speedLabel(worst)}.`,
      };
    });
  }, []);

  const onFrameError = useCallback(() => {
    setHealth({
      status: "fail",
      loadMs: null,
      httpStatus: null,
      message: "Preview failed to load in the frame. Fix the site in the editor, then refresh.",
    });
  }, []);

  // iframe never finished
  useEffect(() => {
    if (!visible || !src) return;
    const t = window.setTimeout(() => {
      setHealth((prev) => {
        if (prev.status === "ok" || prev.status === "slow" || prev.status === "fail") return prev;
        return {
          status: "fail",
          loadMs: prev.loadMs,
          httpStatus: prev.httpStatus,
          message: "Preview timed out (12s+). The page may be broken or too heavy — open editor and check.",
        };
      });
    }, 12000);
    return () => window.clearTimeout(t);
  }, [visible, src]);

  const tone = healthTone(health.status);

  return (
    <article
      ref={hostRef}
      className="rounded-2xl overflow-hidden bg-white"
      style={{ border: `1px solid ${KEBU.border}`, boxShadow: "0 8px 28px rgba(10,10,10,0.06)" }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        style={{ background: KEBU.cream, borderBottom: `1px solid ${KEBU.border}` }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="shrink-0 w-2 h-2 rounded-full"
              style={{ background: published ? "#00C851" : KEBU.orange }}
              aria-hidden
            />
            <h3 className="text-sm font-bold truncate" style={{ color: KEBU.black, fontFamily: "var(--font-fraunces)" }}>
              {project.title}
            </h3>
          </div>
          <p className="text-[10px] font-mono mt-0.5 truncate" style={{ color: KEBU.muted }}>
            {live ?? src?.replace("?embed=1", "") ?? "No public path yet"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider"
            style={{ background: published ? "rgba(0,200,81,0.15)" : "rgba(0,0,0,0.06)", color: published ? "#009E40" : KEBU.muted }}
          >
            {published ? "Live" : "Draft"}
          </span>
          <span
            className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider"
            style={{ background: tone.bg, color: tone.color }}
          >
            {tone.label}
          </span>
          <span
            className="rounded-full px-2.5 py-1 text-[9px] font-bold tabular-nums"
            style={{ background: KEBU.white, border: `1px solid ${KEBU.border}`, color: KEBU.black }}
            title="How long this site took to respond / paint"
          >
            Load {speedLabel(health.loadMs)}
          </span>
        </div>
      </div>

      {/* Desktop · Tablet · Mobile — tap Open detail for full analytics */}
      <Link
        href={`/create/sites/${project.id}`}
        className="block w-full"
        aria-label={`Open detail and analytics for ${project.title}`}
      >
      <div
        className="flex flex-wrap sm:flex-nowrap items-end gap-3 sm:gap-4 p-4 overflow-x-auto"
        style={{ background: "linear-gradient(180deg, #EDE9E3 0%, #D9D3C9 100%)" }}
      >
        {DEVICES.map((d) => (
          <DeviceFrame
            key={d.id}
            device={d}
            src={src}
            title={project.title}
            active={visible}
            onFrameLoad={onFrameLoad}
            onFrameError={onFrameError}
          />
        ))}
      </div>
      </Link>

      <div className="px-4 py-3 space-y-3" style={{ borderTop: `1px solid ${KEBU.border}` }}>
        <p
          className="text-[11px] leading-relaxed rounded-lg px-3 py-2"
          style={{
            background: health.status === "fail" ? "#FFF1F0" : health.status === "slow" ? "rgba(255,85,0,0.08)" : KEBU.cream,
            color: health.status === "fail" ? "#8B1E1E" : KEBU.black,
          }}
          role="status"
        >
          {health.message}
          {health.httpStatus && health.httpStatus >= 400 ? ` (HTTP ${health.httpStatus})` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/create/sites/${project.id}`}
            className="rounded-full px-4 py-2 text-xs font-bold text-white"
            style={{ background: KEBU.orange }}
          >
            Open detail · Analytics
          </Link>
          <Link
            href={`/create/${project.id}`}
            className="rounded-full px-4 py-2 text-xs font-bold text-white"
            style={{ background: KEBU.black }}
          >
            {health.status === "fail" || health.status === "slow" ? "Fix in editor" : "Edit site"}
          </Link>
          <Link
            href={`/create/sites/${project.id}#domain`}
            className="rounded-full px-4 py-2 text-xs font-bold"
            style={{ background: KEBU.cream, color: KEBU.black, border: `1px solid ${KEBU.border}` }}
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

/** @deprecated Prefer SiteHealthCard — kept for any external imports */
export function SitePreviewCard({ project }: { project: MySiteProject }) {
  return <SiteHealthCard project={project} />;
}

export function MySitesGrid({
  projects,
  compact = false,
}: {
  projects: MySiteProject[];
  compact?: boolean;
}) {
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
                Build and edit in the visual editor. Connect your own domain and SEO from each site card — separate from
                building.
              </p>
            </>
          ) : (
            <h2 className="text-lg font-bold">My sites</h2>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
        <div className="space-y-6">
          {projects.map((p) => (
            <SiteHealthCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
