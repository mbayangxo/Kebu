import Link from "next/link";
import { AlkebulanLion, AlkebulanCrest } from "./components/panther-motif";
import { SAMPLE_OPPORTUNITIES } from "@/lib/data/sample-opportunities";
import { SUCCESS_STORIES } from "@/lib/data/success-stories";
import { WEALTH_PATHS } from "@/lib/wealth-paths";
import { INDUSTRIES } from "@/lib/data/industry-intelligence";
import { ResourceVideoSection } from "./components/resource-video";

const FEATURED_STORIES = SUCCESS_STORIES.slice(0, 3);

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "#FAFAF8", color: "#0A0A0A" }}>

      {/* ── NAV ── */}
      <header className="sticky top-0 z-50" style={{ background: "#0F0D33" }}>
        <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #009E40, #00C851, #22D96A)" }} />
        <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="max-w-[1400px] mx-auto px-5 sm:px-8 h-[68px] flex items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-3 flex-shrink-0">
              <AlkebulanLion size={38} />
              <span style={{ letterSpacing: "0.13em", fontFamily: "var(--font-fraunces)", color: "#D4A820" }}
                className="font-bold text-[17px] leading-none hidden sm:block">
                KEBU
              </span>
            </Link>
            <div className="hidden lg:flex items-center gap-5 text-[11px] font-semibold uppercase tracking-[0.14em]">
              {[["Discover", "/build"], ["Industry", "/industry"], ["Path", "/path"], ["Store", "/store/new"]].map(([l, h]) => (
                <Link key={h} href={h} className="text-white/60 hover:text-[#00C851] transition-colors">{l}</Link>
              ))}
              <span className="text-white/20">·</span>
              <Link href="/signup" className="flex items-center gap-2 bg-[#00C851] hover:bg-[#22D96A] text-[#0F0D33] font-bold px-5 py-2 rounded-full transition-colors">
                <AlkebulanLion size={14} /> Enter the Cloud
              </Link>
            </div>
            <div className="lg:hidden flex items-center gap-3">
              <Link href="/signup" className="text-[11px] font-bold uppercase tracking-[0.1em] bg-[#00C851] text-[#0F0D33] px-4 py-2 rounded-full">
                Start
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden" style={{ background: "#0F0D33", minHeight: "92vh", display: "flex", alignItems: "center" }}>
        {/* Subtle texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #00C851 1px, transparent 0)`,
          backgroundSize: "40px 40px"
        }} />
        {/* Gold glow */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-[0.07] rounded-full blur-[120px]"
          style={{ background: "#00C851", transform: "translate(30%, -30%)" }} />

        <div className="relative w-full max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-16 py-24 lg:py-40">
          <div className="max-w-4xl">
            {/* Label */}
            <div className="flex items-center gap-3 mb-10">
              <AlkebulanLion size={28} />
              <span style={{ letterSpacing: "0.22em", color: "rgba(0,200,81,0.7)", fontSize: "10px" }}
                className="font-semibold uppercase">
                The African Cloud
              </span>
            </div>

            {/* Main headline */}
            <h1 style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.0, letterSpacing: "-0.02em" }}
              className="font-bold text-white mb-8">
              <span className="block text-[clamp(2.75rem,8vw,6.5rem)]">One cloud</span>
              <span className="block text-[clamp(2.75rem,8vw,6.5rem)]">to discover,</span>
              <span className="block text-[clamp(2.75rem,8vw,6.5rem)]" style={{ color: "#00C851" }}>create, and sell.</span>
            </h1>

            {/* Sub-headline */}
            <p style={{ fontFamily: "var(--font-fraunces)", color: "rgba(255,255,255,0.5)", lineHeight: 1.3 }}
              className="text-[clamp(1.25rem,3vw,1.85rem)] italic font-light mb-8 max-w-2xl">
              Kebu is the African Cloud for students, creators, and founders —
              find real opportunities, build a business online, and launch a store.
            </p>

            <p className="text-white/45 text-base max-w-xl leading-relaxed mb-12">
              Not another grant list. Not a demo website. A place to see what Africa is sitting on,
              turn it into a product, and put it online — with tools that actually work.
            </p>

            <div className="mb-4">
              <p style={{ color: "rgba(0,200,81,0.55)", fontSize: "11px", letterSpacing: "0.18em", fontWeight: 600, textTransform: "uppercase", marginBottom: "12px" }}>
                Start with what you already have
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/create"
                  className="inline-flex items-center gap-3 font-bold px-8 py-4 rounded-full text-sm uppercase tracking-[0.08em] transition-all"
                  style={{ background: "#00C851", color: "#0F0D33" }}>
                  Create a website
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <path d="M5 12H19M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </Link>
                <Link href="/build"
                  className="inline-flex items-center gap-3 font-semibold px-8 py-4 rounded-full text-sm uppercase tracking-[0.08em] transition-all"
                  style={{ border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" }}>
                  Discover opportunities →
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {["Discover", "Create", "Launch", "Sell", "Grow"].map((cat, i) => (
                <div key={cat} className="flex items-center gap-1.5">
                  {i > 0 && <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>}
                  <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px" }}>{cat}</span>
                </div>
              ))}
              <span style={{ color: "rgba(0,200,81,0.5)", fontSize: "11px", fontWeight: 600 }}>= Kebu Cloud</span>
            </div>
          </div>

          {/* Floating label — bottom right */}
          <div className="absolute bottom-12 right-8 hidden lg:block text-right">
            <p style={{ fontFamily: "var(--font-fraunces)", color: "#00C851", fontSize: "2.5rem", lineHeight: 1, fontWeight: 700 }}>
              African
            </p>
            <p style={{ fontFamily: "var(--font-fraunces)", color: "#FAFAF8", fontSize: "2.5rem", lineHeight: 1, fontWeight: 700 }}>
              Cloud
            </p>
            <p className="text-white/30 text-xs uppercase tracking-[0.2em] mt-2">54 countries · builders first</p>
          </div>
        </div>
      </section>

      {/* ── MISSION STRIP ── */}
      <section className="py-10" style={{ background: "#080620", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-12">
            <p style={{ fontFamily: "var(--font-fraunces)", color: "#FAFAF8", fontSize: "clamp(1rem,2.5vw,1.35rem)", lineHeight: 1.4, fontWeight: 500, flexShrink: 0 }}
              className="italic max-w-lg">
              &ldquo;The African Cloud — for the young person in Lagos, Nairobi, Accra, Dakar who is already trying, and needs infrastructure that finally meets them.&rdquo;
            </p>
            <div className="hidden sm:block h-16 w-px" style={{ background: "rgba(255,255,255,0.1)" }} />
            <p style={{ color: "rgba(253,250,244,0.4)", fontSize: "13px", lineHeight: 1.75 }}>
              Discover opportunities.<br />
              Create a brand, website, or store.<br />
              Launch, sell, and grow — on one platform.
            </p>
          </div>
        </div>
      </section>

      {/* ── EXTRACTION TRUTH ── */}
      <section className="py-16 lg:py-20" style={{ background: "#F0EFF8" }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="mb-10">
            <p style={{ letterSpacing: "0.2em", color: "#009E40", fontSize: "10px" }} className="font-semibold uppercase mb-3">
              The gap that exists
            </p>
            <h2 style={{ fontFamily: "var(--font-fraunces)", color: "#0F0D33", lineHeight: 1.1 }}
              className="font-bold text-[clamp(1.75rem,4vw,3rem)] max-w-2xl">
              Africa produces the world&apos;s most valuable commodities. And earns almost none of the value.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { commodity: "Cocoa", country: "Ghana", fact: "Grows 65% of the world's cocoa", gap: "Earns 6% of chocolate's value", href: "/industry/cocoa" },
              { commodity: "Coffee", country: "Ethiopia", fact: "Invented coffee. Still feeds the world.", gap: "Earns 0.2% of the $500B market", href: "/industry/coffee" },
              { commodity: "Cobalt", country: "DRC", fact: "Holds 65% of global cobalt supply", gap: "Earns 3% of EV battery value", href: "/industry/coltan" },
              { commodity: "Remittance", country: "Continent", fact: "$100B flows in from diaspora yearly", gap: "$12B taken in transfer fees alone", href: "/industry/remittance" },
            ].map((item) => (
              <Link key={item.commodity} href={item.href}
                className="group p-6 rounded-2xl transition-all"
                style={{ background: "#0F0D33", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ color: "rgba(0,200,81,0.7)", fontSize: "10px", letterSpacing: "0.18em" }}
                  className="font-semibold uppercase mb-3">{item.country}</p>
                <p style={{ fontFamily: "var(--font-fraunces)", color: "#FAFAF8", lineHeight: 1.2 }}
                  className="font-bold text-lg mb-2">{item.commodity}</p>
                <p style={{ color: "rgba(253,250,244,0.5)", fontSize: "12px", lineHeight: 1.6 }} className="mb-4">{item.fact}</p>
                <div style={{ borderTop: "1px solid rgba(0,200,81,0.2)" }} className="pt-4">
                  <p style={{ color: "#00C851", fontSize: "12px", fontWeight: 700 }}>{item.gap}</p>
                </div>
                <p style={{ color: "rgba(0,200,81,0.5)", fontSize: "10px", letterSpacing: "0.1em" }}
                  className="font-semibold uppercase mt-4">See the entry points →</p>
              </Link>
            ))}
          </div>

          {/* Footage of the raw materials being described above */}
          <div className="mt-12 pt-10" style={{ borderTop: "1px solid rgba(15,13,51,0.12)" }}>
            <p style={{ fontSize: "9px", letterSpacing: "0.22em", color: "#009E40" }} className="font-semibold uppercase mb-5">
              What's being grown and fished right now
            </p>
            <div className="grid lg:grid-cols-2 gap-6">
              <ResourceVideoSection title="" query="farming" count={2} layout="grid" />
              <ResourceVideoSection title="" query="fish" count={2} layout="grid" />
            </div>
          </div>
        </div>
      </section>

      {/* ── THREE PILLARS ── */}
      <section className="py-24 lg:py-32" style={{ background: "#FAFAF8" }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="mb-16">
            <p style={{ letterSpacing: "0.2em", color: "#00C851", fontSize: "10px" }} className="font-semibold uppercase mb-4">
              What Kebu is
            </p>
            <h2 style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.05, color: "#0F0D33" }}
              className="font-bold text-[clamp(2rem,5vw,3.75rem)] max-w-3xl">
              Not a grant portal. The African Cloud for people who want to build.
            </h2>
            <p style={{ color: "#6B5B45", lineHeight: 1.75, maxWidth: "36rem", marginTop: "1.25rem" }} className="text-base">
              Discover what is possible in your country. Create a business online.
              Launch a store and start selling. One cloud — not three disconnected tools.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-0 border border-[#DDE0F0] rounded-3xl overflow-hidden">
            {[
              {
                num: "01",
                title: "Discover",
                sub: "See the resources, industries, and market gaps around you — labeled clearly as facts vs ideas worth researching.",
                detail: "Industry intel · Opportunity path · Ka Score",
                href: "/build",
                cta: "Find my opportunity",
              },
              {
                num: "02",
                title: "Create",
                sub: "Turn an idea into a business plan, brand direction, and online presence — then edit and publish.",
                detail: "Business builder · Brand tools · Store launcher",
                href: "/build-business",
                cta: "Start creating",
                highlight: true,
              },
              {
                num: "03",
                title: "Launch & sell",
                sub: "Put a store online, take orders, and grow. Payments and full commerce OS expand country by country.",
                detail: "Store · Orders · WhatsApp / manual payments",
                href: "/store/new",
                cta: "Launch a store",
              },
            ].map((p, i) => (
              <div key={p.num} className="relative"
                style={{
                  background: p.highlight ? "#0F0D33" : "#FAFAF8",
                  borderLeft: i > 0 ? "1px solid #DDE0F0" : "none",
                }}>
                <div className="p-8 lg:p-10 flex flex-col h-full min-h-[380px]">
                  <div className="flex items-start justify-between mb-8">
                    <span style={{ fontFamily: "var(--font-fraunces)", color: p.highlight ? "rgba(0,200,81,0.4)" : "rgba(15,13,51,0.15)", fontSize: "4rem", lineHeight: 1, fontWeight: 700 }}>
                      {p.num}
                    </span>
                  </div>
                  <h3 style={{ fontFamily: "var(--font-fraunces)", color: p.highlight ? "#FAFAF8" : "#0F0D33", lineHeight: 1.15 }}
                    className="font-bold text-2xl mb-4">
                    {p.title}
                  </h3>
                  <p style={{ color: p.highlight ? "rgba(253,250,244,0.6)" : "#6B5B45", lineHeight: 1.65 }}
                    className="text-sm flex-1 mb-6">
                    {p.sub}
                  </p>
                  <p style={{ color: p.highlight ? "rgba(0,200,81,0.7)" : "rgba(15,13,51,0.4)", fontSize: "10px", letterSpacing: "0.15em" }}
                    className="font-semibold uppercase mb-6">
                    {p.detail}
                  </p>
                  <Link href={p.href}
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] transition-all self-start"
                    style={{ color: p.highlight ? "#00C851" : "#0F0D33" }}>
                    {p.cta} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NUMBERS THAT MATTER ── */}
      <section className="py-24" style={{ background: "#0F0D33" }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border border-white/10 rounded-3xl overflow-hidden">
            {[
              { n: "1.4B", label: "People living inside Africa right now", sub: "The largest young market on earth." },
              { n: "54", label: "Countries with full intelligence coverage", sub: "Every market, every opportunity." },
              { n: "$1T+", label: "In untapped market value across the continent", sub: "Most of it invisible without a map." },
              { n: "6%", label: "Of chocolate value stays in cocoa-growing Africa", sub: "The other 94% is your entry point." },
            ].map((s, i) => (
              <div key={s.n} className="p-8 lg:p-10"
                style={{ borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                <p style={{ fontFamily: "var(--font-fraunces)", color: "#00C851", lineHeight: 1, fontWeight: 700 }}
                  className="text-[clamp(2.5rem,5vw,4rem)] mb-3">
                  {s.n}
                </p>
                <p className="text-white/70 text-sm leading-snug mb-2">{s.label}</p>
                <p style={{ color: "rgba(0,200,81,0.5)", fontSize: "11px", letterSpacing: "0.1em" }}
                  className="font-semibold uppercase">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 lg:py-32" style={{ background: "#FAFAF8" }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p style={{ letterSpacing: "0.2em", color: "#00C851", fontSize: "10px" }} className="font-semibold uppercase mb-5">
                How the African Cloud works
              </p>
              <h2 style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.05, color: "#0F0D33" }}
                className="font-bold text-[clamp(2rem,4.5vw,3.5rem)] mb-8">
                Discover what is possible.<br />
                Create what is yours.<br />
                <span style={{ color: "#00C851" }}>Launch and sell.</span>
              </h2>
              <p style={{ color: "#6B5B45", lineHeight: 1.75 }} className="text-base mb-4 max-w-lg">
                Most people don&apos;t know they can build something. No one taught them.
                No one showed them the industries around them, the businesses that already
                work, or the path that people like them have already walked.
              </p>
              <p style={{ color: "#6B5B45", lineHeight: 1.75 }} className="text-base mb-10 max-w-lg">
                Kebu does that first. Once you see it — then we give you
                the exact steps. In order. With real costs and real timelines.
                No grant required.
              </p>
              <Link href="/path"
                className="inline-flex items-center gap-3 font-bold px-8 py-4 rounded-full text-sm uppercase tracking-[0.08em] transition-all"
                style={{ background: "#0F0D33", color: "#FAFAF8" }}>
                Show me what&apos;s possible →
              </Link>
            </div>

            {/* Path preview card */}
            <div style={{ background: "#0F0D33", borderRadius: "24px", overflow: "hidden" }}>
              <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#00C851" }} />
                  <p style={{ fontSize: "10px", letterSpacing: "0.18em", color: "rgba(0,200,81,0.7)" }}
                    className="font-semibold uppercase">
                    Example · Skincare brand · Lagos, Nigeria
                  </p>
                </div>
              </div>
              <div className="p-6 space-y-2.5">
                {[
                  { n: 1, text: "Register your business name at CAC", meta: "1 week · ₦10,000 (~$6)", done: true },
                  { n: 2, text: "Open a business account at GTBank or Access", meta: "3 days · Free", done: true },
                  { n: 3, text: "Source raw shea butter from Kwara suppliers", meta: "2 weeks · ₦80,000 starter stock", done: false },
                  { n: 4, text: "Sell first 20 units via Instagram + WhatsApp", meta: "Month 1 · Zero ad spend", done: false },
                  { n: 5, text: "List on Jumia and Konga", meta: "3 days setup · 10% commission", done: false },
                  { n: 6, text: "Pitch to Shoprite / Hubmart for shelf space", meta: "Month 4 · Supply agreement", done: false },
                  { n: 7, text: "Export to diaspora via DHL + Shopify storefront", meta: "Month 8 · $3,000–$8,000/month", done: false },
                ].map(({ n, text, meta, done }) => (
                  <div key={n} className="flex items-start gap-3 px-4 py-3 rounded-xl"
                    style={{ background: done ? "rgba(0,200,81,0.1)" : "rgba(255,255,255,0.04)" }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold mt-0.5"
                      style={{
                        background: done ? "#00C851" : "transparent",
                        border: done ? "none" : "1px solid rgba(255,255,255,0.15)",
                        color: done ? "#0F0D33" : "rgba(255,255,255,0.3)"
                      }}>
                      {done ? "✓" : n}
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: done ? "rgba(253,250,244,0.4)" : "rgba(253,250,244,0.85)", textDecoration: done ? "line-through" : "none" }}>
                        {text}
                      </p>
                      <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }} className="mt-0.5">{meta}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-6 pb-6">
                <Link href="/path" className="block text-center text-xs font-bold uppercase tracking-[0.12em] py-3 rounded-full transition-all"
                  style={{ background: "#00C851", color: "#0F0D33" }}>
                  Build your path →
                </Link>
              </div>
            </div>
          </div>

          {/* What it looks like when Africa owns the value chain */}
          <div className="mt-20 pt-16" style={{ borderTop: "1px solid #DDE0F0" }}>
            <div className="flex items-end justify-between mb-6">
              <div>
                <p style={{ fontSize: "9px", letterSpacing: "0.22em", color: "#00C851" }} className="font-semibold uppercase mb-2">
                  What the end result looks like
                </p>
                <p style={{ fontFamily: "var(--font-fraunces)", color: "#0F0D33", lineHeight: 1.2 }}
                  className="font-semibold text-xl max-w-lg">
                  African markets, brands, and businesses — already running, already winning.
                </p>
              </div>
            </div>
            <ResourceVideoSection title="" query="market" count={4} layout="strip" />
          </div>
        </div>
      </section>

      {/* ── INDUSTRY INTELLIGENCE PREVIEW ── */}
      <section className="py-24" style={{ background: "#F0EFF8" }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p style={{ letterSpacing: "0.2em", color: "#00C851", fontSize: "10px" }} className="font-semibold uppercase mb-4">
                Industry Intelligence
              </p>
              <h2 style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.05, color: "#0F0D33" }}
                className="font-bold text-[clamp(2rem,4.5vw,3.5rem)]">
                Who controls the chain.<br />Where you can enter.
              </h2>
            </div>
            <Link href="/industry" className="hidden lg:flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] transition-colors"
              style={{ color: "#0F0D33" }}>
              All 5 industries →
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {INDUSTRIES.map((ind) => (
              <Link key={ind.slug} href={`/industry/${ind.slug}`}
                className="group relative p-6 rounded-2xl transition-all"
                style={{ background: "#0F0D33", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-3xl mb-4">{ind.icon}</div>
                <p style={{ fontFamily: "var(--font-fraunces)", color: "#FAFAF8", lineHeight: 1.2 }}
                  className="font-bold text-lg mb-2">{ind.name}</p>
                <p style={{ color: "rgba(253,250,244,0.4)", fontSize: "11px", lineHeight: 1.5 }}
                  className="line-clamp-2 mb-4">{ind.tagline}</p>
                <p style={{ color: "#00C851", fontSize: "10px", letterSpacing: "0.15em" }}
                  className="font-bold uppercase">
                  {ind.value_leakage.africa_earns_pct} of value →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── SUCCESS PATHS ── */}
      <section className="py-24 lg:py-32" style={{ background: "#FAFAF8" }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p style={{ letterSpacing: "0.2em", color: "#00C851", fontSize: "10px" }} className="font-semibold uppercase mb-4">
                Proof it works
              </p>
              <h2 style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.05, color: "#0F0D33" }}
                className="font-bold text-[clamp(2rem,4.5vw,3.5rem)]">
                Real people. Real paths.
              </h2>
            </div>
            <Link href="/success" className="hidden lg:block text-xs font-bold uppercase tracking-[0.12em]"
              style={{ color: "#0F0D33" }}>
              All stories →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {FEATURED_STORIES.map((story) => {
              const initials = story.name.split(" ").map((n: string) => n[0]).join("");
              return (
                <div key={story.id} className="rounded-2xl overflow-hidden"
                  style={{ background: "#FAFAF8", border: "1px solid #DDE0F0" }}>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                        style={{ background: "#0F0D33", color: "#FAFAF8" }}>
                        {initials}
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: "#0A0A0A" }}>{story.name}, {story.age}</p>
                        <p className="text-xs" style={{ color: "#9B8B75" }}>{story.location}</p>
                      </div>
                    </div>
                    <h3 style={{ fontFamily: "var(--font-fraunces)", color: "#0F0D33", lineHeight: 1.25 }}
                      className="font-bold text-base mb-3">
                      {story.headline}
                    </h3>
                    <p className="text-xs leading-relaxed mb-4 line-clamp-3" style={{ color: "#6B5B45" }}>{story.story}</p>
                    <blockquote className="text-xs italic pl-3 leading-relaxed" style={{ borderLeft: "2px solid #00C851", color: "#9B8B75" }}>
                      &ldquo;{story.quote}&rdquo;
                    </blockquote>
                    {story.capital_raised && (
                      <p className="text-xs font-bold mt-4" style={{ color: "#009E40" }}>{story.capital_raised}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── WEALTH PATHS ── */}
      <section className="py-24" style={{ background: "#0F0D33" }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="mb-14">
            <p style={{ letterSpacing: "0.2em", color: "rgba(0,200,81,0.6)", fontSize: "10px" }} className="font-semibold uppercase mb-4">
              7 proven paths
            </p>
            <h2 style={{ fontFamily: "var(--font-fraunces)", color: "#FAFAF8", lineHeight: 1.05 }}
              className="font-bold text-[clamp(2rem,4.5vw,3.5rem)]">
              Which path is yours?
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {WEALTH_PATHS.slice(0, 4).map((path) => (
              <Link key={path.id} href={`/path?goal=${encodeURIComponent(path.prefilledGoal)}`}
                className="group p-6 rounded-2xl transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="text-2xl mb-4">{path.emoji}</div>
                <h3 style={{ fontFamily: "var(--font-fraunces)", color: "#FAFAF8", lineHeight: 1.2 }}
                  className="font-bold text-lg mb-2">
                  {path.persona}
                </h3>
                <p style={{ color: "rgba(253,250,244,0.45)", fontSize: "12px", lineHeight: 1.6 }} className="mb-4">
                  {path.tagline}
                </p>
                <div className="flex gap-4 mb-4">
                  <div>
                    <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em" }} className="uppercase mb-0.5">Start with</p>
                    <p style={{ color: "#00C851", fontSize: "12px" }} className="font-bold">{path.startingCapital}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em" }} className="uppercase mb-0.5">Timeline</p>
                    <p style={{ color: "rgba(253,250,244,0.7)", fontSize: "12px" }} className="font-bold">{path.timelineMonths}mo</p>
                  </div>
                </div>
                <p style={{ color: "#00C851", fontSize: "11px", letterSpacing: "0.1em" }} className="font-semibold uppercase">
                  Start here →
                </p>
              </Link>
            ))}
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {WEALTH_PATHS.slice(4).map((path) => (
              <Link key={path.id} href={`/path?goal=${encodeURIComponent(path.prefilledGoal)}`}
                className="flex items-center gap-4 p-5 rounded-2xl transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-2xl flex-shrink-0">{path.emoji}</span>
                <div>
                  <p style={{ color: "#FAFAF8", fontFamily: "var(--font-fraunces)" }} className="font-semibold text-sm">{path.persona}</p>
                  <p style={{ color: "#00C851", fontSize: "11px" }} className="font-semibold mt-0.5">From {path.startingCapital} →</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE NAME ── */}
      <section className="py-24 lg:py-32" style={{ background: "#0F0D33" }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="max-w-3xl">

            {/* Name reveal — AL faded, KEBU lit, LAN faded */}
            <div className="flex items-baseline mb-10 select-none" aria-label="Alkebulan">
              <span style={{ fontFamily: "var(--font-fraunces)", color: "rgba(253,250,244,0.18)", fontSize: "clamp(2.75rem,8vw,5.5rem)", fontWeight: 700, letterSpacing: "0.04em", lineHeight: 1 }}>
                AL
              </span>
              <span style={{ fontFamily: "var(--font-fraunces)", color: "#D4A820", fontSize: "clamp(2.75rem,8vw,5.5rem)", fontWeight: 700, letterSpacing: "0.04em", lineHeight: 1 }}>
                KEBU
              </span>
              <span style={{ fontFamily: "var(--font-fraunces)", color: "rgba(253,250,244,0.18)", fontSize: "clamp(2.75rem,8vw,5.5rem)", fontWeight: 700, letterSpacing: "0.04em", lineHeight: 1 }}>
                LAN
              </span>
            </div>

            {/* Translation */}
            <p style={{ fontFamily: "var(--font-fraunces)", color: "#FAFAF8", fontSize: "clamp(1.1rem,2.5vw,1.5rem)", lineHeight: 1.4, fontWeight: 500 }}
              className="italic mb-8">
              &ldquo;Mother of Mankind.&rdquo; The ancient name for Africa.
            </p>

            {/* History */}
            <div className="space-y-4 max-w-2xl">
              <p style={{ color: "rgba(253,250,244,0.55)", lineHeight: 1.8 }} className="text-sm">
                Before the continent was called Africa — a name that came from outside — the land had its own name, given by its own people. <span style={{ color: "rgba(253,250,244,0.85)", fontWeight: 500 }}>Alkebulan.</span> It was used by the Moors, the Nubians, the Ethiopians, and the Carthaginians. Ancient civilisations that built empires, mapped the stars, traded across oceans, and gave the world mathematics, architecture, and medicine before Europe had modern cities.
              </p>
              <p style={{ color: "rgba(253,250,244,0.55)", lineHeight: 1.8 }} className="text-sm">
                The name was not lost. It was buried under centuries of extraction, renaming, and the deliberate erasure of what Africa was before the world decided what it would become.
              </p>
              <p style={{ color: "rgba(253,250,244,0.55)", lineHeight: 1.8 }} className="text-sm">
                We kept the heart of it. <span style={{ color: "#00C851", fontWeight: 600 }}>Kebu.</span> The core of the oldest name for the oldest place. A platform built not on what Africa needs from the world — but on what Africa already has, and what it is becoming.
              </p>
            </div>

            {/* Ka Score mention */}
            <div className="mt-12 pt-8 border-t border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <span style={{ fontFamily: "var(--font-fraunces)", color: "#00C851", fontSize: "1.1rem", fontWeight: 700 }}>Ka</span>
                <span style={{ color: "rgba(253,250,244,0.3)", fontSize: "11px", letterSpacing: "0.2em" }} className="font-semibold uppercase">Coming · Business credit for African builders</span>
              </div>
              <p style={{ color: "rgba(253,250,244,0.4)", fontSize: "12px", lineHeight: 1.7 }} className="max-w-lg">
                Ka — the ancient Egyptian concept of life force and vital energy. Your business credit profile on Kebu, built from real activity: what you have, what you sell, what you build. A score that grows as you do — and opens doors that have been closed to informal businesses for too long.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── MANIFESTO ── */}
      <section className="py-24 lg:py-32" style={{ background: "#FAFAF8", borderTop: "1px solid #DDE0F0" }}>
        <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <AlkebulanCrest size={56} className="mx-auto mb-10" />
          <blockquote style={{ fontFamily: "var(--font-fraunces)", color: "#0F0D33", lineHeight: 1.35, fontWeight: 500 }}
            className="text-[clamp(1.4rem,3.5vw,2rem)] italic mb-8">
            &ldquo;The young person selling things on the street in Accra is not failing.
            They are untaught. No one showed them the industry around them,
            the business that could scale it, or the step that comes next.
            That is what Kebu is here to do.&rdquo;
          </blockquote>
          <p style={{ color: "#9B8B75", letterSpacing: "0.12em", fontSize: "11px" }} className="uppercase font-semibold">
            Kebu — Mother of Mankind
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-32" style={{ background: "#0F0D33" }}>
        <div className="max-w-3xl mx-auto px-5 sm:px-8 text-center">
          <h2 style={{ fontFamily: "var(--font-fraunces)", color: "#FAFAF8", lineHeight: 1.0, fontWeight: 700 }}
            className="text-[clamp(3rem,8vw,6rem)] mb-8">
            You&apos;re in the<br />right <span style={{ color: "#00C851" }}>place.</span>
          </h2>
          <p style={{ color: "rgba(253,250,244,0.5)", lineHeight: 1.7 }} className="text-base mb-4 max-w-xl mx-auto">
            You don&apos;t need a grant to start. You don&apos;t need to move abroad.
            You need to see what is already around you — and know what to do with it.
          </p>
          <p style={{ color: "rgba(253,250,244,0.35)", lineHeight: 1.7 }} className="text-sm mb-12 max-w-xl mx-auto">
            Tell us where you are and what you want to do. We&apos;ll show you the opportunity and the exact steps.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/path"
              className="inline-flex items-center gap-3 font-bold px-10 py-4 rounded-full text-sm uppercase tracking-[0.08em] transition-all"
              style={{ background: "#00C851", color: "#0F0D33" }}>
              Show me what&apos;s possible →
            </Link>
            <Link href="/build-business"
              className="inline-flex items-center gap-3 font-semibold px-10 py-4 rounded-full text-sm uppercase tracking-[0.08em] transition-all"
              style={{ border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)" }}>
              Kebu Builder
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#070F09", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <AlkebulanCrest size={32} />
                <span style={{ fontFamily: "var(--font-fraunces)", color: "#FAFAF8", letterSpacing: "0.1em" }}
                  className="font-bold italic">KEBU</span>
              </div>
              <p style={{ color: "rgba(253,250,244,0.35)", fontSize: "12px", lineHeight: 1.7 }}>
                Africa is the opportunity.
              </p>
            </div>
            {[
              {
                title: "Platform",
                links: [["Your Path", "/path"], ["Industry Intelligence", "/industry"], ["AI Business Builder", "/build-business"], ["Programs", "/programs"], ["Procurement", "/procurement"]],
              },
              {
                title: "Intelligence",
                links: [["Cocoa", "/industry/cocoa"], ["Coffee", "/industry/coffee"], ["Cotton", "/industry/cotton"], ["Coltan", "/industry/coltan"], ["Remittance", "/industry/remittance"]],
              },
              {
                title: "Tools",
                links: [["Capital Stack", "/capital-stack"], ["AfCFTA Navigator", "/afcfta"], ["Bankability Engine", "/bankability"], ["AI Assistant", "/assistant"], ["Success Stories", "/success"]],
              },
            ].map((col) => (
              <div key={col.title}>
                <p style={{ fontSize: "9px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.25)" }} className="font-semibold uppercase mb-4">
                  {col.title}
                </p>
                <div className="space-y-2.5">
                  {col.links.map(([label, href]) => (
                    <Link key={href} href={href} className="block text-xs transition-colors"
                      style={{ color: "rgba(253,250,244,0.45)" }}>
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>© 2026 Kebu. Africa is the opportunity.</p>
            <div className="flex gap-6">
              {[["Sign in", "/login"], ["Get started", "/signup"]].map(([l, h]) => (
                <Link key={h} href={h} style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}
                  className="uppercase font-semibold hover:text-white transition-colors">{l}</Link>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
