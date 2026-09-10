"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";
import {
  buildKebuBusinessNav,
  kebuBusinessNavStats,
  resolveKebuBusinessNavHref,
  type KebuBusinessNavItem,
  type KebuBusinessNavSection,
  type KebuBusinessNavStatus,
} from "@/lib/navigation/kebu-business-nav";

const NAV = {
  bg: "#EBEBEB",
  header: "#F1F1F1",
  border: "#E3E3E3",
  muted: "#616161",
  faint: "#8C8C8C",
} as const;

const STATUS: Record<KebuBusinessNavStatus, { short: string; color: string }> = {
  live: { short: "", color: "#009E40" },
  partial: { short: "", color: KEBU.orange },
  not_implemented: { short: "Soon", color: NAV.muted },
};

function NavRow({
  item,
  homePath,
  depth = 0,
}: {
  item: KebuBusinessNavItem;
  homePath: string;
  depth?: number;
}) {
  const href = resolveKebuBusinessNavHref(item, homePath);
  const s = STATUS[item.status];
  const pad = depth > 0 ? { paddingLeft: `${12 + depth * 12}px` } : undefined;

  const inner = (
    <>
      <span
        className="truncate text-[13px]"
        style={{ color: item.status === "not_implemented" ? NAV.muted : KEBU.black }}
      >
        {item.label}
      </span>
      {item.status === "not_implemented" ? (
        <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider" style={{ color: s.color }}>
          Soon
        </span>
      ) : null}
    </>
  );

  const className =
    "flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-left transition-colors hover:bg-black/[0.05]";

  if (href && item.status !== "not_implemented") {
    if (href.startsWith("#") || (href.includes("#") && !href.startsWith("http"))) {
      return (
        <a href={href} className={className} style={pad}>
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className={className} style={pad}>
        {inner}
      </Link>
    );
  }

  return (
    <div className={`${className} cursor-default opacity-55`} style={pad} aria-disabled title="Not implemented yet">
      {inner}
    </div>
  );
}

function SectionBlock({
  section,
  homePath,
  open,
  onToggle,
}: {
  section: KebuBusinessNavSection;
  homePath: string;
  open: boolean;
  onToggle: () => void;
}) {
  if (section.solo) {
    const item: KebuBusinessNavItem = {
      id: section.id,
      label: section.label,
      status: section.status ?? "not_implemented",
      href: section.href,
      anchor: section.anchor,
    };
    return <NavRow item={item} homePath={homePath} />;
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-[13px] font-semibold transition-colors hover:bg-black/[0.05]"
        style={{ color: KEBU.black }}
        aria-expanded={open}
      >
        <span>{section.label}</span>
        <span className="text-[11px] font-normal tabular-nums" style={{ color: NAV.muted }} aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open ? (
        <div className="mb-1 space-y-0.5 border-l ml-3 pl-1" style={{ borderColor: NAV.border }}>
          {(section.items ?? []).map((item) => (
            <NavRow key={item.id} item={item} homePath={homePath} depth={1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Shopify-style merchant OS tree — children only show when their accordion is open.
 * Opening one group closes the others (neat / one focus).
 */
export function KebuBusinessNavTree({
  projectId,
  businessId,
  published,
  siteTitle,
  shopOpened = false,
}: {
  projectId: string;
  businessId: string | null;
  published: boolean;
  siteTitle?: string;
  shopOpened?: boolean;
}) {
  const homePath = `/my-sites/${projectId}`;
  const sections = useMemo(
    () => buildKebuBusinessNav({ projectId, businessId, shopOpened }),
    [projectId, businessId, shopOpened],
  );
  const stats = useMemo(() => kebuBusinessNavStats(sections), [sections]);

  /** Exclusive accordion — null = all closed. Default Online Store open. */
  const [openId, setOpenId] = useState<string | null>("online-store");

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  let lastGroup: string | undefined;

  return (
    <nav
      className="flex h-full min-h-[min(72vh,680px)] flex-col overflow-hidden lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:min-h-0"
      style={{ background: NAV.bg }}
      aria-label="Kebu Business"
    >
      <div className="shrink-0 border-b px-3 py-3" style={{ borderColor: NAV.border, background: NAV.header }}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: NAV.muted }}>
          {shopOpened ? "Store" : "Website"}
        </p>
        {siteTitle ? (
          <p className="mt-0.5 truncate text-sm font-semibold" style={{ color: KEBU.black }}>
            {siteTitle}
          </p>
        ) : null}
        <p className="mt-1 text-[10px] leading-snug" style={{ color: NAV.faint }}>
          Tap a section to open · tap again to close
          {!published ? " · Publish for traffic" : null}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-2">
        {sections.map((section) => {
          const showGroup = Boolean(section.groupLabel && section.groupLabel !== lastGroup);
          if (section.groupLabel) lastGroup = section.groupLabel;
          return (
            <div key={section.id}>
              {showGroup ? (
                <p
                  className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: NAV.muted }}
                >
                  {section.groupLabel}
                </p>
              ) : null}
              <SectionBlock
                section={section}
                homePath={homePath}
                open={section.solo ? true : openId === section.id}
                onToggle={() => toggle(section.id)}
              />
            </div>
          );
        })}
      </div>

      <div
        className="shrink-0 border-t px-3 py-2 text-[10px]"
        style={{ borderColor: NAV.border, color: NAV.faint, background: NAV.header }}
      >
        {stats.live} ready · {stats.partial} partial · {stats.notImplemented} soon
      </div>
    </nav>
  );
}
