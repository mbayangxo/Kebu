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

const STATUS: Record<KebuBusinessNavStatus, { color: string }> = {
  live: { color: "#009E40" },
  partial: { color: KEBU.orange },
  not_implemented: { color: NAV.muted },
};

function NavRow({
  item,
  homePath,
  depth = 0,
  onOpenShop,
  openShopBusy,
}: {
  item: KebuBusinessNavItem;
  homePath: string;
  depth?: number;
  onOpenShop?: () => void;
  openShopBusy?: boolean;
}) {
  const href = resolveKebuBusinessNavHref(item, homePath);
  const pad = depth > 0 ? { paddingLeft: `${12 + depth * 12}px` } : undefined;
  const isNotImpl = item.status === "not_implemented";

  if (item.action === "open-shop") {
    return (
      <button
        type="button"
        disabled={openShopBusy}
        onClick={onOpenShop}
        className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-1.5 text-left text-[13px] transition-colors hover:bg-black/[0.05] disabled:opacity-50"
        style={{ color: KEBU.orange, ...pad }}
      >
        {openShopBusy ? "Opening…" : item.label}
      </button>
    );
  }

  const inner = (
    <>
      <span
        className="truncate text-[13px]"
        style={{ color: isNotImpl ? NAV.muted : KEBU.black }}
      >
        {item.label}
      </span>
      {isNotImpl ? (
        <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider" style={{ color: STATUS.not_implemented.color }}>
          Soon
        </span>
      ) : null}
    </>
  );

  const className =
    "flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-left transition-colors hover:bg-black/[0.05]";

  if (href && !isNotImpl) {
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
    <div
      className={`${className} ${isNotImpl ? "cursor-default opacity-55" : ""}`}
      style={pad}
      aria-disabled={isNotImpl || undefined}
    >
      {inner}
    </div>
  );
}

function SectionBlock({
  section,
  homePath,
  open,
  onToggle,
  onOpenShop,
  openShopBusy,
}: {
  section: KebuBusinessNavSection;
  homePath: string;
  open: boolean;
  onToggle: () => void;
  onOpenShop?: () => void;
  openShopBusy?: boolean;
}) {
  if (section.solo) {
    if (section.action === "open-shop") {
      return (
        <button
          type="button"
          disabled={openShopBusy}
          onClick={onOpenShop}
          className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-[13px] font-semibold transition-colors hover:bg-black/[0.05] disabled:opacity-50"
          style={{ color: KEBU.orange }}
        >
          {openShopBusy ? "Opening…" : section.label}
        </button>
      );
    }

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
            <NavRow
              key={item.id}
              item={item}
              homePath={homePath}
              depth={1}
              onOpenShop={onOpenShop}
              openShopBusy={openShopBusy}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Shopify-style merchant OS tree — accordion groups with sub-items.
 * Opening one group closes the others. Shop items only shown when shopOpened.
 */
export function KebuBusinessNavTree({
  projectId,
  businessId,
  published,
  siteTitle,
  shopOpened = false,
  openShopBusy = false,
  onOpenShop,
}: {
  projectId: string;
  businessId: string | null;
  published: boolean;
  siteTitle?: string;
  shopOpened?: boolean;
  openShopBusy?: boolean;
  onOpenShop?: () => void;
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
          {!published ? "Publish for traffic · " : ""}Tap a section to expand
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
                onOpenShop={onOpenShop}
                openShopBusy={openShopBusy}
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
