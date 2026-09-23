"use client";

import Link from "next/link";
import { KEBU } from "@/lib/kebu-brand";
import { KebuLandingHeroCTA } from "@/app/components/kebu-landing-hero-cta";

const TOOL_CATS = [
  { label: "Social Media", emoji: "📱" },
  { label: "Video Editing", emoji: "🎬" },
  { label: "Graphics", emoji: "✦" },
  { label: "Presentations", emoji: "📊" },
  { label: "Brand Kits", emoji: "🎨" },
  { label: "AI Creation", emoji: "⚡" },
  { label: "Collaboration", emoji: "👥" },
  { label: "More Tools", emoji: "→" },
];

const FEATURES = [
  { title: "Templates", desc: "Thousands of professionally designed templates across every format and industry.", accent: "#FF5500" },
  { title: "AI Tools", desc: "Generate, edit, and enhance with AI designed for creative professionals.", accent: "#6C63FF" },
  { title: "Video Studio", desc: "Full video editing with captions, music, effects and export anywhere.", accent: "#0EA5E9" },
  { title: "Photo & Graphics", desc: "Edit photos, create graphics, and build visual assets in minutes.", accent: "#0E9F6E" },
  { title: "Audio", desc: "AI-generated music, sound effects, and voice for your projects.", accent: "#F4B400" },
  { title: "Brand Tools", desc: "Logos, color palettes, fonts and brand guidelines in one place.", accent: "#FF1F1F" },
  { title: "Team Collaboration", desc: "Share, comment, and build together in real-time.", accent: "#A15CFF" },
  { title: "Export Anywhere", desc: "Download in any format. Publish direct to social, web and more.", accent: "#333333" },
];

