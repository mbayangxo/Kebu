"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BackLink } from "@/app/components/back-link";
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
  | "aesthetic"
  | "media"
  | "nav"
  | "yande";

const RAIL: { id: BuilderStudioTab; label: string; icon: ReactNode }[] = [
  {
    id: "content",
    label: "Sections",
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
    id: "aesthetic",
    label: "Aesthetic Editor",
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
    label: "Photos",
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
    label: "Nav",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "yande",
    label: "Yande",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M12 3l1.6 5.2L19 10l-5.4 1.8L12 17l-1.6-5.2L5 10l5.4-1.8L12 3z" strokeLinejoin="round" />
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
    <div
      className="flex w-11 shrink-0 flex-col items-center gap-0.5 border-r py-2"
      style={{ borderColor: BUILDER.border, background: "#FAFAFA" }}
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
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{
              background: on ? BUILDER.ink : "transparent",
              color: on ? "#fff" : BUILDER.muted,
            }}
          >
            {item.icon}
          </button>
        );
      })}
      {extras ? <div className="mt-auto flex flex-col items-center gap-1 px-0.5 pb-1">{extras}</div> : null}
    </div>
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
  previewHost,
  pages,
  activePageId,
  onPageChange,
  minimal: _minimal = false,
  floating: _floating = false,
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
      className="flex h-11 shrink-0 items-center gap-2 border-b px-2 sm:px-3"
      style={{ borderColor: "#E5E5E5", background: "#fff" }}
    >
      <BackLink fallbackHref={MY_SITES_HREF} label="Sites" variant="strong" />

      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0">
          <p
            className="truncate text-[12px] font-semibold leading-tight tracking-tight"
            style={{ color: BUILDER.ink, fontFamily: "var(--font-jost), system-ui, sans-serif" }}
            title={title}
          >
            {title}
          </p>
          <p className="hidden truncate text-[10px] sm:block" style={{ color: BUILDER.faint }}>
            {host}
          </p>
        </div>
        {draftLabel ? (
          <span
            className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
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
        <label className="hidden min-w-0 sm:block">
          <span className="sr-only">Page</span>
          <select
            value={activePageId ?? pages[0]?.id}
            onChange={(e) => onPageChange(e.target.value)}
            className="max-w-[10rem] truncate rounded-md px-2 py-1.5 text-[11px] font-semibold"
            style={{
              border: "1px solid #E5E5E5",
              background: "#F4F4F5",
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

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {saveLabel ? (
          <span className="hidden text-[10px] lg:inline" style={{ color: BUILDER.faint }}>
            {saveLabel}
          </span>
        ) : null}

        <div
          className="flex shrink-0 items-center gap-0.5 rounded-md p-0.5"
          style={{ background: "#F4F4F5" }}
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
              className="flex h-7 w-7 items-center justify-center rounded"
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
          className="hidden rounded px-1.5 py-1 text-[10px] font-semibold disabled:opacity-30 sm:inline"
          style={{ color: BUILDER.ink }}
        >
          Undo
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="hidden rounded px-1.5 py-1 text-[10px] font-semibold disabled:opacity-30 sm:inline"
          style={{ color: BUILDER.ink }}
        >
          Redo
        </button>
        <Link
          href={`/create/${projectId}/preview`}
          className="hidden rounded-md px-2 py-1 text-[10px] font-semibold sm:inline"
          style={{ color: BUILDER.ink, border: `1px solid ${BUILDER.border}` }}
        >
          Preview
        </Link>
        {onSaveDraft ? (
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={savingDraft || publishing}
            className="rounded-md px-3 py-1.5 text-[10px] font-bold disabled:opacity-40"
            style={{ border: `1px solid ${BUILDER.border}`, color: BUILDER.ink, background: "#fff" }}
          >
            {savingDraft ? "…" : "Save draft"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onPublish}
          disabled={publishing}
          className="relative overflow-hidden rounded-lg px-4 py-1.5 text-[11px] font-bold disabled:opacity-50 transition-all"
          style={{ background: publishing ? "#4B5563" : "#FF5500", color: "#fff", minWidth: 84 }}
        >
          {publishing ? (
            <span className="flex items-center gap-1.5 justify-center">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Publishing…
            </span>
          ) : publishLabel}
        </button>
      </div>
    </header>
  );
}
