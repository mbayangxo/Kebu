import Link from "next/link";
import { KebuMarketingPageShell } from "@/app/components/landing/kebu-marketing-chrome";
import { KEBU } from "@/lib/kebu-brand";

export const metadata = {
  title: "Kebu for Enterprise — Africa's business platform at scale",
  description:
    "Multiple brands, team management, B2B directory, opportunity posting, and API access. Built for companies that mean business in Africa.",
};

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
      </svg>
    ),
    title: "Up to 10 sites per account",
    body: "Manage multiple brand sites, campaign microsites, product lines, or regional offices — all from one dashboard. No juggling logins.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    title: "Team & role management",
    body: "Add designers, marketing staff, sales leads, regional managers. Set who can edit which sites. Full audit trail of changes.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "Verified company badge",
    body: "Enterprise accounts get a Kebu Verified Company badge. Critical for trust in the B2B directory — buyers in West Africa verify before they reach out.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
      </svg>
    ),
    title: "B2B directory listing",
    body: "Get discovered in Alkebulan — Kebu's Africa-wide B2B marketplace. Showcase products, services, certifications, and contact details.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
      </svg>
    ),
    title: "Post tenders & opportunities",
    body: "Source vendors, post procurement tenders, run calls for proposals — listed on Opportunity OS and routed to verified African businesses.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "Advanced analytics",
    body: "Site traffic, design impressions, shop revenue, opportunity application rates — all in one dashboard. Exportable. No third-party trackers.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    title: "Brand DNA & design system",
    body: "Lock your brand colors, fonts, logo, and voice into Kebu Studio. Every designer on your team works inside your brand guardrails automatically.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
    title: "Priority support",
    body: "Dedicated account contact. WhatsApp line for urgent issues. SLA-backed response times. Onboarding session for your team.",
  },
];

const COMPANY_SIZES = [
  { label: "10–50 staff", desc: "Growing businesses managing multiple products or markets." },
  { label: "50–500 staff", desc: "Mid-market companies with dedicated marketing and ops teams." },
  { label: "500+ staff", desc: "Large enterprises with regional footprints and procurement needs." },
];

const COMPARE = [
  { feature: "Sites", kebu: "Up to 10", others: "1 per account or per $$$" },
  { feature: "Team members", kebu: "Unlimited", others: "Per-seat pricing" },
  { feature: "B2B directory listing", kebu: "Included", others: "Not available" },
  { feature: "Opportunity / tender posting", kebu: "Included", others: "Not available" },
  { feature: "Brand DNA system", kebu: "Included", others: "Not available" },
  { feature: "Mobile money payments", kebu: "Included", others: "Not available" },
  { feature: "Custom domain", kebu: "Per site", others: "Per site" },
  { feature: "Priority support", kebu: "Included", others: "Extra cost" },
];

