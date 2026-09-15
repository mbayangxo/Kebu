import Link from "next/link";
import { KebuMarketingPageShell } from "@/app/components/landing/kebu-marketing-chrome";
import { KEBU } from "@/lib/kebu-brand";

export const metadata = {
  title: "Kebu for Organizations — Your NGO, association, or community group on Kebu",
  description:
    "Nonprofits, associations, and community organizations get a professional digital presence, team access, and opportunity listing tools on Kebu.",
};

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M9 21V9" />
      </svg>
    ),
    title: "Organization website",
    body: "A professional site that tells your story — mission, programs, team, impact numbers, and how to apply or donate. Built in minutes, updated from any phone.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    title: "Team & staff accounts",
    body: "Add your entire team — program officers, comms, field staff. Each person gets their own Kebu account. Manage who can edit the site.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "Verified organization badge",
    body: "Apply for a Kebu Verified badge for your organization's profile. Young people in Africa trust verified orgs when applying for fellowships and grants.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
      </svg>
    ),
    title: "Post fellowships, grants & jobs",
    body: "List your opportunities directly on Kebu Opportunity OS — the for-you feed thousands of young Africans check daily. Applications come to your Kebu inbox.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    title: "Design tools for comms teams",
    body: "Create posters, reports, social media graphics, and print flyers with Kebu Studio. No Canva subscription needed — everything exports as files.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
    title: "WhatsApp-first messaging",
    body: "When partners or applicants reach out through your Kebu profile, messages route to WhatsApp or your inbox. No missed inquiries. Works on 2G.",
  },
];

const USE_CASES = [
  {
    label: "NGOs & nonprofits",
    desc: "Run your donor page, post grant opportunities, and manage your program team — all from one dashboard.",
    accent: "#10B981",
  },
  {
    label: "Youth associations",
    desc: "Build a directory of members, share events, post leadership opportunities, and promote your chapter.",
    accent: KEBU.orange,
  },
  {
    label: "Community groups",
    desc: "A simple site to introduce your group, share what you do, and connect with young people looking to contribute.",
    accent: "#9333EA",
  },
  {
    label: "Foundations & trusts",
    desc: "Manage multiple program sites, post calls for applications, track submissions, and communicate with grantees.",
    accent: "#0EA5E9",
  },
];

