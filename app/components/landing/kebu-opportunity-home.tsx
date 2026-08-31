import Link from "next/link";
import { AlkebulanLion } from "@/app/components/panther-motif";
import { SAMPLE_OPPORTUNITIES } from "@/lib/data/sample-opportunities";
import { SUCCESS_STORIES } from "@/lib/data/success-stories";
import { INDUSTRIES } from "@/lib/data/industry-intelligence";

/** Kebu landing — bright orange, black, red. Opportunity OS first. */
const C = {
  black: "#0A0A0A",
  blackSoft: "#141414",
  orange: "#FF5500",
  orangeLight: "#FF7733",
  red: "#E10600",
  redSoft: "#FF2D2D",
  white: "#FAFAFA",
  muted: "rgba(250,250,250,0.55)",
  faint: "rgba(250,250,250,0.35)",
} as const;

const NAV = [
  { label: "Opportunity", href: "/opportunity" },
  { label: "Resources", href: "/industry" },
  { label: "Entrepreneurs", href: "/success" },
  { label: "Build a site", href: "/create" },
] as const;

const LOCATION_LAYERS = [
  {
    level: "Country",
    desc: "National grants, AfCFTA trade rules, sector policies, and macro opportunities.",
    href: "/opportunity/countries",
    stat: "54 countries",
  },
  {
    level: "City",
    desc: "Metro tenders, incubators, supplier networks, and urban market gaps.",
    href: "/map",
    stat: "Capitals + major cities",
  },
  {
    level: "Town & local",
    desc: "Commune-level starts, local procurement, and what your neighbourhood already produces.",
    href: "/starts",
    stat: "Local chapters growing",
  },
] as const;

const DAILY_FEEDS = [
  { label: "Grants", href: "/programs", desc: "Foundation & government funding windows" },
  { label: "Tenders & bids", href: "/procurement", desc: "Public contracts you can compete for" },
  { label: "Trade & resources", href: "/industry", desc: "What Africa grows, mines, and ships" },
  { label: "Entrepreneur paths", href: "/path", desc: "Step-by-step plans from real builders" },
] as const;

const FEATURED_OPPS = SAMPLE_OPPORTUNITIES.filter((o) =>
  ["Grant", "Procurement", "Government contract", "Accelerator", "Fellowship"].includes(o.type)
).slice(0, 4);

