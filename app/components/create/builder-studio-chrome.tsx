"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { MY_SITES_HREF } from "@/lib/navigation/product-nav";
import { BUILDER } from "@/lib/create/builder-ui";
import type { BuilderDevice } from "@/lib/create/builder-device";

/**
 * Vertical rail — customize THIS site (Shopify theme-settings depth).
 * Aesthetic Gallery (/create/aesthetics) browses design worlds — not this rail tool.
 */
export type BuilderStudioTab =
  | "content"
  | "pages"
  | "layers"
  | "versions"
  | "aesthetic"
  | "media"
  | "nav"
  | "apps"
  | "seo";

const RAIL: { id: BuilderStudioTab; label: string; icon: ReactNode }[] = [
  {
    id: "content",
    label: "Build",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "pages",
    label: "Pages",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M6 4h8l4 4v12a1 1 0 01-1 1H6a1 1 0 01-1-1V5a1 1 0 011-1z" strokeLinejoin="round" />
        <path d="M14 4v4h4" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "layers",
    label: "Layers",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M12 3l8 4-8 4-8-4 8-4z" strokeLinejoin="round" />
        <path d="M4 12l8 4 8-4M4 17l8 4 8-4" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "versions",
    label: "History",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 12a8 8 0 108-8 8.5 8.5 0 00-6 2.5L4 8.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 4v4.5h4.5M12 8v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "aesthetic",
    label: "Design",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M12 3a9 9 0 100 18 4 4 0 010-8h2a3 3 0 100-6h-1" strokeLinejoin="round" />
        <circle cx="7.5" cy="10.5" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="10.5" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "media",
    label: "Assets",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="10" r="1.4" fill="currentColor" stroke="none" />
        <path d="M21 16l-5.5-5.5L8 18" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "nav",
    label: "Menu",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "apps",
    label: "Apps",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="4" y="4" width="6" height="6" rx="1.5" />
        <rect x="14" y="4" width="6" height="6" rx="1.5" />
        <rect x="4" y="14" width="6" height="6" rx="1.5" />
        <path d="M17 14v6M14 17h6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "seo",
    label: "SEO",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M15.5 15.5L20 20M7.5 10.5h6" strokeLinecap="round" />
      </svg>
    ),
  },
];

/** Vertical icon rail — Shopify theme-editor style (not horizontal tabs). */
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
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex h-[calc(58px+env(safe-area-inset-bottom))] shrink-0 items-start gap-0 overflow-x-auto border-t px-1 pb-[env(safe-area-inset-bottom)] sm:relative sm:inset-auto sm:z-auto sm:h-auto sm:w-[64px] sm:flex-col sm:items-stretch sm:overflow-y-auto sm:border-r sm:border-t-0 sm:px-1 sm:py-1.5"
      style={{ borderColor: BUILDER.border, background: BUILDER.surface }}
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
            className="group relative flex h-[58px] min-w-[58px] flex-col items-center justify-center gap-1 rounded-[10px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#FF6A00] focus-visible:ring-offset-1 sm:h-[50px] sm:min-w-0 sm:w-full"
            style={{
              background: on ? BUILDER.orangeGlow : "transparent",
              color: on ? BUILDER.ink : BUILDER.muted,
            }}
          >
            {on ? (
              <span className="absolute left-0 top-2 hidden h-8 w-[3px] rounded-r-full bg-[#FF6A00] sm:block" aria-hidden />
            ) : null}
            {item.icon}
            <span className="text-[9px] font-semibold leading-none tracking-[-0.01em]">{item.label}</span>
          </button>
        );
      })}
      {extras ? <div className="ml-auto hidden flex-col items-center gap-1 px-0.5 pb-1 sm:flex">{extras}</div> : null}
    </nav>
  );
}

