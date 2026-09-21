"use client";

import Link from "next/link";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { kebuSitePreviewPath, liveSiteUrl } from "@/lib/create/site-urls";
import { KEBU } from "@/lib/kebu-brand";
import { MY_SITES_HREF, mySiteDetailHref } from "@/lib/navigation/product-nav";

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

function previewSrc(p: MySiteProject): string | null {
  if (!isSitePublished(p)) {
    return `/create/${p.id}/preview?embed=1`;
  }
  if (p.subdomain?.trim()) {
    return kebuSitePreviewPath(p.subdomain) ?? `/sites/${p.subdomain.trim().toLowerCase()}`;
  }
  return `/create/${p.id}/preview?embed=1`;
}

function SiteHealthCard({
  project,
  size,
  onDeleted,
}: {
  project: MySiteProject;
  size: "live" | "draft";
  onDeleted?: (id: string) => void;
}) {
  const router = useRouter();
  const published = isSitePublished(project);
  const src = useMemo(() => previewSrc(project), [project]);
  const live = liveSiteUrl(project.subdomain);
  const hostRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [frameReady, setFrameReady] = useState(false);
  const [scale, setScale] = useState(0.22);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    const el = shellRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w > 0) setScale(Math.min(0.38, w / 1280));
  }, [visible]);

  const handlePublish = useCallback(async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/publish`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) router.refresh();
    } finally {
      setPublishing(false);
    }
  }, [project.id, publishing, router]);

  const handleDelete = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        onDeleted?.(project.id);
        router.refresh();
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }, [project.id, deleting, onDeleted, router]);

  const isLive = size === "live";
  const slotH = 170;

  return (
    <article
      ref={hostRef}
      className="group flex h-full flex-col overflow-hidden rounded-[18px] bg-white transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(10,10,10,.07)]"
      style={{
        border: `1px solid ${KEBU.border}`,
        boxShadow: "0 2px 12px rgba(10,10,10,0.035)",
      }}
    >
      {/* Card header — links to site detail */}
      <Link
        href={mySiteDetailHref(project.id)}
        className="flex items-center justify-between gap-2 px-3 py-2 transition-colors hover:bg-black/[0.02]"
        style={{
          background: isLive ? KEBU.cream : "#FAFAFA",
          borderBottom: `1px solid ${KEBU.border}`,
        }}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: published ? "#00C851" : KEBU.orange }}
            aria-hidden
          />
          <h3
            className="truncate text-[13px] font-black"
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
      </Link>

      {/* Preview thumbnail — desktop only, lazy */}
      <div
        ref={shellRef}
        className="relative overflow-hidden"
        style={{ height: slotH, background: "#F5F4F2" }}
      >
        {visible && src ? (
          <>
            {!frameReady ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div
                  className="h-4 w-4 animate-spin rounded-full border-2"
                  style={{
                    borderColor: `${KEBU.orange}33`,
                    borderTopColor: KEBU.orange,
                  }}
                />
              </div>
            ) : null}
            <iframe
              key={src}
              src={src}
              title={`${project.title} preview`}
              className="absolute left-1/2 top-0 border-0 origin-top bg-white pointer-events-none"
              style={{
                width: 1280,
                height: 800,
                transform: `translateX(-50%) scale(${scale})`,
                opacity: frameReady ? 1 : 0,
                transition: "opacity 0.25s",
              }}
              tabIndex={-1}
              loading="lazy"
              onLoad={() => setFrameReady(true)}
              onError={() => setFrameReady(false)}
            />
          </>
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center px-4"
            style={{
              background: `linear-gradient(135deg, #0A0A0A 0%, #1C1C1C 70%, rgba(255,85,0,0.2) 100%)`,
            }}
          >
            <p
              className="text-center text-xs font-bold leading-tight text-white/80"
              style={{ fontFamily: "var(--font-fraunces)" }}
            >
              {project.title}
            </p>
          </div>
        )}
      </div>

      {/* Footer — actions */}
      <div
        className="mt-auto space-y-2 px-3 py-2.5"
        style={{ borderTop: `1px solid ${KEBU.border}` }}
      >
        {live ?? project.subdomain ? (
          <p className="truncate text-[9px] font-mono" style={{ color: KEBU.muted }}>
            {live ? live.replace(/^https?:\/\//, "") : `/sites/${project.subdomain}`}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={mySiteDetailHref(project.id)}
            className="rounded-full bg-black px-3 py-1.5 text-[9px] font-black uppercase tracking-wide text-white"
          >
            Open site
          </Link>

          <Link
            href={`/create/${project.id}`}
            className="rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wide"
            style={{ borderColor: KEBU.border, color: KEBU.black }}
          >
            Edit
          </Link>

          {live ? (
            <a
              href={live}
              target="_blank"
              rel="noreferrer"
              className="rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-wide"
              style={{ color: KEBU.orange }}
            >
              Visit ↗
            </a>
          ) : null}

          {!published ? (
            <button
              type="button"
              onClick={() => void handlePublish()}
              disabled={publishing}
              className="rounded-full px-3 py-1.5 text-[10px] font-bold disabled:opacity-60"
              style={{
                background: "rgba(0,200,81,0.1)",
                color: "#009E40",
                border: "1px solid rgba(0,200,81,0.25)",
              }}
            >
              {publishing ? "Publishing…" : "Publish"}
            </button>
          ) : null}

          <div className="flex-1" />

          {confirmDelete ? (
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="rounded-full px-2.5 py-1 text-[10px] font-bold text-white disabled:opacity-60"
                style={{ background: "#CC1A1A" }}
              >
                {deleting ? "…" : "Delete?"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-full px-1.5 py-1 text-[9px]"
                style={{ color: KEBU.muted }}
              >
                No
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded-full p-1.5 text-[10px] leading-none opacity-30 transition-opacity hover:opacity-70"
              style={{ color: KEBU.muted }}
              aria-label="Delete site"
            >
              ✕
            </button>
          )}
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
  const [query, setQuery] = useState("");
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  const visibleProjects = useMemo(
    () => projects.filter((p) => {
      if (removedIds.has(p.id)) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return [p.title, p.subdomain ?? "", p.project_type ?? "", p.status ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    }),
    [projects, removedIds, query],
  );

  const liveSites = useMemo(() => visibleProjects.filter(isSitePublished), [visibleProjects]);
  const draftSites = useMemo(
    () => visibleProjects.filter((p) => !isSitePublished(p)),
    [visibleProjects],
  );
  const liveCount = liveSites.length;
  const draftCount = draftSites.length;

  const filterHref = (id: MySitesFilter) =>
    id === "all" ? MY_SITES_HREF : `${MY_SITES_HREF}?filter=${id}`;

  const handleDeleted = useCallback((id: string) => {
    setRemovedIds((prev) => new Set([...prev, id]));
  }, []);

  function renderGrid(list: MySiteProject[], size: "live" | "draft") {
    if (list.length === 0) return null;
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((p, i) => (
          <div key={p.id} className="kebu-slide-in-up" style={{ animationDelay: `${i * 50}ms` }}>
            <SiteHealthCard project={p} size={size} onDeleted={handleDeleted} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={compact ? "" : "w-full px-5 py-8 sm:px-8 lg:px-16"}>
      <div className={compact ? "mb-4" : "mb-5"}>
        {compact ? (
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold" style={{ color: KEBU.black }}>Recent sites</h2>
            <Link href={MY_SITES_HREF} className="text-[12px] font-bold" style={{ color: KEBU.orange }}>View all →</Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  ["all", `All ${visibleProjects.length}`],
                  ["live", `Published ${liveCount}`],
                  ["draft", `Drafts ${draftCount}`],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className="rounded-full px-3 py-2 text-[10px] font-black"
                  style={{
                    background: filter === id ? KEBU.black : "transparent",
                    color: filter === id ? KEBU.white : KEBU.muted,
                    border: filter === id ? "1px solid #0A0A0A" : `1px solid ${KEBU.border}`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="flex min-h-10 min-w-[220px] items-center gap-2 rounded-full border bg-white px-3" style={{ borderColor: KEBU.border }}>
              <span className="text-black/30" aria-hidden>⌕</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search sites"
                className="min-w-0 flex-1 bg-transparent text-[11px] font-semibold outline-none placeholder:text-black/30"
              />
            </label>
          </div>
        )}
      </div>

      {visibleProjects.length === 0 ? (
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
        <div>
          {renderGrid(
            filter === "live" ? liveSites : filter === "draft" ? draftSites : visibleProjects,
            filter === "draft" ? "draft" : "live",
          )}
        </div>
      )}
    </div>
  );
}
