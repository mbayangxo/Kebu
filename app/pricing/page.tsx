import Link from "next/link";
import { KebuMarketingPageShell } from "@/app/components/landing/kebu-marketing-chrome";
import {
  BUSINESS_EMAIL_YEARLY_LABEL,
  KEBU_DOMAIN_DESCRIPTION,
  KEBU_DOMAIN_YEARLY_LABEL,
  KEBU_PLANS,
  KEBU_PRICING_HEADLINE,
  KEBU_PRICING_PAGE_ORDER,
} from "@/lib/billing/pricing";
import { KEBU } from "@/lib/kebu-brand";

export const metadata = {
  title: "Pricing — Kebu",
  description:
    "Start free with 4 sites + shop. Upgrade at $2/site/month for a custom domain. Built for African youth — pay with mobile money.",
};

export default function PricingPage() {
  return (
    <KebuMarketingPageShell activeHref="/pricing">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-16 lg:py-24">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-3" style={{ color: KEBU.orange }}>
          Pricing
        </p>
        <h1
          className="text-4xl lg:text-5xl font-bold mb-4 max-w-3xl"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          {KEBU_PRICING_HEADLINE}
        </h1>
        <p className="text-base leading-relaxed mb-3 max-w-2xl" style={{ color: KEBU.muted }}>
          Free includes 4 sites + shop + studio — we earn on transaction fees.{" "}
          <strong style={{ color: KEBU.black }}>Upgrade at $2/site/month</strong> to add your own domain and remove Kebu branding.
          Pay with mobile money (JOKO / Wave / Orange Money).
        </p>
        <p className="text-sm mb-12 max-w-2xl" style={{ color: KEBU.faint }}>
          Per-site pricing — you pay for each site you upgrade, not a flat account fee. A business with 3 custom-domain sites pays $6/month total.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          {KEBU_PRICING_PAGE_ORDER.filter((id) => id !== "shop").map((id) => {
            const plan = KEBU_PLANS[id];
            const hero = Boolean(plan.hero);
            const isContact = plan.monthlyUsd === 0 && id !== "free";
            return (
              <div
                key={id}
                className="rounded-2xl p-5 flex flex-col"
                style={
                  hero
                    ? {
                        background: KEBU.black,
                        color: KEBU.white,
                        border: `2px solid ${KEBU.orange}`,
                        boxShadow: "6px 6px 0 #FF5500",
                      }
                    : {
                        background: KEBU.white,
                        border: `1px solid ${KEBU.border}`,
                      }
                }
              >
                <p
                  className="text-[9px] font-bold uppercase tracking-widest mb-2"
                  style={{ color: hero ? KEBU.orange : KEBU.muted }}
                >
                  {hero ? "Most popular" : plan.id}
                </p>
                <p className="text-base font-black" style={{ color: hero ? KEBU.white : KEBU.black }}>
                  {plan.name}
                </p>
                <div className="mt-2 mb-1">
                  {isContact ? (
                    <p className="text-2xl font-black" style={{ color: hero ? KEBU.white : KEBU.black }}>
                      Custom
                    </p>
                  ) : (
                    <p className="text-3xl font-black" style={{ color: hero ? KEBU.white : KEBU.black }}>
                      {plan.monthlyUsd === 0 ? "Free" : `$${plan.monthlyUsd}`}
                      {plan.monthlyUsd > 0 && (
                        <span
                          className="text-sm font-semibold"
                          style={{ opacity: 0.6, marginLeft: 2 }}
                        >
                          {plan.perSite ? "/site/mo" : "/mo"}
                        </span>
                      )}
                    </p>
                  )}
                  {plan.yearlyUsd > 0 && !isContact && (
                    <p className="text-[11px] mt-0.5" style={{ color: hero ? "#8A8074" : KEBU.faint }}>
                      or ${plan.yearlyUsd}/year per site
                    </p>
                  )}
                </div>
                <p
                  className="text-xs mt-1 mb-4"
                  style={{ color: hero ? "#C8BFB8" : KEBU.muted }}
                >
                  {plan.whoFor}
                </p>
                <ul
                  className="text-[11px] space-y-1.5 flex-1 mb-5"
                  style={{ color: hero ? "rgba(255,255,255,0.75)" : KEBU.muted }}
                >
                  {plan.highlights.slice(0, 6).map((h) => (
                    <li key={h} className="flex items-start gap-1.5">
                      <span style={{ color: KEBU.orange, marginTop: 1 }}>·</span>
                      {h}
                    </li>
                  ))}
                </ul>
                <Link
                  href={isContact ? "/contact?type=enterprise" : plan.monthlyUsd === 0 ? "/signup" : "/signup"}
                  className="inline-flex justify-center rounded-full px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider"
                  style={
                    hero
                      ? { background: KEBU.orange, color: KEBU.white }
                      : { background: KEBU.black, color: KEBU.white }
                  }
                >
                  {isContact ? "Contact us" : plan.monthlyUsd === 0 ? "Start free" : "Get started"}
                </Link>
              </div>
            );
          })}
        </div>

        {/* How per-site billing works */}
        <div
          className="mt-8 rounded-2xl p-6"
          style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: KEBU.orange }}>
            How per-site pricing works
          </p>
          <p className="text-sm leading-relaxed" style={{ color: KEBU.muted }}>
            You start with a Kebu account — free, with up to 4 sites and a shop. When you want a custom domain on a site,
            you upgrade <em>that site</em> to Starter ($2/mo) or Business ($5/mo). Your other free sites stay free.
            A freelancer with 1 paid site pays $2/month. A business with 3 paid sites pays $6–$15/month.
            No flat account tax.
          </p>
        </div>

        {/* Student callout */}
        <div
          className="mt-4 rounded-2xl p-6"
          style={{ background: "#FFF8F0", border: `2px solid rgba(255,85,0,0.2)` }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: KEBU.orange }}>
            Students
          </p>
          <p className="text-lg font-bold" style={{ color: KEBU.black }}>
            Kebu Student — $1/month flat
          </p>
          <p className="text-sm mt-1 max-w-2xl" style={{ color: KEBU.muted }}>
            3 sites, custom domain, shop, studio — plus Yande Code and every product Kebu ships.
            Not $29/mo of separate tools. One flat dollar. Account stays after graduation.
            Student ID verification required (rolling out).
          </p>
        </div>

        {/* For schools & orgs */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div
            className="rounded-2xl p-6"
            style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: KEBU.orange }}>
              Schools
            </p>
            <p className="font-bold mb-1" style={{ color: KEBU.black }}>Bulk student pricing</p>
            <p className="text-sm" style={{ color: KEBU.muted }}>
              Enroll a class or school — school website included free when 20+ students join.
              Teacher accounts always free.
            </p>
            <Link
              href="/for-schools"
              className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold"
              style={{ color: KEBU.orange }}
            >
              Kebu for Schools →
            </Link>
          </div>
          <div
            className="rounded-2xl p-6"
            style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: KEBU.orange }}>
              NGOs & companies
            </p>
            <p className="font-bold mb-1" style={{ color: KEBU.black }}>Nonprofit discount + enterprise</p>
            <p className="text-sm" style={{ color: KEBU.muted }}>
              Registered nonprofits get 50% off. Large businesses get volume pricing and a dedicated account manager.
            </p>
            <div className="flex gap-4 mt-3">
              <Link href="/for-organizations" className="text-xs font-bold" style={{ color: KEBU.orange }}>
                For Orgs →
              </Link>
              <Link href="/for-enterprise" className="text-xs font-bold" style={{ color: KEBU.orange }}>
                For Enterprise →
              </Link>
            </div>
          </div>
        </div>

        {/* Revenue transparency */}
        <div
          className="mt-4 rounded-2xl p-6"
          style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: KEBU.orange }}>
            How Kebu earns beyond your subscription
          </p>
          <p className="text-sm" style={{ color: KEBU.muted }}>
            Free doesn&apos;t mean nothing is happening. Free users fund growth via{" "}
            <strong style={{ color: KEBU.black }}>transaction fees on shop sales</strong> — small, transparent,
            lower as you upgrade. Beyond that: optional domains, business email, AI overage, premium templates,
            and Reach. No surprise charges. Tiers add capability, not punishment for succeeding.
          </p>
        </div>

        {/* Domains */}
        <div
          className="mt-4 rounded-2xl p-6"
          style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: KEBU.orange }}>
            Domains &amp; extras
          </p>
          <p className="text-xl font-black mb-2">{KEBU_DOMAIN_YEARLY_LABEL}</p>
          <p className="text-sm" style={{ color: KEBU.muted }}>
            {KEBU_DOMAIN_DESCRIPTION} Business email planned at {BUSINESS_EMAIL_YEARLY_LABEL}.
          </p>
        </div>
      </div>
    </KebuMarketingPageShell>
  );
}
