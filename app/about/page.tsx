import Link from "next/link";
import { KebuMarketingPageShell } from "@/app/components/landing/kebu-marketing-chrome";
import { KEBU } from "@/lib/kebu-brand";

export const metadata = {
  title: "About us — Kebu",
  description: "Kebu helps African youth discover opportunity and build real businesses.",
};

export default function AboutPage() {
  return (
    <KebuMarketingPageShell activeHref="/about">
      <div className="max-w-[800px] mx-auto px-5 sm:px-8 py-16 lg:py-24">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-3" style={{ color: KEBU.orange }}>
          About us
        </p>
        <h1 className="text-4xl lg:text-5xl font-bold mb-6" style={{ fontFamily: "var(--font-fraunces)" }}>
          Built for African youth who want to build something real.
        </h1>
        <div className="space-y-5 text-base leading-relaxed" style={{ color: KEBU.muted }}>
          <p>
            Kebu is an AI-powered business builder and Opportunity Operating System. We help you answer two questions:
            <strong style={{ color: KEBU.black }}> what should I build?</strong> and{" "}
            <strong style={{ color: KEBU.black }}>how do I build it?</strong>
          </p>
          <p>
            Your personal account (Afrique ID) stays separate from your business (Kebu ID). That way your identity as a
            person never gets mixed up with your company, store, or score.
          </p>
          <p>
            We label verified public information separately from AI-generated analysis — so you always know what is a fact
            and what needs validation.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 mt-10">
          <Link
            href="/opportunity"
            className="rounded-full px-6 py-3 text-xs font-bold uppercase tracking-wider text-white"
            style={{ background: KEBU.orange }}
          >
            Explore Opportunity OS
          </Link>
          <Link
            href="/create"
            className="rounded-full px-6 py-3 text-xs font-bold uppercase tracking-wider border"
            style={{ borderColor: KEBU.border, color: KEBU.muted }}
          >
            Kebu Builder
          </Link>
        </div>
      </div>
    </KebuMarketingPageShell>
  );
}
