"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { KebuMark, KebuWordmark } from "./kebu-mark";
import { KEBU } from "@/lib/kebu-brand";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

/** Only routes that are live vertical slices — no sample/static product marketing. */
const PRIMARY = [
  { label: "Business", href: "/business" },
  { label: "Create", href: "/create" },
  { label: "Opportunity", href: "/opportunity" },
  { label: "Countries", href: "/opportunity/countries" },
  { label: "Kebu Score", href: "/ka-score" },
];

function NavDot() {
  return <span style={{ color: "rgba(255,85,0,0.35)" }}>·</span>;
}

export function Nav({ transparent = false }: { transparent?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) {
        setUser(data.user ?? null);
        setAuthReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSignOut() {
    setSigningOut(true);
    setMenuOpen(false);
    await supabase.auth.signOut();
    setUser(null);
    setSigningOut(false);
    router.push("/");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md"
      style={{ background: transparent ? "transparent" : "rgba(255,251,247,0.95)" }}
    >
      <div
        className="h-[3px] w-full"
        style={{ background: `linear-gradient(90deg, ${KEBU.red}, ${KEBU.orange}, ${KEBU.orangeLight})` }}
      />

      <nav style={{ borderBottom: `1px solid ${KEBU.border}` }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 h-[68px] flex items-center justify-between gap-6">
          <Link href="/" className="flex-shrink-0">
            <KebuWordmark size={34} dark />
          </Link>

          <div className="hidden lg:flex items-center gap-4">
            {PRIMARY.map(({ label, href }, i) => (
              <div key={href} className="flex items-center gap-4">
                {i > 0 && <NavDot />}
                <Link
                  href={href}
                  className="text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors"
                  style={{ color: isActive(href) ? KEBU.orange : KEBU.muted }}
                >
                  {label}
                </Link>
              </div>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-5">
            {authReady && user ? (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="inline-flex items-center justify-center font-bold uppercase tracking-[0.1em] rounded-full transition-all hover:bg-black/[0.04] px-5 py-2.5 text-[11px] disabled:opacity-60"
                style={{ border: `2px solid ${KEBU.border}`, color: KEBU.muted, background: KEBU.white }}
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            ) : authReady ? (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center font-bold uppercase tracking-[0.1em] rounded-full transition-all hover:bg-black/[0.04] px-5 py-2.5 text-[11px]"
                  style={{ border: `2px solid ${KEBU.orange}`, color: KEBU.orange, background: KEBU.white }}
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] px-5 py-2.5 rounded-full transition-all hover:brightness-110"
                  style={{ background: KEBU.orange, color: KEBU.white }}
                >
                  <KebuMark size={16} />
                  Start
                </Link>
              </>
            ) : null}
          </div>

          {authReady && user ? (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="lg:hidden text-[11px] font-bold uppercase tracking-[0.1em] px-4 py-2 rounded-full disabled:opacity-60"
              style={{ border: `1px solid ${KEBU.border}`, color: KEBU.muted }}
            >
              {signingOut ? "…" : "Sign out"}
            </button>
          ) : null}

          <button
            type="button"
            className="lg:hidden p-1"
            style={{ color: KEBU.black }}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <div className="space-y-[5px]">
              <span className={`block h-[1.5px] bg-current transition-all duration-300 ${menuOpen ? "w-6 translate-y-[6.5px] rotate-45" : "w-6"}`} />
              <span className={`block h-[1.5px] bg-current transition-all duration-300 ${menuOpen ? "opacity-0 w-0" : "w-4"}`} />
              <span className={`block h-[1.5px] bg-current transition-all duration-300 ${menuOpen ? "w-6 -translate-y-[6.5px] -rotate-45" : "w-6"}`} />
            </div>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="lg:hidden bg-white" style={{ borderBottom: `1px solid ${KEBU.border}` }}>
          <div className="px-5 pt-5 pb-3 space-y-1">
            {PRIMARY.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 py-3 text-sm border-b last:border-0"
                style={{
                  color: isActive(href) ? KEBU.orange : KEBU.black,
                  borderColor: KEBU.border,
                  fontWeight: isActive(href) ? 700 : 500,
                }}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
          </div>
          <div className="px-5 py-5" style={{ borderTop: `1px solid ${KEBU.border}` }}>
            {user ? (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="w-full flex items-center justify-center text-sm font-bold py-3 rounded-full disabled:opacity-60"
                style={{ border: `2px solid ${KEBU.border}`, color: KEBU.muted }}
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="flex-1 flex items-center justify-center text-sm font-bold py-3 rounded-full"
                  style={{ border: `2px solid ${KEBU.orange}`, color: KEBU.orange }}
                  onClick={() => setMenuOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="flex-1 flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-full"
                  style={{ background: KEBU.orange, color: KEBU.white }}
                  onClick={() => setMenuOpen(false)}
                >
                  <KebuMark size={16} />
                  Start
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