/**
 * Theme-editor top bar (Shopify Horizon-style): back · site · Draft · page · device · undo · publish.
 * Canvas starts immediately below — no brand marketing chrome.
 */
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
  onSaveDraft,
  savingDraft,
  saveLabelColor,
  previewHost,
  pages,
  activePageId,
  onPageChange,
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
  onSaveDraft?: () => void;
  savingDraft?: boolean;
  saveLabelColor?: string;
  previewHost?: string;
  pages?: { id: string; title: string; slug: string }[];
  activePageId?: string;
  onPageChange?: (pageId: string) => void;
  minimal?: boolean;
  floating?: boolean;
}) {
  const host =
    previewHost?.replace(/^https?:\/\//, "").replace(/\/$/, "") ||
    `${projectId.slice(0, 8)}.kebu.africa`;

  return (
    <header
      className="relative flex h-[52px] shrink-0 items-center gap-1.5 border-b px-2.5 sm:px-3"
      style={{ borderColor: BUILDER.border, background: BUILDER.surface }}
    >
      <Link
        href={MY_SITES_HREF}
        aria-label="Back to your Kebu sites"
        className="mr-1 hidden shrink-0 items-center gap-1.5 rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00] sm:flex"
      >
        <span
          className="text-[20px] font-black leading-none tracking-[-0.08em]"
          style={{ color: BUILDER.ink, fontFamily: "var(--font-jost), system-ui, sans-serif" }}
        >
          kebu
        </span>
        <span className="h-5 w-px" style={{ background: BUILDER.border }} aria-hidden />
      </Link>

      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0">
          <p
            className="max-w-[120px] truncate text-[11px] font-bold leading-tight tracking-tight sm:max-w-[190px]"
            style={{ color: BUILDER.ink, fontFamily: "var(--font-jost), system-ui, sans-serif" }}
            title={title}
          >
            {title}
          </p>
          <p className="hidden max-w-[190px] truncate text-[9px] sm:block" style={{ color: BUILDER.faint }}>
            {host}
          </p>
        </div>
        {draftLabel ? (
          <span
            className="hidden shrink-0 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide md:inline"
            style={{
              background: draftLabel === "Live" ? "#ECFDF3" : "#F4F4F5",
              color: draftLabel === "Live" ? "#166534" : BUILDER.muted,
              border: `1px solid ${draftLabel === "Live" ? "#BBF7D0" : "#E8E8EA"}`,
            }}
          >
            {draftLabel}
          </span>
        ) : null}
      </div>

      {pages && pages.length > 0 && onPageChange ? (
        <label className="absolute left-1/2 hidden min-w-0 -translate-x-1/2 md:block">
          <span className="sr-only">Page</span>
          <select
            value={activePageId ?? pages[0]?.id}
            onChange={(e) => onPageChange(e.target.value)}
            className="max-w-[12rem] truncate rounded-md px-2.5 py-1.5 text-[10px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
            style={{
              border: "1px solid #E5E5E5",
              background: BUILDER.surfaceMuted,
              color: BUILDER.ink,
            }}
            aria-label="Editing page"
          >
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || p.slug}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
        {saveLabel ? (
          <span
            className="hidden max-w-[150px] items-center gap-1.5 truncate text-[10px] lg:flex"
            style={{ color: saveLabelColor ?? BUILDER.faint }}
          >
            {saveLabel}
          </span>
        ) : null}

        <div
          className="hidden shrink-0 items-center gap-0.5 rounded-full p-0.5 sm:flex"
          style={{ background: BUILDER.surfaceMuted }}
          role="group"
          aria-label="Preview device"
        >
          {(
            [
              ["desktop", "Desktop", "M4 5h16v12H4z M8 19h8"],
              ["tablet", "Tablet", "M7 3h10v18H7z M11 18h2"],
              ["mobile", "Phone", "M9 3h6v18H9z M11 18h2"],
            ] as const
          ).map(([id, label, d]) => (
            <button
              key={id}
              type="button"
              title={label}
              aria-label={label}
              aria-pressed={device === id}
              onClick={() => onDevice(id)}
              className="flex h-7 w-7 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
              style={{
                background: device === id ? "#fff" : "transparent",
                color: device === id ? BUILDER.ink : BUILDER.muted,
                boxShadow: device === id ? "0 0 0 1px #E5E5E5" : "none",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d={d} strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg disabled:opacity-25"
          style={{ color: BUILDER.ink }}
          aria-label="Undo"
          title="Undo"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg disabled:opacity-25"
          style={{ color: BUILDER.ink }}
          aria-label="Redo"
          title="Redo"
        >
          ↷
        </button>
        <Link
          href={`/create/${projectId}/preview`}
          className="hidden rounded-full px-3.5 py-2 text-[10px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00] sm:inline"
          style={{ color: BUILDER.ink, border: `1px solid ${BUILDER.borderStrong}`, background: BUILDER.surface }}
        >
          Preview
        </Link>
        {onSaveDraft ? (
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={savingDraft || publishing}
            className="hidden rounded-full px-3.5 py-2 text-[10px] font-bold disabled:opacity-40 md:inline"
            style={{ border: `1px solid ${BUILDER.border}`, color: BUILDER.ink, background: "#fff" }}
          >
            {savingDraft ? "…" : "Save draft"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onPublish}
          disabled={publishing}
          className="rounded-full px-4 py-2 text-[10px] font-black tracking-wide shadow-[0_3px_12px_rgba(10,10,10,0.12)] disabled:opacity-50 sm:px-5"
          style={{ background: BUILDER.ink, color: "#fff" }}
        >
          {publishing ? "…" : publishLabel}
        </button>
      </div>
    </header>
  );
}
