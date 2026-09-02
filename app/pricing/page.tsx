import Link from "next/link";
import { KebuMarketingPageShell } from "@/app/components/landing/kebu-marketing-chrome";
import {
  BUSINESS_EMAIL_YEARLY_LABEL,
  SITE_HOSTING_BILLING_LABEL,
  SITE_HOSTING_DESCRIPTION,
} from "@/lib/billing/pricing";
import { KEBU } from "@/lib/kebu-brand";

export const metadata = {
  title: "Pricing — Kebu",
  description: "Simple pricing for building and hosting your business on Kebu.",
};

export default function PricingPage() {
  return (
    <KebuMarketingPageShell activeHref="/pricing">
      <div className="max-w-[900px] mx-auto px-5 sm:px-8 py-16 lg:py-24">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-3" style={{ color: KEBU.orange }}>
          Pricing
        </p>
        <h1
          className="text-4xl lg:text-5xl font-bold mb-4"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Start free. Pay when you go live.
        </h1>
        <p className="text-base leading-relaxed mb-12" style={{ color: KEBU.muted }}>
          Build your site, edit templates, and explore Opportunity OS at no cost. Hosting is billed only when you publish
          a live site.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <div
            className="rounded-2xl p-8"
            style={{ background: KEBU.white, border: `2px solid ${KEBU.black}`, boxShadow: "4px 4px 0 #0A0A0A" }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: KEBU.orange }}>
              Builder
            </p>
            <p className="text-3xl font-black mb-2">Free</p>
            <p className="text-sm mb-6" style={{ color: KEBU.muted }}>
              Templates, editor, Kebu ID draft, Opportunity OS, and Afrique ID.
            </p>
            <ul className="text-sm space-y-2 mb-8" style={{ color: KEBU.muted }}>
              <li>· Visual site editor</li>
              <li>· Template gallery with live previews</li>
              <li>· Business draft & readiness tools</li>
            </ul>
            <Link
              href="/create"
              className="inline-flex rounded-full px-6 py-3 text-xs font-bold uppercase tracking-wider text-white"
              style={{ background: KEBU.orange }}
            >
              Start building
            </Link>
          </div>

          <div
            className="rounded-2xl p-8"
            style={{ background: KEBU.black, color: KEBU.white }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: KEBU.orange }}>
              Live hosting
            </p>
            <p className="text-3xl font-black mb-2">{SITE_HOSTING_BILLING_LABEL}</p>
            <p className="text-sm mb-6 opacity-80">{SITE_HOSTING_DESCRIPTION}</p>
            <ul className="text-sm space-y-2 mb-8 opacity-80">
              <li>· Published on Kebu (Vercel app host)</li>
              <li>· Optional custom domain (when connected)</li>
              <li>· Pay with supported mobile money via JOKO</li>
            </ul>
            <Link
              href="/create/sites"
              className="inline-flex rounded-full px-6 py-3 text-xs font-bold uppercase tracking-wider"
              style={{ background: KEBU.orange, color: KEBU.white }}
            >
              My sites
            </Link>
          </div>
        </div>

        <p className="text-xs mt-10" style={{ color: KEBU.faint }}>
          Business email on your domain — planned at {BUSINESS_EMAIL_YEARLY_LABEL} when Kebu Mail ships. Not billed yet.
        </p>
      </div>
    </KebuMarketingPageShell>
  );
}
