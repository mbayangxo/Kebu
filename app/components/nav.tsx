"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { AlkebulanLion } from "./panther-motif";

const PRIMARY = [
  { label: "Discover", href: "/build" },
  { label: "Create",   href: "/build-business" },
  { label: "Store",    href: "/store/new" },
  { label: "Industry", href: "/industry" },
  { label: "Path",     href: "/path" },
];

const EXPLORE = [
  { label: "Industry Intelligence", href: "/industry" },
  { label: "Programs",              href: "/programs" },
  { label: "Procurement",           href: "/procurement" },
  { label: "Feed",                  href: "/feed" },
  { label: "Countries",             href: "/map" },
  { label: "Network",               href: "/network" },
  { label: "Success Stories",       href: "/success" },
];

const TOOLS = [
  { label: "Ka Score",             href: "/ka-score" },
  { label: "Kebu Builder",          href: "/build-business" },
  { label: "Build vs. Leave",      href: "/compare" },
  { label: "Decode a Product",     href: "/scan" },
  { label: "Local Starts Map",     href: "/starts" },
  { label: "Build a Business",     href: "/build" },
  { label: "Bankability Engine",   href: "/bankability" },
  { label: "AfCFTA Navigator",     href: "/afcfta" },
  { label: "Capital Stack",        href: "/capital-stack" },
  { label: "Community Partners",   href: "/gatekeepers" },
  { label: "AI Assistant",         href: "/assistant" },
  { label: "AI Agents",            href: "/agents" },
];

function NavDot() {
  return <span className="text-gold/30 select-none">·</span>;
}

function Dropdown({
  label,
  items,
}: {
  label: string;
  items: { label: string; href: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
        className="flex items-center gap-1 text-ivory/65 hover:text-gold transition-colors text-[11px] font-semibold uppercase tracking-[0.14em]"
      >
        {label}
        <svg
          width="8"
          height="6"
          viewBox="0 0 8 6"
          fill="none"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M1 1L4 5L7 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-52 bg-[#080620] border border-gold/15 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-50">
          <div className="p-1.5">
            {items.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="block px-3.5 py-2 text-xs text-ivory/70 hover:text-ivory hover:bg-white/5 rounded-xl transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Nav({ transparent = false }: { transparent?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const navBg = transparent
    ? "bg-transparent"
    : "bg-[#080620]";

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <header className={`${navBg} sticky top-0 z-50`}>
      {/* Brand accent stripe */}
      <div className="h-[3px] w-full bg-gradient-to-r from-gold-dark via-gold to-gold-light" />

      {/* Main nav bar */}
      <nav className="border-b border-white/8">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 h-[68px] flex items-center justify-between gap-6">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0 group">
            <AlkebulanLion size={38} className="transition-transform duration-300 group-hover:scale-105" />
            <span
              style={{ letterSpacing: "0.13em", fontFamily: "var(--font-fraunces)", color: "#D4A820" }}
              className="font-bold text-[17px] leading-none hidden sm:block"
            >
              KEBU
            </span>
          </Link>

          {/* ── Desktop nav ── */}
          <div className="hidden lg:flex items-center gap-4">
            {PRIMARY.map(({ label, href }, i) => (
              <div key={href} className="flex items-center gap-4">
                {i > 0 && <NavDot />}
                <Link
                  href={href}
                  className={`text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                    isActive(href)
                      ? "text-gold"
                      : "text-ivory/65 hover:text-gold"
                  }`}
                >
                  {label}
                </Link>
              </div>
            ))}

            <NavDot />
            <Dropdown label="Explore" items={EXPLORE} />
            <NavDot />
            <Dropdown label="Tools" items={TOOLS} />
          </div>

          {/* ── Right side ── */}
          <div className="hidden lg:flex items-center gap-5">
            {/* Subtle editorial marker */}
            <span
              style={{ letterSpacing: "0.18em" }}
              className="text-[9px] font-semibold uppercase text-gold/30 hidden xl:block"
            >
              Africa · Cloud
            </span>

            <Link
              href="/login"
              className="text-ivory/50 hover:text-ivory text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors"
            >
              Sign in
            </Link>

            <Link
              href="/signup"
              className="flex items-center gap-2 bg-gold hover:bg-gold-light text-deep-green text-[11px] font-bold uppercase tracking-[0.1em] px-5 py-2.5 rounded-full transition-colors"
            >
              <AlkebulanLion size={14} />
              Enter the Cloud
            </Link>
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            className="lg:hidden text-ivory/80 hover:text-gold transition-colors p-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <div className="space-y-[5px]">
              <span
                className={`block h-[1.5px] bg-current transition-all duration-300 ${
                  menuOpen ? "w-6 translate-y-[6.5px] rotate-45" : "w-6"
                }`}
              />
              <span
                className={`block h-[1.5px] bg-current transition-all duration-300 ${
                  menuOpen ? "opacity-0 w-0" : "w-4"
                }`}
              />
              <span
                className={`block h-[1.5px] bg-current transition-all duration-300 ${
                  menuOpen ? "w-6 -translate-y-[6.5px] -rotate-45" : "w-6"
                }`}
              />
            </div>
          </button>
        </div>
      </nav>

      {/* ── Mobile menu ── */}
      {menuOpen && (
        <div className="lg:hidden bg-[#080620] border-b border-white/8">
          {/* Primary links */}
          <div className="px-5 pt-5 pb-3 space-y-1">
            <p
              style={{ letterSpacing: "0.18em" }}
              className="text-[9px] font-semibold uppercase text-gold/40 mb-3"
            >
              Navigate
            </p>
            {PRIMARY.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 py-3 text-sm transition-colors border-b border-white/5 last:border-0 ${
                  isActive(href) ? "text-gold" : "text-ivory/75 hover:text-gold"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                <span className="font-semibold">{label}</span>
                {isActive(href) && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gold" />
                )}
              </Link>
            ))}
          </div>

          {/* Explore */}
          <div className="px-5 py-4 border-t border-white/8">
            <p
              style={{ letterSpacing: "0.18em" }}
              className="text-[9px] font-semibold uppercase text-gold/40 mb-3"
            >
              Explore
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {EXPLORE.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-xs text-ivory/60 hover:text-gold py-1.5 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Tools */}
          <div className="px-5 py-4 border-t border-white/8">
            <p
              style={{ letterSpacing: "0.18em" }}
              className="text-[9px] font-semibold uppercase text-gold/40 mb-3"
            >
              Tools
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {TOOLS.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-xs text-ivory/60 hover:text-gold py-1.5 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="px-5 py-5 border-t border-white/8 flex items-center gap-3">
            <Link
              href="/login"
              className="text-ivory/60 text-sm font-medium hover:text-ivory"
              onClick={() => setMenuOpen(false)}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="flex-1 flex items-center justify-center gap-2 bg-gold text-deep-green text-sm font-bold py-3 rounded-full hover:bg-gold-light transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              <AlkebulanLion size={16} />
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
