import Link from "next/link";
import { KebuMarketingPageShell } from "@/app/components/landing/kebu-marketing-chrome";
import { KEBU } from "@/lib/kebu-brand";

export const metadata = {
  title: "Kebu for Schools — Digital skills for Africa's next generation",
  description:
    "Give every student a real digital portfolio, a website, and Africa's best creative tools — for $1 a month per student.",
};

const FEATURES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
    title: "Student portfolios, not just grades",
    body: "Every student gets their own Kebu site — a real portfolio they own and keep. Show parents and employers what students built, not just their test scores.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
      </svg>
    ),
    title: "School website included",
    body: "Your school gets a professional Kebu site — class schedules, events, gallery, staff directory. No IT department needed. Update it from your phone.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    title: "Yande Code — code from day one",
    body: "Students learn real coding with Yande Code, built for beginners in Africa. From HTML to building apps — all in-browser, no software to install.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    title: "Kebu Studio for every class",
    body: "Graphic design, posters, flyers, social content — students use the same tools real designers use. Better than Canva. Made for Africa.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    title: "Teacher dashboard",
    body: "Manage your entire class from one screen. See who built what, approve student sites before they go live, and track progress across subjects.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
    title: "Works on slow internet",
    body: "Kebu is built offline-first. Students in areas with weak data still get a full experience. We know Africa's internet. We built for it.",
  },
];

const OUTCOMES = [
  { stat: "3 mins", label: "to publish a student site" },
  { stat: "$1/mo", label: "per student, everything included" },
  { stat: "0", label: "software to install" },
  { stat: "100%", label: "owned by the student" },
];

const PLANS = [
  {
    name: "Per student",
    price: "$1",
    per: "/month",
    desc: "Site + Studio + Yande Code + Opportunity OS. Everything. Student keeps their account after graduation.",
    cta: { label: "Start a pilot", href: "/contact?type=schools" },
    highlight: true,
  },
  {
    name: "School site",
    price: "Free",
    per: "",
    desc: "Your school's own Kebu website included when you enroll 20+ students. Managed by the school admin.",
    cta: { label: "Contact us", href: "/contact?type=schools" },
    highlight: false,
  },
  {
    name: "Teacher accounts",
    price: "Free",
    per: "",
    desc: "Unlimited teacher and administrator accounts. No seat fees for staff.",
    cta: { label: "Contact us", href: "/contact?type=schools" },
    highlight: false,
  },
];

