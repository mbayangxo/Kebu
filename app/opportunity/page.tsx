import Link from "next/link";
import { KebuWordmark } from "@/app/components/kebu-mark";
import { KEBU } from "@/lib/kebu-brand";

/** Opportunity OS hub — only live slices are clickable. No fake future-product cards. */
export default function OpportunityOsHubPage() {
  return (
    <div className="min-h-screen" style={{ background: KEBU.bright, color: KEBU.black }}>
      <header className="sticky top-0 z-40 backdrop-blur-md" style={{ background: "rgba(255,251,247,0.92)" }}>
        <div
          className="h-[3px] w-full"
          style={{ background: `linear-gradient(90deg, ${KEBU.red}, ${KEBU.orange})` }}
        />
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between" style={{ borderBottom: `1px solid ${KEBU.border}` }}>
          <Link href="/" className="flex items-center gap-2 text-sm">
            <KebuWordmark size={28} dark />
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: KEBU.muted }}>
            Opportunity OS
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-12">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-3"
          style={{ color: KEBU.orange }}
        >
          Live now
        </p>
        <h1 className="text-4xl font-bold mb-3" style={{ fontFamily: "var(--font-fraunces)" }}>
          Opportunity Operating System
        </h1>
        <p className="text-sm mb-10 max-w-xl" style={{ color: KEBU.muted, lineHeight: 1.7 }}>
          Discover what to build and how — using curated public information, clearly labeled AI analysis, and Kebu
          business tools. Not a blog.
        </p>

        <Link
          href="/opportunity/countries"
          className="block rounded-2xl p-6 mb-6 bg-white transition-transform hover:-translate-y-0.5"
          style={{ border: `1px solid ${KEBU.border}`, boxShadow: "0 12px 32px rgba(255,85,0,0.08)" }}
        >
          <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: KEBU.orange }}>
            Slice 1 · live · Supabase
          </p>
          <p className="text-xl font-bold mb-1" style={{ color: KEBU.black }}>
            Country Explorer
          </p>
          <p className="text-sm" style={{ color: KEBU.muted }}>
            Verified country profiles with optional AI opportunity analysis. Requires migration 009 applied.
          </p>
        </Link>

        <p className="text-xs leading-relaxed" style={{ color: KEBU.faint }}>
          Industry, Resource, Import/Export explorers and Build This Business are not started yet — we build one
          complete slice at a time. Do not treat sample opportunity cards elsewhere on the site as Opportunity OS
          until they are DB-backed.
        </p>
      </main>
    </div>
  );
}