export default function ForOrganizationsPage() {
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
            background: `radial-gradient(ellipse 60% 70% at 0% 120%, #10B98118 0%, transparent 60%),
                         radial-gradient(ellipse 50% 60% at 100% 0%, ${KEBU.orange}20 0%, transparent 55%)`,
          }}
        />
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04]"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 80 80"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid-o" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-o)" />
        </svg>

        <div className="relative max-w-[1100px] mx-auto px-5 sm:px-8 py-20 lg:py-28">
          <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full"
            style={{ background: "#10B98118", border: "1px solid #10B98130" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#10B981" }}>
              Kebu for Organizations
            </span>
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 max-w-3xl"
            style={{ fontFamily: "var(--font-fraunces)", color: KEBU.white }}
          >
            Your organization,
            <br />
            <span style={{ color: KEBU.orange }}>where young Africa is looking</span>
          </h1>

          <p className="text-lg leading-relaxed mb-8 max-w-xl" style={{ color: "#C8BFB8" }}>
            NGOs, associations, foundations, and community groups — build your digital presence and post opportunities directly to the young people you want to reach.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/contact?type=organizations"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold"
              style={{ background: KEBU.orange, color: KEBU.white }}
            >
              Get started free
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/b2b"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold"
              style={{ background: "rgba(255,255,255,0.08)", color: KEBU.white, border: "1px solid rgba(255,255,255,0.15)" }}
            >
              Browse directory
            </Link>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section style={{ background: KEBU.cream }}>
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-14 lg:py-20">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-8" style={{ color: KEBU.orange }}>
            Who it's for
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {USE_CASES.map(({ label, desc, accent }) => (
              <div
                key={label}
                className="p-5 rounded-2xl"
                style={{ background: KEBU.white, border: `1px solid ${KEBU.border}`, borderTop: `3px solid ${accent}` }}
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
            What you get
          </p>
          <h2
            className="text-3xl lg:text-4xl font-bold max-w-2xl"
            style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
          >
            Tools built for how organizations actually work in Africa
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

      {/* Opportunity OS callout */}
      <section
        className="relative overflow-hidden"
        style={{ background: KEBU.black }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 80% at 100% 50%, ${KEBU.red}15 0%, transparent 60%)`,
          }}
        />
        <div className="relative max-w-[1100px] mx-auto px-5 sm:px-8 py-14 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-4" style={{ color: KEBU.red }}>
                Opportunity OS
              </p>
              <h2
                className="text-3xl font-bold mb-5"
                style={{ fontFamily: "var(--font-fraunces)", color: KEBU.white }}
              >
                Post your fellowship. Reach 10,000 young Africans who are looking right now.
              </h2>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "#C8BFB8" }}>
                Kebu Opportunity OS is a daily feed for young entrepreneurs and professionals across Francophone and Anglophone Africa — grants, fellowships, tenders, contracts. List yours free as a verified organization.
              </p>
              <Link
                href="/opportunity/listings"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: KEBU.red, color: KEBU.white }}
              >
                See opportunity listings
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { type: "Fellowship", color: KEBU.orange, count: "Open" },
                { type: "Grant", color: "#10B981", count: "Open" },
                { type: "Tender", color: "#9333EA", count: "Closed" },
                { type: "Internship", color: "#0EA5E9", count: "Open" },
              ].map(({ type, color, count }) => (
                <div
                  key={type}
                  className="p-4 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="inline-flex text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded mb-3"
                    style={{ background: `${color}20`, color }}
                  >
                    {type}
                  </div>
                  <p className="text-xs font-bold mb-1" style={{ color: KEBU.white }}>
                    Your listing here
                  </p>
                  <p className="text-[11px]" style={{ color: "#8A8074" }}>Status: {count}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing note */}
      <section className="max-w-[1100px] mx-auto px-5 sm:px-8 py-14 lg:py-20">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "Free to start",
              body: "Create your organization profile and site. Post up to 3 opportunities. No credit card.",
              cta: "Sign up free",
              href: "/signup",
            },
            {
              title: "$2/site/month",
              body: "Add a custom domain and unlock more features. Per site — not a flat account fee. Pay with mobile money.",
              cta: "See pricing",
              href: "/pricing",
            },
            {
              title: "Nonprofit discount",
              body: "Registered nonprofits and registered associations get 50% off any paid plan. Contact us with your registration.",
              cta: "Apply for discount",
              href: "/contact?type=nonprofit-discount",
            },
          ].map(({ title, body, cta, href }) => (
            <div
              key={title}
              className="p-6 rounded-2xl"
              style={{ background: KEBU.white, border: `1px solid ${KEBU.border}` }}
            >
              <h3 className="text-base font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}>{title}</h3>
              <p className="text-xs leading-relaxed mb-5" style={{ color: KEBU.muted }}>{body}</p>
              <Link
                href={href}
                className="inline-flex items-center gap-1.5 text-xs font-bold"
                style={{ color: KEBU.orange }}
              >
                {cta}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: KEBU.black }}>
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 py-16 text-center">
          <h2
            className="text-3xl font-bold mb-4"
            style={{ fontFamily: "var(--font-fraunces)", color: KEBU.white }}
          >
            Ready to reach young Africa?
          </h2>
          <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: "#C8BFB8" }}>
            Set up your organization profile in 10 minutes. Free to start, no credit card.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold"
            style={{ background: KEBU.orange, color: KEBU.white }}
          >
            Create organization profile
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>
    </KebuMarketingPageShell>
  );
}
