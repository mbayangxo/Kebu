"use client";

import Link from "next/link";
import { useEffect } from "react";
import { KebuMark } from "@/app/components/kebu-mark";
import { KebuLandingHeroCTA } from "@/app/components/kebu-landing-hero-cta";
import { KebuMarketingFooter, KebuMarketingHeader } from "@/app/components/landing/kebu-marketing-chrome";
import { KebuIcon, type KebuIconName } from "@/app/components/kebu/kebu-icon";
import { KEBU } from "@/lib/kebu-brand";

const C = { ...KEBU, ink: KEBU.black, paper: KEBU.bright, muted: KEBU.muted } as const;
const TRUST = [{ value: "1", label: "account across Kebu" }] as const;

const WORLDS: Array<{ label:string; detail:string; href:string; icon:KebuIconName; live:boolean }> = [
  { label:"Studio", detail:"Design, video, content", href:"/studio", icon:"studio", live:true },
  { label:"Sites", detail:"Build and publish", href:"/create", icon:"builder", live:true },
  { label:"Mail", detail:"Personal and business", href:"/email", icon:"message", live:true },
  { label:"Library", detail:"Files and documents", href:"/library", icon:"library", live:true },
  { label:"Spaces", detail:"People and shared work", href:"/spaces", icon:"spaces", live:true },
  { label:"Opportunity", detail:"Find what is possible", href:"/opportunity", icon:"opportunity", live:true },
  { label:"Browser", detail:"A Kebu way to browse", href:"/browser", icon:"search", live:true },
  { label:"Business", detail:"Identity, teams, tools", href:"/business", icon:"work", live:true },
];

function useReveal() {
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>(".k-home-reveal");
    if (!nodes.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in-view");
        io.unobserve(entry.target);
      });
    }, { threshold:.08, rootMargin:"0px 0px -40px 0px" });
    nodes.forEach((node)=>io.observe(node));
    return ()=>io.disconnect();
  },[]);
}

