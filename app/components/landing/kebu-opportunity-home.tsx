import Image from "next/image";
import Link from "next/link";
import { KebuMark } from "@/app/components/kebu-mark";
import { YandeMark } from "@/app/components/yande-mark";
import { KebuLandingHeroCTA } from "@/app/components/kebu-landing-hero-cta";
import { KebuMarketingFooter, KebuMarketingHeader } from "@/app/components/landing/kebu-marketing-chrome";
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

/** Live product paths — hero cards only (not top nav). */
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
    desc: "Templates, editor, and publish to your Kebu site address — or connect your own domain.",
    href: "/create",
    stat: "Live now",
  },
] as const;

export function KebuOpportunityHome() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.paper, color: C.ink }}>
      <KebuMarketingHeader />

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
          <div className="kebu-landing-rise kebu-landing-rise-delay-3">
            <KebuLandingHeroCTA orange={C.orange} ink={C.ink} border={C.border} />
          </div>
        </div>
      </section>

      {/*
        Was a full card grid repeating the exact same three LIVE_PATHS entries shown again a few
        hundred pixels below in the "Three live paths" section — same labels, same links, same copy,
        just restyled. Collapsed to a single honest status line so the page says it once. Doubles as
        a dark beat between the cream hero and the cream card grid, closer to how Shopify breaks up
        long light stretches with a contrasting strip.
      */}
      <section style={{ background: C.ink }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-7 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] shrink-0" style={{ color: C.orangeLight }}>
            Phase One, shipped
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {["Country Explorer", "Kebu ID", "Site Builder"].map((label, i) => (
              <span key={label} className="flex items-center gap-2 text-sm font-semibold" style={{ color: C.white }}>
                {i > 0 && <span style={{ color: "rgba(255,255,255,0.25)" }}>·</span>}
                {label}
              </span>
            ))}
          </div>
          <p className="sm:ml-auto text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
            No waitlist pages for features that don&apos;t exist yet.
          </p>
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

      {/* Real product proof — actual working templates from the aesthetic gallery, not stock photography
          standing in for screenshots. Both are live aesthetics any Kebu user can pick and personalize. */}
      <section className="py-20 lg:py-28" style={{ background: C.paper }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="mb-12 max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-3" style={{ color: C.red }}>
              From the aesthetic gallery
            </p>
            <h2
              style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.05 }}
              className="font-bold text-[clamp(1.75rem,4vw,3rem)] mb-4"
            >
              Real templates.
              <span style={{ color: C.orange }}> Not mockups of a builder.</span>
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: C.muted }}>
              Two of the working aesthetics in the gallery today. Pick one, swap in your own name, photos,
              and colors, and publish — the layout underneath is the same one you&apos;re looking at.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Link
              href="/create/aesthetics"
              className="group block rounded-3xl overflow-hidden transition-transform hover:-translate-y-1"
              style={{ background: "#FFE4F0", border: `1px solid ${C.border}`, boxShadow: "0 8px 24px rgba(10,10,10,0.04)" }}
            >
              <div className="relative h-64 sm:h-72 overflow-hidden">
                <Image
                  src="/templates/maylecor/hero-collage.png"
                  alt="Maylecor aesthetic template — artist portrait with a New York City skyline collage"
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  // This PNG's transparent cutout background survives untouched when served as-is, but
                  // Next's image optimizer re-encodes transparent PNGs to an indexed (palette) PNG whose
                  // tRNS transparency chunk Chromium doesn't honor — it renders those pixels using their
                  // raw (opaque, near-white/gray) palette color instead of as transparent, which looks
                  // exactly like a checkerboard behind the cutout. Verified by comparing the optimizer's
                  // output against the original bytes directly. `unoptimized` serves the original file.
                  unoptimized
                  className="object-contain object-bottom p-4"
                />
              </div>
              <div className="p-5" style={{ borderTop: `1px solid ${C.border}` }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: C.red }}>
                  Maylecor
                </p>
                <p className="text-sm leading-snug" style={{ color: C.ink }}>
                  Recording-artist template — hero collage, music embeds, tour dates.
                </p>
              </div>
            </Link>

            <Link
              href="/create/aesthetics"
              className="group block rounded-3xl overflow-hidden transition-transform hover:-translate-y-1"
              style={{ background: "#170006", border: `1px solid ${C.border}`, boxShadow: "0 8px 24px rgba(10,10,10,0.04)" }}
            >
              <div className="relative h-64 sm:h-72 overflow-hidden">
                <Image
                  src="/templates/kdirection/portrait.jpg"
                  alt="K-Direction aesthetic template — studio portrait on a magenta background"
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="p-5" style={{ borderTop: `1px solid ${C.border}` }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: C.red }}>
                  K-Direction
                </p>
                <p className="text-sm leading-snug" style={{ color: C.ink }}>
                  Record-label template — roster pages, portrait-forward hero, press kit.
                </p>
              </div>
            </Link>
          </div>

          <Link
            href="/create/aesthetics"
            className="inline-flex items-center gap-2 mt-8 text-sm font-bold uppercase tracking-[0.1em]"
            style={{ color: C.orange }}
          >
            Browse the aesthetic gallery →
          </Link>
        </div>
      </section>

      {/* Yande is a real, shipped feature (app/components/yande-global-fab.tsx) — the starter prompts
          below are its actual default suggestions, not invented copy. */}
      <section className="py-20 lg:py-28" style={{ background: C.ink }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="mb-6 inline-flex">
                <YandeMark size={56} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-3" style={{ color: C.orangeLight }}>
                Built into every site
              </p>
              <h2
                style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.05, color: C.white }}
                className="font-bold text-[clamp(1.75rem,4vw,3rem)] mb-4"
              >
                Ask Yande instead of guessing.
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
                Yande sits on top of the builder and knows the page you&apos;re on — not a generic help
                doc. Drag it out of the way, ask a question, keep working.
              </p>
            </div>

            <div className="rounded-3xl p-6" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
                What people actually ask it
              </p>
              <div className="space-y-3">
                {[
                  "How do I add photos to my music page?",
                  "How do I connect maylecor.com on Namecheap?",
                  "How do I change my site colors?",
                  "What should I publish first?",
                ].map((q) => (
                  <p
                    key={q}
                    className="text-sm rounded-xl px-4 py-3"
                    style={{ background: "rgba(255,255,255,0.9)", color: C.ink }}
                  >
                    {q}
                  </p>
                ))}
              </div>
            </div>
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
                Templates, editor, and publish on Kebu — or connect your own domain like maylecor.com.
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
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/opportunity/countries"
              className="inline-flex items-center justify-center gap-2 font-bold uppercase tracking-[0.12em] px-10 py-4 text-sm rounded-full transition-all hover:brightness-105"
              style={{ background: C.white, color: C.orange }}
            >
              Explore countries
            </Link>
            <Link
              href="/create"
              className="inline-flex items-center justify-center gap-2 font-bold uppercase tracking-[0.12em] px-10 py-4 text-sm rounded-full transition-all hover:brightness-105"
              style={{ background: "transparent", color: C.white, border: "2px solid rgba(255,255,255,0.85)" }}
            >
              Kebu Builder
            </Link>
          </div>
        </div>
      </section>

      <KebuMarketingFooter />
    </div>
  );
}
