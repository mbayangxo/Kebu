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

const CAPABILITIES = [
  {
    id: "sites",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M3 9h18M9 21V9" strokeLinecap="round" />
      </svg>
    ),
    label: "Sites",
    desc: "Build and publish a professional site in minutes.",
  },
  {
    id: "shop",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <path d="M3 6h18M16 10a4 4 0 01-8 0" strokeLinecap="round" />
      </svg>
    ),
    label: "Shop",
    desc: "Sell products with mobile money and WhatsApp checkout.",
  },
  {
    id: "ai",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.64 5.64l1.41 1.41M16.95 16.95l1.41 1.41M5.64 18.36l1.41-1.41M16.95 7.05l1.41-1.41" strokeLinecap="round" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
    label: "Yande AI",
    desc: "Ask questions and get help right inside the builder.",
  },
  {
    id: "mail",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M2 7l10 7 10-7" strokeLinecap="round" />
      </svg>
    ),
    label: "Mail",
    desc: "Reach your audience directly from your Kebu account.",
  },
  {
    id: "explorer",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a15 15 0 010 18M3 12h18" strokeLinecap="round" />
      </svg>
    ),
    label: "Explorer",
    desc: "Real market data for 54 African countries.",
  },
  {
    id: "identity",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    label: "Kebu ID",
    desc: "One business identity across every Kebu tool.",
  },
] as const;

const TEMPLATES = [
  {
    slug: "maylecor",
    name: "Maylecor",
    tag: "Artist",
    desc: "Hero collage · Music embeds · Tour dates",
    img: "/templates/maylecor/hero-collage.png",
    bg: "#FFE4F0",
    dark: false,
  },
  {
    slug: "kdirection",
    name: "K-Direction",
    tag: "Record label",
    desc: "Portrait-forward · Roster pages · Press kit",
    img: "/templates/kdirection/portrait.jpg",
    bg: "#170006",
    dark: true,
  },
  {
    slug: "legally-blonde",
    name: "Legally Blonde",
    tag: "Lifestyle brand",
    desc: "Editorial layout · Product showcase · Clean type",
    img: "/templates/legally-blonde/hero-photo.png",
    bg: "#F9F3E8",
    dark: false,
  },
] as const;

const STATS = [
  { value: "54", label: "African countries" },
  { value: "XOF", label: "mobile money native" },
  { value: "1", label: "account, every tool" },
  { value: "Free", label: "to start" },
] as const;

const WEST_AFRICA = [
  "Sénégal", "Côte d'Ivoire", "Mali", "Burkina Faso",
  "Guinée", "Niger", "Bénin", "Togo",
  "Ghana", "Nigeria", "Sierra Leone", "Liberia",
  "Mauritanie", "Gambie", "Cap-Vert", "Guinée-Bissau",
] as const;

