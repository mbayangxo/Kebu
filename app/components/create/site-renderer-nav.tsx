"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { cssFontStack } from "@/lib/create/site-theme-fonts";
import { Z_LAYERS } from "@/app/components/create/kebu-z-layers";

/** Editor-only drag handle for resizing the nav bar height. */
export function NavResizeHandle({ currentScale, onPatch }: { currentScale: number; onPatch: (s: number) => void }) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-50 flex cursor-ns-resize items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
      style={{ height: 10, background: "rgba(44,110,203,0.3)" }}
      title="Drag to resize nav bar height"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const startY = e.clientY;
        const base = currentScale;
        function onMove(ev: MouseEvent) {
          const delta = ev.clientY - startY;
          onPatch(Math.min(2.2, Math.max(0.7, base + delta / 80)));
        }
        function onUp() {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
        }
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      }}
    >
      <div className="h-0.5 w-10 rounded-full" style={{ background: "#2C6ECB" }} />
    </div>
  );
}

/** Site navigation — hamburger drawer on mobile, top bar on desktop, or always-hamburger mode. */
export function SiteNav({
  brand,
  brandEl,
  links,
  navBg,
  navColor,
  stickyClass,
  padY,
  padX,
  fontPx,
  gap,
  maxWidth,
  logoAlign,
  layout,
  navStyle,
  navScale,
  resolveHref,
  onNavigate,
  onNavResize,
  fontFamily,
  fontWeight,
}: {
  brand: string;
  brandEl: ReactNode;
  links: { label: string; href: string; children?: { label: string; href: string; grandchildren?: { label: string; href: string }[] }[] }[];
  navBg: string | undefined;
  navColor: string;
  stickyClass: string;
  padY: number;
  padX: number;
  fontPx: number;
  gap: number;
  maxWidth: string | undefined;
  logoAlign: "left" | "center" | "right";
  layout?: "top" | "side" | "hamburger";
  navStyle?: "standard" | "mega";
  /** Current scale value, passed so the drag handle can compute correctly. */
  navScale?: number;
  resolveHref: (h: string) => string;
  onNavigate?: (slug: string) => void;
  /** Editor-only: callback for nav drag-resize handle at bottom of bar. */
  onNavResize?: (newScale: number) => void;
  fontFamily?: string;
  fontWeight?: number;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  function slugFromHref(href: string): string | null {
    const h = (href || "").trim();
    if (!h || h === "#" || h.startsWith("#") || h.startsWith("http") || h.startsWith("//") || h.startsWith("mailto:") || h.startsWith("tel:")) return null;
    const cleaned = h.replace(/^\//, "").split(/[?#]/)[0] ?? "";
    return cleaned || "home";
  }

  function handleNav(href: string) {
    const slug = slugFromHref(href);
    if (onNavigate && slug) {
      onNavigate(slug);
    }
    setDrawerOpen(false);
    setOpenGroup(null);
  }

  /* Desktop link renderer */
  function renderDesktopLink(l: { label: string; href: string; children?: { label: string; href: string; grandchildren?: { label: string; href: string }[] }[] }) {
    const hasChildren = l.children && l.children.length > 0;
    if (!hasChildren) {
      const slug = slugFromHref(l.href);
      return onNavigate && slug ? (
        <button
          key={l.label}
          type="button"
          onClick={() => handleNav(l.href)}
          className="kebu-nav-link"
          style={{ fontSize: fontPx, fontFamily: fontFamily ? cssFontStack(fontFamily) : undefined, fontWeight }}
        >
          {l.label}
        </button>
      ) : (
        <a key={l.label} href={resolveHref(l.href)} className="kebu-nav-link" style={{ fontSize: fontPx, fontFamily: fontFamily ? cssFontStack(fontFamily) : undefined, fontWeight }}>
          {l.label}
        </a>
      );
    }
    const groupOpen = openGroup === l.label;
    return (
      <div key={l.label} className="relative">
        <button
          type="button"
          onClick={() => {
            setDrawerOpen(false);
            setOpenGroup(groupOpen ? null : l.label);
          }}
          className="kebu-nav-link flex items-center gap-1"
          style={{ fontSize: fontPx, fontFamily: fontFamily ? cssFontStack(fontFamily) : undefined, fontWeight }}
        >
          {l.label}
          <span aria-hidden style={{ fontSize: "0.65em", opacity: 0.6, transform: groupOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s", display: "inline-block" }}>▾</span>
        </button>
        {groupOpen && (
          <>
            <div className="fixed inset-0" style={{ zIndex: Z_LAYERS.dropdownBackdrop }} onClick={() => setOpenGroup(null)} aria-hidden />
            <div
              className="absolute left-0 top-full mt-1 overflow-hidden rounded-xl shadow-xl"
              style={{
                zIndex: Z_LAYERS.dropdownPanel,
                background: navBg || "#000",
                border: "1px solid rgba(255,255,255,0.12)",
                minWidth: (navStyle === "mega" || l.children!.length > 4) ? 240 : 180,
              }}
            >
              {(navStyle === "mega" || l.children!.length > 4) ? (
                <div className="grid grid-cols-2 gap-0">
                  {l.children!.map((child) => {
                    const cslug = slugFromHref(child.href);
                    const cls = "kebu-nav-dropdown-item text-left";
                    const childLink = onNavigate && cslug ? (
                      <button type="button" onClick={() => handleNav(child.href)} className={cls} style={{ color: navColor }}>{child.label}</button>
                    ) : (
                      <a href={resolveHref(child.href)} onClick={() => setOpenGroup(null)} className={cls} style={{ color: navColor }}>{child.label}</a>
                    );
                    return <div key={child.label} className="flex flex-col">{childLink}{child.grandchildren?.map((grand) => {
                      const gslug = slugFromHref(grand.href);
                      return onNavigate && gslug
                        ? <button key={grand.label} type="button" onClick={() => handleNav(grand.href)} className="px-4 py-1.5 text-left text-[0.85em] opacity-70" style={{ color: navColor }}>{grand.label}</button>
                        : <a key={grand.label} href={resolveHref(grand.href)} onClick={() => setOpenGroup(null)} className="px-4 py-1.5 text-[0.85em] opacity-70" style={{ color: navColor }}>{grand.label}</a>;
                    })}</div>;
                  })}
                </div>
              ) : (
                <div className="flex flex-col">
                  {l.children!.map((child) => {
                    const cslug = slugFromHref(child.href);
                    const cls = "kebu-nav-dropdown-item text-left";
                    const childLink = onNavigate && cslug ? (
                      <button type="button" onClick={() => handleNav(child.href)} className={cls} style={{ color: navColor }}>{child.label}</button>
                    ) : (
                      <a href={resolveHref(child.href)} onClick={() => setOpenGroup(null)} className={cls} style={{ color: navColor }}>{child.label}</a>
                    );
                    return <div key={child.label} className="flex flex-col">{childLink}{child.grandchildren?.map((grand) => {
                      const gslug = slugFromHref(grand.href);
                      return onNavigate && gslug
                        ? <button key={grand.label} type="button" onClick={() => handleNav(grand.href)} className="px-4 py-1.5 text-left text-[0.85em] opacity-70" style={{ color: navColor }}>{grand.label}</button>
                        : <a key={grand.label} href={resolveHref(grand.href)} onClick={() => setOpenGroup(null)} className="px-4 py-1.5 text-[0.85em] opacity-70" style={{ color: navColor }}>{grand.label}</a>;
                    })}</div>;
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  /* Mobile drawer link renderer */
  function renderDrawerLink(l: { label: string; href: string; children?: { label: string; href: string; grandchildren?: { label: string; href: string }[] }[] }) {
    const hasChildren = l.children && l.children.length > 0;
    if (!hasChildren) {
      const slug = slugFromHref(l.href);
      return onNavigate && slug ? (
        <button
          key={l.label}
          type="button"
          onClick={() => handleNav(l.href)}
          className="kebu-nav-drawer-link"
        >
          {l.label}
        </button>
      ) : (
        <a key={l.label} href={resolveHref(l.href)} onClick={() => setDrawerOpen(false)} className="kebu-nav-drawer-link">
          {l.label}
        </a>
      );
    }
    const groupOpen = openGroup === l.label;
    return (
      <div key={l.label}>
        <button
          type="button"
          onClick={() => setOpenGroup(groupOpen ? null : l.label)}
          className="kebu-nav-drawer-link flex w-full items-center justify-between"
        >
          {l.label}
          <span aria-hidden style={{ fontSize: "0.75em", opacity: 0.6, transform: groupOpen ? "rotate(180deg)" : "none", transition: "transform 0.18s", display: "inline-block" }}>▾</span>
        </button>
        {groupOpen && (
          <div className="kebu-nav-drawer-children">
            {l.children!.map((child) => {
              const cslug = slugFromHref(child.href);
              const childLink = onNavigate && cslug ? (
                <button type="button" onClick={() => handleNav(child.href)} className="kebu-nav-drawer-child">{child.label}</button>
              ) : (
                <a href={resolveHref(child.href)} onClick={() => setDrawerOpen(false)} className="kebu-nav-drawer-child">{child.label}</a>
              );
              return <div key={child.label} className="flex flex-col">{childLink}{child.grandchildren?.map((grand) => {
                const gslug = slugFromHref(grand.href);
                return onNavigate && gslug
                  ? <button key={grand.label} type="button" onClick={() => handleNav(grand.href)} className="kebu-nav-drawer-child pl-8 text-[0.9em] opacity-70">{grand.label}</button>
                  : <a key={grand.label} href={resolveHref(grand.href)} onClick={() => setDrawerOpen(false)} className="kebu-nav-drawer-child pl-8 text-[0.9em] opacity-70">{grand.label}</a>;
              })}</div>;
            })}
          </div>
        )}
      </div>
    );
  }

  const alwaysHamburger = layout === "hamburger";

  return (
    <header
      className={`kebu-site-nav relative ${stickyClass}`}
      style={{
        background: navBg,
        color: navColor,
        paddingTop: padY,
        paddingBottom: padY,
        paddingLeft: padX,
        paddingRight: padX,
      }}
    >
      <div
        className="mx-auto flex w-full items-center justify-between"
        style={{ maxWidth }}
      >
        <div className={`flex shrink-0 ${logoAlign === "center" ? "absolute left-1/2 -translate-x-1/2" : ""}`}>
          {brandEl}
        </div>

        {!alwaysHamburger && (
          <nav
            className="kebu-site-nav__links hidden items-center sm:flex"
            style={{ gap, fontSize: fontPx, marginLeft: logoAlign === "left" ? "auto" : undefined }}
            aria-label="Site navigation"
          >
            {links.map((l) => renderDesktopLink(l))}
          </nav>
        )}

        {links.length > 0 && (
          <button
            type="button"
            onClick={() => { setDrawerOpen((v) => !v); setOpenGroup(null); }}
            className={`kebu-nav-hamburger ${alwaysHamburger ? "" : "sm:hidden"}`}
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            aria-expanded={drawerOpen}
            style={{ color: navColor }}
          >
            {drawerOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h12"/></svg>
            )}
          </button>
        )}
      </div>

      {drawerOpen && (
        <>
          <div
            className={`fixed inset-0 ${alwaysHamburger ? "" : "sm:hidden"}`}
            style={{ background: "rgba(0,0,0,0.35)", zIndex: Z_LAYERS.drawerBackdrop }}
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div
            className={`kebu-nav-drawer ${alwaysHamburger ? "" : "sm:hidden"}`}
            style={{ background: navBg || "#000", color: navColor, borderTop: "1px solid rgba(255,255,255,0.1)" }}
          >
            {links.map((l) => renderDrawerLink(l))}
          </div>
        </>
      )}

      {onNavResize ? (
        <NavResizeHandle currentScale={navScale ?? 1} onPatch={onNavResize} />
      ) : null}
    </header>
  );
}
