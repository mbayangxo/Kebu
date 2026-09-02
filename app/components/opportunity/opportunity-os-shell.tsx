"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { KEBU } from "@/lib/kebu-brand";

const TABS = [
  { href: "/opportunity", label: "For you", exact: true },
  { href: "/welcome", label: "About you", exact: false },
  { href: "/opportunity/countries", label: "Countries", exact: false },
] as const;

export function OpportunityOsShell({
  title,
  eyebrow = "Opportunity OS",
  headline,
  subhead,
  children,
  heroVisual,
}: {
  title: string;
  eyebrow?: string;
  headline: string;
  subhead?: string;
  children: React.ReactNode;
  heroVisual?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AppShell title={title}>
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 10% -10%, rgba(255,85,0,0.18), transparent 55%),
              radial-gradient(ellipse 60% 50% at 90% 0%, rgba(225,6,0,0.12), transparent 50%),
              linear-gradient(180deg, ${KEBU.cream} 0%, ${KEBU.bright} 40%, ${KEBU.white} 100%)
            `,
          }}
        />

        <div className="relative max-w-6xl mx-auto px-5 pt-8 pb-4 lg:pt-12">
          <nav className="flex gap-2 mb-8 overflow-x-auto pb-1">
            {TABS.map((tab) => {
              const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="shrink-0 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all"
                  style={{
                    background: active ? KEBU.orange : "rgba(255,255,255,0.7)",
                    color: active ? "#fff" : KEBU.black,
                    border: active ? "none" : `1px solid ${KEBU.border}`,
                    boxShadow: active ? "0 8px 24px rgba(255,85,0,0.25)" : "none",
                  }}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-12 items-center mb-10 lg:mb-14">
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.28em] mb-4"
                style={{ color: KEBU.orange }}
              >
                {eyebrow}
              </p>
              <h1
                className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.05] mb-4"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {headline}
              </h1>
              {subhead ? (
                <p className="text-base max-w-xl leading-relaxed" style={{ color: KEBU.muted }}>
                  {subhead}
                </p>
              ) : null}
            </div>
            {heroVisual ? <div className="relative min-h-[200px] lg:min-h-[280px]">{heroVisual}</div> : null}
          </div>
        </div>

        <div className="relative max-w-6xl mx-auto px-5 pb-16">{children}</div>
      </div>
    </AppShell>
  );
}
