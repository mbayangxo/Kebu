import Link from "next/link";
import { KebuMarketingPageShell } from "@/app/components/landing/kebu-marketing-chrome";
import { KEBU } from "@/lib/kebu-brand";

export const metadata = { title: "Help center — Kebu" };

const TOPICS = [
  { title: "Create your first site", href: "/create", body: "Pick a template, edit in the builder, publish when ready." },
  { title: "Kebu ID & business", href: "/business", body: "Draft your business identity and track registration readiness." },
  { title: "Opportunity OS", href: "/opportunity", body: "Explore countries and personalized opportunity paths." },
  { title: "Account & Afrique ID", href: "/account", body: "Your personal profile separate from your business." },
  { title: "Templates gallery", href: "/templates", body: "Live preview every template before you start." },
  { title: "Pricing", href: "/pricing", body: "Free to build; hosting when you publish." },
];

export default function HelpCenterPage() {
  return (
    <KebuMarketingPageShell activeHref="/help">
      <div className="max-w-[800px] mx-auto px-5 sm:px-8 py-16 lg:py-24">
        <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-fraunces)" }}>
          Help center
        </h1>
        <p className="text-base mb-10" style={{ color: KEBU.muted }}>
          Quick paths into live Kebu features. More guides ship as products mature.
        </p>
        <div className="space-y-4">
          {TOPICS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="block rounded-xl p-5 transition-colors hover:border-[#FF5500]"
              style={{ border: `1px solid ${KEBU.border}`, background: KEBU.white }}
            >
              <p className="font-bold text-sm mb-1">{t.title}</p>
              <p className="text-xs" style={{ color: KEBU.muted }}>
                {t.body}
              </p>
            </Link>
          ))}
        </div>
        <p className="text-sm mt-10">
          <Link href="/support" className="underline" style={{ color: KEBU.orange }}>
            Contact support
          </Link>{" "}
          ·{" "}
          <Link href="/faqs" className="underline" style={{ color: KEBU.orange }}>
            FAQs
          </Link>
        </p>
      </div>
    </KebuMarketingPageShell>
  );
}
