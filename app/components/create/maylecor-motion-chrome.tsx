"use client";

import { useEffect, useState } from "react";
import {
  MAYLECOR_LOCALES,
  MAYLECOR_NAV_SLUGS,
  MAYLECOR_LOCALE_STORAGE_KEY,
  maylecorHomeLabel,
  maylecorNavLabel,
  parseMaylecorLocale,
  type MaylecorLocale,
} from "@/lib/create/maylecor-site-i18n";

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
}: {
  siteBase: string;
  brandLabel: string;
  titleLogo?: string;
  currentSlug?: string;
  accentColor?: string;
}) {
  const [locale, setLocale] = useState<MaylecorLocale>("en");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const stored = parseMaylecorLocale(localStorage.getItem(MAYLECOR_LOCALE_STORAGE_KEY));
    setLocale(stored);
  }, []);

  const pickLocale = (code: MaylecorLocale) => {
    setLocale(code);
    localStorage.setItem(MAYLECOR_LOCALE_STORAGE_KEY, code);
  };

  const navClass = (slug: string) =>
    `text-xs font-bold uppercase tracking-[0.2em] transition-opacity hover:opacity-70 ${
      currentSlug === slug ? "opacity-100" : "opacity-60"
    }`;

  return (
    <header
      className="sticky top-0 z-[100010] border-b border-black/10 bg-white/92 backdrop-blur-md"
      style={{ color: "#111" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a href={resolveHref(siteBase, "home")} className="flex shrink-0 items-center gap-2">
          {titleLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={titleLogo} alt={brandLabel} className="h-8 w-auto max-w-[120px] object-contain" />
          ) : (
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: accentColor }}>
              {brandLabel}
            </span>
          )}
        </a>

        <nav className="hidden items-center gap-5 lg:flex" aria-label="Site">
          <a href={resolveHref(siteBase, "home")} className={navClass("home")} style={{ color: accentColor }}>
            {maylecorHomeLabel(locale)}
          </a>
          {MAYLECOR_NAV_SLUGS.map((slug) => (
            <a key={slug} href={resolveHref(siteBase, slug)} className={navClass(slug)}>
              {maylecorNavLabel(slug, locale)}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div
            className="hidden items-center gap-1 text-xs font-bold uppercase tracking-wider sm:flex"
            style={{ color: accentColor, fontFamily: "Steelfish, Arial, sans-serif" }}
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

          <button
            type="button"
            className="lg:hidden rounded-md border border-black/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Menu"
          >
            Menu
          </button>
        </div>
      </div>

      {open ? (
        <nav
          className="border-t border-black/10 px-4 py-4 lg:hidden"
          aria-label="Mobile site menu"
        >
          <ul className="flex flex-col gap-3">
            <li>
              <a href={resolveHref(siteBase, "home")} className={navClass("home")} style={{ color: accentColor }}>
                {maylecorHomeLabel(locale)}
              </a>
            </li>
            {MAYLECOR_NAV_SLUGS.map((slug) => (
              <li key={slug}>
                <a href={resolveHref(siteBase, slug)} className={navClass(slug)}>
                  {maylecorNavLabel(slug, locale)}
                </a>
              </li>
            ))}
            <li className="flex gap-2 pt-2">
              {MAYLECOR_LOCALES.map((loc) => (
                <button
                  key={loc.code}
                  type="button"
                  onClick={() => pickLocale(loc.code)}
                  className="text-xs font-bold uppercase"
                  style={{ color: locale === loc.code ? accentColor : "#666" }}
                >
                  {loc.label}
                </button>
              ))}
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
