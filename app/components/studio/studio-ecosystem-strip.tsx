"use client";

import Link from "next/link";

/**
 * Studio → Builder → Shop → Reach continuum (Mail/Cloud when live).
 * Honest labels — never fake Mail/Cloud send.
 */
export function StudioEcosystemStrip({ compact }: { compact?: boolean }) {
  const steps: { label: string; href: string | null; live: boolean; hint: string }[] = [
    { label: "Studio", href: "/studio", live: true, hint: "Create" },
    { label: "Builder", href: "/create", live: true, hint: "Website" },
    { label: "Shop", href: "/shop", live: true, hint: "Sell" },
    { label: "Reach", href: "/reach", live: true, hint: "Promote" },
    { label: "Mail", href: null, live: false, hint: "Later" },
    { label: "Cloud", href: null, live: false, hint: "Later" },
  ];

  return (
    <nav
      aria-label="Kebu creation pipeline"
      className={`rounded-2xl border border-black/10 bg-white ${compact ? "px-3 py-2" : "px-4 py-3"}`}
    >
      {!compact ? (
        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 mb-2">
          One ecosystem
        </p>
      ) : null}
      <ol className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-center gap-1.5">
            {i > 0 ? <span className="opacity-30" aria-hidden>→</span> : null}
            {s.live && s.href ? (
              <Link
                href={s.href}
                className="rounded-full px-2.5 py-1 bg-[#FFF8F0] hover:bg-orange-50 border border-black/5"
                title={s.hint}
              >
                {s.label}
              </Link>
            ) : (
              <span
                className="rounded-full px-2.5 py-1 opacity-40 border border-dashed border-black/15"
                title={`${s.label} not live yet`}
              >
                {s.label}
              </span>
            )}
          </li>
        ))}
      </ol>
      {!compact ? (
        <p className="text-[10px] opacity-50 mt-2 leading-relaxed">
          Create in Studio → put it on your site → sell → promote. Mail & Cloud join when those products
          ship — not fake buttons.
        </p>
      ) : null}
    </nav>
  );
}
