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
        className="h-[3px] w-full"
        style={{ background: `linear-gradient(90deg, ${C.red}, ${C.orange}, ${C.orangeLight})` }}
      />
      <nav style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 h-[62px] flex items-center justify-between gap-4">
          <Link href="/" className="flex-shrink-0">
            <KebuWordmark size={36} dark />
          </Link>

          <div className="hidden lg:flex items-center gap-5 text-[11px] font-semibold tracking-[0.02em]">
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
              className="hidden sm:inline-flex text-[10px] font-semibold px-3 py-1.5 rounded-md border"
              style={{ borderColor: C.border, color: C.muted }}
            >
              Builder
            </Link>
            <KebuAuthHeaderCTA orange={C.orange} white={C.white} />
            <button
              type="button"
              className="lg:hidden rounded-md border px-2.5 py-1.5 text-[10px] font-semibold"
              style={{ borderColor: C.border, color: C.muted }}
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="marketing-mobile-menu"
            >
              Menu
            </button>
          </div>
        </div>
      </nav>

      {/* Full-screen dark mobile nav — covers the whole viewport like Shopify's mobile menu */}
      {menuOpen ? (
        <div
          id="marketing-mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className="lg:hidden fixed inset-0 flex flex-col"
          style={{ background: C.black, zIndex: Z_LAYERS.modalPanel }}
        >
          {/* Top bar inside the overlay */}
          <div
            className="flex items-center justify-between px-5 h-[72px] shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Link href="/" onClick={() => setMenuOpen(false)}>
              <KebuWordmark size={32} dark={false} />
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="w-10 h-10 flex items-center justify-center rounded-lg text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              style={{ color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.08)" }}
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M3 3l10 10M13 3 3 13" strokeLinecap="round"/></svg>
            </button>
          </div>

          {/* Nav items — large text with dividers */}
          <nav className="flex-1 overflow-y-auto px-5 pt-2">
            {KEBU_MARKETING_NAV.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between py-5"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  color: activeHref === href ? C.orange : C.white,
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                }}
                onClick={() => setMenuOpen(false)}
              >
                {label}
                <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "1rem" }}>→</span>
              </Link>
            ))}
          </nav>

          {/* Bottom CTAs */}
          <div className="px-5 py-6 space-y-3 shrink-0">
            {!profileLoading && !profile ? (
              <Link
                href="/login"
                className="block w-full text-center py-3.5 rounded-lg text-sm font-semibold"
                style={{ border: "2px solid rgba(255,255,255,0.25)", color: C.white }}
                onClick={() => setMenuOpen(false)}
              >
                Log in
              </Link>
            ) : null}
            <Link
              href={profile ? "/dashboard" : "/signup"}
              className="block w-full text-center py-3.5 rounded-lg text-sm font-semibold"
              style={{ background: C.white, color: C.black }}
              onClick={() => setMenuOpen(false)}
            >
              {profile ? "Your Kebu" : "Start for free"}
            </Link>
          </div>
        </div>
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
              One Kebu for creating, working, selling, communicating and finding opportunities.
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
