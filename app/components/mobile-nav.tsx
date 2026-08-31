"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KebuMark } from "./kebu-mark";

function IconHome({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.5}
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
        fillOpacity={active ? 0.15 : 0}
      />
    </svg>
  );
}

function IconBusiness({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
    </svg>
  );
}

function IconCreate({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth={active ? 2 : 1.5} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
      <rect x="14" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth={active ? 2 : 1.5} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
      <rect x="8" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth={active ? 2 : 1.5} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
    </svg>
  );
}

function IconOpportunity({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" />
    </svg>
  );
}

/** Live product tabs only — no sample path/matches/programs. */
const TABS = [
  { href: "/", label: "Home", Icon: IconHome },
  { href: "/opportunity/countries", label: "Countries", Icon: IconOpportunity },
  { href: "/create", label: "Create", Icon: IconCreate },
  { href: "/business", label: "Business", Icon: IconBusiness },
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
        <div className="bg-[#FFFBF7]/95 backdrop-blur-md border-t border-black/10">
          <div className="h-[2px] w-full bg-gradient-to-r from-gold-dark via-gold to-gold-light" />
          <div className="flex items-stretch">
            {TABS.map(({ href, label, Icon }, i) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              const isCenter = i === 2;

              if (isCenter) {
                return (
                  <Link
                    key={href}
                    href={href}
                    className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative"
                  >
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
                        active ? "bg-gold shadow-lg shadow-gold/30" : "bg-black/5 hover:bg-black/8"
                      }`}
                    >
                      <KebuMark size={22} />
                    </div>
                    <span
                      className={`text-[9px] font-semibold uppercase tracking-[0.1em] leading-none mt-0.5 ${
                        active ? "text-gold" : "text-ink/45"
                      }`}
                    >
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
                    active ? "text-gold" : "text-ink/40 hover:text-ink/70"
                  }`}
                >
                  <Icon active={active} />
                  <span className="text-[9px] font-semibold uppercase tracking-[0.1em] leading-none">{label}</span>
                </Link>
              );
            })}
          </div>
          <div className="h-safe-bottom bg-[#FFFBF7]/95" />
        </div>
      </nav>
      <div className="h-20 lg:hidden" aria-hidden />
    </>
  );
}
