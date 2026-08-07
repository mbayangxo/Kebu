import Link from "next/link";
import { AlkebulanLion } from "@/app/components/panther-motif";

export default function OpportunityOsHubPage() {
  return (
    <div className="min-h-screen" style={{ background: "#FAFAF8", color: "#0F0D33" }}>
      <header className="sticky top-0 z-40" style={{ background: "#0F0D33" }}>
        <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #009E40, #00C851)" }} />
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white text-sm">
            <AlkebulanLion size={28} />
            <span className="font-bold tracking-[0.12em]">Opportunity OS</span>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-12">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: "#009E40" }}>
          African Cloud
        </p>
        <h1 className="text-4xl font-bold mb-3" style={{ fontFamily: "var(--font-fraunces)" }}>
          Opportunity Operating System
        </h1>
        <p className="text-sm mb-10 max-w-xl" style={{ color: "#6B5B45", lineHeight: 1.7 }}>
          Discover what to build and how to build it — using curated public information, clearly labeled AI
          analysis, and Kebu business tools. Not a blog.
        </p>

        <Link
          href="/opportunity/countries"
          className="block rounded-2xl p-6 mb-4"
          style={{ background: "#0F0D33", color: "#FAFAF8" }}
        >
          <p className="text-[10px] uppercase tracking-wider text-[#00C851] mb-2">Slice 1 · live</p>
          <p className="text-xl font-bold mb-1">Country Explorer</p>
          <p className="text-sm text-white/60">Verified country profiles with optional AI opportunity analysis.</p>
        </Link>

        <div className="grid sm:grid-cols-2 gap-3">
          {[
            "Industry Explorer",
            "Resource Explorer",
            "Import Explorer",
            "Export Explorer",
            "Opportunity Explorer",
            "Opportunity AI",
            "Build This Business",
          ].map((label) => (
            <div
              key={label}
              className="rounded-2xl p-4"
              style={{ background: "#fff", border: "1px solid #DDE0F0", opacity: 0.7 }}
            >
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-[11px] mt-1" style={{ color: "#8A8578" }}>
                Later slice — not started
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
