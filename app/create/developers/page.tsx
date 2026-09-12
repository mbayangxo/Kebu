import type { Metadata } from "next";
import Link from "next/link";
import { KEBU } from "@/lib/kebu-brand";
import { DeveloperProgramClient } from "@/app/components/create/developer-program-client";

export const metadata: Metadata = {
  title: "Kebu Developer Program — Sell Templates",
  description: "Build and sell site templates on Kebu. Reach African founders building their first digital presence.",
};

export default function DeveloperProgramPage() {
  return (
    <main className="min-h-screen" style={{ background: KEBU.cream }}>
      {/* Back link */}
      <div className="px-5 pt-5 sm:px-8 lg:px-16">
        <Link
          href="/create/aesthetics"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold"
          style={{ color: KEBU.muted }}
        >
          ← Templates
        </Link>
      </div>

      {/* Hero */}
      <div className="px-5 pt-10 pb-12 sm:px-8 lg:px-16 max-w-2xl">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3"
          style={{ color: KEBU.orange }}
        >
          Developer Program
        </p>
        <h1
          className="text-3xl sm:text-4xl font-black leading-tight mb-4"
          style={{ color: KEBU.black, fontFamily: "var(--font-fraunces)" }}
        >
          Build templates.<br />Sell to African founders.
        </h1>
        <p className="text-base leading-relaxed mb-8" style={{ color: KEBU.muted }}>
          Kebu reaches young entrepreneurs across West Africa building their first digital presence — beauty brands, musicians, boutiques, food businesses. If you build exceptional site templates, you can sell them here.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { label: "Revenue split", value: "70 / 30", note: "You keep 70% of every sale" },
            { label: "Payout", value: "Wave / OM", note: "Wave & Orange Money supported" },
            { label: "Audience", value: "Africa", note: "Côte d'Ivoire, Sénégal & beyond" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl p-4"
              style={{ background: "#fff", border: `1px solid ${KEBU.border}` }}
            >
              <p className="text-2xl font-black mb-0.5" style={{ color: KEBU.black }}>
                {stat.value}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: KEBU.muted }}>
                {stat.label}
              </p>
              <p className="text-[11px]" style={{ color: KEBU.muted }}>
                {stat.note}
              </p>
            </div>
          ))}
        </div>

        {/* Requirements */}
        <div
          className="rounded-2xl p-5 mb-8"
          style={{ background: "#fff", border: `1px solid ${KEBU.border}` }}
        >
          <h2 className="text-base font-bold mb-3" style={{ color: KEBU.black }}>
            What we look for
          </h2>
          <ul className="space-y-2">
            {[
              "Mobile-first design — most Kebu users are on phones",
              "WhatsApp + Joko payment sections included",
              "Prices in XOF and African currencies",
              "Real business content (not lorem ipsum)",
              "Clean, fast-loading with no external dependencies",
              "Unique design — not a copy of existing Kebu templates",
            ].map((req) => (
              <li key={req} className="flex items-start gap-2 text-[12px]" style={{ color: KEBU.black }}>
                <span className="mt-0.5 shrink-0 text-[10px]" style={{ color: KEBU.orange }}>✓</span>
                {req}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Developer signup form */}
      <div
        className="border-t px-5 py-10 sm:px-8 lg:px-16"
        style={{ borderColor: KEBU.border, background: "#fff" }}
      >
        <div className="max-w-lg">
          <h2
            className="text-xl font-black mb-2"
            style={{ color: KEBU.black, fontFamily: "var(--font-fraunces)" }}
          >
            Apply as a developer
          </h2>
          <p className="text-sm mb-6" style={{ color: KEBU.muted }}>
            Create your developer account to start uploading and selling templates.
          </p>
          <DeveloperProgramClient />
        </div>
      </div>
    </main>
  );
}