export default function ForEnterprisePage() {
  return (
    <KebuMarketingPageShell>
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: KEBU.black }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 70% 80% at 100% 100%, ${KEBU.orange}18 0%, transparent 55%),
                         radial-gradient(ellipse 50% 60% at 0% 0%, #0EA5E920 0%, transparent 55%)`,
          }}
        />
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04]"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 80 80"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid-e" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-e)" />
        </svg>

        <div className="relative max-w-[1100px] mx-auto px-5 sm:px-8 py-20 lg:py-28">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.25)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round">
              <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#0EA5E9" }}>
              Kebu for Enterprise
            </span>
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 max-w-3xl"
            style={{ fontFamily: "var(--font-fraunces)", color: KEBU.white }}
          >
            Built for companies
            <br />
            <span style={{ color: KEBU.orange }}>serious about Africa</span>
          </h1>

          <p className="text-lg leading-relaxed mb-8 max-w-xl" style={{ color: "#C8BFB8" }}>
            Multiple sites. Full team access. B2B directory. Tender posting. Brand system. All the infrastructure for doing business across Africa — without the enterprise price tag.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/contact?type=enterprise"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold"
              style={{ background: KEBU.orange, color: KEBU.white }}
            >
              Talk to sales
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold"
              style={{ background: "rgba(255,255,255,0.08)", color: KEBU.white, border: "1px solid rgba(255,255,255,0.15)" }}
            >
              See pricing
            </Link>
          </div>

          {/* Trust signals */}
          <div className="mt-14 flex flex-wrap gap-8">
            {[
              "Mobile money payments",
              "Works on 2G / low data",
              "Offline-first architecture",
              "West & East Africa coverage",
            ].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={KEBU.orange} strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-xs" style={{ color: "#C8BFB8" }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section style={{ background: KEBU.cream }}>
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-14 lg:py-20">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-8" style={{ color: KEBU.orange }}>
            Company size
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {COMPANY_SIZES.map(({ label, desc }) => (
              <div
                key={label}
                className="p-5 rounded-2xl"
                style={{ background: KEBU.white, border: `1px solid ${KEBU.border}`, borderLeft: `4px solid ${KEBU.orange}` }}
              >
                <p className="text-sm font-bold mb-2" style={{ color: KEBU.black }}>{label}</p>
                <p className="text-xs leading-relaxed" style={{ color: KEBU.muted }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-[1100px] mx-auto px-5 sm:px-8 py-16 lg:py-24">
        <div className="mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-3" style={{ color: KEBU.orange }}>
            Features
          </p>
          <h2
            className="text-3xl lg:text-4xl font-bold max-w-2xl"
            style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
          >
            Everything your company needs in one place
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon, title, body }) => (
            <div
              key={title}
              className="p-5 rounded-2xl"
              style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${KEBU.orange}12`, color: KEBU.orange }}
              >
                {icon}
              </div>
              <h3 className="text-sm font-bold mb-1.5" style={{ color: KEBU.black }}>{title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: KEBU.muted }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section style={{ background: KEBU.cream }}>
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-14 lg:py-20">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-3" style={{ color: KEBU.orange }}>
            How we compare
          </p>
          <h2
            className="text-2xl font-bold mb-8"
            style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
          >
            Built for Africa, not adapted from Silicon Valley
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${KEBU.border}` }}>
                  <th className="text-left py-3 pr-8 text-xs font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                    Feature
                  </th>
                  <th className="text-left py-3 pr-8 text-xs font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
                    Kebu
                  </th>
                  <th className="text-left py-3 text-xs font-bold uppercase tracking-wider" style={{ color: KEBU.muted }}>
                    Others
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(({ feature, kebu, others }, i) => (
                  <tr
                    key={feature}
                    style={{ borderBottom: `1px solid ${KEBU.border}`, background: i % 2 === 0 ? KEBU.white : "transparent" }}
                  >
                    <td className="py-3 pr-8 text-xs" style={{ color: KEBU.black }}>{feature}</td>
                    <td className="py-3 pr-8">
                      <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "#10B981" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {kebu}
                      </span>
                    </td>
                    <td className="py-3 text-xs" style={{ color: KEBU.faint }}>{others}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-[1100px] mx-auto px-5 sm:px-8 py-16 lg:py-24">
        <div className="grid gap-6 lg:grid-cols-2 items-start">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-3" style={{ color: KEBU.orange }}>
              Pricing
            </p>
            <h2
              className="text-3xl font-bold mb-4"
              style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
            >
              Pay for what you use. No flat enterprise tax.
            </h2>
            <p className="text-sm leading-relaxed mb-5" style={{ color: KEBU.muted }}>
              Kebu charges per site, not per account. One business with 10 sites pays for 10 sites. A company with one regional site pays for one. Predictable, fair, African.
            </p>
            <p className="text-sm leading-relaxed mb-6" style={{ color: KEBU.muted }}>
              Pay with mobile money (JOKO / Wave / Orange Money). Annual billing available. Volume discounts for 5+ sites.
            </p>
            <div className="flex gap-3">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: KEBU.orange, color: KEBU.white }}
              >
                Full pricing breakdown
              </Link>
              <Link
                href="/contact?type=enterprise"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: "transparent", color: KEBU.black, border: `1px solid ${KEBU.border}` }}
              >
                Talk to sales
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { tier: "Starter", price: "$2", per: "/site/month", desc: "Custom domain, more features, up to 5 sites." },
              { tier: "Business", price: "$4–6", per: "/site/month", desc: "Advanced analytics, priority support, up to 10 sites. Volume discount." },
              { tier: "Custom volume", price: "Contact us", per: "", desc: "10+ sites, white-glove onboarding, dedicated account manager, SLA." },
            ].map(({ tier, price, per, desc }, i) => (
              <div
                key={tier}
                className="p-5 rounded-2xl flex items-start gap-4"
                style={{
                  background: i === 1 ? KEBU.black : KEBU.white,
                  border: i === 1 ? `2px solid ${KEBU.orange}` : `1px solid ${KEBU.border}`,
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1"
                    style={{ color: i === 1 ? KEBU.orange : KEBU.muted }}>{tier}</p>
                  <div className="flex items-end gap-1 mb-2">
                    <span
                      className="text-2xl font-bold"
                      style={{ fontFamily: "var(--font-fraunces)", color: i === 1 ? KEBU.white : KEBU.black }}
                    >
                      {price}
                    </span>
                    {per && <span className="text-xs mb-0.5" style={{ color: i === 1 ? "#8A8074" : KEBU.faint }}>{per}</span>}
                  </div>
                  <p className="text-xs" style={{ color: i === 1 ? "#C8BFB8" : KEBU.muted }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: KEBU.black }}>
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-16 text-center">
          <h2
            className="text-3xl font-bold mb-4"
            style={{ fontFamily: "var(--font-fraunces)", color: KEBU.white }}
          >
            Let&apos;s build something serious together
          </h2>
          <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: "#C8BFB8" }}>
            Tell us about your company and your goals in Africa. We&apos;ll set up a demo and walk you through what Kebu looks like at scale.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/contact?type=enterprise"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold"
              style={{ background: KEBU.orange, color: KEBU.white }}
            >
              Talk to sales
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/b2b"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl text-sm font-bold"
              style={{ background: "rgba(255,255,255,0.08)", color: KEBU.white, border: "1px solid rgba(255,255,255,0.15)" }}
            >
              Browse B2B directory
            </Link>
          </div>
        </div>
      </section>
    </KebuMarketingPageShell>
  );
}
