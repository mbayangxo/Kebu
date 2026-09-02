import Link from "next/link";
import { KebuMarketingPageShell } from "@/app/components/landing/kebu-marketing-chrome";
import { KEBU_SUPPORT_EMAIL } from "@/lib/navigation/marketing-nav";
import { KEBU } from "@/lib/kebu-brand";

export const metadata = {
  title: "Contact us — Kebu",
  description: "Get in touch with the Kebu team.",
};

export default function ContactPage() {
  return (
    <KebuMarketingPageShell activeHref="/contact">
      <div className="max-w-[800px] mx-auto px-5 sm:px-8 py-16 lg:py-24">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-3" style={{ color: KEBU.orange }}>
          Contact us
        </p>
        <h1 className="text-4xl lg:text-5xl font-bold mb-6" style={{ fontFamily: "var(--font-fraunces)" }}>
          Talk to Kebu
        </h1>
        <p className="text-base leading-relaxed mb-8" style={{ color: KEBU.muted }}>
          Questions about your account, building a site, or partnering with Kebu? Email us — we read every message.
        </p>
        <a
          href={`mailto:${KEBU_SUPPORT_EMAIL}`}
          className="inline-flex rounded-full px-8 py-4 text-sm font-bold uppercase tracking-wider text-white"
          style={{ background: KEBU.orange }}
        >
          {KEBU_SUPPORT_EMAIL}
        </a>
        <p className="text-sm mt-8" style={{ color: KEBU.faint }}>
          For help using the product, see the{" "}
          <Link href="/help" className="underline" style={{ color: KEBU.orange }}>
            Help center
          </Link>{" "}
          and{" "}
          <Link href="/faqs" className="underline" style={{ color: KEBU.orange }}>
            FAQs
          </Link>
          .
        </p>
      </div>
    </KebuMarketingPageShell>
  );
}
