"use client";

import { useEffect, useState, type MouseEvent } from "react";
import {
  MAYLECOR_LOCALES,
  MAYLECOR_LOCALE_STORAGE_KEY,
  MAYLECOR_NAV_ICONS,
  parseMaylecorLocale,
  type MaylecorLocale,
  type MaylecorNavSlug,
} from "@/lib/create/maylecor-site-i18n";
import {
  navLinkHasDropdown,
  sanitizeMaylecorNavLinks,
} from "@/lib/create/maylecor-nav";
import {
  navChromeMetrics,
  parseNavLayout,
  type NavLayoutPreset,
  type NavSizePreset,
} from "@/lib/create/nav-chrome-size";
import { MaylecorSocialBar, type MaylecorSocialLink } from "@/app/components/create/maylecor-social-bar";

const PINK = "#E9006B";

function resolveHref(siteBase: string, slug: string): string {
  const base = siteBase.replace(/\/$/, "");
  if (!slug || slug === "home") return base || "/";
  return base ? `${base}/${slug}` : `/${slug}`;
}

export function MaylecorMotionChrome({
  siteBase,
  brandLabel,
  titleLogo,
  currentSlug = "home",
  accentColor = PINK,
  contained = false,
  overlayOnSite = true,
  navLinks,
  socialLinks,
  navScale = 1,
  navSize = "comfortable",
  navLayout = "top",
  navDisplay = "text",
  showChromeLogo = true,
  onNavigate,
}: {
  siteBase: string;
  brandLabel: string;
  titleLogo?: string;
  currentSlug?: string;
  accentColor?: string;
  contained?: boolean;
  overlayOnSite?: boolean;
  navLinks?: Parameters<typeof sanitizeMaylecorNavLinks>[0];
  socialLinks?: MaylecorSocialLink[];
  navScale?: number;
  navSize?: NavSizePreset;
  navLayout?: NavLayoutPreset;
  /** text = words · icons = built-in SVGs · photos = prefer custom iconUrl on each link */
  navDisplay?: "text" | "icons" | "photos";
  showChromeLogo?: boolean;
  onNavigate?: (slug: string) => void;
}) {
  const [locale, setLocale] = useState<MaylecorLocale>("en");
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const m = navChromeMetrics({ scale: navScale, size: navSize });
  const layout = parseNavLayout(navLayout);

  useEffect(() => {
    const stored = parseMaylecorLocale(localStorage.getItem(MAYLECOR_LOCALE_STORAGE_KEY));
    setLocale(stored);
  }, []);

  const pickLocale = (code: MaylecorLocale) => {
    setLocale(code);
    localStorage.setItem(MAYLECOR_LOCALE_STORAGE_KEY, code);
  };

  const customNav = sanitizeMaylecorNavLinks(navLinks);

  const navClass = (active: boolean) =>
    `font-bold uppercase transition-opacity hover:opacity-70 ${
      active ? "opacity-100" : "opacity-60"
    }`;

  function navIcon(slug: string): string | null {
    const key = slug as MaylecorNavSlug;
    return MAYLECOR_NAV_ICONS[key] ?? null;
  }

  function NavLabel({
    label,
    slug,
    active,
    iconUrl,
    showLabel = true,
  }: {
    label: string;
    slug: string;
    active: boolean;
    iconUrl?: string;
    showLabel?: boolean;
  }) {
    const custom = (iconUrl ?? "").trim();
    const useBuiltInIcon =
      (navDisplay === "icons" || navDisplay === "photos") && !custom;
    const path = useBuiltInIcon ? navIcon(slug) : null;
    const size = Math.max(18, Math.round(m.fontPx * 1.35));

    if (custom) {
      return (
        <span
          className={`inline-flex flex-col items-center gap-1 transition-opacity hover:opacity-80 ${
            active ? "opacity-100" : "opacity-65"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={custom}
            alt={showLabel === false ? label : ""}
            className="rounded-full object-cover"
            style={{ width: size + 6, height: size + 6 }}
          />
          {showLabel !== false ? (
            <span
              className="font-bold uppercase leading-none"
              style={{ fontSize: Math.max(9, m.fontPx - 2), letterSpacing: m.tracking }}
            >
              {label}
            </span>
          ) : (
            <span className="sr-only">{label}</span>
          )}
        </span>
      );
    }

    if (!path) {
      return (
        <span className={navClass(active)} style={{ fontSize: m.fontPx, letterSpacing: m.tracking }}>
          {label}
        </span>
      );
    }
    return (
      <span
        className={`inline-flex flex-col items-center gap-1 transition-opacity hover:opacity-80 ${
          active ? "opacity-100" : "opacity-65"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d={path} />
        </svg>
        {showLabel !== false ? (
          <span
            className="font-bold uppercase leading-none"
            style={{ fontSize: Math.max(9, m.fontPx - 2), letterSpacing: m.tracking }}
          >
            {label}
          </span>
        ) : (
          <span className="sr-only">{label}</span>
        )}
      </span>
    );
  }

  function resolveLink(href: string): string {
    const h = href.trim();
    if (!h || h === "#" || h === "/") return siteBase.replace(/\/$/, "") || "/";
    if (h.startsWith("http")) {
      try {
        const u = new URL(h);
        if (
          u.hostname.includes("maylecor.com") ||
          u.hostname.includes("wixsite.com") ||
          u.hostname.includes("wix.com")
        ) {
          const path = u.pathname.replace(/\/$/, "") || "/";
          if (path.includes("video")) return resolveHref(siteBase, "videos");
          if (path.includes("music")) return resolveHref(siteBase, "music");
          if (path.includes("photo")) return resolveHref(siteBase, "photos");
          if (path.includes("shop")) return resolveHref(siteBase, "shop");
          return resolveHref(siteBase, "home");
        }
      } catch {
        /* keep */
      }
      return h;
    }
    if (h.startsWith("#")) return h;
    if (h.startsWith("/") && !h.startsWith("//")) {
      const base = siteBase.replace(/\/$/, "");
      return base ? `${base}${h === "/" ? "" : h}` : h;
    }
    return resolveHref(siteBase, h.replace(/^\//, ""));
  }

  const items = customNav.map((l) => ({
    ...l,
    resolvedHref: resolveLink(l.href),
    slug: l.href.replace(/^\//, "").split("/")[0] || "",
    childItems: (l.children ?? []).map((c) => ({
      ...c,
      resolvedHref: resolveLink(c.href),
      slug: c.href.replace(/^\//, "").split("/")[0] || "",
    })),
  }));

  function goTo(e: MouseEvent, slug: string) {
    if (!onNavigate) return;
    e.preventDefault();
    onNavigate(slug || "home");
    setOpen(false);
    setOpenMenu(null);
  }

  function itemActive(item: (typeof items)[number]) {
    if (currentSlug === item.slug) return true;
    return item.childItems.some((c) => c.slug === currentSlug);
  }

  function renderDropdown(item: (typeof items)[number], overlay: boolean) {
    const active = itemActive(item);
    const key = `${item.label}-${item.href}`;
    const show = openMenu === key;
    if (!navLinkHasDropdown(item)) {
      return (
        <a
          key={key}
          href={item.resolvedHref}
          onClick={(e) => goTo(e, item.slug)}
          className="whitespace-nowrap"
          style={{ color: active ? accentColor : overlay ? "#fff" : "#111" }}
        >
          <NavLabel
            label={item.label}
            slug={item.slug}
            active={active}
            iconUrl={item.iconUrl}
            showLabel={item.showLabel}
          />
        </a>
      );
    }
    return (
      <div
        key={key}
        className="relative"
        onMouseEnter={() => setOpenMenu(key)}
        onMouseLeave={() => setOpenMenu(null)}
      >
        <button
          type="button"
          className="inline-flex items-center gap-1 whitespace-nowrap"
          style={{ color: active ? accentColor : overlay ? "#fff" : "#111" }}
          aria-expanded={show}
          aria-haspopup="true"
          onClick={() => setOpenMenu((v) => (v === key ? null : key))}
        >
          <NavLabel
            label={item.label}
            slug={item.slug}
            active={active}
            iconUrl={item.iconUrl}
            showLabel={item.showLabel}
          />
          <span className="text-[10px] opacity-70" aria-hidden>
            ▾
          </span>
        </button>
        {show ? (
          <div className="absolute left-1/2 top-full z-[130] min-w-[11rem] -translate-x-1/2 pt-2" role="menu">
            <ul
              className="rounded-xl py-2 shadow-xl"
              style={{
                background: overlay ? "rgba(10,10,10,0.94)" : "#fff",
                border: `1px solid ${overlay ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`,
              }}
            >
              <li>
                <a
                  href={item.resolvedHref}
                  role="menuitem"
                  className="block px-4 py-2 text-[11px] font-bold uppercase tracking-wider hover:opacity-80"
                  style={{ color: accentColor }}
                  onClick={(e) => goTo(e, item.slug)}
                >
                  {item.label} home
                </a>
              </li>
              {item.childItems.map((child) => (
                <li key={`${child.label}-${child.href}`}>
                  <a
                    href={child.resolvedHref}
                    role="menuitem"
                    className="block px-4 py-2 text-[11px] font-bold uppercase tracking-wider hover:opacity-80"
                    style={{
                      color:
                        currentSlug === child.slug
                          ? accentColor
                          : overlay
                            ? "rgba(255,255,255,0.88)"
                            : "#111",
                    }}
                    onClick={(e) => goTo(e, child.slug)}
                  >
                    {child.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  function renderMobileOrSideItem(item: (typeof items)[number]) {
    const active = itemActive(item);
    if (!navLinkHasDropdown(item)) {
      return (
        <li key={`m-${item.label}-${item.href}`}>
          <a
            href={item.resolvedHref}
            onClick={(e) => goTo(e, item.slug)}
            style={{ color: active ? accentColor : undefined }}
          >
            <NavLabel
              label={item.label}
              slug={item.slug}
              active={active}
              iconUrl={item.iconUrl}
              showLabel={item.showLabel}
            />
          </a>
        </li>
      );
    }
    return (
      <li key={`m-${item.label}-${item.href}`} className="space-y-1">
        <a
          href={item.resolvedHref}
          onClick={(e) => goTo(e, item.slug)}
          style={{ color: active ? accentColor : undefined }}
        >
          <NavLabel
            label={item.label}
            slug={item.slug}
            active={active}
            iconUrl={item.iconUrl}
            showLabel={item.showLabel}
          />
        </a>
        <ul className="ml-3 space-y-1 border-l border-black/10 pl-3">
          {item.childItems.map((child) => (
            <li key={`c-${child.label}-${child.href}`}>
              <a
                href={child.resolvedHref}
                onClick={(e) => goTo(e, child.slug)}
                className="text-[11px] font-semibold uppercase tracking-wider opacity-80"
                style={{ color: currentSlug === child.slug ? accentColor : undefined }}
              >
                {child.label}
              </a>
            </li>
          ))}
        </ul>
      </li>
    );
  }

  const brand = (
    <a
      href={resolveHref(siteBase, "home")}
      className="flex shrink-0 items-center gap-2"
      onClick={(e) => goTo(e, "home")}
      title="Home"
      aria-label={`${brandLabel} — Home`}
    >
      {showChromeLogo !== false && titleLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={titleLogo}
          alt={brandLabel}
          className="w-auto object-contain"
          style={{ height: m.logoH, maxWidth: Math.round(m.logoH * 4) }}
        />
      ) : (
        <span
          className="font-bold uppercase"
          style={{
            color: overlayOnSite !== false ? "#fff" : accentColor,
            fontSize: m.brandPx,
            letterSpacing: m.tracking,
          }}
        >
          {brandLabel}
        </span>
      )}
    </a>
  );

  const localeRow = (
    <div
      className="flex flex-wrap items-center gap-1 font-bold uppercase"
      style={{
        color: accentColor,
        fontFamily: "Steelfish, Arial, sans-serif",
        fontSize: Math.max(10, m.fontPx - 1),
        letterSpacing: m.tracking,
      }}
      aria-label="Language"
    >
      {MAYLECOR_LOCALES.map((loc, i) => (
        <span key={loc.code} className="inline-flex items-center gap-1">
          {i > 0 ? <span className="opacity-40">|</span> : null}
          <button
            type="button"
            onClick={() => pickLocale(loc.code)}
            className={locale === loc.code ? "opacity-100" : "opacity-50 hover:opacity-80"}
          >
            {loc.label}
          </button>
        </span>
      ))}
    </div>
  );

  if (layout === "side") {
    return (
      <div className="flex flex-col md:contents">
        <div
          className={`flex items-center justify-between border-b border-black/10 bg-white/92 backdrop-blur-md md:hidden ${
            contained ? "relative z-20" : "sticky top-0 z-30"
          }`}
          style={{ padding: `${m.padY}px ${m.padX}px` }}
        >
          {brand}
          <button
            type="button"
            className="rounded-md border border-black/15 font-bold uppercase tracking-wider"
            style={{
              fontSize: Math.max(9, m.fontPx - 2),
              padding: `${Math.round(m.padY / 3)}px ${Math.round(m.padX / 2)}px`,
            }}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Menu"
          >
            Menu
          </button>
        </div>

        {open ? (
          <nav className="border-b border-black/10 bg-white px-4 py-3 md:hidden" aria-label="Mobile site menu">
            <ul className="flex flex-col" style={{ gap: Math.max(8, m.gap / 2) }}>
              {items.map((item) => renderMobileOrSideItem(item))}
              <li className="pt-2">
                <MaylecorSocialBar links={socialLinks} accentColor={accentColor} variant="pill" />
              </li>
              <li className="pt-2">{localeRow}</li>
            </ul>
          </nav>
        ) : null}

        <aside
          className={`hidden md:flex flex-col border-r border-black/10 bg-white/95 backdrop-blur-md shrink-0 ${
            contained ? "relative z-20 self-stretch min-h-full" : "sticky top-0 z-30 h-dvh"
          }`}
          style={{
            width: m.sideWidth,
            paddingTop: m.padY + 8,
            paddingBottom: m.padY + 8,
            paddingLeft: m.padX,
            paddingRight: m.padX,
            color: "#111",
          }}
          aria-label="Site"
        >
          <div className="mb-6">{brand}</div>
          <nav className="flex flex-1 flex-col" style={{ gap: Math.max(10, m.gap * 0.65) }}>
            <ul className="flex flex-col gap-2">{items.map((item) => renderMobileOrSideItem(item))}</ul>
          </nav>
          <div className="mt-auto space-y-4 pt-4">
            <MaylecorSocialBar links={socialLinks} accentColor={accentColor} variant="rail" />
            {localeRow}
          </div>
        </aside>
      </div>
    );
  }

  const overlay = overlayOnSite !== false;

  return (
    <header
      className={`${
        overlay
          ? "pointer-events-none absolute inset-x-0 top-0 z-[120] bg-gradient-to-b from-black/55 via-black/20 to-transparent"
          : `border-b border-black/10 bg-white/92 backdrop-blur-md ${
              contained ? "relative z-20" : "sticky top-0 z-30"
            }`
      }`}
      style={{ color: overlay ? "#fff" : "#111" }}
      data-kebu-site-nav="1"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`pointer-events-auto mx-auto flex items-center justify-between ${
          overlay ? "drop-shadow-[0_1px_10px_rgba(0,0,0,0.65)]" : ""
        } ${m.size === "fullscreen" ? "w-full max-w-none" : ""}`}
        style={{
          maxWidth: m.maxWidth,
          paddingTop: Math.max(10, m.padY),
          paddingBottom: Math.max(10, m.padY),
          paddingLeft: m.padX,
          paddingRight: m.padX,
          gap: Math.max(8, m.gap / 2),
          flexWrap: "nowrap",
        }}
      >
        {brand}

        <nav
          className="hidden min-w-0 flex-1 items-center justify-center gap-x-4 md:flex md:gap-x-6 lg:gap-x-8"
          aria-label="Site"
          style={{ flexWrap: "nowrap" }}
        >
          {items.map((item) => renderDropdown(item, overlay))}
        </nav>

        <div className="flex shrink-0 flex-nowrap items-center gap-2 sm:gap-3">
          <MaylecorSocialBar links={socialLinks} accentColor={accentColor} variant="pill" />
          <div className="hidden sm:block">{localeRow}</div>
        </div>
      </div>
      {/* Second row only on small screens — one professional bar on desktop */}
      <nav
        className="pointer-events-auto flex w-full flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-white/10 px-4 py-2 md:hidden"
        aria-label="Site pages"
        style={{
          paddingLeft: m.padX,
          paddingRight: m.padX,
        }}
      >
        {items.map((item) => renderDropdown(item, overlay))}
      </nav>
    </header>
  );
}
