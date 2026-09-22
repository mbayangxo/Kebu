"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { KebuMark } from "@/app/components/kebu-mark";
import { YandeMark } from "@/app/components/yande-mark";
import { KebuLandingHeroCTA } from "@/app/components/kebu-landing-hero-cta";
import { KebuMarketingFooter, KebuMarketingHeader } from "@/app/components/landing/kebu-marketing-chrome";
import { KEBU } from "@/lib/kebu-brand";

const C = {
  ...KEBU,
  ink: KEBU.black,
  paper: KEBU.bright,
  paperSoft: KEBU.cream,
  muted: KEBU.muted,
  faint: KEBU.faint,
} as const;

const STEPS = [
  {
    num: "01",
    title: "Find the opportunity",
    desc: "Country Explorer — real data from labeled public sources. Not a brochure dump. 54 countries, real market signals.",
    href: "/opportunity/countries",
  },
  {
    num: "02",
    title: "Create your business",
    desc: "Draft your Kebu ID, check registration readiness, and keep all co-founders on one business identity.",
    href: "/business",
  },
  {
    num: "03",
    title: "Build & publish",
    desc: "Pick a template, personalize it, connect your own domain — then publish. Mobile money and WhatsApp checkout included.",
    href: "/create",
  },
] as const;

const STATS = [
  { value: "54", label: "African countries in Explorer" },
  { value: "XOF", label: "mobile money native" },
  { value: "1", label: "account across Kebu" },
  { value: "Free", label: "to start building" },
] as const;

