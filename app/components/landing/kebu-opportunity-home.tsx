import Link from "next/link";
import { KebuMark, KebuWordmark } from "@/app/components/kebu-mark";
import { KEBU } from "@/lib/kebu-brand";

/** Landing — bright cream / white with orange energy. */
const C = {
  ...KEBU,
  ink: KEBU.black,
  paper: KEBU.bright,
  paperSoft: KEBU.cream,
  muted: KEBU.muted,
  faint: KEBU.faint,
} as const;

/** Live product only — no sample /programs, /map, /path, etc. */
const NAV = [
  { label: "Opportunity", href: "/opportunity" },
  { label: "Countries", href: "/opportunity/countries" },
  { label: "Business", href: "/business" },
  { label: "Create", href: "/create" },
] as const;

const LIVE_PATHS = [
  {
    level: "Find opportunity",
    desc: "Start with Country Explorer — real country pages with labeled sources, not a brochure dump.",
    href: "/opportunity/countries",
    stat: "Live now",
  },
  {
    level: "Create your business",
    desc: "Draft a Kebu ID, track registration readiness, and keep founders on one identity.",
    href: "/business",
    stat: "Live now",
  },
  {
    level: "Build & publish a site",
    desc: "Templates, editor, and publish to a kebu.africa subdomain when hosting is set up.",
    href: "/create",
    stat: "Live now",
  },
] as const;

