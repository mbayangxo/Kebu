"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { KebuMark } from "@/app/components/kebu-mark";
import { KEBU } from "@/lib/kebu-brand";
import {
  WORKSPACE_OPTIONS,
  storeWorkspace,
  type KebuWorkspace,
} from "@/lib/navigation/kebu-workspace";

export function KebuWorkspacePicker({
  nextPath,
  compact = false,
}: {
  /** After pick, go here instead of workspace home (e.g. welcome intake). */
  nextPath?: string;
  compact?: boolean;
}) {
  const router = useRouter();

  function pick(id: KebuWorkspace, homeHref: string) {
    storeWorkspace(id);
    router.push(nextPath?.trim() ? nextPath : homeHref);
    router.refresh();
  }

  return (
    <div className={compact ? "space-y-3" : "min-h-screen flex flex-col"} style={{ background: KEBU.bright }}>
      {!compact ? (
        <>
          <div
            className="pointer-events-none fixed inset-0"
            style={{
              background: `radial-gradient(ellipse 70% 50% at 80% 0%, rgba(255,85,0,0.15), transparent 55%), radial-gradient(ellipse 50% 40% at 0% 100%, rgba(225,6,0,0.08), transparent 50%)`,
            }}
            aria-hidden
          />
          <header className="relative z-10 px-6 pt-10 pb-4 text-center">
            <Link href="/" className="inline-flex flex-col items-center gap-2">
              <KebuMark size={48} />
              <span
                className="text-sm font-black uppercase tracking-[0.22em]"
                style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
              >
                Kebu
              </span>
            </Link>
            <h1
              className="mt-6 text-2xl sm:text-3xl font-black"
              style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
            >
              What do you want to do today?
            </h1>
            <p className="mt-2 text-sm max-w-md mx-auto" style={{ color: KEBU.muted }}>
              One account — everything connects. Pick a starting point; switch anytime from the sidebar.
            </p>
          </header>
        </>
      ) : (
        <p className="text-xs" style={{ color: KEBU.muted }}>
          Switch workspace — your sites, business, and designs stay linked.
        </p>
      )}

      <div
        className={`relative z-10 grid gap-4 ${compact ? "" : "flex-1 px-4 pb-12 max-w-4xl mx-auto w-full sm:grid-cols-3 content-start pt-4"}`}
      >
        {WORKSPACE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => pick(opt.id, opt.homeHref)}
            className="text-left rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{
              background: KEBU.white,
              border: `2px solid ${KEBU.black}`,
              boxShadow: compact ? "2px 2px 0 rgba(10,10,10,0.9)" : "4px 4px 0 rgba(10,10,10,1)",
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: KEBU.orange }}>
              {opt.id === "business" ? "Build & sell" : opt.id === "studio" ? "Design" : "Discover"}
            </p>
            <h2 className="text-lg font-black mb-1" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>
              {opt.title}
            </h2>
            <p className="text-xs leading-relaxed mb-3" style={{ color: KEBU.muted }}>
              {opt.subtitle}
            </p>
            <ul className="text-[11px] space-y-1" style={{ color: KEBU.black }}>
              {opt.bullets.map((b) => (
                <li key={b}>· {b}</li>
              ))}
            </ul>
            <span className="inline-block mt-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.red }}>
              Open {opt.title} →
            </span>
          </button>
        ))}
      </div>

      {!compact ? (
        <p className="relative z-10 text-center text-[11px] pb-8 px-4" style={{ color: KEBU.muted }}>
          <strong>My Account</strong> shows everything you are doing across Kebu — sites, business, designs, and
          opportunities.
        </p>
      ) : null}
    </div>
  );
}
