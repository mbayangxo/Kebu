import Link from "next/link";
import { KebuMarketingPageShell } from "@/app/components/landing/kebu-marketing-chrome";
import { KEBU } from "@/lib/kebu-brand";

export const metadata = {
  title: "Kebu Icon — digital magazine",
  description: "Stories, culture, and business from African youth — the Kebu Icon digital magazine.",
};

export default function KebuIconPage() {
  return (
    <KebuMarketingPageShell activeHref="/kebu-icon">
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 70% 60% at 100% 0%, rgba(255,85,0,0.2), transparent 55%), ${KEBU.bright}`,
          }}
        />
        <div className="relative max-w-[900px] mx-auto px-5 sm:px-8 py-16 lg:py-24">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-3" style={{ color: KEBU.orange }}>
            Kebu Icon
          </p>
          <h1
            className="text-4xl lg:text-6xl font-black uppercase leading-[0.95] mb-6"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            The digital magazine for African builders.
          </h1>
          <p className="text-lg leading-relaxed mb-8 max-w-2xl" style={{ color: KEBU.muted }}>
            Kebu Icon is where youth culture meets business — founder stories, creative portfolios, opportunity deep
            dives, and the people building across the continent. Not a generic blog: every piece connects back to what you
            can research and build on Kebu.
          </p>
          <div
            className="rounded-2xl p-8 mb-10"
            style={{ background: KEBU.black, color: KEBU.white }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: KEBU.orange }}>
              Now reading
            </p>
            <p className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
              Opportunity stories & country explorer
            </p>
            <p className="text-sm opacity-80 mb-6">
              While the full Icon editorial desk ships, start with verified country pages and entrepreneur stories inside
              Opportunity OS — labeled sources, no fake facts.
            </p>
            <Link
              href="/opportunity"
              className="inline-flex rounded-full px-6 py-3 text-xs font-bold uppercase tracking-wider"
              style={{ background: KEBU.orange, color: KEBU.white }}
            >
              Open Opportunity OS
            </Link>
          </div>
          <p className="text-xs" style={{ color: KEBU.faint }}>
            Want to pitch a story for Kebu Icon?{" "}
            <Link href="/contact" className="underline" style={{ color: KEBU.orange }}>
              Contact us
            </Link>
            .
          </p>
        </div>
      </div>
    </KebuMarketingPageShell>
  );
}
