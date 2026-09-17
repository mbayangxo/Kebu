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
  { value: "3", label: "live products" },
  { value: "XOF", label: "mobile money native" },
  { value: "0%", label: "equity taken" },
  { value: "Free", label: "to start building" },
] as const;

const WEST_AFRICA = [
  "Sénégal", "Côte d'Ivoire", "Mali", "Burkina Faso",
  "Guinée", "Niger", "Bénin", "Togo",
  "Ghana", "Nigeria", "Sierra Leone", "Liberia",
  "Mauritanie", "Gambie", "Cap-Vert", "Guinée-Bissau",
] as const;

const BUILDER_STORIES = [
  {
    role: "Recording artist",
    city: "Dakar",
    story: "Built a music page with tour dates and streaming links in one afternoon. Published the same day.",
    tag: "Maylecor aesthetic",
  },
  {
    role: "Fashion designer",
    city: "Abidjan",
    story: "Site with WhatsApp order button and mobile money checkout. No code. Clients now order directly.",
    tag: "Kebu Builder",
  },
  {
    role: "Talent agency",
    city: "Lagos",
    story: "Roster pages with portrait-forward layout and a press kit download — ready in an afternoon.",
    tag: "K-Direction aesthetic",
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

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-[94svh] overflow-hidden flex flex-col justify-center"
        style={{ background: C.paper }}
      >
        <div
          className="kebu-landing-orb pointer-events-none absolute -right-24 top-[8%] h-[520px] w-[520px] rounded-full blur-3xl opacity-[0.12] sm:h-[700px] sm:w-[700px]"
          style={{ background: "radial-gradient(circle, rgba(255,85,0,0.8), transparent 65%)" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-16 bottom-[12%] h-[340px] w-[340px] rounded-full blur-3xl opacity-[0.08]"
          style={{ background: "radial-gradient(circle, rgba(225,6,0,0.9), transparent 65%)", animationDelay: "4s" }}
          aria-hidden
        />

        <div className="relative max-w-[1400px] mx-auto w-full px-5 sm:px-8 lg:px-16 py-24 lg:py-36">
          <div className="kebu-landing-rise mb-8 inline-flex">
            <KebuMark size={72} />
          </div>

          <h1
            className="kebu-landing-rise kebu-landing-rise-delay font-black uppercase leading-[0.83] tracking-tight mb-6"
            style={{
              fontFamily: "var(--font-fraunces)",
              fontSize: "clamp(3.4rem,12vw,9rem)",
              color: C.ink,
            }}
          >
            Build your
            <br />
            <span style={{ color: C.orange }}>hustle.</span>
          </h1>

          <p
            className="kebu-landing-rise kebu-landing-rise-delay-2 text-[clamp(1.05rem,2.4vw,1.3rem)] max-w-xl mb-10 leading-relaxed"
            style={{ color: C.muted }}
          >
            Find the opportunity. Create your business. Build and publish a real site — all in one place. Made for Africa.
          </p>

          <div className="kebu-landing-rise kebu-landing-rise-delay-3">
            <KebuLandingHeroCTA
              orange={C.orange}
              ink={C.ink}
              border={C.border}
            />
          </div>

          <div
            className="kebu-landing-rise mt-12 flex flex-wrap gap-2.5"
            style={{ animationDelay: "0.5s" }}
          >
            {["Free to start", "No code required", "XOF & mobile money", "WhatsApp checkout"].map((chip) => (
              <span
                key={chip}
                className="text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1.5 rounded-full"
                style={{
                  background: C.white,
                  color: C.muted,
                  border: `1px solid ${C.border}`,
                }}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Phase One status strip ───────────────────────────────────────────── */}
      <section style={{ background: C.orange }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.22em] shrink-0"
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
            No waitlist pages for features that don&apos;t exist yet.
          </p>
        </div>
      </section>

      {/* ── Three moves / steps ──────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32" style={{ background: C.paperSoft }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="kebu-reveal mb-16 max-w-2xl">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.22em] mb-4"
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
                className="kebu-reveal group block rounded-3xl p-8 transition-colors hover:shadow-md"
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
                  className="text-xs font-bold uppercase tracking-[0.12em] transition-colors group-hover:text-[#FF5500]"
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
                  className="text-[10px] font-bold uppercase tracking-[0.22em] mb-4"
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
                    className="kebu-reveal rounded-2xl p-6"
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
                className="text-[10px] font-bold uppercase tracking-[0.22em] mb-5"
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
              className="text-[10px] font-bold uppercase tracking-[0.22em] mb-3"
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
              className="kebu-reveal group block rounded-3xl overflow-hidden transition-transform hover:-translate-y-1"
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
                  unoptimized
                  className="object-contain object-bottom p-4"
                />
              </div>
              <div className="p-5" style={{ borderTop: `1px solid ${C.border}` }}>
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1"
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
              className="kebu-reveal group block rounded-3xl overflow-hidden transition-transform hover:-translate-y-1"
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
                  className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1"
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

      {/* ── Builder stories / use cases ──────────────────────────────────────── */}
      <section className="py-24 lg:py-32" style={{ background: C.paper }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="kebu-reveal mb-14">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.22em] mb-4"
              style={{ color: C.orange }}
            >
              What builders do with it
            </p>
            <h2
              style={{ fontFamily: "var(--font-fraunces)", lineHeight: 1.0, color: C.ink }}
              className="font-bold text-[clamp(1.75rem,4vw,3rem)]"
            >
              Made for the
              <span style={{ color: C.orange }}> African hustle.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {BUILDER_STORIES.map(({ role, city, story, tag }, i) => (
              <div
                key={role}
                className="kebu-reveal rounded-3xl p-7"
                style={{
                  transitionDelay: `${i * 0.1}s`,
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  boxShadow: "0 2px 8px rgba(10,10,10,0.04)",
                }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4"
                  style={{ color: C.orange }}
                >
                  {tag}
                </p>
                <p
                  className="text-base leading-relaxed mb-6"
                  style={{ color: C.ink }}
                >
                  &ldquo;{story}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: `${C.orange}18`, color: C.orange }}
                  >
                    {role[0]}
                  </div>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: C.ink }}>
                      {role}
                    </p>
                    <p className="text-[10px]" style={{ color: C.faint }}>
                      {city}
                    </p>
                  </div>
                </div>
              </div>
            ))}
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
                className="text-[10px] font-bold uppercase tracking-[0.22em] mb-3"
                style={{ color: C.orange }}
              >
                Built into every site
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
              className="kebu-reveal rounded-3xl p-6"
              style={{
                transitionDelay: "0.12s",
                background: C.white,
                border: `1px solid ${C.border}`,
                boxShadow: "0 2px 8px rgba(10,10,10,0.04)",
              }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4"
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
              className="inline-flex items-center justify-center font-bold uppercase tracking-[0.12em] px-10 py-4 text-sm rounded-full transition-all hover:brightness-105"
              style={{ background: C.white, color: C.orange }}
            >
              Explore countries
            </Link>
            <Link
              href="/create"
              className="inline-flex items-center justify-center font-bold uppercase tracking-[0.12em] px-10 py-4 text-sm rounded-full transition-all"
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
