import Link from "next/link";
import { KebuMarketingPageShell } from "@/app/components/landing/kebu-marketing-chrome";
import { KEBU_SUPPORT_EMAIL } from "@/lib/navigation/marketing-nav";
import { KEBU } from "@/lib/kebu-brand";

export const metadata = { title: "Support — Kebu" };

export default function SupportPage() {
  return (
    <KebuMarketingPageShell activeHref="/support">
      <div className="max-w-[700px] mx-auto px-5 sm:px-8 py-16 lg:py-24">
        <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-fraunces)" }}>
          Support
        </h1>
        <p className="text-base mb-6" style={{ color: KEBU.muted }}>
          We&apos;re here for account issues, publishing problems, and product questions.
        </p>
        <ul className="space-y-3 text-sm mb-8" style={{ color: KEBU.muted }}>
          <li>
            · Email:{" "}
            <a href={`mailto:${KEBU_SUPPORT_EMAIL}`} className="underline" style={{ color: KEBU.orange }}>
              {KEBU_SUPPORT_EMAIL}
            </a>
          </li>
          <li>
            ·{" "}
            <Link href="/help" className="underline" style={{ color: KEBU.orange }}>
              Help center
            </Link>
          </li>
          <li>
            ·{" "}
            <Link href="/faqs" className="underline" style={{ color: KEBU.orange }}>
              FAQs
            </Link>
          </li>
        </ul>
      </div>
    </KebuMarketingPageShell>
  );
}
