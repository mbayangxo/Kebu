"use client";

import Link from "next/link";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { kebuSitePreviewPath, liveSiteUrl } from "@/lib/create/site-urls";
import { KEBU } from "@/lib/kebu-brand";
import { MY_SITES_HREF, mySiteDetailHref } from "@/lib/navigation/product-nav";
import { UploadAestheticButton } from "@/app/components/create/upload-aesthetic-button";

export type MySiteProject = {
  id: string;
  title: string;
  status: string;
  subdomain?: string | null;
  project_type: string;
  updated_at: string;
  published_at?: string | null;
};

export type MySitesFilter = "all" | "live" | "draft";

export function isSitePublished(p: MySiteProject): boolean {
  return Boolean(p.published_at) || p.status === "published" || p.status === "live";
}

type Device = "desktop" | "tablet" | "mobile";

const DEVICES: {
  id: Device;
  label: string;
  width: number;
  height: number;
  radius: number;
}[] = [
  { id: "desktop", label: "Desktop", width: 1280, height: 800, radius: 10 },
  { id: "tablet", label: "Tablet", width: 768, height: 1024, radius: 14 },
  { id: "mobile", label: "Phone", width: 390, height: 844, radius: 20 },
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

/** One device preview inside the site card — switch Desktop / Tablet / Phone in-frame. */
function InCardDevicePreview({
  src,
  title,
  device,
  onDevice,
  onFrameLoad,
  onFrameError,
  active,
  tall,
}: {
  src: string | null;
  title: string;
  device: Device;
  onDevice: (d: Device) => void;
  onFrameLoad: (ms: number) => void;
  onFrameError: () => void;
  active: boolean;
  /** Live sites get a slightly taller preview. */
  tall: boolean;
}) {
  const spec = DEVICES.find((d) => d.id === device) ?? DEVICES[0]!;
  const shellRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.18);
  const [ready, setReady] = useState(false);
  const startRef = useRef<number | null>(null);
  const chromeH = device === "desktop" ? 22 : 12;
  const slotH = tall ? 200 : 148;

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight - chromeH;
      if (w <= 0 || h <= 0) return;
      setScale(Math.min(w / spec.width, h / spec.height));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [spec.width, spec.height, chromeH, slotH]);

  useEffect(() => {
    setReady(false);
    startRef.current = null;
  }, [src, device]);

  return (
    <div className="w-full">
      <div
        className="mb-2 flex items-center justify-center gap-0.5 rounded-md p-0.5"
        style={{ background: "rgba(0,0,0,0.06)" }}
        role="group"
        aria-label="Preview device"
      >
        {DEVICES.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDevice(d.id);
            }}
            className="rounded px-2 py-1 text-[9px] font-bold uppercase tracking-wider"
            style={{
              background: device === d.id ? "#fff" : "transparent",
              color: device === d.id ? KEBU.black : KEBU.muted,
              boxShadow: device === d.id ? "0 0 0 1px rgba(0,0,0,0.08)" : "none",
            }}
            aria-pressed={device === d.id}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div
        ref={shellRef}
        className="relative mx-auto w-full overflow-hidden bg-white"
        style={{
          height: slotH,
          maxWidth: device === "mobile" ? 120 : device === "tablet" ? 160 : "100%",
          borderRadius: spec.radius,
          border: `1.5px solid ${KEBU.black}`,
        }}
      >
        {device === "desktop" ? (
          <div
            className="flex items-center gap-1 px-2"
            style={{ height: chromeH, background: "#F3F0EB", borderBottom: `1px solid ${KEBU.border}` }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF5F57]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#FEBC2E]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#28C840]" />
            <span
              className="ml-1 flex-1 truncate rounded-sm px-1 text-[6px]"
              style={{ background: "#fff", color: KEBU.muted, lineHeight: `${chromeH - 8}px` }}
            >
              {title}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center" style={{ height: chromeH }}>
            <span className="h-0.5 w-8 rounded-full bg-black/20" aria-hidden />
          </div>
        )}

        <div className="relative overflow-hidden" style={{ height: slotH - chromeH }}>
          {!ready && active && src ? (
            <div className="absolute inset-0 z-[1] flex items-center justify-center bg-white/80">
              <div
                className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
                style={{ borderColor: `${KEBU.orange}55`, borderTopColor: KEBU.orange }}
              />
            </div>
          ) : null}

          {active && src ? (
            <iframe
              key={`${src}-${device}`}
              src={src}
              title={`${title} ${spec.label} preview`}
              className="absolute left-1/2 top-0 border-0 origin-top bg-white pointer-events-none"
              style={{
                width: spec.width,
                height: spec.height,
                transform: `translateX(-50%) scale(${scale})`,
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
              className="absolute inset-0 flex items-center justify-center px-2 text-center"
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

function SiteHealthCard({
  project,
  size,
}: {
  project: MySiteProject;
  size: "live" | "draft";
}) {
  const published = isSitePublished(project);
  const src = useMemo(() => previewSrc(project), [project]);
  const live = liveSiteUrl(project.subdomain);
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [device, setDevice] = useState<Device>("desktop");
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
            message: `Page returned ${res.status}.`,
          });
          return;
        }
        setHealth({
          status: ms >= 2000 ? "slow" : "ok",
          loadMs: ms,
          httpStatus: res.status,
          message: ms >= 2000 ? `Responded in ${speedLabel(ms)} — a bit slow.` : `Responded in ${speedLabel(ms)}.`,
        });
      } catch {
        if (cancelled) return;
        setHealth({
          status: "fail",
          loadMs: null,
          httpStatus: null,
          message: "Could not reach this preview.",
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
      return {
        status: worst >= 2500 ? "slow" : "ok",
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
      message: "Preview failed to load.",
    });
  }, []);

  const tone = healthTone(health.status);
  const isLive = size === "live";

  return (
    <article
      ref={hostRef}
      className="flex h-full flex-col overflow-hidden rounded-xl bg-white"
      style={{
        border: `1px solid ${KEBU.border}`,
        boxShadow: isLive ? "0 6px 20px rgba(10,10,10,0.07)" : "0 2px 10px rgba(10,10,10,0.04)",
      }}
    >
      <div
        className="flex items-center justify-between gap-2 px-3 py-2"
        style={{ background: isLive ? KEBU.cream : "#FAFAFA", borderBottom: `1px solid ${KEBU.border}` }}
      >
        <div className="min-w-0 flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: published ? "#00C851" : KEBU.orange }}
            aria-hidden
          />
          <h3
            className={`truncate font-bold ${isLive ? "text-sm" : "text-xs"}`}
            style={{ color: KEBU.black, fontFamily: "var(--font-fraunces)" }}
          >
            {project.title}
          </h3>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider"
          style={{
            background: published ? "rgba(0,200,81,0.15)" : "rgba(0,0,0,0.06)",
            color: published ? "#009E40" : KEBU.muted,
          }}
        >
          {published ? "Live" : "Draft"}
        </span>
      </div>

      <div
        className="flex-1 px-3 pt-2 pb-1"
        style={{ background: "linear-gradient(180deg, #EDE9E3 0%, #E2DDD4 100%)" }}
      >
        <InCardDevicePreview
          src={src}
          title={project.title}
          device={device}
          onDevice={setDevice}
          active={visible}
          tall={isLive}
          onFrameLoad={onFrameLoad}
          onFrameError={onFrameError}
        />
      </div>

      <div className="mt-auto space-y-2 px-3 py-2.5" style={{ borderTop: `1px solid ${KEBU.border}` }}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider"
            style={{ background: tone.bg, color: tone.color }}
          >
            {tone.label}
          </span>
          <span className="text-[9px] tabular-nums" style={{ color: KEBU.muted }}>
            {speedLabel(health.loadMs)}
          </span>
          <span className="truncate text-[9px] font-mono" style={{ color: KEBU.muted }}>
            {live?.replace(/^https?:\/\//, "") ?? "Not published"}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={`/create/${project.id}`}
            className="rounded-full px-3 py-1.5 text-[10px] font-bold text-white"
            style={{ background: KEBU.black }}
          >
            Edit
          </Link>
          <Link
            href={mySiteDetailHref(project.id)}
            className="rounded-full px-3 py-1.5 text-[10px] font-bold"
            style={{ background: KEBU.cream, color: KEBU.black, border: `1px solid ${KEBU.border}` }}
          >
            Detail
          </Link>
          {live ? (
            <a
              href={live}
              target="_blank"
              rel="noreferrer"
              className="rounded-full px-3 py-1.5 text-[10px] font-bold text-white"
              style={{ background: KEBU.orange }}
            >
              Open live
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** @deprecated Prefer SiteHealthCard — kept for any external imports */
export function SitePreviewCard({ project }: { project: MySiteProject }) {
  return <SiteHealthCard project={project} size={isSitePublished(project) ? "live" : "draft"} />;
}

export function MySitesGrid({
  projects,
  compact = false,
  initialFilter = "all",
}: {
  projects: MySiteProject[];
  compact?: boolean;
  initialFilter?: MySitesFilter;
}) {
  const [filter, setFilter] = useState<MySitesFilter>(initialFilter);

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  const liveSites = useMemo(() => projects.filter(isSitePublished), [projects]);
  const draftSites = useMemo(() => projects.filter((p) => !isSitePublished(p)), [projects]);
  const liveCount = liveSites.length;
  const draftCount = draftSites.length;

  const filterHref = (id: MySitesFilter) => (id === "all" ? MY_SITES_HREF : `${MY_SITES_HREF}?filter=${id}`);

  function renderGrid(list: MySiteProject[], size: "live" | "draft") {
    if (list.length === 0) return null;
    return (
      <div
        className={
          size === "live"
            ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2"
            : "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        {list.map((p) => (
          <SiteHealthCard key={p.id} project={p} size={size} />
        ))}
      </div>
    );
  }

  return (
    <div className={compact ? "" : "w-full px-5 py-8 sm:px-8 lg:px-16"}>
      <div className={`flex flex-wrap items-center justify-between gap-4 ${compact ? "mb-4" : "mb-6"}`}>
        <div>
          {!compact ? (
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
              My sites
            </h1>
          ) : (
            <h2 className="text-lg font-bold">Recent sites</h2>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!compact ? (
            <>
              <Link
                href="/create/aesthetics"
                className="inline-flex rounded-full border px-5 py-2.5 text-sm font-bold"
                style={{ borderColor: KEBU.border }}
              >
                Aesthetic Gallery
              </Link>
              <UploadAestheticButton
                sites={projects.map((p) => ({ id: p.id, title: p.title || "Untitled site" }))}
              />
              <Link
                href="/create/domains"
                className="inline-flex rounded-full border px-5 py-2.5 text-sm font-bold"
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
            <Link href={MY_SITES_HREF} className="text-sm font-bold underline" style={{ color: KEBU.orange }}>
              My sites →
            </Link>
          )}
        </div>
      </div>

      {!compact ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {(
            [
              ["all", `All (${projects.length})`],
              ["live", `Live (${liveCount})`],
              ["draft", `Drafts (${draftCount})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className="rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: filter === id ? KEBU.black : KEBU.white,
                color: filter === id ? KEBU.white : KEBU.black,
                border: filter === id ? "none" : `1px solid ${KEBU.border}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {projects.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-black/15 bg-white p-12 text-center">
          <p className="mb-2 text-lg font-semibold">No sites yet</p>
          <p className="mb-6 text-sm" style={{ color: KEBU.muted }}>
            Start in Builder — your draft appears here automatically. Publish when you are ready to go live.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/create/new" className="font-bold underline" style={{ color: KEBU.orange }}>
              + New site
            </Link>
            <Link href="/create/aesthetics" className="font-bold underline" style={{ color: KEBU.black }}>
              Browse aesthetics
            </Link>
          </div>
        </div>
      ) : filter === "live" && liveCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center">
          <p className="mb-2 text-sm font-semibold">No live sites yet</p>
          <p className="mb-4 text-xs" style={{ color: KEBU.muted }}>
            Publish a draft from the editor to see it here.
          </p>
          <Link href={filterHref("draft")} className="text-sm font-bold underline" style={{ color: KEBU.orange }}>
            View drafts
          </Link>
        </div>
      ) : filter === "draft" && draftCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center">
          <p className="mb-2 text-sm font-semibold">No drafts</p>
          <p className="mb-4 text-xs" style={{ color: KEBU.muted }}>
            Everything here is published — or start a new site in Builder.
          </p>
          <Link href={filterHref("all")} className="text-sm font-bold underline" style={{ color: KEBU.orange }}>
            View all sites
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {(filter === "all" || filter === "live") && liveCount > 0 ? (
            <section>
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
                  Live
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                  {liveCount} site{liveCount === 1 ? "" : "s"}
                </span>
              </div>
              {renderGrid(liveSites, "live")}
            </section>
          ) : null}

          {(filter === "all" || filter === "draft") && draftCount > 0 ? (
            <section>
              <div
                className={`mb-3 flex items-baseline justify-between gap-2 ${filter === "all" && liveCount > 0 ? "border-t pt-8" : ""}`}
                style={filter === "all" && liveCount > 0 ? { borderColor: KEBU.border } : undefined}
              >
                <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
                  Drafts
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                  {draftCount} draft{draftCount === 1 ? "" : "s"}
                </span>
              </div>
              {renderGrid(draftSites, "draft")}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