const FEATURED_STORIES = SUCCESS_STORIES.slice(0, 3);

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
      style={{ background: C.orange, color: C.black }}
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
    <div className="min-h-screen" style={{ background: C.black, color: C.white }}>
      {/* ── NAV ── */}
      <header className="sticky top-0 z-50" style={{ background: C.black }}>
        <div
          className="h-[4px] w-full"
          style={{ background: `linear-gradient(90deg, ${C.red}, ${C.orange}, ${C.red})` }}
        />
        <nav style={{ borderBottom: `1px solid rgba(255,85,0,0.15)` }}>
          <div className="max-w-[1400px] mx-auto px-5 sm:px-8 h-[68px] flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 flex-shrink-0 group">
              <AlkebulanLion size={36} />
              <span
                style={{ letterSpacing: "0.14em", fontFamily: "var(--font-fraunces)", color: C.orange }}
                className="font-bold text-[17px] leading-none hidden sm:block"
              >
                KEBU
              </span>
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

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 70% 20%, ${C.orange} 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 10% 80%, ${C.red} 0%, transparent 50%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(${C.orange} 1px, transparent 1px), linear-gradient(90deg, ${C.orange} 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-16 py-20 lg:py-32">
          <div className="max-w-4xl">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{ background: `${C.red}22`, color: C.redSoft, border: `1px solid ${C.red}44` }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.red }} />
              Opportunity OS · refreshed from public sources
            </div>

            <h1
              style={{ fontFamily: "var(--font-fraunces)", lineHeight: 0.95, letterSpacing: "-0.02em" }}
              className="font-bold mb-8"
            >
              <span className="block text-[clamp(2.5rem,7vw,5.5rem)] text-white">Kebu is for</span>
              <span className="block text-[clamp(2.5rem,7vw,5.5rem)]" style={{ color: C.orange }}>
                opportunity.
              </span>
            </h1>

            <p
              style={{ fontFamily: "var(--font-fraunces)", color: C.muted, lineHeight: 1.35 }}
              className="text-[clamp(1.15rem,2.5vw,1.65rem)] font-light mb-6 max-w-2xl"
            >
              Grants, government tenders, and bids — mapped to your country, your city, and your town.
              See what African resources can become. See what the world already does with them.
            </p>

            <p className="text-sm max-w-xl leading-relaxed mb-10" style={{ color: C.faint }}>
              When you find the right opportunity, Kebu helps you build the site, brand, and business
              to capture it — not a demo, a real path forward.
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-12">
              <StartButton large href="/signup" />
              <Link
                href="/opportunity/countries"
                className="inline-flex items-center gap-2 font-semibold px-8 py-4 rounded-full text-sm uppercase tracking-[0.08em] transition-all"
                style={{ border: `1px solid ${C.orange}66`, color: C.orangeLight }}
              >
                Explore my country →
              </Link>
            </div>

            <div className="flex flex-wrap gap-3 text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: C.faint }}>
              {["Grants", "Tenders", "Resources", "Entrepreneurs", "Build"].map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-full" style={{ background: C.blackSoft, border: `1px solid ${C.orange}22` }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── DAILY OPPORTUNITY STRIP ── */}
      <section style={{ background: C.blackSoft, borderTop: `1px solid ${C.orange}18`, borderBottom: `1px solid ${C.orange}18` }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-14">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-3" style={{ color: C.orange }}>
                Updated daily
              </p>
              <h2
                style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.05 }}
                className="font-bold text-[clamp(1.75rem,4vw,2.75rem)]"
              >
                Government portals. Grants. Bidding.
                <span style={{ color: C.red }}> One place.</span>
              </h2>
            </div>
            <p className="text-sm max-w-md leading-relaxed" style={{ color: C.muted }}>
              Kebu pulls from public government and foundation sources so you see what opened today —
              not a static list from last year. Verified entries are labeled; estimates are labeled too.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
            {DAILY_FEEDS.map(({ label, href, desc }) => (
              <Link
                key={href}
                href={href}
                className="group p-5 rounded-2xl transition-all"
                style={{ background: C.black, border: `1px solid ${C.orange}22` }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: C.redSoft }}>
                  {label}
                </p>
                <p className="text-sm leading-snug mb-3" style={{ color: C.white }}>
                  {desc}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] group-hover:underline" style={{ color: C.orange }}>
                  Open feed →
                </p>
              </Link>
            ))}
          </div>

          {FEATURED_OPPS.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: C.faint }}>
                Live opportunity preview
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                {FEATURED_OPPS.map((opp) => (
                  <Link
                    key={opp.id}
                    href={`/opportunity/${opp.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl transition-all"
                    style={{ background: C.black, border: `1px solid ${C.orange}15` }}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                          style={{ background: `${C.orange}22`, color: C.orange }}
                        >
                          {opp.type}
                        </span>
                        <span className="text-[10px]" style={{ color: C.faint }}>
                          {opp.country}
                        </span>
                      </div>
                      <p className="font-semibold text-sm truncate">{opp.title}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase shrink-0" style={{ color: C.orangeLight }}>
                      View →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── COUNTRY · CITY · TOWN ── */}
      <section className="py-20 lg:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="mb-12 max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-3" style={{ color: C.redSoft }}>
              Every layer of Africa
            </p>
            <h2
              style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.05 }}
              className="font-bold text-[clamp(1.75rem,4vw,3rem)] mb-4"
            >
              Country. City. Local town.
              <span style={{ color: C.orange }}> All mapped.</span>
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: C.muted }}>
              Opportunity is not only in Lagos or Nairobi — it is in your commune, your port, your farm belt.
              Kebu connects national policy to street-level action.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            {LOCATION_LAYERS.map(({ level, desc, href, stat }, i) => (
              <Link
                key={level}
                href={href}
                className="relative p-8 rounded-3xl overflow-hidden transition-transform hover:-translate-y-1"
                style={{
                  background: i === 1 ? C.orange : C.blackSoft,
                  color: i === 1 ? C.black : C.white,
                  border: i === 1 ? "none" : `1px solid ${C.orange}25`,
                }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4"
                  style={{ color: i === 1 ? C.black : C.redSoft }}
                >
                  {stat}
                </p>
                <h3
                  style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.1 }}
                  className="font-bold text-2xl mb-3"
                >
                  {level}
                </h3>
                <p className="text-sm leading-relaxed mb-6" style={{ color: i === 1 ? "rgba(10,10,10,0.75)" : C.muted }}>
                  {desc}
                </p>
                <span className="text-xs font-bold uppercase tracking-[0.12em]">Explore →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── AFRICAN RESOURCES vs GLOBAL VALUE ── */}
      <section style={{ background: C.blackSoft }} className="py-20 lg:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-3" style={{ color: C.orange }}>
                African resources
              </p>
              <h2
                style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.05 }}
                className="font-bold text-[clamp(1.75rem,4vw,3rem)] max-w-xl"
              >
                What we produce.
                <br />
                <span style={{ color: C.red }}>What others capture.</span>
              </h2>
            </div>
            <Link href="/industry" className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: C.orangeLight }}>
              All industries →
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {INDUSTRIES.slice(0, 6).map((ind) => (
              <Link
                key={ind.slug}
                href={`/industry/${ind.slug}`}
                className="p-6 rounded-2xl transition-all group"
                style={{ background: C.black, border: `1px solid ${C.orange}18` }}
              >
                <div className="text-2xl mb-3">{ind.icon}</div>
                <h3 style={{ fontFamily: "var(--font-fraunces)" }} className="font-bold text-lg mb-2">
                  {ind.name}
                </h3>
                <p className="text-xs leading-relaxed mb-4 line-clamp-2" style={{ color: C.muted }}>
                  {ind.extraction_headline}
                </p>
                <div className="flex items-center justify-between gap-2 pt-3" style={{ borderTop: `1px solid ${C.orange}15` }}>
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: C.faint }}>
                    Africa keeps
                  </span>
                  <span className="text-sm font-bold" style={{ color: C.orange }}>
                    {ind.value_leakage.africa_earns_pct}
                  </span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] mt-4 group-hover:underline" style={{ color: C.redSoft }}>
                  See global chain →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── BUILD WHEN YOU FIND IT ── */}
      <section className="py-20 lg:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-3" style={{ color: C.redSoft }}>
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
                Kebu is not only a feed — it includes a real website builder so you can launch a brand,
                portfolio, or store tied to the grant, tender, or business you are pursuing.
              </p>
              <p className="text-sm leading-relaxed mb-8" style={{ color: C.faint }}>
                Templates for agencies, salons, production houses, perfume brands, artists, and more.
                Edit, publish, and grow from one place.
              </p>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-full text-sm uppercase tracking-[0.08em]"
                style={{ background: C.red, color: C.white }}
              >
                Open site builder →
              </Link>
              <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.1em]">
                <Link
                  href="/create/demo/musician-kdirection-artist"
                  className="underline underline-offset-4"
                  style={{ color: C.orangeLight }}
                >
                  Preview May Lecor artist template →
                </Link>
                <Link
                  href="/create/demo/showcase-legally-blonde"
                  className="underline underline-offset-4"
                  style={{ color: C.orangeLight }}
                >
                  Preview Legally Blonde template →
                </Link>
              </div>
            </div>

            <div
              className="rounded-3xl p-8 lg:p-10"
              style={{ background: C.blackSoft, border: `1px solid ${C.orange}25` }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6" style={{ color: C.orange }}>
                How it connects
              </p>
              <ol className="space-y-5">
                {[
                  { step: "01", text: "Pick your country, city, or local area on Kebu." },
                  { step: "02", text: "See grants, tenders, resources, and entrepreneur paths — labeled clearly." },
                  { step: "03", text: "Build a site or store to apply, bid, or sell — then publish live." },
                ].map(({ step, text }) => (
                  <li key={step} className="flex gap-4">
                    <span
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: C.orange, color: C.black }}
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

      {/* ── ENTREPRENEURS ── */}
      <section style={{ background: C.blackSoft }} className="py-20 lg:py-28">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="flex items-end justify-between mb-10 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-3" style={{ color: C.orange }}>
                Entrepreneurs
              </p>
              <h2 style={{ fontFamily: "var(--font-fraunces)" }} className="font-bold text-[clamp(1.75rem,4vw,3rem)]">
                People who moved.
              </h2>
            </div>
            <Link href="/success" className="hidden sm:block text-xs font-bold uppercase tracking-[0.12em]" style={{ color: C.orangeLight }}>
              All stories →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {FEATURED_STORIES.map((story) => {
              const initials = story.name.split(" ").map((n: string) => n[0]).join("");
              return (
                <div
                  key={story.id}
                  className="p-6 rounded-2xl"
                  style={{ background: C.black, border: `1px solid ${C.orange}18` }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{ background: C.orange, color: C.black }}
                    >
                      {initials}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{story.name}</p>
                      <p className="text-xs" style={{ color: C.faint }}>
                        {story.location}
                      </p>
                    </div>
                  </div>
                  <h3 style={{ fontFamily: "var(--font-fraunces)" }} className="font-bold text-base mb-2 leading-snug">
                    {story.headline}
                  </h3>
                  <p className="text-xs leading-relaxed line-clamp-3" style={{ color: C.muted }}>
                    {story.story}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${C.red}33 0%, ${C.black} 40%, ${C.orange}22 100%)` }}
        />
        <div className="relative max-w-3xl mx-auto px-5 text-center">
          <h2
            style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.0 }}
            className="font-bold text-[clamp(2.5rem,7vw,4.5rem)] mb-6"
          >
            Africa is the
            <span style={{ color: C.orange }}> opportunity.</span>
          </h2>
          <p className="text-base mb-10 max-w-lg mx-auto leading-relaxed" style={{ color: C.muted }}>
            Start with where you are. See what opened today. Build what comes next.
          </p>
          <StartButton large href="/signup" className="mx-auto" />
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: C.black, borderTop: `1px solid ${C.orange}15` }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <AlkebulanLion size={28} />
                <span style={{ fontFamily: "var(--font-fraunces)", color: C.orange }} className="font-bold tracking-widest">
                  KEBU
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: C.faint }}>
                Opportunity first. Resources mapped. Entrepreneurs shown. Sites built to capture it.
              </p>
            </div>
            {[
              {
                title: "Opportunity",
                links: [
                  ["Countries", "/opportunity/countries"],
                  ["Programs & grants", "/programs"],
                  ["Tenders & bids", "/procurement"],
                  ["Your path", "/path"],
                ],
              },
              {
                title: "Resources",
                links: [
                  ["Industries", "/industry"],
                  ["Local starts", "/starts"],
                  ["Map", "/map"],
                  ["AfCFTA", "/afcfta"],
                ],
              },
              {
                title: "Build",
                links: [
                  ["Site builder", "/create"],
                  ["Store", "/store/new"],
                  ["Success stories", "/success"],
                  ["Business", "/business"],
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: C.orange }}>
                  {col.title}
                </p>
                <div className="space-y-2">
                  {col.links.map(([label, href]) => (
                    <Link key={href} href={href} className="block text-xs transition-colors hover:text-[#FF5500]" style={{ color: C.muted }}>
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: `1px solid ${C.orange}12` }}>
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