export default function ForSchoolsPage() {
  return (
    <KebuMarketingPageShell>
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: KEBU.black }}
      >
        {/* Gradient blobs */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 70% 80% at 5% 110%, ${KEBU.orange}20 0%, transparent 60%),
                         radial-gradient(ellipse 50% 60% at 90% -10%, #9333EA25 0%, transparent 55%)`,
          }}
        />
        {/* Grid texture */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04]"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 80 80"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid-s" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-s)" />
        </svg>

        <div className="relative max-w-[1100px] mx-auto px-5 sm:px-8 py-20 lg:py-28">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full"
            style={{ background: `${KEBU.orange}18`, border: `1px solid ${KEBU.orange}30` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={KEBU.orange} strokeWidth="2.5" strokeLinecap="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: KEBU.orange }}>
              Kebu for Schools
            </span>
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 max-w-3xl"
            style={{ fontFamily: "var(--font-fraunces)", color: KEBU.white }}
          >
            Give students skills
            <br />
            <span style={{ color: KEBU.orange }}>Africa actually needs</span>
          </h1>

          <p className="text-lg leading-relaxed mb-8 max-w-xl" style={{ color: "#C8BFB8" }}>
            A real website. A design tool. A coding environment. An opportunity feed.
            All in one — $1 per student per month. No computer lab required.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/contact?type=schools"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold"
              style={{ background: KEBU.orange, color: KEBU.white }}
            >
              Start a free pilot
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

          {/* Outcome stats */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {OUTCOMES.map(({ stat, label }) => (
              <div key={label}>
                <p
                  className="text-3xl font-bold mb-1"
                  style={{ fontFamily: "var(--font-fraunces)", color: KEBU.orange }}
                >
                  {stat}
                </p>
                <p className="text-xs" style={{ color: "#8A8074" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-[1100px] mx-auto px-5 sm:px-8 py-16 lg:py-24">
        <div className="mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-3" style={{ color: KEBU.orange }}>
            What's included
          </p>
          <h2
            className="text-3xl lg:text-4xl font-bold max-w-2xl"
            style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
          >
            Everything a modern school needs — in one place
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon, title, body }) => (
            <div
              key={title}
              className="p-6 rounded-2xl"
              style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${KEBU.orange}12`, color: KEBU.orange }}
              >
                {icon}
              </div>
              <h3 className="text-sm font-bold mb-2" style={{ color: KEBU.black }}>{title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: KEBU.muted }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What students get to keep */}
      <section style={{ background: KEBU.cream }}>
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-3" style={{ color: KEBU.orange }}>
                After graduation
              </p>
              <h2
                className="text-3xl font-bold mb-5"
                style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
              >
                Students leave with more than a certificate
              </h2>
              <p className="text-sm leading-relaxed mb-5" style={{ color: KEBU.muted }}>
                When a student graduates, their Kebu account travels with them. Their portfolio, their designs, their business profile — all owned by them. Not the school.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: KEBU.muted }}>
                A student from Dakar who built a flyer business in Form 4 can keep running it in university. Skills compound. That&apos;s the point.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Portfolio site", sub: "Hosted forever on kebu.co" },
                { label: "Design library", sub: "All designs export as files" },
                { label: "Business profile", sub: "Kebu ID stays with them" },
                { label: "Opportunity feed", sub: "Grants, gigs, fellowships" },
              ].map(({ label, sub }) => (
                <div
                  key={label}
                  className="p-4 rounded-xl"
                  style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
                >
                  <div
                    className="w-6 h-6 rounded-md mb-3"
                    style={{ background: KEBU.orange }}
                  />
                  <p className="text-xs font-bold mb-1" style={{ color: KEBU.black }}>{label}</p>
                  <p className="text-[11px]" style={{ color: KEBU.faint }}>{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-[1100px] mx-auto px-5 sm:px-8 py-16 lg:py-24">
        <div className="mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-3" style={{ color: KEBU.orange }}>
            Pricing
          </p>
          <h2
            className="text-3xl lg:text-4xl font-bold"
            style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
          >
            Designed to be affordable
          </h2>
          <p className="mt-3 text-sm" style={{ color: KEBU.muted }}>
            Pay with mobile money (JOKO / Wave / Orange Money). No credit card.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {PLANS.map(({ name, price, per, desc, cta, highlight }) => (
            <div
              key={name}
              className="rounded-2xl p-6 flex flex-col"
              style={
                highlight
                  ? { background: KEBU.black, border: `2px solid ${KEBU.orange}`, boxShadow: `5px 5px 0 ${KEBU.orange}` }
                  : { background: KEBU.white, border: `1px solid ${KEBU.border}` }
              }
            >
              <p
                className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4"
                style={{ color: highlight ? KEBU.orange : KEBU.muted }}
              >
                {name}
              </p>
              <div className="flex items-end gap-1 mb-4">
                <span
                  className="text-4xl font-bold"
                  style={{ fontFamily: "var(--font-fraunces)", color: highlight ? KEBU.white : KEBU.black }}
                >
                  {price}
                </span>
                {per && (
                  <span className="text-sm mb-1.5" style={{ color: highlight ? "#8A8074" : KEBU.faint }}>
                    {per}
                  </span>
                )}
              </div>
              <p
                className="text-xs leading-relaxed flex-1 mb-6"
                style={{ color: highlight ? "#C8BFB8" : KEBU.muted }}
              >
                {desc}
              </p>
              <Link
                href={cta.href}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold"
                style={
                  highlight
                    ? { background: KEBU.orange, color: KEBU.white }
                    : { background: "transparent", color: KEBU.black, border: `1px solid ${KEBU.border}` }
                }
              >
                {cta.label}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: KEBU.black }}>
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-16 lg:py-20 text-center">
          <h2
            className="text-3xl lg:text-4xl font-bold mb-4"
            style={{ fontFamily: "var(--font-fraunces)", color: KEBU.white }}
          >
            Ready to run a free pilot?
          </h2>
          <p className="text-sm mb-8 max-w-lg mx-auto" style={{ color: "#C8BFB8" }}>
            We work with schools in Senegal, Côte d&apos;Ivoire, Ghana, and Nigeria. Tell us about your school — we&apos;ll set up a free 30-day pilot for your class.
          </p>
          <Link
            href="/contact?type=schools"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold"
            style={{ background: KEBU.orange, color: KEBU.white }}
          >
            Get in touch
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>
    </KebuMarketingPageShell>
  );
}
