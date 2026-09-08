"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BackLink } from "@/app/components/back-link";
import { KebuMark } from "@/app/components/kebu-mark";
import { MY_SITES_HREF } from "@/lib/navigation/product-nav";
import { BUILDER } from "@/lib/create/builder-ui";
import type { BuilderDevice } from "@/lib/create/builder-device";

export type BuilderStudioTab = "content" | "pages" | "media" | "aesthetics" | "yande";

const RAIL: { id: BuilderStudioTab; label: string; icon: ReactNode }[] = [
  {
    id: "content",
    label: "Sections",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "pages",
    label: "Pages",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M6 4h8l4 4v12a1 1 0 01-1 1H6a1 1 0 01-1-1V5a1 1 0 011-1z" strokeLinejoin="round" />
        <path d="M14 4v4h4" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "media",
    label: "Media",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="10" r="1.4" fill="currentColor" stroke="none" />
        <path d="M21 16l-5.5-5.5L8 18" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "aesthetics",
    label: "Aesthetics",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3v3M12 18v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M3 12h3M18 12h3M4.9 19.1L7 17M17 7l2.1-2.1" strokeLinecap="round" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
  {
    id: "yande",
    label: "Yande",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3l1.6 5.2L19 10l-5.4 1.8L12 17l-1.6-5.2L5 10l5.4-1.8L12 3z" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function BuilderStudioRail({
  railTab,
  panelOpen,
  onRail,
  extras,
}: {
  railTab: BuilderStudioTab;
  panelOpen: boolean;
  onRail: (tab: BuilderStudioTab) => void;
  extras?: ReactNode;
}) {
  return (
    <div
      className="flex w-12 shrink-0 flex-col items-center gap-1 border-r py-2"
      style={{ borderColor: BUILDER.border, background: "#fff" }}
      role="toolbar"
      aria-label="Builder tools"
    >
      {RAIL.map((item) => {
        const on = panelOpen && railTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            aria-label={item.label}
            aria-pressed={on}
            onClick={() => onRail(item.id)}
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: on ? BUILDER.ink : "transparent",
              color: on ? "#fff" : BUILDER.muted,
            }}
          >
            {item.icon}
          </button>
        );
      })}
      {extras ? <div className="mt-auto flex flex-col items-center gap-1 px-1 pb-2">{extras}</div> : null}
    </div>
  );
}

export function BuilderStudioChrome({
  projectId,
  title,
  saveLabel,
  draftLabel,
  device,
  onDevice,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  publishing,
  publishLabel,
  onPublish,
  /** Hide device switcher — canvas already fills the pane. */
  minimal = false,
  /**
   * Float over the site instead of a solid top bar (flagship May Lecor / K-Direction).
   * Keeps one site nav only — no second black/white editor strip.
   */
  floating = false,
}: {
  projectId: string;
  title: string;
  saveLabel: string;
  draftLabel?: string;
  device: BuilderDevice;
  onDevice: (d: BuilderDevice) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  publishing: boolean;
  publishLabel: string;
  onPublish: () => void;
  minimal?: boolean;
  floating?: boolean;
}) {
  if (floating) {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[80] flex items-start justify-between gap-2 p-2 sm:p-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
          <BackLink fallbackHref={MY_SITES_HREF} label="Back" variant="strong" />
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md"
            style={{ background: "rgba(255,255,255,0.92)", color: BUILDER.ink, border: `1px solid ${BUILDER.border}` }}
          >
            {title}
          </span>
          {saveLabel ? (
            <span className="hidden rounded-full px-2 py-1 text-[9px] text-black/55 backdrop-blur-md sm:inline" style={{ background: "rgba(255,255,255,0.85)" }}>
              {saveLabel}
            </span>
          ) : null}
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold disabled:opacity-30 backdrop-blur-md"
            style={{ background: "rgba(255,255,255,0.92)", color: BUILDER.ink }}
          >
            Undo
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold disabled:opacity-30 backdrop-blur-md"
            style={{ background: "rgba(255,255,255,0.92)", color: BUILDER.ink }}
          >
            Redo
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={publishing}
            className="rounded-full px-3.5 py-1.5 text-[10px] font-bold disabled:opacity-50"
            style={{ background: "#FF5500", color: "#fff" }}
          >
            {publishing ? "…" : publishLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
      <header
        className="flex h-11 shrink-0 items-center gap-3 border-b px-3"
        style={{ borderColor: BUILDER.border, background: "#fff" }}
      >
        <BackLink fallbackHref={MY_SITES_HREF} label="Back" variant="strong" />
        <span className="h-4 w-px shrink-0" style={{ background: BUILDER.border }} aria-hidden />
        <Link href="/create" className="flex min-w-0 items-center gap-2" style={{ color: BUILDER.ink }}>
          <KebuMark size={22} />
          <span className="truncate text-sm font-semibold">{title}</span>
        </Link>
        {draftLabel ? (
          <span
            className="hidden rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider sm:inline"
            style={{ background: "#F4F4F5", color: BUILDER.muted }}
          >
            {draftLabel}
          </span>
        ) : null}
        <span className="hidden text-[10px] sm:inline" style={{ color: BUILDER.faint }}>
          {saveLabel}
        </span>

        {!minimal ? (
        <div className="mx-auto hidden items-center gap-0.5 rounded-full p-0.5 md:flex" style={{ background: "#F4F4F5" }}>
          {(["desktop", "tablet", "mobile"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onDevice(id)}
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: device === id ? BUILDER.ink : "transparent",
                color: device === id ? "#fff" : BUILDER.muted,
              }}
              aria-pressed={device === id}
            >
              {id === "desktop" ? "Desktop" : id === "tablet" ? "Tablet" : "Phone"}
            </button>
          ))}
        </div>
        ) : (
          <div className="mx-auto" />
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="rounded-md px-2 py-1 text-[11px] font-semibold disabled:opacity-30"
            style={{ color: BUILDER.ink }}
          >
            Undo
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="rounded-md px-2 py-1 text-[11px] font-semibold disabled:opacity-30"
            style={{ color: BUILDER.ink }}
          >
            Redo
          </button>
          {!minimal ? (
          <Link
            href={`/create/${projectId}/preview`}
            className="hidden rounded-full px-3 py-1.5 text-[11px] font-semibold sm:inline"
            style={{ color: BUILDER.ink, border: `1px solid ${BUILDER.border}` }}
          >
            Preview
          </Link>
          ) : null}
          <button
            type="button"
            onClick={onPublish}
            disabled={publishing}
            className="rounded-full px-4 py-1.5 text-[11px] font-bold disabled:opacity-50"
            style={{ background: BUILDER.ink, color: "#fff" }}
          >
            {publishing ? "…" : publishLabel}
          </button>
        </div>
      </header>
  );
}
