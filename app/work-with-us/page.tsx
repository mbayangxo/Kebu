import Link from "next/link";
import { KebuMarketingPageShell } from "@/app/components/landing/kebu-marketing-chrome";
import { KEBU_SUPPORT_EMAIL } from "@/lib/navigation/marketing-nav";
import { KEBU } from "@/lib/kebu-brand";

export const metadata = { title: "Work for us — Kebu" };

export default function WorkWithUsPage() {
  return (
    <KebuMarketingPageShell activeHref="/work-with-us">
      <div className="max-w-[700px] mx-auto px-5 sm:px-8 py-16 lg:py-24">
        <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-fraunces)" }}>
          Work for us
        </h1>
        <p className="text-base leading-relaxed mb-6" style={{ color: KEBU.muted }}>
          Kebu is building infrastructure for African youth — product, engineering, opportunity research, design, and
          community. We hire people who care about real users, not slide decks.
        </p>
        <p className="text-sm mb-8" style={{ color: KEBU.muted }}>
          Send your portfolio or CV with a short note on what you want to build at Kebu:
        </p>
        <a
          href={`mailto:${KEBU_SUPPORT_EMAIL}?subject=Work%20at%20Kebu`}
          className="inline-flex rounded-full px-6 py-3 text-xs font-bold uppercase tracking-wider text-white"
          style={{ background: KEBU.orange }}
        >
          Apply by email
        </a>
        <p className="text-xs mt-8" style={{ color: KEBU.faint }}>
          No open roles listed yet — we review every serious introduction.
        </p>
      </div>
    </KebuMarketingPageShell>
  );
}
