"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { MY_SITES_HREF } from "@/lib/navigation/product-nav";
import type { BuilderDevice } from "@/lib/create/builder-device";
import { KebuMark } from "@/app/components/kebu-mark";
import { KebuIcon, type KebuIconName } from "@/app/components/kebu/kebu-icon";

const ECOSYSTEM: Array<{ label: string; href: string; icon: KebuIconName }> = [
  { label: "Home", href: "/home", icon: "home" },
  { label: "Search", href: "/search", icon: "search" },
  { label: "Universe", href: "/universe", icon: "universe" },
  { label: "Spaces", href: "/spaces", icon: "spaces" },
  { label: "Library", href: "/library", icon: "library" },
  { label: "Studio", href: "/studio", icon: "studio" },
  { label: "Builder", href: "/create", icon: "builder" },
  { label: "Work", href: "/work", icon: "work" },
  { label: "Opportunities", href: "/opportunity", icon: "opportunity" },
];

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
  | "apps";

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
      className="kebu-builder-tool-rail fixed inset-x-0 bottom-0 z-50 flex h-[calc(60px+env(safe-area-inset-bottom))] shrink-0 items-start gap-0 overflow-x-auto border-t px-1 pb-[env(safe-area-inset-bottom)] sm:relative sm:inset-auto sm:z-auto sm:h-auto sm:w-[72px] sm:flex-col sm:items-stretch sm:overflow-y-auto sm:border-r sm:border-t-0 sm:px-1.5 sm:py-2"
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
            className="group relative flex h-[58px] min-w-[58px] flex-col items-center justify-center gap-1 rounded-[10px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#FF6A00] focus-visible:ring-offset-1 sm:h-[54px] sm:min-w-0 sm:w-full"
            style={{
              background: on ? "linear-gradient(145deg, rgba(255,106,0,.32), rgba(255,31,31,.16))" : "transparent",
              color: on ? "var(--kb-editor-text)" : "var(--kb-editor-muted)",
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

export function BuilderEcosystemRail() {
  return (
    <nav
      className="kebu-builder-ecosystem-rail hidden w-[68px] shrink-0 flex-col border-r py-2 xl:flex"
      aria-label="Kebu apps"
    >
      <div className="flex flex-1 flex-col items-center gap-1.5">
        {ECOSYSTEM.map((item) => {
          const active = item.icon === "builder";
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-current={active ? "page" : undefined}
              className="group relative flex h-[52px] w-[58px] flex-col items-center justify-center gap-1 rounded-[12px] outline-none transition focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
              style={{
                color: active ? "var(--kb-editor-text)" : "var(--kb-editor-muted)",
                background: active
                  ? "linear-gradient(145deg, rgba(255,106,0,.5), rgba(255,31,31,.24))"
                  : "transparent",
              }}
            >
              <KebuIcon name={item.icon} size={18} />
              <span className="text-[8px] font-bold leading-none">{item.label}</span>
              {active ? <span className="absolute right-0 h-7 w-[2px] rounded-l bg-[#FF6A00]" /> : null}
            </Link>
          );
        })}
      </div>
      <Link
        href="/tools"
        className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
        style={{ color: "var(--kb-editor-muted)" }}
        aria-label="More Kebu apps"
        title="More"
      >
        <KebuIcon name="more" size={19} />
      </Link>
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
      className="kebu-builder-topbar relative flex h-[64px] shrink-0 items-center gap-2 border-b px-2.5 sm:px-4"
    >
      <Link
        href={MY_SITES_HREF}
        aria-label="Back to your Kebu sites"
        className="mr-1 hidden shrink-0 items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00] sm:flex"
      >
        <KebuMark size={30} className="kebu-builder-mark" />
        <span className="text-[15px] font-black tracking-[-0.035em]">Kebu Builder</span>
        <span className="h-5 w-px" style={{ background: "var(--kb-editor-border)" }} aria-hidden />
      </Link>

      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0">
          <p
            className="max-w-[120px] truncate text-[12px] font-bold leading-tight tracking-tight sm:max-w-[190px]"
            style={{ color: "var(--kb-editor-text)", fontFamily: "var(--font-jost), system-ui, sans-serif" }}
            title={title}
          >
            {title}
          </p>
          <p className="hidden max-w-[190px] truncate text-[9px] sm:block" style={{ color: "var(--kb-editor-faint)" }}>
            {host}
          </p>
        </div>
        {draftLabel ? (
          <span
            className="hidden shrink-0 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide md:inline"
            style={{
              background: draftLabel === "Live" ? "rgba(34,197,94,.12)" : "rgba(255,255,255,.08)",
              color: draftLabel === "Live" ? "#86EFAC" : "#D4D4D8",
              border: `1px solid ${draftLabel === "Live" ? "rgba(34,197,94,.25)" : "rgba(255,255,255,.1)"}`,
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
            className="max-w-[12rem] truncate rounded-full px-3 py-2 text-[11px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
            style={{ border: "1px solid var(--kb-editor-border)", background: "var(--kb-editor-control)", color: "var(--kb-editor-text)" }}
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
            style={{ color: saveLabelColor ?? "var(--kb-editor-muted)" }}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden />
            {saveLabel}
          </span>
        ) : null}

        <div
          className="hidden shrink-0 items-center gap-0.5 rounded-full p-0.5 sm:flex"
          style={{ background: "var(--kb-editor-control)", border: "1px solid var(--kb-editor-border)" }}
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
              className="flex h-8 w-8 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]"
              style={{
                background: device === id ? "#FF8C73" : "transparent",
                color: device === id ? "#0A0A0A" : "var(--kb-editor-muted)",
                boxShadow: "none",
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
          className="hidden h-8 w-8 items-center justify-center rounded-full text-lg disabled:opacity-25 lg:flex"
          style={{ color: "var(--kb-editor-text)" }}
          aria-label="Undo"
          title="Undo"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="hidden h-8 w-8 items-center justify-center rounded-full text-lg disabled:opacity-25 lg:flex"
          style={{ color: "var(--kb-editor-text)" }}
          aria-label="Redo"
          title="Redo"
        >
          ↷
        </button>
        <Link
          href={`/create/${projectId}/preview`}
          className="hidden rounded-full px-3.5 py-2 text-[10px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00] sm:inline"
          style={{ color: "var(--kb-editor-text)", border: "1px solid var(--kb-editor-border-strong)", background: "var(--kb-editor-surface)" }}
        >
          Preview
        </Link>
        {onSaveDraft ? (
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={savingDraft || publishing}
            className="hidden rounded-full px-3.5 py-2 text-[10px] font-bold disabled:opacity-40 md:inline"
            style={{ border: "1px solid var(--kb-editor-border)", color: "var(--kb-editor-text)", background: "var(--kb-editor-control)" }}
          >
            {savingDraft ? "…" : "Save"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onPublish}
          disabled={publishing}
          className="rounded-full px-4 py-2 text-[10px] font-black tracking-wide shadow-[0_3px_12px_rgba(10,10,10,0.12)] disabled:opacity-50 sm:px-5"
          style={{ background: "linear-gradient(135deg, #FF9B82, #FF6A5C)", color: "#0A0A0A" }}
        >
          {publishing ? "…" : publishLabel}
        </button>
      </div>
    </header>
  );
}
