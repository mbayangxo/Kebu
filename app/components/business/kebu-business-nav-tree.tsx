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

const STATUS: Record<KebuBusinessNavStatus, { short: string; color: string }> = {
  live: { short: "Live", color: "#009E40" },
  partial: { short: "Partial", color: KEBU.orange },
  not_implemented: { short: "—", color: KEBU.muted },
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
  const pad = depth > 0 ? { paddingLeft: `${depth * 12 + 12}px` } : undefined;

  const inner = (
    <>
      <span className="truncate text-sm" style={{ color: item.status === "not_implemented" ? KEBU.muted : KEBU.black }}>
        {item.label}
      </span>
      <span
        className="shrink-0 text-[9px] font-bold uppercase tracking-wider tabular-nums"
        style={{ color: s.color }}
        title={item.status === "not_implemented" ? "Not implemented" : s.short}
      >
        {item.status === "not_implemented" ? "Soon" : s.short}
      </span>
    </>
  );

  const className =
    "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-black/[0.03]";

  if (href && item.status !== "not_implemented") {
    if (href.startsWith("#") || href.includes("#")) {
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
      className={`${className} opacity-60 cursor-default`}
      style={pad}
      aria-disabled
      title="Not implemented yet"
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
    return (
      <div className="border-b py-1" style={{ borderColor: KEBU.border }}>
        <NavRow item={item} homePath={homePath} />
      </div>
    );
  }

  return (
    <div className="border-b py-1" style={{ borderColor: KEBU.border }}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left font-bold hover:bg-black/[0.03]"
        style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
        aria-expanded={open}
      >
        <span>{section.label}</span>
        <span className="text-xs font-normal" style={{ color: KEBU.muted }}>
          {open ? "−" : "+"}
        </span>
      </button>
      {open ? (
        <div className="pb-2 space-y-0.5">
          {(section.items ?? []).map((item) => (
            <NavRow key={item.id} item={item} homePath={homePath} depth={1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Kebu Business IA tree — merchant OS navigation.
 */
export function KebuBusinessNavTree({
  projectId,
  businessId,
  published,
  siteTitle,
}: {
  projectId: string;
  businessId: string | null;
  published: boolean;
  siteTitle?: string;
}) {
  const homePath = `/my-sites/${projectId}`;
  const sections = useMemo(
    () => buildKebuBusinessNav({ projectId, businessId }),
    [projectId, businessId],
  );
  const stats = useMemo(() => kebuBusinessNavStats(sections), [sections]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => ({
    website: true,
    shop: true,
    analytics: true,
  }));

  const toggle = (id: string) =>
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <nav
      className="rounded-2xl overflow-hidden lg:sticky lg:top-6"
      style={{ border: `1px solid ${KEBU.border}`, background: KEBU.white }}
      aria-label="Kebu Business"
    >
      <div className="px-4 py-4 border-b" style={{ borderColor: KEBU.border, background: KEBU.cream }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: KEBU.orange }}>
          Kebu Business
        </p>
        {siteTitle ? (
          <p className="mt-1 text-sm font-bold truncate" style={{ fontFamily: "var(--font-fraunces)" }}>
            {siteTitle}
          </p>
        ) : null}
        <p className="mt-2 text-[11px] leading-relaxed" style={{ color: KEBU.muted }}>
          {stats.live} live · {stats.partial} partial · {stats.notImplemented} not built yet
          {!published ? " · Publish to collect traffic" : null}
        </p>
      </div>

      <div className="max-h-[min(70vh,640px)] overflow-y-auto px-1 py-2">
        {sections.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            homePath={homePath}
            open={section.solo ? true : (openSections[section.id] ?? false)}
            onToggle={() => toggle(section.id)}
          />
        ))}
      </div>
    </nav>
  );
}
