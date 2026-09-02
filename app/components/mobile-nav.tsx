"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KebuMark } from "./kebu-mark";
import { useKebuWorkspace } from "@/app/hooks/use-kebu-workspace";
import { workspaceHome } from "@/lib/navigation/kebu-workspace";
import { isMarketingPath } from "@/lib/navigation/marketing-nav";

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

function IconOpportunity({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" />
    </svg>
  );
}

function IconAccount({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth={active ? 2 : 1.5} />
      <path
        d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

const TABS = [
  { href: "/dashboard", label: "Kebu", Icon: IconHome, match: (p: string) => p === "/dashboard" || p === "/welcome" },
  {
    href: "/opportunity",
    label: "Opportunity",
    Icon: IconOpportunity,
    match: (p: string) => p.startsWith("/opportunity"),
  },
  {
    href: "/business",
    label: "Business",
    Icon: IconBusiness,
    center: true,
    match: (p: string) =>
      p.startsWith("/business") ||
      p.startsWith("/create") ||
      p.startsWith("/b2b") ||
      p.startsWith("/ka-score") ||
      p.startsWith("/studio"),
  },
  { href: "/account", label: "Account", Icon: IconAccount, match: (p: string) => p === "/account" },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const { workspace } = useKebuWorkspace();
  const centerHref = workspace ? workspaceHome(workspace) : "/business";

  const isStoreCustomer =
    pathname.startsWith("/store/") &&
    !pathname.startsWith("/store/new") &&
    !pathname.startsWith("/store/dashboard");

  if (
    isStoreCustomer ||
    pathname === "/start" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    isMarketingPath(pathname)
  ) {
    return null;
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        <div className="bg-[#FFFBF7]/95 backdrop-blur-md border-t border-black/10">
          <div className="h-[2px] w-full bg-gradient-to-r from-gold-dark via-gold to-gold-light" />
          <div className="flex items-stretch">
            {TABS.map(({ href, label, Icon, match }, i) => {
              const active = match(pathname);
              const isCenter = i === 2;

              if (isCenter) {
                return (
                  <Link
                    key={href}
                    href={centerHref}
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