const STEPS = [
  {
    num: "01",
    title: "Find the opportunity",
    desc: "Country Explorer — real data from labeled public sources. 54 countries, real market signals.",
    href: "/opportunity/countries",
  },
  {
    num: "02",
    title: "Create your business",
    desc: "Draft your Kebu ID, check registration readiness, keep all co-founders on one business identity.",
    href: "/business",
  },
  {
    num: "03",
    title: "Build & publish",
    desc: "Pick a template, personalize, connect your domain — then publish. Mobile money and WhatsApp checkout included.",
    href: "/create",
  },
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

      {/* ── Hero — dark editorial ─────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: C.black }}
      >
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute right-0 top-0 h-[700px] w-[700px] opacity-[0.12]"
          style={{ background: "radial-gradient(circle at 85% 15%, #FF5500, transparent 55%)" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-0 bottom-0 h-[400px] w-[500px] opacity-[0.06]"
          style={{ background: "radial-gradient(circle at 20% 90%, #FF5500, transparent 60%)" }}
          aria-hidden
        />

        <div className="relative max-w-[1400px] mx-auto w-full px-5 sm:px-8 lg:px-16 pt-24 pb-20 lg:pt-32 lg:pb-28">
          {/* Eyebrow */}
          <div className="kebu-landing-rise mb-8 flex items-center gap-3">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{ background: "rgba(255,85,0,0.14)", color: C.orange, border: "1px solid rgba(255,85,0,0.25)" }}
            >
              <KebuMark size={13} /> Free to start · Built for Africa
            </span>
          </div>

          <div className="grid items-end gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.55fr)] lg:gap-20">
            {/* Left: headline */}
            <div>
              <h1
                className="kebu-landing-rise kebu-landing-rise-delay font-black leading-[0.87] tracking-[-0.04em] mb-8"
                style={{
                  fontFamily: "var(--font-fraunces)",
                  fontSize: "clamp(3.5rem,8.5vw,7.5rem)",
                  color: "#FFFFFF",
                }}
              >
                Create without<br />
                <span style={{ color: C.orange }}>limits.</span>
              </h1>

              <p
                className="kebu-landing-rise kebu-landing-rise-delay-2 text-base sm:text-lg max-w-lg mb-10 leading-relaxed"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                One platform to build a professional site, run a shop, reach your audience, and find African market opportunities — no code, no confusion.
              </p>

              <div className="kebu-landing-rise kebu-landing-rise-delay-3 flex flex-wrap gap-3 mb-10">
                <KebuLandingHeroCTA
                  orange={C.orange}
                  ink={C.black}
                  border="rgba(255,255,255,0.15)"
                />
              </div>

              <div className="kebu-landing-rise flex flex-wrap gap-2" style={{ animationDelay: "0.5s" }}>
                {["No code", "XOF native", "Mobile money", "WhatsApp checkout", "AI built in"].map((chip) => (
                  <span
                    key={chip}
                    className="text-[10px] font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.09)" }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: K mark visual */}
            <div className="kebu-landing-rise kebu-landing-rise-delay-2 hidden lg:flex items-center justify-center">
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-full opacity-25 blur-3xl"
                  style={{ background: C.orange, transform: "scale(1.4)" }}
                  aria-hidden
                />
                <KebuMark size={260} style={{ position: "relative", filter: "drop-shadow(0 0 40px rgba(255,85,0,0.3))" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Phase One strip ──────────────────────────────────────────────────── */}
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
            More tools join the same account as they become ready.
          </p>
        </div>
      </section>

      {/* ── Capabilities grid ────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32" style={{ background: C.paper }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="kebu-reveal mb-14 max-w-2xl">
            <p
              className="text-[10px] font-semibold tracking-[0.1em] uppercase mb-4"
              style={{ color: C.orange }}
            >
              The platform
            </p>
            <h2
              style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.0, color: C.ink }}
              className="font-bold text-[clamp(2.2rem,5vw,4rem)]"
            >
              Everything you need.
              <br />
              <span style={{ color: C.orange }}>One account.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CAPABILITIES.map(({ id, icon, label, desc }, i) => (
              <div
                key={id}
                className="kebu-reveal group rounded-2xl p-7 transition-shadow hover:shadow-lg"
                style={{
                  transitionDelay: `${i * 0.06}s`,
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  boxShadow: "0 1px 4px rgba(10,10,10,0.05)",
                }}
              >
                <div
                  className="mb-5 inline-flex items-center justify-center rounded-xl p-3"
                  style={{ background: "rgba(255,85,0,0.07)", color: C.orange }}
                >
                  {icon}
                </div>
                <h3
                  style={{ fontFamily: "var(--font-fraunces)", color: C.ink }}
                  className="font-bold text-[1.05rem] mb-2"
                >
                  {label}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: C.muted }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Template gallery — dark section ──────────────────────────────────── */}
      <section className="py-24 lg:py-32" style={{ background: C.black }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="kebu-reveal mb-14 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <p
                className="text-[10px] font-semibold tracking-[0.1em] uppercase mb-4"
                style={{ color: C.orange }}
              >
                Aesthetic gallery
              </p>
              <h2
                style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.0, color: "#FFFFFF" }}
                className="font-bold text-[clamp(2.2rem,5vw,4rem)]"
              >
                Designed for Africa.
                <br />
                <span style={{ color: C.orange }}>Ready to publish.</span>
              </h2>
            </div>
            <Link
              href="/create/aesthetics"
              className="shrink-0 text-sm font-bold uppercase tracking-[0.12em] transition-opacity hover:opacity-70"
              style={{ color: C.orange }}
            >
              Browse all →
            </Link>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 lg:gap-5">
            {TEMPLATES.map(({ slug, name, tag, desc, img, bg, dark }, i) => (
              <Link
                key={slug}
                href="/create/aesthetics"
                className="kebu-reveal group block rounded-2xl overflow-hidden transition-transform hover:-translate-y-1.5"
                style={{
                  transitionDelay: `${i * 0.08}s`,
                  background: bg,
                  border: dark ? "1px solid rgba(255,255,255,0.08)" : `1px solid ${C.border}`,
                  boxShadow: "0 8px 24px rgba(10,10,10,0.2)",
                }}
              >
                <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
                  <Image
                    src={img}
                    alt={`${name} template`}
                    fill
                    sizes="(min-width: 640px) 33vw, 100vw"
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                </div>
                <div
                  className="p-5"
                  style={{ borderTop: dark ? "1px solid rgba(255,255,255,0.07)" : `1px solid ${C.border}` }}
                >
                  <p
                    className="text-[9px] font-bold uppercase tracking-[0.14em] mb-1.5"
                    style={{ color: dark ? "rgba(255,255,255,0.4)" : C.faint }}
                  >
                    {tag}
                  </p>
                  <p
                    className="font-bold text-[0.95rem] mb-1"
                    style={{ fontFamily: "var(--font-fraunces)", color: dark ? "#FFFFFF" : C.ink }}
                  >
                    {name}
                  </p>
                  <p className="text-[11px] leading-snug" style={{ color: dark ? "rgba(255,255,255,0.4)" : C.faint }}>
                    {desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Three moves ──────────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32" style={{ background: C.paperSoft }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="kebu-reveal mb-16 max-w-2xl">
            <p
              className="text-[10px] font-semibold tracking-[0.1em] uppercase mb-4"
              style={{ color: C.orange }}
            >
              How it works
            </p>
            <h2
              style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.0, color: C.ink }}
              className="font-bold text-[clamp(2.2rem,5vw,4rem)]"
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
                className="kebu-reveal group block rounded-2xl p-8 transition-shadow hover:shadow-md"
                style={{
                  transitionDelay: `${i * 0.1}s`,
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  boxShadow: "0 1px 4px rgba(10,10,10,0.04)",
                }}
              >
                <p
                  className="font-black text-[3.5rem] leading-none mb-6 tabular-nums"
                  style={{ color: "rgba(255,85,0,0.15)", fontFamily: "var(--font-fraunces)" }}
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

      {/* ── Africa stats — dark section ───────────────────────────────────────── */}
      <section className="py-24 lg:py-32" style={{ background: C.black }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <div className="kebu-reveal mb-12">
                <p
                  className="text-[10px] font-semibold tracking-[0.1em] uppercase mb-4"
                  style={{ color: C.orange }}
                >
                  Built for Africa
                </p>
                <h2
                  style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.0, color: "#FFFFFF" }}
                  className="font-bold text-[clamp(2.2rem,5vw,4rem)]"
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
                    className="kebu-reveal rounded-2xl p-6"
                    style={{
                      transitionDelay: `${i * 0.1}s`,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <p
                      className="font-black text-[2.4rem] leading-none mb-2 tabular-nums"
                      style={{ color: C.orange, fontFamily: "var(--font-fraunces)" }}
                    >
                      {value}
                    </p>
                    <p
                      className="text-[10px] uppercase tracking-[0.12em]"
                      style={{ color: "rgba(255,255,255,0.35)" }}
                    >
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="kebu-reveal" style={{ transitionDelay: "0.15s" }}>
              <p
                className="text-[10px] font-semibold tracking-[0.1em] uppercase mb-6"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                West Africa — our home
              </p>
              <div className="grid grid-cols-4 gap-2">
                {WEST_AFRICA.map((country) => (
                  <div
                    key={country}
                    className="rounded-xl px-2 py-2.5 text-center"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <p
                      className="text-[9px] font-semibold leading-tight"
                      style={{ color: "rgba(255,255,255,0.35)" }}
                    >
                      {country}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                Dakar-built · XOF native · Mobile money first
              </p>
            </div>
          </div>
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
                className="text-[10px] font-semibold tracking-[0.1em] uppercase mb-3"
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
                Yande sits inside the builder and knows the page you&apos;re editing. Ask a question, keep building.
              </p>
            </div>

            <div
              className="kebu-reveal rounded-2xl p-6"
              style={{
                transitionDelay: "0.12s",
                background: C.white,
                border: `1px solid ${C.border}`,
                boxShadow: "0 2px 8px rgba(10,10,10,0.04)",
              }}
            >
              <p
                className="text-[10px] font-semibold tracking-[0.08em] mb-5"
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
      <section className="py-28 lg:py-40 relative overflow-hidden" style={{ background: C.orange }}>
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 20% 50%, rgba(255,255,255,0.35), transparent), radial-gradient(ellipse 50% 60% at 90% 20%, rgba(225,6,0,0.4), transparent)",
          }}
          aria-hidden
        />
        <div className="relative max-w-[1400px] mx-auto px-5 sm:px-8 text-center">
          <div className="mb-8 flex justify-center">
            <KebuMark size={64} />
          </div>
          <h2
            style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.0, color: "#FFFFFF" }}
            className="font-bold text-[clamp(2.5rem,6vw,5rem)] mb-5 tracking-[-0.03em]"
          >
            Start building today.
          </h2>
          <p
            className="text-base mb-12 max-w-lg mx-auto leading-relaxed"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            Start where you are. See what is live. Build what comes next.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/create"
              className="inline-flex items-center justify-center font-bold px-10 py-4 text-sm rounded-xl transition-all hover:brightness-105"
              style={{ background: C.white, color: C.orange }}
            >
              Open the Builder →
            </Link>
            <Link
              href="/opportunity/countries"
              className="inline-flex items-center justify-center font-semibold px-10 py-4 text-sm rounded-xl transition-all"
              style={{ background: "transparent", color: C.white, border: "2px solid rgba(255,255,255,0.75)" }}
            >
              Explore countries
            </Link>
          </div>
        </div>
      </section>

      <KebuMarketingFooter />
    </div>
  );
}
