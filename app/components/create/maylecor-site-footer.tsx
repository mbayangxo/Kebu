"use client";

import { MaylecorSocialBar } from "@/app/components/create/maylecor-social-bar";
import { useRef, type MouseEvent as ReactMouseEvent } from "react";

type Social = { label: string; iconUrl: string; href: string };

export function MaylecorSiteFooter({
  brandLabel,
  accentColor = "#E9006B",
  socialLinks,
  siteBase = "",
  paddingTop = 20,
  paddingBottom = 20,
  editing = false,
  selected = false,
  onSelect,
  onResize,
}: {
  brandLabel: string;
  accentColor?: string;
  /** undefined = May defaults; [] = intentionally empty (left-nav cleared). */
  socialLinks?: Social[];
  siteBase?: string;
  paddingTop?: number;
  paddingBottom?: number;
  editing?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onResize?: (patch: { embeddedFooterPaddingTop?: number; embeddedFooterPaddingBottom?: number }) => void;
}) {
  const year = new Date().getFullYear();
  const footerRef = useRef<HTMLElement>(null);

  function beginResize(which: "top" | "bottom", event: ReactMouseEvent<HTMLButtonElement>) {
    if (!editing || !onResize) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect?.();
    const startY = event.clientY;
    const start = which === "top" ? paddingTop : paddingBottom;
    const onMove = (moveEvent: MouseEvent) => {
      const delta = which === "top" ? startY - moveEvent.clientY : moveEvent.clientY - startY;
      const next = Math.min(160, Math.max(8, Math.round(start + delta)));
      onResize(
        which === "top"
          ? { embeddedFooterPaddingTop: next }
          : { embeddedFooterPaddingBottom: next },
      );
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <footer
      ref={footerRef}
      className="relative border-t border-white/10 px-6 text-center"
      style={{
        background: "#0a0a0a",
        color: "rgba(255,255,255,0.75)",
        paddingTop,
        paddingBottom,
        outline: editing && selected ? "2px solid #2C6ECB" : undefined,
        outlineOffset: editing && selected ? -2 : undefined,
      }}
      onClick={(event) => {
        if (!editing) return;
        event.stopPropagation();
        onSelect?.();
      }}
    >
      {editing ? (
        <button
          type="button"
          aria-label="Resize footer top spacing"
          className="absolute left-1/2 top-0 z-20 h-3 w-16 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize rounded-full border border-white/70 bg-[#2C6ECB] shadow"
          onMouseDown={(event) => beginResize("top", event)}
        />
      ) : null}
      <p className="text-[10px] font-bold uppercase tracking-[0.35em]" style={{ color: accentColor }}>
        {brandLabel}
      </p>
      <div className="mt-6">
        <MaylecorSocialBar links={socialLinks} accentColor={accentColor} variant="footer" />
      </div>
      <p className="mt-6 text-[10px] uppercase tracking-widest opacity-50">
        © {year} {brandLabel}
        {siteBase ? (
          <>
            {" "}
            ·{" "}
            <a href={siteBase || "/"} className="underline hover:opacity-80">
              Home
            </a>
          </>
        ) : null}
      </p>
      <p className="mt-2 text-[9px] opacity-40">Built on Kebu</p>
      {editing ? (
        <button
          type="button"
          aria-label="Resize footer bottom spacing"
          className="absolute bottom-0 left-1/2 z-20 h-3 w-16 -translate-x-1/2 translate-y-1/2 cursor-ns-resize rounded-full border border-white/70 bg-[#2C6ECB] shadow"
          onMouseDown={(event) => beginResize("bottom", event)}
        />
      ) : null}
    </footer>
  );
}