const WEST_AFRICA = [
  "Sénégal", "Côte d'Ivoire", "Mali", "Burkina Faso",
  "Guinée", "Niger", "Bénin", "Togo",
  "Ghana", "Nigeria", "Sierra Leone", "Liberia",
  "Mauritanie", "Gambie", "Cap-Vert", "Guinée-Bissau",
] as const;

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".kebu-reveal");
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export function KebuOpportunityHome() {
  useScrollReveal();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.paper, color: C.ink }}>
      <KebuMarketingHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: C.paper }}
      >
        <div
          className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] opacity-[0.07]"
          style={{ background: "radial-gradient(circle at 80% 20%, rgba(255,85,0,1), transparent 60%)" }}
          aria-hidden
        />

        <div className="relative max-w-[1400px] mx-auto w-full px-5 sm:px-8 lg:px-16 py-16 lg:py-20 xl:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
            {/* Left: copy */}
            <div>
              <p
                className="kebu-landing-rise mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em]"
                style={{ background: "rgba(255,85,0,.08)", color: C.orange, border: "1px solid rgba(255,85,0,.18)" }}
              >
                <KebuMark size={14} /> Free to start · Built for Africa
              </p>

              <h1
                className="kebu-landing-rise kebu-landing-rise-delay font-black leading-[0.88] tracking-[-0.04em] mb-6"
                style={{
                  fontFamily: "var(--font-fraunces)",
                  fontSize: "clamp(3rem,7.5vw,6.4rem)",
                  color: C.ink,
                }}
              >
                Build your site.<br />
                Run your business.<br />
                <span style={{ color: C.orange }}>Own your future.</span>
              </h1>

              <p
                className="kebu-landing-rise kebu-landing-rise-delay-2 text-base sm:text-lg max-w-lg mb-10 leading-relaxed"
                style={{ color: C.muted }}
              >
                One platform to build a professional site, run a shop, manage customers and find African market opportunities — no code, no confusion.
              </p>

              <div className="kebu-landing-rise kebu-landing-rise-delay-3 flex flex-wrap gap-3 mb-10">
                <KebuLandingHeroCTA
                  orange={C.orange}
                  ink={C.ink}
                  border={C.border}
                />
              </div>

              <div className="kebu-landing-rise flex flex-wrap gap-2" style={{ animationDelay: "0.5s" }}>
                {["Free to start", "No code", "XOF & mobile money", "WhatsApp checkout", "AI site builder"].map((chip) => (
                  <span
                    key={chip}
                    className="text-[10px] font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: C.white, color: C.muted, border: `1px solid ${C.border}` }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: product browser mockup */}
            <div className="kebu-landing-rise kebu-landing-rise-delay-2 relative">
              {/* Browser chrome frame */}
              <div
                className="relative overflow-hidden rounded-[18px] shadow-[0_24px_80px_rgba(10,10,10,.14)]"
                style={{ border: `1px solid ${C.border}` }}
              >
                {/* Browser top bar */}
                <div
                  className="flex items-center gap-2 px-4 py-3"
                  style={{ background: "#F0EDE8", borderBottom: `1px solid ${C.border}` }}
                >
                  <span className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-red-400" />
                    <span className="h-3 w-3 rounded-full bg-yellow-400" />
                    <span className="h-3 w-3 rounded-full bg-green-400" />
                  </span>
                  <span
                    className="flex-1 mx-3 rounded-md px-3 py-1 text-[10px]"
                    style={{ background: C.white, color: C.faint, border: `1px solid ${C.border}` }}
                  >
                    maylecor.kebu.africa
                  </span>
                </div>
                {/* Site preview */}
                <div className="relative" style={{ aspectRatio: "4/3", background: "#FFE4F0" }}>
                  <Image
                    src="/templates/maylecor/hero-collage.png"
                    alt="May Lecor artist site built on Kebu"
                    fill
                    sizes="(min-width: 1024px) 55vw, 100vw"
                    className="object-cover object-top"
                    priority
                  />
                  {/* Overlay badge */}
                  <div
                    className="absolute bottom-4 left-4 rounded-xl px-3 py-2 text-[10px] font-bold"
                    style={{ background: "rgba(255,255,255,0.95)", color: C.ink, boxShadow: "0 2px 12px rgba(10,10,10,.15)" }}
                  >
                    <span style={{ color: C.orange }}>● Live</span> · maylecor.kebu.africa
                  </div>
                </div>
              </div>

              {/* Floating stat cards */}
              <div
                className="absolute -left-6 top-1/3 hidden rounded-2xl px-4 py-3 shadow-lg lg:block"
                style={{ background: C.white, border: `1px solid ${C.border}` }}
              >
                <p className="text-[11px] font-black" style={{ color: C.ink }}>6 min</p>
                <p className="text-[9px]" style={{ color: C.muted }}>avg. time to first site</p>
              </div>
              <div
                className="absolute -right-4 bottom-16 hidden rounded-2xl px-4 py-3 shadow-lg lg:block"
                style={{ background: C.black, border: "1px solid rgba(255,255,255,.1)" }}
              >
                <p className="text-[11px] font-black text-white">XOF native</p>
                <p className="text-[9px] text-white/50">mobile money built in</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Phase One status strip ───────────────────────────────────────────── */}
      <section style={{ background: C.orange }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
          <p
            className="text-[10px] font-semibold tracking-[0.08em] shrink-0"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            Phase One — live now
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {["Country Explorer", "Kebu ID", "Site Builder"].map((label, i) => (
              <span key={label} className="flex items-center gap-2 text-sm font-semibold" style={{ color: C.white }}>
                {i > 0 && <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>}
                {label}
              </span>
            ))}
          </div>
          <p className="sm:ml-auto text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
            See what is available now. New Kebu tools join the same account as they become ready.
          </p>
        </div>
      </section>

      {/* ── Three moves / steps ──────────────────────────────────────────────── */}
      <section className="py-20 lg:py-24" style={{ background: C.paperSoft }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="kebu-reveal mb-16 max-w-2xl">
            <p
              className="text-[10px] font-semibold tracking-[0.08em] mb-4"
              style={{ color: C.orange }}
            >
              How it works
            </p>
            <h2
              style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.0, color: C.ink }}
              className="font-bold text-[clamp(2rem,5vw,3.5rem)]"
            >
              Three moves.
              <span style={{ color: C.orange }}> One platform.</span>
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            {STEPS.map(({ num, title, desc, href }, i) => (
              <Link
                key={num}
                href={href}
                className="kebu-reveal group block rounded-xl p-8 transition-colors hover:shadow-md"
                style={{
                  transitionDelay: `${i * 0.1}s`,
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  boxShadow: "0 2px 8px rgba(10,10,10,0.04)",
                }}
              >
                <p
                  className="font-black text-[3.2rem] leading-none mb-6 tabular-nums"
                  style={{ color: "rgba(255,85,0,0.2)", fontFamily: "var(--font-fraunces)" }}
                >
                  {num}
                </p>
                <h3
                  style={{ fontFamily: "var(--font-fraunces)", color: C.ink }}
                  className="font-bold text-xl mb-3"
                >
                  {title}
                </h3>
                <p className="text-sm leading-relaxed mb-6" style={{ color: C.muted }}>
                  {desc}
                </p>
                <span
                  className="text-xs font-semibold transition-colors group-hover:text-[#FF5500]"
                  style={{ color: C.faint }}
                >
                  Start here →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats + West Africa ──────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32" style={{ background: C.paper }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="kebu-reveal mb-10">
                <p
                  className="text-[10px] font-semibold tracking-[0.08em] mb-4"
                  style={{ color: C.orange }}
                >
                  Built for Africa
                </p>
                <h2
                  style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.0, color: C.ink }}
                  className="font-bold text-[clamp(2rem,5vw,3.2rem)]"
                >
                  Africa is the
                  <br />
                  <span style={{ color: C.orange }}>opportunity.</span>
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {STATS.map(({ value, label }, i) => (
                  <div
                    key={label}
                    className="kebu-reveal rounded-xl p-6"
                    style={{
                      transitionDelay: `${i * 0.1}s`,
                      background: C.white,
                      border: `1px solid ${C.border}`,
                      boxShadow: "0 2px 8px rgba(10,10,10,0.04)",
                    }}
                  >
                    <p
                      className="font-black text-[2.2rem] leading-none mb-2"
                      style={{ color: C.orange, fontFamily: "var(--font-fraunces)" }}
                    >
                      {value}
                    </p>
                    <p
                      className="text-[10px] uppercase tracking-[0.14em]"
                      style={{ color: C.faint }}
                    >
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="kebu-reveal" style={{ transitionDelay: "0.15s" }}>
              <p
                className="text-[10px] font-semibold tracking-[0.08em] mb-5"
                style={{ color: C.faint }}
              >
                West Africa — our home
              </p>
              <div className="grid grid-cols-4 gap-2">
                {WEST_AFRICA.map((country) => (
                  <div
                    key={country}
                    className="rounded-xl px-2 py-2.5 text-center"
                    style={{
                      background: C.white,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <p
                      className="text-[9px] font-semibold leading-tight"
                      style={{ color: C.muted }}
                    >
                      {country}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[11px]" style={{ color: C.faint }}>
                Dakar-built · XOF native · Mobile money first
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Template gallery ─────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32" style={{ background: C.paperSoft }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="kebu-reveal mb-12 max-w-2xl">
            <p
              className="text-[10px] font-semibold tracking-[0.08em] mb-3"
              style={{ color: C.red }}
            >
              From the aesthetic gallery
            </p>
            <h2
              style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.05, color: C.black }}
              className="font-bold text-[clamp(1.75rem,4vw,3rem)] mb-4"
            >
              Real templates.
              <span style={{ color: C.orange }}> Not mockups.</span>
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: C.muted }}>
              Every template is a live aesthetic you can pick, personalize, and publish — the same layout you see here.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <Link
              href="/create/aesthetics"
              className="kebu-reveal group block rounded-xl overflow-hidden transition-transform hover:-translate-y-1"
              style={{
                background: "#FFE4F0",
                border: `1px solid ${C.border}`,
                boxShadow: "0 8px 24px rgba(10,10,10,0.04)",
              }}
            >
              <div className="relative h-64 sm:h-72 overflow-hidden">
                <Image
                  src="/templates/maylecor/hero-collage.png"
                  alt="Maylecor aesthetic template — artist portrait with a New York City skyline collage"
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="object-contain object-bottom p-4"
                />
              </div>
              <div className="p-5" style={{ borderTop: `1px solid ${C.border}` }}>
                <p
                  className="text-[10px] font-semibold tracking-[0.08em] mb-1"
                  style={{ color: C.red }}
                >
                  Maylecor
                </p>
                <p className="text-sm leading-snug" style={{ color: C.black }}>
                  Recording-artist template — hero collage, music embeds, tour dates.
                </p>
              </div>
            </Link>

            <Link
              href="/create/aesthetics"
              className="kebu-reveal group block rounded-xl overflow-hidden transition-transform hover:-translate-y-1"
              style={{
                transitionDelay: "0.08s",
                background: "#170006",
                border: `1px solid ${C.border}`,
                boxShadow: "0 8px 24px rgba(10,10,10,0.04)",
              }}
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
                <p
                  className="text-[10px] font-semibold tracking-[0.08em] mb-1"
                  style={{ color: C.red }}
                >
                  K-Direction
                </p>
                <p className="text-sm leading-snug" style={{ color: C.white }}>
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

      {/* ── Yande AI ─────────────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32" style={{ background: C.paperSoft }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="kebu-reveal">
              <div className="mb-6 inline-flex">
                <YandeMark size={56} />
              </div>
              <p
                className="text-[10px] font-semibold tracking-[0.08em] mb-3"
                style={{ color: C.orange }}
              >
                Built into the Builder
              </p>
              <h2
                style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.05, color: C.ink }}
                className="font-bold text-[clamp(1.75rem,4vw,3rem)] mb-4"
              >
                Ask Yande instead of guessing.
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: C.muted }}>
                Yande sits inside the builder and knows the page you&apos;re editing. Drag it out of the way, ask a question, keep building.
              </p>
            </div>

            <div
              className="kebu-reveal rounded-xl p-6"
              style={{
                transitionDelay: "0.12s",
                background: C.white,
                border: `1px solid ${C.border}`,
                boxShadow: "0 2px 8px rgba(10,10,10,0.04)",
              }}
            >
              <p
                className="text-[10px] font-semibold tracking-[0.08em] mb-4"
                style={{ color: C.faint }}
              >
                What builders actually ask
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
                    style={{ background: C.paperSoft, color: C.black, border: `1px solid ${C.border}` }}
                  >
                    {q}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────────── */}
      <section className="py-28 lg:py-36 relative overflow-hidden" style={{ background: C.orange }}>
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 20% 50%, rgba(255,255,255,0.35), transparent), radial-gradient(ellipse 50% 60% at 90% 20%, rgba(225,6,0,0.4), transparent)",
          }}
          aria-hidden
        />
        <div className="relative max-w-[1400px] mx-auto px-5 sm:px-8 text-center">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.28em] mb-4"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            Ready when you are
          </p>
          <h2
            style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.05 }}
            className="font-bold text-[clamp(2.2rem,5.5vw,4rem)] mb-4 text-white"
          >
            Africa is the opportunity.
          </h2>
          <p
            className="text-base mb-10 max-w-lg mx-auto leading-relaxed"
            style={{ color: "rgba(255,255,255,0.9)" }}
          >
            Start where you are. See what is live. Build what comes next.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/opportunity/countries"
              className="inline-flex items-center justify-center font-semibold px-10 py-4 text-sm rounded-lg transition-all hover:brightness-105"
              style={{ background: C.white, color: C.orange }}
            >
              Explore countries
            </Link>
            <Link
              href="/create"
              className="inline-flex items-center justify-center font-semibold px-10 py-4 text-sm rounded-lg transition-all"
              style={{ background: "transparent", color: C.white, border: "2px solid rgba(255,255,255,0.85)" }}
            >
              Kebu Builder →
            </Link>
          </div>
        </div>
      </section>

      <KebuMarketingFooter />
    </div>
  );
}
