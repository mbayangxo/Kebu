"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlkebulanLion } from "./panther-motif";

function IconHome({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z"
        stroke="currentColor" strokeWidth={active ? 2 : 1.5}
        strokeLinejoin="round" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0}
      />
    </svg>
  );
}

function IconPath({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M3 17C3 17 6 14 9 14C12 14 12 17 15 17C18 17 21 14 21 14" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" />
      <path d="M3 10C3 10 6 7 9 7C12 7 12 10 15 10C18 10 21 7 21 7" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" />
    </svg>
  );
}

function IconMatches({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinejoin="round" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
    </svg>
  );
}

function IconBuild({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth={active ? 2 : 1.5} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
      <rect x="14" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth={active ? 2 : 1.5} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
      <rect x="8" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth={active ? 2 : 1.5} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
    </svg>
  );
}

function IconPrograms({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
      <path d="M20 20L17 17" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" />
    </svg>
  );
}

const TABS = [
  { href: "/",        label: "Home",     Icon: IconHome },
  { href: "/path",    label: "My Path",  Icon: IconPath },
  { href: "/matches", label: "Matches",  Icon: IconMatches },
  { href: "/build",   label: "Build",    Icon: IconBuild },
  { href: "/programs",label: "Programs", Icon: IconPrograms },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  const isStoreCustomer =
    pathname.startsWith("/store/") &&
    !pathname.startsWith("/store/new") &&
    !pathname.startsWith("/store/dashboard");

  if (isStoreCustomer || pathname === "/") return null;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        {/* Frosted glass effect */}
        <div className="bg-[#080620]/95 backdrop-blur-md border-t border-white/8">
          {/* Thin accent stripe at top */}
          <div className="h-[2px] w-full bg-gradient-to-r from-gold-dark via-gold to-gold-light" />
          <div className="flex items-stretch">
            {TABS.map(({ href, label, Icon }, i) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              const isCenter = i === Math.floor(TABS.length / 2);

              if (isCenter) {
                return (
                  <Link
                    key={href}
                    href={href}
                    className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative"
                  >
                    {/* Center tab — slightly elevated lion button */}
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
                      active ? "bg-gold shadow-lg shadow-gold/30" : "bg-white/10 hover:bg-white/15"
                    }`}>
                      <AlkebulanLion size={22} />
                    </div>
                    <span className={`text-[9px] font-semibold uppercase tracking-[0.1em] leading-none mt-0.5 ${
                      active ? "text-gold" : "text-ivory/45"
                    }`}>
                      {label}
                    </span>
                  </Link>
                );
              }

              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
                    active ? "text-gold" : "text-ivory/40 hover:text-ivory/70"
                  }`}
                >
                  <Icon active={active} />
                  <span className="text-[9px] font-semibold uppercase tracking-[0.1em] leading-none">
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="h-safe-bottom bg-[#080620]/95" />
        </div>
      </nav>
      <div className="h-20 lg:hidden" aria-hidden />
    </>
  );
}
