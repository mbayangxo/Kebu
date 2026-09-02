"use client";

import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

export type SocialLinkItem = {
  label: string;
  iconUrl: string;
  href: string;
};

export type SocialRailStyle = {
  visible?: boolean;
  bgColor?: string;
  leftPct?: number;
  topPct?: number;
  iconSize?: number;
};

type Patch = (next: Record<string, unknown>) => void;

/** Contained social icon rail — lives inside the site (never viewport-fixed over the builder). */
export function EditableSocialRail({
  links,
  style,
  editing,
  onPatch,
  onSelect,
  siteBase,
}: {
  links: SocialLinkItem[];
  style?: SocialRailStyle;
  editing?: boolean;
  onPatch?: Patch;
  onSelect?: () => void;
  siteBase?: string;
}) {
  if (style?.visible === false || !links.length) return null;

  const leftPct = clamp(style?.leftPct ?? 0, 0, 92);
  const topPct = clamp(style?.topPct ?? 12, 0, 85);
  const iconSize = clamp(style?.iconSize ?? 40, 20, 72);
  const bg = style?.bgColor?.trim() || "rgba(0,0,0,0.85)";
  const dragging = useRef(false);

  const railStyle: CSSProperties = {
    position: "absolute",
    left: `${leftPct}%`,
    top: `${topPct}%`,
    zIndex: 30,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    padding: "14px 10px",
    borderRadius: 12,
    background: bg,
    maxHeight: "76%",
    overflowY: "auto",
    touchAction: editing ? "none" : undefined,
    cursor: editing ? "grab" : undefined,
    boxShadow: editing ? "0 0 0 2px #FF5500" : "0 8px 24px rgba(0,0,0,0.25)",
  };

  function startDrag(e: ReactPointerEvent<HTMLElement>) {
    if (!editing || !onPatch) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.();
    const root = (e.currentTarget as HTMLElement).offsetParent as HTMLElement | null;
    if (!root) return;
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      if (!dragging.current) return;
      const rect = root.getBoundingClientRect();
      const nextLeft = clamp(((ev.clientX - rect.left) / Math.max(1, rect.width)) * 100 - 2, 0, 92);
      const nextTop = clamp(((ev.clientY - rect.top) / Math.max(1, rect.height)) * 100 - 4, 0, 85);
      onPatch({
        socialRailLeftPct: Math.round(nextLeft * 10) / 10,
        socialRailTopPct: Math.round(nextTop * 10) / 10,
      });
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <aside
      style={railStyle}
      aria-label="Social links"
      onPointerDown={startDrag}
      onClick={(e) => {
        if (!editing) return;
        e.stopPropagation();
        onSelect?.();
      }}
      role={editing ? "button" : undefined}
      tabIndex={editing ? 0 : undefined}
    >
      {editing ? (
        <span className="mb-1 text-[8px] font-bold uppercase tracking-wider text-white/70">Drag</span>
      ) : null}
      {links.map((link) => (
        <a
          key={`${link.label}-${link.href}`}
          href={editing ? undefined : link.href}
          target={editing ? undefined : "_blank"}
          rel={editing ? undefined : "noopener noreferrer"}
          title={link.label}
          className="opacity-90 transition hover:opacity-100"
          onClick={(e) => {
            if (editing) e.preventDefault();
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={link.iconUrl}
            alt={link.label}
            style={{ width: iconSize, height: iconSize, objectFit: "contain" }}
            draggable={false}
          />
        </a>
      ))}
      {siteBase && !editing ? (
        <a href={siteBase} className="mt-2 text-[9px] uppercase tracking-widest text-white/50 hover:text-white">
          Home
        </a>
      ) : null}
      {editing && onPatch ? (
        <button
          type="button"
          className="mt-2 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-red-300 hover:text-red-200"
          onClick={(e) => {
            e.stopPropagation();
            onPatch({ socialRailVisible: false });
          }}
        >
          Hide rail
        </button>
      ) : null}
    </aside>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function socialRailStyleFromProps(props: Record<string, unknown>): SocialRailStyle {
  return {
    visible: props.socialRailVisible !== false,
    bgColor: typeof props.socialRailBg === "string" ? props.socialRailBg : undefined,
    leftPct: typeof props.socialRailLeftPct === "number" ? props.socialRailLeftPct : undefined,
    topPct: typeof props.socialRailTopPct === "number" ? props.socialRailTopPct : undefined,
    iconSize: typeof props.socialRailIconSize === "number" ? props.socialRailIconSize : undefined,
  };
}