export function KebuOpportunityHome() {
  useReveal();

  return (
    <div className="min-h-screen" style={{ background:C.paper, color:C.ink }}>
      <KebuMarketingHeader />

      <main>
        <section className="relative overflow-hidden border-b border-black/[.07]">
          <div className="pointer-events-none absolute inset-0" aria-hidden
            style={{ background:"radial-gradient(circle at 78% 16%,rgba(255,106,0,.13),transparent 24%),radial-gradient(circle at 16% 86%,rgba(255,31,31,.07),transparent 25%)" }} />
          <div className="relative mx-auto grid min-h-[78svh] max-w-[1500px] items-end gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,.9fr)] lg:px-12 lg:py-16">
            <div className="max-w-[850px] self-center">
              <div className="mb-7 inline-flex items-center gap-3">
                <KebuMark size={54} />
                <span className="text-[9px] font-semibold uppercase tracking-[.16em] text-black/35">One account · many worlds</span>
              </div>
              <h1 className="max-w-[11ch] text-[clamp(3.2rem,8.2vw,7.7rem)] font-semibold leading-[.84] tracking-[-.065em]" style={{ fontFamily:"var(--font-fraunces)" }}>
                Build what’s next. <span className="italic font-normal">All yours.</span>
              </h1>
              <p className="mt-7 max-w-[620px] text-[clamp(.95rem,1.5vw,1.15rem)] leading-relaxed text-black/55">
                Create, work, sell, communicate and find opportunities without stitching together a dozen disconnected products.
              </p>
              <div className="mt-8">
                <KebuLandingHeroCTA orange={C.orange} ink={C.ink} border={C.border} />
              </div>
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-black/[.07] pt-4 text-[9px] font-semibold text-black/40">
                <span>Free to start</span><span>Offline-aware</span><span>Personal + Business</span><span>Africa-first</span>{TRUST.map((item)=><span key={item.label}>{item.value} {item.label}</span>)}
              </div>
            </div>

            <div className="self-end lg:pb-4">
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-black/35">Open a world</p>
                <p className="text-[9px] text-black/30">Everything stays connected.</p>
              </div>
              <div className="border-y border-black/[.08]">
                {WORLDS.map((world,index)=>(
                  <Link key={world.label} href={world.href}
                    className="group grid min-h-[62px] grid-cols-[32px_1fr_auto] items-center gap-3 border-b border-black/[.06] px-1 transition last:border-b-0 hover:pl-2"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[.04] text-black/55 group-hover:bg-black group-hover:text-white">
                      <KebuIcon name={world.icon} size={15}/>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12px] font-semibold">{world.label}</span>
                      <span className="block text-[9px] text-black/38">{world.detail}</span>
                    </span>
                    <span className="flex items-center gap-2 text-[9px] text-black/30">
                      {world.live ? <span className="h-1.5 w-1.5 rounded-full bg-[#FF6A00]" /> : null}
                      <span className="transition group-hover:translate-x-1">→</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-black/[.07]">
          <div className="mx-auto max-w-[1500px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
            <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr]">
              <div className="k-home-reveal">
                <p className="text-[9px] font-semibold uppercase tracking-[.16em]" style={{color:C.orange}}>Not another app grid</p>
                <h2 className="mt-4 max-w-[9ch] text-[clamp(2.4rem,5vw,4.7rem)] leading-[.94] tracking-[-.05em]" style={{fontFamily:"var(--font-fraunces)"}}>
                  One identity. Different worlds.
                </h2>
              </div>
              <div className="grid gap-0 border-t border-black/[.08] sm:grid-cols-2">
                {[
                  ["Personal stays personal","Mail, friends, files, tasks and your everyday Kebu begin with you."],
                  ["Business opens when you need it","A business gets its own people, mail, sites, shop and identity instead of mixing into your personal life."],
                  ["Tools become worlds","Studio, Mail, Browser and Builder take over the screen when you enter them. They do not feel like dashboard widgets."],
                  ["Your work follows you","Search, files, people and activity can connect without forcing every product to look or behave the same."],
                ].map(([title,body],index)=>(
                  <div key={title} className="k-home-reveal border-b border-black/[.08] py-6 sm:px-5 sm:first:pl-0 sm:nth-[2]:pr-0" style={{transitionDelay:`${index*.06}s`}}>
                    <p className="text-[12px] font-semibold">{title}</p>
                    <p className="mt-2 max-w-[42ch] text-[10px] leading-relaxed text-black/45">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-black text-white">
          <div className="mx-auto grid min-h-[520px] max-w-[1500px] items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_1fr] lg:px-12">
            <div className="k-home-reveal">
              <p className="text-[9px] font-semibold uppercase tracking-[.16em] text-white/35">Built differently</p>
              <h2 className="mt-4 max-w-[10ch] text-[clamp(2.7rem,5.5vw,5.4rem)] leading-[.9] tracking-[-.055em]" style={{fontFamily:"var(--font-fraunces)"}}>
                Built for the way people actually live online.
              </h2>
            </div>
            <div className="k-home-reveal border-t border-white/15">
              {[
                ["Create","Sites, visual design, video and publishing."],
                ["Communicate","Mail, chats, rooms and calls."],
                ["Work","Documents, tasks, calendar and shared spaces."],
                ["Build","Business identity, teams, commerce and opportunity."],
              ].map(([title,body],index)=>(
                <div key={title} className="grid grid-cols-[28px_1fr] gap-3 border-b border-white/10 py-5">
                  <span className="text-[9px] font-semibold text-[#FF6A00]">0{index+1}</span>
                  <div><p className="text-[12px] font-semibold">{title}</p><p className="mt-1 text-[10px] text-white/42">{body}</p></div>
                </div>
              ))}
              <Link href="/signup" className="mt-7 inline-flex rounded-full bg-white px-5 py-2.5 text-[10px] font-semibold text-black">Create your Kebu →</Link>
            </div>
          </div>
        </section>
      </main>

      <KebuMarketingFooter />
    </div>
  );
}
