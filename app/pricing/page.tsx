import Link from "next/link";
import { KebuMarketingPageShell } from "@/app/components/landing/kebu-marketing-chrome";
import {
  BUSINESS_EMAIL_YEARLY_LABEL,
  KEBU_COMPETITOR_ECOMMERCE_USD_MONTHLY,
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
    "Build free. Kebu Shop is $5/month for website + store + hosting + AI — built for African youth, not $29 Shopify pricing.",
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
          Start free. Upgrade when you&apos;re ready.{" "}
          <strong style={{ color: KEBU.black }}>Kebu Shop at $5/month</strong> is the plan we push —
          website + store + hosting + analytics + AI, vs ~${KEBU_COMPETITOR_ECOMMERCE_USD_MONTHLY}/month on Shopify or Wix.
        </p>
        <p className="text-sm mb-12 max-w-2xl" style={{ color: KEBU.faint }}>
          Sensible limits on AI, storage, and staff — not unlimited pretend. Pay with mobile money (JOKO).
          Founder / ops accounts stay free.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {KEBU_PRICING_PAGE_ORDER.map((id) => {
            const plan = KEBU_PLANS[id];
            const hero = Boolean(plan.hero);
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
                {hero ? (
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: KEBU.orange }}>
                    Most popular
                  </p>
                ) : (
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: KEBU.orange }}>
                    {plan.id}
                  </p>
                )}
                <p className="text-lg font-black">{plan.name}</p>
                <p className="text-3xl font-black mt-2">
                  {plan.monthlyUsd === 0 ? "$0" : `$${plan.monthlyUsd}`}
                  {plan.monthlyUsd > 0 ? (
                    <span className="text-sm font-semibold opacity-70">/mo</span>
                  ) : null}
                </p>
                {plan.yearlyUsd > 0 ? (
                  <p className="text-[11px] mt-1 opacity-70">or ${plan.yearlyUsd}/year</p>
                ) : null}
                <p className={`text-xs mt-2 mb-4 ${hero ? "opacity-80" : ""}`} style={hero ? undefined : { color: KEBU.muted }}>
                  {plan.whoFor}
                </p>
                <ul className={`text-[11px] space-y-1.5 flex-1 mb-5 ${hero ? "opacity-85" : ""}`} style={hero ? undefined : { color: KEBU.muted }}>
                  {plan.highlights.slice(0, 6).map((h) => (
                    <li key={h}>· {h}</li>
                  ))}
                </ul>
                <Link
                  href={plan.monthlyUsd === 0 ? "/create" : "/account"}
                  className="inline-flex justify-center rounded-full px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider"
                  style={
                    hero
                      ? { background: KEBU.orange, color: KEBU.white }
                      : { background: KEBU.black, color: KEBU.white }
                  }
                >
                  {plan.monthlyUsd === 0 ? "Start free" : "Choose plan"}
                </Link>
              </div>
            );
          })}
        </div>

        <div
          className="mt-8 rounded-2xl p-6"
          style={{ background: "#FFF8F0", border: `1px solid ${KEBU.border}` }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: KEBU.orange }}>
            Students
          </p>
          <p className="text-lg font-bold" style={{ color: KEBU.black }}>
            Kebu Student — $1/month
          </p>
          <p className="text-sm mt-1" style={{ color: KEBU.muted }}>
            {KEBU_PLANS.student.tagline} Website Builder + AI + templates + learning-by-building — not
            $29 Shopify + $15 tools + $20 AI + $10 hosting. Verified student price (verification rolling out;
            first year free is under consideration).
          </p>
        </div>

        <div
          className="mt-6 rounded-2xl p-6"
          style={{ background: "#F5F5F5", border: `1px solid ${KEBU.border}` }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: KEBU.orange }}>
            What $5 Shop grows into
          </p>
          <p className="text-sm" style={{ color: KEBU.muted }}>
            At maturity, Kebu Shop aims to bundle real business infrastructure — not just a webpage: AI builder,
            hosting, store, domain connection, analytics, business email, Kebu ID, Cloud, Search presence, Reach,
            and Opportunity OS for eligible users. Items still rolling out are labeled honestly until each slice ships
            end-to-end.
          </p>
        </div>

        <div
          className="mt-6 rounded-2xl p-6"
          style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: KEBU.orange }}>
            How Kebu earns (beyond your subscription)
          </p>
          <p className="text-sm" style={{ color: KEBU.muted }}>
            We don&apos;t need to squeeze $30/month from a student. A $5 merchant can also use domains, business
            email, AI beyond included limits, premium templates, optional Reach, and Cloud — plus a{" "}
            <strong>small transparent transaction fee</strong> on sales (payment processing separate). Higher plans
            can lower that fee. Tiers add <strong>capability</strong>, not punishment for succeeding.
          </p>
        </div>

        <div
          className="mt-6 rounded-2xl p-6"
          style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: KEBU.orange }}>
            Domains &amp; extras
          </p>
          <p className="text-xl font-black mb-2">{KEBU_DOMAIN_YEARLY_LABEL}</p>
          <p className="text-sm" style={{ color: KEBU.muted }}>
            {KEBU_DOMAIN_DESCRIPTION} Business email planned at {BUSINESS_EMAIL_YEARLY_LABEL}. Shop and up may
            include a small transparent transaction fee on sales — capability grows with your plan, not a
            penalty for succeeding.
          </p>
        </div>
      </div>
    </KebuMarketingPageShell>
  );
}