function StartButton({
  href = "/signup",
  className = "",
  large = false,
}: {
  href?: string;
  className?: string;
  large?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 font-bold uppercase tracking-[0.12em] transition-all hover:brightness-110 ${large ? "px-10 py-4 text-sm rounded-full" : "px-6 py-2.5 text-[11px] rounded-full"} ${className}`}
      style={{ background: C.orange, color: C.white }}
    >
      Start
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" aria-hidden>
        <path d="M5 12H19M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </Link>
  );
}

export function KebuOpportunityHome() {
  return (
    <div className="min-h-screen" style={{ background: C.paper, color: C.ink }}>
      <header className="sticky top-0 z-50 backdrop-blur-md" style={{ background: "rgba(255,251,247,0.92)" }}>
        <div
          className="h-[4px] w-full"
          style={{ background: `linear-gradient(90deg, ${C.red}, ${C.orange}, ${C.orangeLight})` }}
        />
        <nav style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="max-w-[1400px] mx-auto px-5 sm:px-8 h-[68px] flex items-center justify-between gap-4">
            <Link href="/" className="flex-shrink-0">
              <KebuWordmark size={36} dark />
            </Link>

            <div className="hidden lg:flex items-center gap-6 text-[11px] font-semibold uppercase tracking-[0.14em]">
              {NAV.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="transition-colors hover:text-[#FF5500]"
                  style={{ color: C.muted }}
                >
                  {label}
                </Link>
              ))}
            </div>

            <StartButton />
          </div>
        </nav>
      </header>

      <section className="relative min-h-[92svh] overflow-hidden flex flex-col justify-center">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 90% 10%, rgba(255,85,0,0.22) 0%, transparent 55%),
              radial-gradient(ellipse 50% 45% at 0% 85%, rgba(225,6,0,0.12) 0%, transparent 50%),
              ${C.paper}
            `,
          }}
        />
        <div
          className="kebu-landing-orb pointer-events-none absolute -right-16 top-[18%] h-[380px] w-[380px] rounded-full blur-3xl opacity-50 sm:h-[520px] sm:w-[520px]"
          style={{ background: `radial-gradient(circle, rgba(255,85,0,0.35), transparent 70%)` }}
          aria-hidden
        />

        <div className="relative max-w-[1400px] mx-auto w-full px-5 sm:px-8 lg:px-16 py-20 lg:py-28">
          <div className="kebu-landing-rise mb-8 inline-flex">
            <KebuMark size={72} />
          </div>
          <p
            className="kebu-landing-rise mb-4 text-[clamp(3rem,11vw,7.5rem)] font-black uppercase leading-[0.85] tracking-tight"
            style={{ fontFamily: "var(--font-fraunces)", color: C.orange }}
          >
            Kebu
          </p>
          <h1
            className="kebu-landing-rise kebu-landing-rise-delay font-bold mb-6 max-w-3xl"
            style={{
              fontFamily: "var(--font-fraunces)",
              lineHeight: 0.98,
              letterSpacing: "-0.03em",
              fontSize: "clamp(1.85rem, 5.2vw, 3.5rem)",
              color: C.ink,
            }}
          >
            Find the opportunity.
            <br />
            <span style={{ color: C.orange }}>Build the business.</span>
          </h1>
          <p
            className="kebu-landing-rise kebu-landing-rise-delay-2 text-[clamp(1rem,2.2vw,1.25rem)] max-w-xl mb-10 leading-relaxed"
            style={{ color: C.muted }}
          >
            Country Explorer, Kebu ID, and a real site builder — the live Phase One path. No fake product menus.
          </p>
          <div className="kebu-landing-rise kebu-landing-rise-delay-3 flex flex-wrap items-center gap-4">
            <StartButton large href="/signup" />
            <Link
              href="/opportunity/countries"
              className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-full text-sm uppercase tracking-[0.1em] transition-all hover:bg-black/[0.03]"
              style={{ border: `2px solid ${C.orange}`, color: C.orange }}
            >
              Explore my country
            </Link>
          </div>
        </div>
      </section>

      <section style={{ background: C.paperSoft, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-14">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-3" style={{ color: C.orange }}>
                Live on Kebu now
              </p>
              <h2
                style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.05, color: C.ink }}
                className="font-bold text-[clamp(1.75rem,4vw,2.75rem)]"
              >
                Country Explorer. Business ID.
                <span style={{ color: C.red }}> Site builder.</span>
              </h2>
            </div>
            <p className="text-sm max-w-md leading-relaxed" style={{ color: C.muted }}>
              We only link what ships. Grants, tenders, maps, and feeds will appear here when they are
              DB-backed — not as sample pages that look finished.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            {LIVE_PATHS.map(({ level, href, desc }) => (
              <Link
                key={href}
                href={href}
                className="group p-5 rounded-2xl transition-all hover:-translate-y-0.5"
                style={{ background: C.white, border: `1px solid ${C.border}`, boxShadow: "0 8px 24px rgba(255,85,0,0.06)" }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: C.red }}>
                  {level}
                </p>
                <p className="text-sm leading-snug mb-3" style={{ color: C.ink }}>
                  {desc}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] group-hover:underline" style={{ color: C.orange }}>
                  Open →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28" style={{ background: C.paper }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="mb-12 max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-3" style={{ color: C.red }}>
              Your next move
            </p>
            <h2
              style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.05 }}
              className="font-bold text-[clamp(1.75rem,4vw,3rem)] mb-4"
            >
              Three live paths.
              <span style={{ color: C.orange }}> No fake menus.</span>
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: C.muted }}>
              Start where you are: find a country opportunity, create a business identity, or build a site.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            {LIVE_PATHS.map(({ level, desc, href, stat }, i) => (
              <Link
                key={`${level}-card`}
                href={href}
                className="relative p-8 rounded-3xl overflow-hidden transition-transform hover:-translate-y-1"
                style={{
                  background: i === 1 ? C.orange : C.white,
                  color: i === 1 ? C.white : C.ink,
                  border: i === 1 ? "none" : `1px solid ${C.border}`,
                  boxShadow: i === 1 ? "0 16px 40px rgba(255,85,0,0.25)" : "0 8px 24px rgba(10,10,10,0.04)",
                }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4"
                  style={{ color: i === 1 ? "rgba(255,255,255,0.85)" : C.red }}
                >
                  {stat}
                </p>
                <h3
                  style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.1 }}
                  className="font-bold text-2xl mb-3"
                >
                  {level}
                </h3>
                <p
                  className="text-sm leading-relaxed mb-6"
                  style={{ color: i === 1 ? "rgba(255,255,255,0.9)" : C.muted }}
                >
                  {desc}
                </p>
                <span className="text-xs font-bold uppercase tracking-[0.12em]">Go →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28" style={{ background: C.paperSoft }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-3" style={{ color: C.red }}>
                Site building
              </p>
              <h2
                style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.05 }}
                className="font-bold text-[clamp(1.75rem,4vw,3rem)] mb-6"
              >
                Found the opportunity?
                <span style={{ color: C.orange }}> Build for it.</span>
              </h2>
              <p className="text-sm leading-relaxed mb-4" style={{ color: C.muted }}>
                Templates, editor, and publish to a kebu.africa subdomain when hosting is active.
                Live publish uses JOKO billing in production — editing stays free.
              </p>
              <p className="text-sm leading-relaxed mb-8" style={{ color: C.faint }}>
                Custom domains: DNS verify works; HTTPS attach on the host is still a manual ops step.
              </p>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-full text-sm uppercase tracking-[0.08em]"
                style={{ background: C.orange, color: C.white }}
              >
                Open site builder →
              </Link>
            </div>

            <div
              className="rounded-3xl p-8 lg:p-10 bg-white"
              style={{ border: `1px solid ${C.border}`, boxShadow: "0 20px 50px rgba(255,85,0,0.08)" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6" style={{ color: C.orange }}>
                How it connects
              </p>
              <ol className="space-y-5">
                {[
                  { step: "01", text: "Explore countries for labeled opportunity data." },
                  { step: "02", text: "Create a business draft with Kebu ID readiness." },
                  { step: "03", text: "Build a site, pay hosting if required, then publish." },
                ].map(({ step, text }) => (
                  <li key={step} className="flex gap-4">
                    <span
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: C.orange, color: C.white }}
                    >
                      {step}
                    </span>
                    <p className="text-sm leading-relaxed pt-2" style={{ color: C.muted }}>
                      {text}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-32 relative overflow-hidden" style={{ background: C.orange }}>
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 20% 50%, rgba(255,255,255,0.35), transparent), radial-gradient(ellipse 50% 60% at 90% 20%, rgba(225,6,0,0.4), transparent)",
          }}
          aria-hidden
        />
        <div className="relative max-w-[1400px] mx-auto px-5 sm:px-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-4" style={{ color: "rgba(255,255,255,0.85)" }}>
            Ready when you are
          </p>
          <h2
            style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.05 }}
            className="font-bold text-[clamp(2rem,5vw,3.5rem)] mb-4 text-white"
          >
            Africa is the opportunity.
          </h2>
          <p className="text-base mb-10 max-w-lg mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.9)" }}>
            Start with where you are. See what is live. Build what comes next.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 font-bold uppercase tracking-[0.12em] px-10 py-4 text-sm rounded-full transition-all hover:brightness-105"
            style={{ background: C.white, color: C.orange }}
          >
            Start
          </Link>
        </div>
      </section>

      <footer style={{ background: C.white, borderTop: `1px solid ${C.border}` }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-3">
                <KebuWordmark size={28} dark />
              </div>
              <p className="text-xs leading-relaxed" style={{ color: C.faint }}>
                Live product only in this menu. Sample explorers stay off the nav until they ship.
              </p>
            </div>
            {[
              {
                title: "Product",
                links: [
                  ["Opportunity", "/opportunity"],
                  ["Countries", "/opportunity/countries"],
                  ["Business", "/business"],
                  ["Create", "/create"],
                ],
              },
              {
                title: "Account",
                links: [
                  ["Sign in", "/login"],
                  ["Sign up", "/signup"],
                  ["Kebu Score", "/ka-score"],
                ],
              },
              {
                title: "Honest status",
                links: [
                  ["Country Explorer — live", "/opportunity/countries"],
                  ["Site builder — live", "/create"],
                  ["Business ID — live", "/business"],
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: C.orange }}>
                  {col.title}
                </p>
                <div className="space-y-2">
                  {col.links.map(([label, href]) => (
                    <Link
                      key={`${col.title}-${href}-${label}`}
                      href={href}
                      className="block text-xs transition-colors hover:text-[#FF5500]"
                      style={{ color: C.muted }}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: `1px solid ${C.border}` }}>
            <p className="text-[11px]" style={{ color: C.faint }}>
              © 2026 Kebu. Public sources labeled · AI analysis labeled separately.
            </p>
            <StartButton href="/signup" />
          </div>
        </div>
      </footer>
    </div>
  );
}