export function KebuStudioLanding() {
  const orange = KEBU.orange;
  const ink = KEBU.black;
  const border = KEBU.borders.default;

  return (
    <div className="min-h-screen" style={{ background: KEBU.bright, color: ink }}>

      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur-md" style={{ borderColor: border }}>
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-1.5 text-base font-black tracking-[-0.04em]" style={{ color: ink }}>
              <span style={{ color: orange }}>✦</span> kebu
            </Link>
            <nav className="hidden items-center gap-6 lg:flex">
              {["Studio", "Create", "Templates", "AI Tools", "Learn", "Pricing"].map((item) => (
                <Link key={item} href={item === "Studio" ? "/studio" : `/${item.toLowerCase().replace(" ", "-")}`}
                  className="text-[12px] font-semibold transition hover:opacity-60" style={{ color: "rgba(0,0,0,0.55)" }}>
                  {item}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <input
                type="text"
                placeholder="Search templates..."
                className="h-9 rounded-full border px-4 text-[12px] outline-none focus:ring-2"
                style={{ borderColor: border, width: 200, background: "rgba(0,0,0,0.03)" }}
              />
            </div>
            <Link href="/studio" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[11px] font-black uppercase tracking-[.1em] text-white transition hover:brightness-110" style={{ background: orange }}>
              Open Studio →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-[1400px] px-5 pb-16 pt-20 sm:px-8 sm:pt-24">
        <div className="max-w-4xl">
          <p className="mb-4 text-[10px] font-black uppercase tracking-[.2em]" style={{ color: orange }}>Kebu Studio</p>
          <h1 className="text-[clamp(3.5rem,9vw,8rem)] font-black leading-[.85] tracking-[-.07em]" style={{ fontFamily: "var(--font-fraunces)", color: ink }}>
            Create without<br />
            <em className="font-normal not-italic" style={{ color: orange }}>limits.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed" style={{ color: "rgba(0,0,0,0.5)" }}>
            A new creative space for a new generation. Design, edit, animate, and bring your ideas to life — all in one place.
          </p>
          <div className="mt-8">
            <KebuLandingHeroCTA orange={orange} ink={ink} border={border} />
          </div>
          <div className="mt-4 flex items-center gap-4">
            <Link href="/studio" className="text-[12px] font-semibold underline underline-offset-4" style={{ color: "rgba(0,0,0,0.4)" }}>Watch video ▶</Link>
          </div>
        </div>
      </section>

      {/* Tool categories row */}
      <section className="border-y" style={{ borderColor: border }}>
        <div className="mx-auto max-w-[1400px] overflow-x-auto px-5 sm:px-8">
          <div className="flex min-w-max gap-0 divide-x" style={{ borderColor: border }}>
            {TOOL_CATS.map((cat) => (
              <Link key={cat.label} href="/studio"
                className="flex flex-col items-center gap-2 px-6 py-5 text-center transition hover:bg-black/[.03]">
                <span className="text-xl">{cat.emoji}</span>
                <span className="text-[10px] font-black uppercase tracking-[.08em]" style={{ color: "rgba(0,0,0,0.5)" }}>{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* One Studio. Infinite Possibilities. */}
      <section className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div className="flex flex-col justify-center">
            <p className="text-[9px] font-black uppercase tracking-[.2em]" style={{ color: orange }}>One platform</p>
            <h2 className="mt-4 text-[clamp(2.2rem,5vw,4rem)] font-black leading-[.9] tracking-[-.06em]" style={{ fontFamily: "var(--font-fraunces)" }}>
              One Studio.<br />Infinite Possibilities.
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed" style={{ color: "rgba(0,0,0,0.5)" }}>
              Everything a modern creator needs in a single, seamlessly integrated workspace. From social posts to full video productions.
            </p>
            <Link href="/studio" className="mt-8 inline-flex self-start items-center gap-2 rounded-full px-8 py-4 text-[11px] font-black uppercase tracking-[.12em] text-white" style={{ background: orange }}>
              Open Studio →
            </Link>
          </div>
          <div className="relative min-h-[340px] overflow-hidden rounded-3xl" style={{ background: "#0A0A0A" }}>
            <div className="absolute inset-0 opacity-50" style={{ background: "radial-gradient(ellipse at 60% 40%,#FF5500,transparent 55%),radial-gradient(ellipse at 20% 80%,#6C63FF,transparent 50%)" }} />
            <div className="absolute bottom-8 left-8 right-8">
              <div className="space-y-2">
                {["Design", "Edit", "Animate"].map((word, i) => (
                  <div key={word} className="flex items-center gap-3 rounded-xl border bg-white/5 px-4 py-3 backdrop-blur-sm" style={{ borderColor: "rgba(255,255,255,0.08)", opacity: 1 - i * 0.15 }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: i === 0 ? "#FF5500" : i === 1 ? "#6C63FF" : "#0E9F6E" }} />
                    <span className="text-sm font-black text-white">{word}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="border-t" style={{ borderColor: border }}>
        <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8">
          <div className="mb-10 text-center">
            <p className="text-[9px] font-black uppercase tracking-[.2em]" style={{ color: orange }}>Everything you need</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-.04em]" style={{ fontFamily: "var(--font-fraunces)" }}>Make it yours.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feat) => (
              <Link key={feat.title} href="/studio"
                className="group overflow-hidden rounded-2xl border p-5 transition hover:-translate-y-1 hover:shadow-md"
                style={{ borderColor: border, background: "rgba(255,255,255,.8)" }}>
                <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: feat.accent + "18" }}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: feat.accent }} />
                </span>
                <h3 className="font-black">{feat.title}</h3>
                <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "rgba(0,0,0,0.5)" }}>{feat.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof dark section */}
      <section className="mx-4 mb-12 overflow-hidden rounded-3xl sm:mx-8" style={{ background: "#0A0A0A" }}>
        <div className="mx-auto max-w-[1400px] px-8 py-16 text-center">
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 0%,#FF5500,transparent 50%)" }} />
          <p className="relative text-[9px] font-black uppercase tracking-[.2em]" style={{ color: "rgba(255,255,255,0.3)" }}>Growing community</p>
          <h2 className="relative mt-4 text-[clamp(2rem,5vw,4rem)] font-black leading-[.9] tracking-[-.05em] text-white" style={{ fontFamily: "var(--font-fraunces)" }}>
            10M+ creators<br />already building on Kebu
          </h2>
          <p className="relative mx-auto mt-4 max-w-lg text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
            From freelancers to studios. From Lagos to London. One platform for every creative.
          </p>
          <Link href="/studio" className="relative mt-8 inline-flex items-center gap-2 rounded-full px-8 py-4 text-[11px] font-black uppercase tracking-[.12em] text-white transition hover:brightness-110" style={{ background: orange }}>
            Open Studio — it&apos;s free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-5 py-10 text-center sm:px-8" style={{ borderColor: border }}>
        <Link href="/" className="text-base font-black tracking-[-0.04em]" style={{ color: ink }}>
          <span style={{ color: orange }}>✦</span> kebu
        </Link>
        <p className="mt-2 text-[11px]" style={{ color: "rgba(0,0,0,0.4)" }}>The creative platform for a new generation.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-5">
          {["Studio", "Opportunity OS", "For Organizations", "Privacy", "Terms"].map((item) => (
            <Link key={item} href="/" className="text-[11px] transition hover:opacity-60" style={{ color: "rgba(0,0,0,0.4)" }}>{item}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
