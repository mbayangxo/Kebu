"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KebuWordmark } from "@/app/components/kebu-mark";
import { KebuAuthHeaderCTA } from "@/app/components/kebu-auth-header-cta";
import { useKebuUser } from "@/app/hooks/use-kebu-user";
import { KEBU_MARKETING_FOOTER, KEBU_MARKETING_NAV } from "@/lib/navigation/marketing-nav";
import { KEBU } from "@/lib/kebu-brand";
import { Z_LAYERS } from "@/app/components/create/kebu-z-layers";

const C = {
  ...KEBU,
  ink: KEBU.black,
  paper: KEBU.bright,
  muted: KEBU.muted,
  faint: KEBU.faint,
} as const;

export function KebuMarketingHeader({ activeHref }: { activeHref?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { profile, loading: profileLoading } = useKebuUser();

  // Real drawer dismissal: Escape always closes it, on top of the backdrop click already below.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md" style={{ background: "rgba(255,251,247,0.92)" }}>
      <div
        className="h-[4px] w-full"
        style={{ background: `linear-gradient(90deg, ${C.red}, ${C.orange}, ${C.orangeLight})` }}
      />
      <nav style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 h-[68px] flex items-center justify-between gap-4">
          <Link href="/" className="flex-shrink-0">
            <KebuWordmark size={36} dark />
          </Link>

          <div className="hidden lg:flex items-center gap-6 text-[11px] font-semibold uppercase tracking-[0.14em]">
            {KEBU_MARKETING_NAV.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="transition-colors hover:text-[#FF5500]"
                style={{ color: activeHref === href ? C.orange : C.muted }}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/create"
              className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border"
              style={{ borderColor: C.border, color: C.muted }}
            >
              Builder
            </Link>
            <KebuAuthHeaderCTA orange={C.orange} white={C.white} />
            <button
              type="button"
              className="lg:hidden rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
              style={{ borderColor: C.border, color: C.muted }}
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="marketing-mobile-menu"
            >
              {menuOpen ? "Close" : "Menu"}
            </button>
          </div>
        </div>
      </nav>
      {menuOpen ? (
        <>
          {/* Backdrop starts below the header row (not inset-0) so the Close button above stays
              clickable without needing to hit the backdrop first — a second, redundant dismissal. */}
          <div
            className="lg:hidden fixed inset-x-0 bottom-0"
            style={{ top: 72, background: "rgba(0,0,0,0.35)", zIndex: Z_LAYERS.drawerBackdrop }}
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div
            id="marketing-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="lg:hidden fixed inset-x-0 border-t px-5 py-4 space-y-3 shadow-xl"
            style={{ top: 72, borderColor: C.border, background: C.paper, zIndex: Z_LAYERS.drawerPanel }}
          >
            {KEBU_MARKETING_NAV.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="block text-xs font-bold uppercase tracking-wider"
                style={{ color: activeHref === href ? C.orange : C.muted }}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
            {/* Sign in is hidden from the header row below sm: (see KebuAuthHeaderCTA) — surface it
                here instead of dropping it, and hide it again once the header's own pill takes over. */}
            {!profileLoading && !profile ? (
              <Link
                href="/login"
                className="sm:hidden block pt-3 text-xs font-bold uppercase tracking-wider"
                style={{ color: C.orange, borderTop: `1px solid ${C.border}` }}
                onClick={() => setMenuOpen(false)}
              >
                Sign in
              </Link>
            ) : null}
          </div>
        </>
      ) : null}
    </header>
  );
}

export function KebuMarketingFooter() {
  return (
    <footer style={{ background: C.paper, borderTop: `1px solid ${C.border}` }}>
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-3">
              <KebuWordmark size={28} dark />
            </div>
            <p className="text-xs leading-relaxed" style={{ color: C.faint }}>
              Africa&apos;s AI business builder and opportunity operating system — for youth who want to build something
              real.
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: C.orange }}>
              Company
            </p>
            <div className="space-y-2">
              {KEBU_MARKETING_NAV.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="block text-xs transition-colors hover:text-[#FF5500]"
                  style={{ color: C.muted }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: C.orange }}>
              Product
            </p>
            <div className="space-y-2">
              {[
                ["Opportunity OS", "/opportunity"],
                ["Kebu Builder", "/create"],
                ["Kebu Business", "/business"],
                ["Your profile", "/account"],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="block text-xs transition-colors hover:text-[#FF5500]"
                  style={{ color: C.muted }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: C.orange }}>
              Legal & help
            </p>
            <div className="space-y-2">
              {KEBU_MARKETING_FOOTER.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="block text-xs transition-colors hover:text-[#FF5500]"
                  style={{ color: C.muted }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div
          className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderTop: `1px solid ${C.border}` }}
        >
          <p className="text-[11px]" style={{ color: C.faint }}>
            © {new Date().getFullYear()} Kebu. Public sources labeled · AI analysis labeled separately.
          </p>
        </div>
      </div>
    </footer>
  );
}

export function KebuMarketingPageShell({
  children,
  activeHref,
}: {
  children: React.ReactNode;
  activeHref?: string;
}) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.paper, color: C.ink }}>
      <KebuMarketingHeader activeHref={activeHref} />
      <main className="flex-1">{children}</main>
      <KebuMarketingFooter />
    </div>
  );
}
