"use client";

import type { TemplateCardLayout, TemplateCardVisual } from "@/lib/create/template-visuals";

/**
 * Mini website preview for gallery cards — each layout simulates an actual business type.
 * No external images. All CSS + inline SVG so works offline (Africa low data).
 */
export function AestheticCardVisual({
  visual,
  name,
  accent,
}: {
  visual: TemplateCardVisual;
  name: string;
  accent: string;
}) {
  const layout: TemplateCardLayout = visual.layout ?? "generic";
  const mark = visual.wordmark ?? name;
  const bg = visual.previewGradient ?? `linear-gradient(160deg, ${accent}55 0%, #0a0a0a 100%)`;
  const photo = visual.previewImage ?? null;
  function ImgFallback({ className, style }: { className?: string; style?: React.CSSProperties }) {
    if (!photo) return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photo} alt="" className={className} style={style}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
    );
  }

  /* ── DARK ARTIST (music stage) ──────────────────────────────────────────── */
  if (layout === "dark-artist") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "#0a0a0a" }}>
        {/* Nav */}
        <div className="flex items-center justify-between px-2 py-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="text-[5px] font-black tracking-[0.25em] text-white">{mark}</span>
          <div className="flex gap-1.5">
            {["MUSIC", "SHOWS", "BOOK"].map((l) => (
              <span key={l} className="text-[4px] tracking-wider" style={{ color: "rgba(255,255,255,0.45)" }}>{l}</span>
            ))}
          </div>
        </div>
        {/* Hero */}
        <div className="relative flex-1" style={{ background: `radial-gradient(ellipse at 50% 30%, ${accent}55 0%, #0a0a0a 70%)` }}>
          <div className="absolute inset-x-0 top-[18%] text-center">
            <div className="text-[9px] font-black uppercase leading-none tracking-tight text-white">{mark}</div>
            <div className="mt-1 text-[4px] tracking-[0.35em]" style={{ color: `${accent}` }}>NEW SINGLE OUT NOW</div>
            <div className="mx-auto mt-2 rounded-full px-3 py-0.5 text-[4px] font-black tracking-wider text-black" style={{ background: accent, width: "fit-content" }}>LISTEN →</div>
          </div>
          {/* Tour dates */}
          <div className="absolute bottom-0 inset-x-0 px-2 pb-1 space-y-0.5">
            {["Lagos · Nov 15", "Dakar · Dec 03", "Accra · Dec 20"].map((d) => (
              <div key={d} className="flex justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <span className="text-[3.5px]" style={{ color: "rgba(255,255,255,0.5)" }}>{d}</span>
                <span className="text-[3.5px]" style={{ color: accent }}>TIX</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── MUSIC (streaming / listen hub) ────────────────────────────────────── */
  if (layout === "music") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "#191414" }}>
        <div className="flex items-center justify-between px-2 py-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-[5px] font-black text-white">{mark}</span>
          <span className="text-[4px]" style={{ color: accent }}>▶ PLAY</span>
        </div>
        <div className="flex flex-1 gap-1 p-1.5">
          {/* Album art */}
          <div className="aspect-square w-[38%] flex-shrink-0 rounded-md flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${accent}88, #0a0a0a)` }}>
            <span className="text-[14px]" style={{ color: "rgba(255,255,255,0.6)" }}>♪</span>
          </div>
          {/* Track list */}
          <div className="flex-1 space-y-1 py-0.5">
            {["01  New track", "02  Remix", "03  Acoustic"].map((t) => (
              <div key={t} className="flex items-center gap-1">
                <div className="h-0.5 w-full rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
                <span className="text-[3.5px] text-white/40 shrink-0">{t}</span>
              </div>
            ))}
            <div className="mt-1 rounded-full px-2 py-0.5 text-center text-[4px] font-black" style={{ background: accent, color: "#fff" }}>STREAM NOW</div>
          </div>
        </div>
      </div>
    );
  }

  /* ── AGENCY (creative agency / consulting) ──────────────────────────────── */
  if (layout === "agency") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "#FAFAF8" }}>
        {/* Nav */}
        <div className="flex items-center justify-between px-2 py-1 bg-white" style={{ borderBottom: "1px solid #E8E8E6" }}>
          <span className="text-[5.5px] font-black uppercase tracking-tight" style={{ color: "#0a0a0a" }}>{mark}</span>
          <div className="rounded px-1.5 py-0.5 text-[4px] font-bold text-white" style={{ background: accent }}>Brief →</div>
        </div>
        {/* Hero */}
        <div className="px-2 py-2">
          <div className="text-[8px] font-black leading-tight tracking-tight" style={{ color: "#0a0a0a" }}>We Build<br />Bold Brands</div>
          <div className="mt-1 text-[4px]" style={{ color: "#666" }}>Strategy · Design · Growth</div>
        </div>
        {/* Case study grid */}
        <div className="grid grid-cols-3 gap-0.5 px-1.5 pb-1">
          {["#E8E4E0", "#D4D0CC", "#C8C4C0"].map((c, i) => (
            <div key={i} className="aspect-[3/4] rounded-sm" style={{ background: `linear-gradient(135deg, ${c}, ${accent}22)` }}>
              <div className="m-1 h-0.5 w-2/3 rounded-full" style={{ background: "rgba(0,0,0,0.15)" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── SALON (beauty / hair / barber) ────────────────────────────────────── */
  if (layout === "salon") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "#FAF8F5" }}>
        {/* Nav */}
        <div className="flex items-center justify-between px-2 py-1 bg-white" style={{ borderBottom: "1px solid #F0EBE3" }}>
          <span className="text-[5px] font-semibold tracking-[0.2em] uppercase" style={{ color: "#3D2B1F", fontFamily: "Georgia, serif" }}>{mark}</span>
          <div className="rounded-full px-1.5 py-0.5 text-[4px] font-bold" style={{ background: accent, color: "#fff" }}>BOOK</div>
        </div>
        {/* Hero */}
        <div className="relative px-2 py-1.5">
          <div className="text-[8px] font-semibold leading-tight" style={{ color: "#3D2B1F", fontFamily: "Georgia, serif" }}>Expert cuts.<br />Your style.</div>
        </div>
        {/* Services */}
        <div className="flex-1 px-1.5 space-y-0.5">
          {[["Cut & Style", `${accent}`], ["Colour", accent], ["Treatment", accent]].map(([s, c]) => (
            <div key={s} className="flex items-center justify-between rounded-sm px-1.5 py-1" style={{ background: "#F5EDE4" }}>
              <span className="text-[4.5px] font-medium" style={{ color: "#3D2B1F" }}>{s}</span>
              <span className="text-[4px]" style={{ color: c }}>→</span>
            </div>
          ))}
        </div>
        <div className="px-1.5 pb-1 mt-0.5">
          <div className="rounded-full py-1 text-center text-[4px] font-black tracking-wider text-white" style={{ background: "#3D2B1F" }}>WhatsApp to Book</div>
        </div>
      </div>
    );
  }

  /* ── BOLD SALON (Chez Amara premium hair studio) ────────────────────────── */
  if (layout === "bold-salon") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "#1A0F0A" }}>
        {/* Announcement bar */}
        <div className="px-2 py-0.5 text-center" style={{ background: "#D4A574" }}>
          <span className="text-[3.5px] font-bold tracking-widest" style={{ color: "#1A0F0A" }}>✦ BALAYAGE · TRESSES · LOCS NATURELS</span>
        </div>
        {/* Nav */}
        <div className="flex items-center justify-between px-2 py-1" style={{ borderBottom: "1px solid rgba(212,165,116,0.2)" }}>
          <span className="text-[4.5px] font-semibold tracking-[0.18em] uppercase" style={{ color: "#D4A574", fontFamily: "Georgia, serif" }}>{mark}</span>
          <div className="rounded-full px-1.5 py-0.5 text-[3.5px] font-bold" style={{ background: "#D4A574", color: "#1A0F0A" }}>BOOK</div>
        </div>
        {/* Hero */}
        <div className="px-2 py-1.5">
          <div className="text-[8px] font-bold leading-tight" style={{ color: "#FFF9F3", fontFamily: "Georgia, serif" }}>Votre look.<br />Notre art.</div>
          <div className="mt-0.5 text-[3.5px] tracking-wide" style={{ color: "#D4A574" }}>Coupes · Tresses · Couleur · Dakar</div>
        </div>
        {/* Category tiles */}
        <div className="grid grid-cols-4 gap-0.5 px-1.5">
          {["Coupes", "Tresses", "Couleur", "Soins"].map((c) => (
            <div key={c} className="flex items-center justify-center rounded-sm py-1" style={{ background: "rgba(212,165,116,0.12)", border: "1px solid rgba(212,165,116,0.25)" }}>
              <span className="text-[3px] font-bold text-center" style={{ color: "#D4A574" }}>{c}</span>
            </div>
          ))}
        </div>
        {/* Price list */}
        <div className="px-1.5 mt-1 flex-1 space-y-0.5">
          {[["Coupe naturelle", "12 000 F"], ["Box braids", "40 000 F"], ["Balayage", "60 000 F"]].map(([s, p]) => (
            <div key={s} className="flex items-center justify-between" style={{ borderBottom: "1px solid rgba(212,165,116,0.1)" }}>
              <span className="text-[3.5px]" style={{ color: "rgba(255,249,243,0.65)" }}>{s}</span>
              <span className="text-[3.5px] font-bold" style={{ color: "#D4A574" }}>{p}</span>
            </div>
          ))}
        </div>
        {/* CTA */}
        <div className="px-1.5 pb-1.5 mt-0.5">
          <div className="rounded-full py-1 text-center text-[4px] font-black tracking-wider" style={{ background: "#D4A574", color: "#1A0F0A" }}>Réserver sur WhatsApp</div>
        </div>
      </div>
    );
  }

  /* ── STORE (shop / boutique) ────────────────────────────────────────────── */
  if (layout === "store") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "#FAFAF8" }}>
        {/* Nav */}
        <div className="flex items-center justify-between px-2 py-1 bg-white" style={{ borderBottom: "1px solid #E8E8E6" }}>
          <span className="text-[5px] font-black uppercase tracking-wider" style={{ color: "#0a0a0a" }}>{mark}</span>
          <div className="flex gap-1.5 items-center">
            <span className="text-[4px]" style={{ color: "#666" }}>Search</span>
            <span className="text-[5px]" style={{ color: accent }}>🛒</span>
          </div>
        </div>
        {/* Banner */}
        <div className="px-2 py-1" style={{ background: accent }}>
          <span className="text-[4px] font-bold tracking-wider text-white">FREE DELIVERY OVER $50</span>
        </div>
        {/* Product grid */}
        <div className="grid grid-cols-2 gap-1 p-1.5 flex-1">
          {[["#E8E4E0", "25,000 F"], ["#D4CCC4", "18,500 F"], ["#C8C0B8", "32,000 F"], ["#DDD8D0", "14,000 F"]].map(([c, price], i) => (
            <div key={i} className="flex flex-col overflow-hidden rounded-sm" style={{ background: "#fff", border: "1px solid #F0EDE8" }}>
              <div className="aspect-square w-full" style={{ background: `linear-gradient(135deg, ${c}, ${c}88)` }} />
              <div className="px-1 py-0.5">
                <div className="h-0.5 w-4/5 rounded-full" style={{ background: "#E0DDD8" }} />
                <div className="mt-0.5 text-[4px] font-bold" style={{ color: accent }}>{price}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── RESTAURANT (food / café / bakery) ──────────────────────────────────── */
  if (layout === "restaurant") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "#1A1008" }}>
        {/* Nav */}
        <div className="flex items-center justify-between px-2 py-1" style={{ background: "#0F0A05", borderBottom: `1px solid ${accent}33` }}>
          <span className="text-[5px] font-black uppercase tracking-widest" style={{ color: "#fff", fontFamily: "Georgia, serif" }}>{mark}</span>
          <span className="text-[4px]" style={{ color: accent }}>MENU</span>
        </div>
        {/* Hero photo mock */}
        <div className="relative flex items-center justify-center" style={{ height: "38%", background: `radial-gradient(ellipse at 50% 60%, #4A2810 0%, #1A0F05 75%)` }}>
          {photo && <ImgFallback className="absolute inset-0 h-full w-full object-cover opacity-60" />}
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `repeating-linear-gradient(45deg, ${accent}22 0px, ${accent}22 1px, transparent 1px, transparent 8px)` }} />
          <div className="text-center z-10">
            <div className="text-[9px] font-black leading-none" style={{ color: "#F5E6C8", fontFamily: "Georgia, serif" }}>TASTE THE</div>
            <div className="text-[12px] font-black italic leading-none" style={{ color: accent }}>CRAFT</div>
          </div>
        </div>
        {/* "OUR FEATURED" section like Cookie theme */}
        <div className="px-2 py-1.5" style={{ background: "#F5F0E8" }}>
          <div className="text-[5px] font-black uppercase tracking-widest" style={{ color: accent }}>OUR FEATURED</div>
        </div>
        {/* Product grid */}
        <div className="grid grid-cols-2 gap-0.5 px-1 flex-1">
          {[["Signature", "24,000 F"], ["Daily Special", "16,000 F"]].map(([n, p]) => (
            <div key={n} className="rounded-sm p-1" style={{ background: "#F5F0E8" }}>
              <div className="aspect-square w-full rounded-sm mb-0.5" style={{ background: `linear-gradient(135deg, #4A2810, #8B4513)` }} />
              <div className="text-[4px] font-black uppercase" style={{ color: "#1A1008" }}>{n}</div>
              <div className="text-[4px]" style={{ color: accent }}>{p}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── FASHION (atelier / lookbook / editorial) ────────────────────────────── */
  /* ── DARK FASHION (VOLTA urban clothing brand) ─────────────────────────── */
  if (layout === "dark-fashion") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "#0D0D0D" }}>
        {/* Announcement bar */}
        <div className="px-2 py-0.5 text-center" style={{ background: "#B91C1C" }}>
          <span className="text-[3px] font-bold tracking-widest text-white">LIVRAISON DAKAR · PAIEMENT WAVE · ORANGE MONEY</span>
        </div>
        {/* Nav */}
        <div className="flex items-center justify-between px-2 py-1" style={{ borderBottom: "1px solid rgba(185,28,28,0.3)" }}>
          <span className="text-[6px] font-black tracking-[0.15em] uppercase text-white">{mark}</span>
          <div className="rounded px-1.5 py-0.5 text-[3.5px] font-bold text-white" style={{ background: "#B91C1C" }}>SHOP</div>
        </div>
        {/* Hero */}
        <div className="relative px-2 py-2 flex-1 flex flex-col justify-between">
          {photo && <ImgFallback className="absolute inset-0 h-full w-full object-cover opacity-30" />}
          <div className="relative z-10">
            <div className="text-[11px] font-black uppercase leading-none tracking-tight text-white">WEAR<br />THE<br />BOLD</div>
            <div className="mt-1 text-[3.5px] tracking-widest uppercase" style={{ color: "#B91C1C" }}>Collection 2026 · Dakar-born</div>
          </div>
          {/* Product tiles */}
          <div className="relative z-10 grid grid-cols-3 gap-0.5 mt-1">
            {[["#1A0000", "Tee"], ["#0D0D0D", "Hoodie"], ["#1A0000", "Accessoires"]].map(([c, l], i) => (
              <div key={i} className="flex flex-col overflow-hidden rounded-sm" style={{ background: c, border: "1px solid rgba(185,28,28,0.3)" }}>
                <div className="aspect-square w-full" style={{ background: `linear-gradient(135deg, ${c}, rgba(185,28,28,0.4))` }} />
                <div className="px-0.5 py-0.5">
                  <span className="text-[3px] font-bold uppercase text-white">{l}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Category strip */}
        <div className="flex" style={{ borderTop: "1px solid rgba(185,28,28,0.3)" }}>
          {["HOMME", "FEMME", "ACCÈS", "SOLDES"].map((c) => (
            <div key={c} className="flex-1 py-0.5 text-center" style={{ borderRight: "1px solid rgba(185,28,28,0.2)" }}>
              <span className="text-[3px] font-bold tracking-wider" style={{ color: "rgba(255,255,255,0.6)" }}>{c}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── FASHION (editorial light / fashion-atelier) ────────────────────────── */
  if (layout === "fashion") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "#FAFAF8" }}>
        {/* Nav */}
        <div className="flex items-center justify-between px-2 py-1 bg-white" style={{ borderBottom: "1px solid #E8E4DC" }}>
          <div className="w-3 h-0.5 bg-black" />
          <span className="text-[5px] font-medium uppercase tracking-[0.5em]" style={{ color: "#0a0a0a", fontFamily: "Times New Roman, serif" }}>{mark}</span>
          <span className="text-[4px]" style={{ color: "#999" }}>BAG</span>
        </div>
        {/* Full-bleed hero image */}
        <div className="relative flex-1" style={{ background: "linear-gradient(180deg, #F0EDE8 0%, #E0DAD2 100%)" }}>
          {/* Portrait — real photo when available, gradient placeholder otherwise */}
          {photo
            ? <ImgFallback className="absolute inset-0 h-full w-full object-cover" />
            : <div className="absolute left-1/2 top-0 bottom-0 w-[45%] -translate-x-1/2" style={{ background: "linear-gradient(180deg, #D0C8C0, #A89890)" }} />
          }
          {/* Text overlay */}
          <div className="absolute bottom-3 left-2">
            <div className="text-[6px] font-light tracking-[0.5em] uppercase" style={{ color: "rgba(0,0,0,0.6)", fontFamily: "Times New Roman, serif" }}>SS 2026</div>
            <div className="text-[10px] font-bold uppercase leading-none tracking-widest" style={{ color: "#0a0a0a", fontFamily: "Times New Roman, serif" }}>LOOK<br/>BOOK</div>
          </div>
        </div>
        {/* Category strip */}
        <div className="flex" style={{ borderTop: "1px solid #E8E4DC" }}>
          {["NEW IN", "DRESSES", "BAGS", "SALE"].map((c) => (
            <div key={c} className="flex-1 py-0.5 text-center" style={{ borderRight: "1px solid #E8E4DC" }}>
              <span className="text-[3.5px] font-medium tracking-wider" style={{ color: "#666" }}>{c}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── FILM (studio / production / showreel) ───────────────────────────────── */
  if (layout === "film") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "#080808" }}>
        {/* Nav */}
        <div className="flex items-center justify-between px-2 py-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-[5px] font-black uppercase tracking-wider text-white">{mark}</span>
          <div className="flex gap-1">
            {["WORK", "HIRE"].map((l) => (
              <span key={l} className="text-[4px]" style={{ color: "rgba(255,255,255,0.45)" }}>{l}</span>
            ))}
          </div>
        </div>
        {/* Showreel hero */}
        <div className="relative flex-1 flex items-center justify-center" style={{ background: `linear-gradient(160deg, #111 0%, ${accent}22 100%)` }}>
          {/* Film grain */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='1' height='1' x='0' y='0' fill='%23fff' opacity='0.4'/%3E%3Crect width='1' height='1' x='2' y='2' fill='%23fff' opacity='0.3'/%3E%3C/svg%3E\")" }} />
          {/* Play button */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full border" style={{ borderColor: "rgba(255,255,255,0.5)" }}>
            <span className="text-[7px] text-white ml-0.5">▶</span>
          </div>
        </div>
        {/* Project thumbnails */}
        <div className="flex gap-0.5 p-1">
          {[accent + "44", accent + "66", accent + "33"].map((c, i) => (
            <div key={i} className="aspect-video flex-1 rounded-sm" style={{ background: `linear-gradient(135deg, #222, ${c})` }} />
          ))}
        </div>
      </div>
    );
  }

  /* ── TECH (app / startup / SaaS) ────────────────────────────────────────── */
  if (layout === "tech") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "#0F0F1A" }}>
        {/* Nav */}
        <div className="flex items-center justify-between px-2 py-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-[5px] font-black text-white">{mark}</span>
          <div className="rounded-full px-1.5 py-0.5 text-[4px] font-bold text-white" style={{ background: accent }}>Get started</div>
        </div>
        {/* Hero */}
        <div className="px-2 py-2">
          <div className="text-[8px] font-black leading-tight text-white">Built for<br /><span style={{ color: accent }}>Africa.</span></div>
          <div className="mt-1 text-[4px]" style={{ color: "rgba(255,255,255,0.5)" }}>Fast · Mobile-first · Affordable</div>
        </div>
        {/* App UI mockup */}
        <div className="mx-1.5 flex-1 rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-1 px-2 py-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="h-1 w-1 rounded-full" style={{ background: accent }} />
            <div className="h-0.5 flex-1 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
          </div>
          <div className="p-1.5 space-y-1">
            <div className="h-1.5 w-4/5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
            <div className="h-1.5 w-3/5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
            <div className="mt-1 h-2 w-2/3 rounded-md" style={{ background: accent + "44" }} />
          </div>
        </div>
        <div className="px-2 pb-1 mt-1">
          <div className="flex gap-0.5">
            {["Features", "Pricing", "Docs"].map((t) => (
              <div key={t} className="flex-1 rounded py-0.5 text-center text-[3.5px]" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}>{t}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── EVENT (nightclub / concert / show) ─────────────────────────────────── */
  if (layout === "event") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "#0a0a0a" }}>
        {/* Poster hero */}
        <div className="relative flex-1 flex flex-col items-center justify-center" style={{ background: `linear-gradient(160deg, #0a0a0a 0%, ${accent}33 100%)` }}>
          <div className="text-[4px] tracking-[0.4em] mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>THIS FRIDAY</div>
          <div className="text-[14px] font-black uppercase leading-none text-center" style={{ color: "#fff" }}>{mark}</div>
          <div className="mt-0.5 text-[4px] tracking-[0.3em]" style={{ color: accent }}>DOORS 21:00 · 18+</div>
          <div className="mt-2 rounded-sm px-3 py-0.5 text-[4px] font-black tracking-wider" style={{ background: accent, color: "#000" }}>GET TICKETS</div>
        </div>
        {/* Lineup strip */}
        <div className="flex" style={{ background: "rgba(255,255,255,0.04)", borderTop: `1px solid ${accent}44` }}>
          {["LINEUP", "VENUE", "GALLERY"].map((t) => (
            <div key={t} className="flex-1 py-1 text-center text-[3.5px] font-bold tracking-wider" style={{ color: "rgba(255,255,255,0.45)" }}>{t}</div>
          ))}
        </div>
      </div>
    );
  }

  /* ── PERFUME (fragrance house / boutique) ────────────────────────────────── */
  if (layout === "perfume") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "#FAF8F4" }}>
        {/* Nav */}
        <div className="flex items-center justify-between px-2 py-1" style={{ background: "#fff", borderBottom: "1px solid #F0EBE0" }}>
          <span className="text-[5px] font-medium tracking-[0.35em] uppercase" style={{ color: "#2A1F14", fontFamily: "Georgia, serif" }}>{mark}</span>
          <span className="text-[4px]" style={{ color: accent }}>SHOP</span>
        </div>
        {/* Bottle + text layout */}
        <div className="flex-1 flex items-center gap-2 px-2 py-1.5">
          {/* Bottle / product image */}
          <div className="flex-shrink-0 flex flex-col items-center gap-0.5 overflow-hidden rounded" style={{ width: "36%", height: "100%" }}>
            {photo
              ? <ImgFallback className="h-full w-full object-cover rounded" />
              : <>
                  <div className="w-2 h-1 rounded-t-sm" style={{ background: accent + "99" }} />
                  <div className="w-5 flex-1 rounded-b-[6px]" style={{ background: `linear-gradient(180deg, ${accent}66, ${accent}22)`, minHeight: "28px", border: `1px solid ${accent}55` }} />
                </>
            }
          </div>
          <div className="flex-1">
            <div className="text-[5px] tracking-[0.3em] uppercase" style={{ color: "#999", fontFamily: "Georgia, serif" }}>EAU DE PARFUM</div>
            <div className="mt-0.5 text-[9px] font-medium leading-tight" style={{ color: "#2A1F14", fontFamily: "Georgia, serif" }}>{mark}</div>
            <div className="mt-1 text-[4px] leading-relaxed" style={{ color: "#888" }}>Top notes of oud<br />amber &amp; rose</div>
          </div>
        </div>
        {/* Collection strip */}
        <div className="flex border-t" style={{ borderColor: "#F0EBE0" }}>
          {["NOIR", "ROSE", "AMBER"].map((c) => (
            <div key={c} className="flex-1 py-1 text-center" style={{ borderRight: "1px solid #F0EBE0" }}>
              <div className="mx-auto h-2 w-2 rounded-full mb-0.5" style={{ background: `${accent}55` }} />
              <div className="text-[3.5px] tracking-wider" style={{ color: "#888" }}>{c}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── HOTEL (rooms / stay / hospitality) ─────────────────────────────────── */
  if (layout === "hotel") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "#FAF8F4" }}>
        {/* Nav */}
        <div className="flex items-center justify-between px-2 py-1 bg-white" style={{ borderBottom: "1px solid #F0EBE0" }}>
          <span className="text-[5px] font-medium tracking-[0.25em]" style={{ color: "#2A1F14", fontFamily: "Georgia, serif" }}>{mark}</span>
          <div className="rounded px-1.5 py-0.5 text-[4px] font-bold" style={{ background: accent, color: "#fff" }}>Reserve</div>
        </div>
        {/* Hero room photo */}
        <div className="relative" style={{ height: "40%", background: `linear-gradient(160deg, #E8DDD0, #C8BDB0)` }}>
          {photo && <ImgFallback className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-0 flex items-end p-1.5" style={{ background: photo ? "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" : undefined }}>
            <div>
              <div className="text-[4px] tracking-[0.3em] uppercase" style={{ color: "rgba(255,255,255,0.8)" }}>SUPERIOR ROOM</div>
              <div className="text-[7px] font-semibold" style={{ color: "#fff", fontFamily: "Georgia, serif" }}>From 85,000 F/night</div>
            </div>
          </div>
        </div>
        {/* Room categories */}
        <div className="flex gap-0.5 p-1">
          {[["Deluxe", "85K F"], ["Suite", "140K F"], ["Garden", "70K F"]].map(([n, p]) => (
            <div key={n} className="flex-1 rounded-sm p-0.5" style={{ background: "#F0EBE0" }}>
              <div className="aspect-[4/3] rounded-sm mb-0.5" style={{ background: `linear-gradient(135deg, ${accent}33, ${accent}66)` }} />
              <div className="text-[3.5px] font-bold" style={{ color: "#2A1F14" }}>{n}</div>
              <div className="text-[3.5px]" style={{ color: accent }}>{p}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── FARM (agriculture / produce) ────────────────────────────────────────── */
  if (layout === "farm") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "#F5F8F0" }}>
        {/* Nav */}
        <div className="flex items-center justify-between px-2 py-1 bg-white" style={{ borderBottom: "1px solid #E0E8D8" }}>
          <span className="text-[5px] font-black uppercase" style={{ color: "#2D4A1E" }}>{mark}</span>
          <div className="rounded-full px-1.5 py-0.5 text-[4px] font-bold" style={{ background: "#2D4A1E", color: "#fff" }}>ORDER</div>
        </div>
        {/* Season hero */}
        <div className="px-2 py-1.5" style={{ background: accent }}>
          <div className="text-[5px] font-black text-white uppercase tracking-wider">🌿 Harvest Season</div>
          <div className="text-[4px] mt-0.5" style={{ color: "rgba(255,255,255,0.8)" }}>Fresh daily · WhatsApp orders</div>
        </div>
        {/* Produce list */}
        <div className="flex-1 px-1.5 py-1 space-y-0.5">
          {[["Tomatoes", "1,200 F/kg", "#CC3300"], ["Cassava", "800 F/kg", "#CC8800"], ["Mangoes", "2,500 F/kg", "#FF6600"]].map(([n, p, c]) => (
            <div key={n} className="flex items-center justify-between rounded-sm px-1.5 py-0.5" style={{ background: "#fff", border: `1px solid #E8EEE0` }}>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full" style={{ background: c as string }} />
                <span className="text-[4px] font-medium" style={{ color: "#2D4A1E" }}>{n}</span>
              </div>
              <span className="text-[4px] font-bold" style={{ color: accent }}>{p}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── BUILD (construction / contractor) ───────────────────────────────────── */
  if (layout === "build") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "#1C2230" }}>
        {/* Nav */}
        <div className="flex items-center justify-between px-2 py-1" style={{ background: "#141B28", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="text-[5px] font-black uppercase tracking-wider text-white">{mark}</span>
          <div className="rounded px-1.5 py-0.5 text-[4px] font-bold text-black" style={{ background: accent }}>QUOTE</div>
        </div>
        {/* Hero */}
        <div className="px-2 py-1.5">
          <div className="text-[8px] font-black leading-tight text-white">Built Right.<br /><span style={{ color: accent }}>On Time.</span></div>
        </div>
        {/* Project thumbnails */}
        <div className="grid grid-cols-3 gap-0.5 px-1.5">
          {[accent + "33", accent + "55", accent + "22"].map((c, i) => (
            <div key={i} className="aspect-video rounded-sm" style={{ background: `linear-gradient(135deg, #2A3548, ${c})` }}>
              <div className="m-0.5 h-0.5 w-3/4 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
            </div>
          ))}
        </div>
        {/* Services */}
        <div className="px-1.5 pb-1 mt-1 flex gap-0.5">
          {["Residential", "Commercial", "Renovation"].map((s) => (
            <div key={s} className="flex-1 py-0.5 rounded text-center text-[3.5px]" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}>{s}</div>
          ))}
        </div>
      </div>
    );
  }

  /* ── IMPACT (NGO / nonprofit / foundation) ───────────────────────────────── */
  if (layout === "impact") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "#FAFAF8" }}>
        {/* Nav */}
        <div className="flex items-center justify-between px-2 py-1 bg-white" style={{ borderBottom: "1px solid #E8E8E4" }}>
          <span className="text-[5px] font-black uppercase" style={{ color: "#0a0a0a" }}>{mark}</span>
          <div className="rounded-full px-1.5 py-0.5 text-[4px] font-bold text-white" style={{ background: accent }}>DONATE</div>
        </div>
        {/* Mission hero */}
        <div className="px-2 py-2" style={{ background: accent }}>
          <div className="text-[7px] font-black leading-tight text-white">Community<br />First.</div>
          <div className="mt-0.5 text-[4px]" style={{ color: "rgba(255,255,255,0.75)" }}>Empowering Africa · one town at a time</div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-0.5 px-1.5 py-1">
          {[["5K+", "Lives"], ["12", "Programs"], ["54", "Nations"]].map(([n, l]) => (
            <div key={l} className="rounded-sm px-1 py-1 text-center" style={{ background: `${accent}11` }}>
              <div className="text-[7px] font-black" style={{ color: accent }}>{n}</div>
              <div className="text-[3.5px]" style={{ color: "#666" }}>{l}</div>
            </div>
          ))}
        </div>
        {/* Programs */}
        <div className="px-1.5 pb-1 space-y-0.5">
          {["Education", "Health", "Enterprise"].map((p) => (
            <div key={p} className="flex items-center gap-1 rounded-sm px-1 py-0.5" style={{ background: "#F0EEE8" }}>
              <div className="h-1 w-1 rounded-full" style={{ background: accent }} />
              <span className="text-[4px] font-medium" style={{ color: "#333" }}>{p}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── PORTFOLIO (work showcase / CV) ─────────────────────────────────────── */
  if (layout === "portfolio") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "#0a0a0a" }}>
        {/* Nav */}
        <div className="flex items-center justify-between px-2 py-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-[5px] font-black text-white">{mark}</span>
          <div className="flex gap-1">
            {["WORK", "CV", "HIRE"].map((l) => (
              <span key={l} className="text-[4px]" style={{ color: "rgba(255,255,255,0.45)" }}>{l}</span>
            ))}
          </div>
        </div>
        {/* Work grid */}
        <div className="flex-1 grid grid-cols-2 gap-0.5 p-1">
          <div className="row-span-2 rounded-sm" style={{ background: `linear-gradient(135deg, ${accent}66, ${accent}22)` }}>
            <div className="m-1 h-0.5 w-3/4 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
            <div className="m-1 mt-0 h-0.5 w-1/2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
          </div>
          <div className="rounded-sm aspect-square" style={{ background: `linear-gradient(135deg, ${accent}33, #1a1a1a)` }} />
          <div className="rounded-sm aspect-square" style={{ background: "linear-gradient(135deg, #2a2a2a, #111)" }} />
        </div>
        {/* CTA */}
        <div className="px-2 pb-1">
          <div className="rounded-full py-0.5 text-center text-[4px] font-black tracking-wider" style={{ background: accent, color: "#000" }}>HIRE ME → WHATSAPP</div>
        </div>
      </div>
    );
  }

  /* ── WIX COLLAGE (K-Direction style) ────────────────────────────────────── */
  if (layout === "wix-collage") {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ background: bg }}>
        {visual.previewImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={visual.previewImage} alt="" className="absolute bottom-[18%] right-[8%] h-[48%] w-[38%] rotate-[-12deg] object-cover shadow-2xl ring-2 ring-white/70" />
        ) : null}
        <div className="absolute inset-x-[8%] top-[12%] z-10 flex flex-wrap justify-center gap-1">
          {["HOME", "ARTISTS", "CONTACT"].map((label) => (
            <span key={label} className="rounded-full px-2 py-0.5 text-[6px] font-bold tracking-wider text-black" style={{ background: "#FFF86B" }}>{label}</span>
          ))}
        </div>
        <p className="absolute inset-x-0 top-[32%] z-10 text-center text-[22px] font-medium leading-none text-white" style={{ fontFamily: "Oswald, Impact, sans-serif" }}>
          K<span className="mt-0.5 block text-[11px] tracking-[0.28em]">DIRECTION</span>
        </p>
      </div>
    );
  }

  /* ── RUSSIAN CUTOUTS (May Lecor style) ─────────────────────────────────── */
  if (layout === "russian-cutouts") {
    return (
      <div className="absolute inset-0 overflow-hidden" style={{ background: bg }}>
        {visual.previewImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={visual.previewImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
        ) : null}
        <div className="absolute left-[8%] top-[12%] z-10 max-w-[70%] text-[11px] font-semibold uppercase leading-none tracking-tight text-white drop-shadow" style={{ fontFamily: "var(--font-jost), system-ui, sans-serif" }}>
          May Lècor
          <span className="mt-1 block text-[8px] font-medium tracking-[0.15em] text-[#ffd6ec]">Circle seal · cutouts</span>
        </div>
      </div>
    );
  }

  /* ── LUXURY (editorial RTW / minimal luxury fashion) ───────────────────── */
  if (layout === "luxury") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "#F5F2EC" }}>
        {/* Nav — ultra-thin */}
        <div className="flex items-center justify-between px-2 py-1" style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
          <span className="text-[5.5px] font-thin tracking-[0.4em] uppercase" style={{ color: "#1A1814", letterSpacing: "0.35em" }}>{mark}</span>
          <div className="flex gap-1.5">
            {["SHOP", "ABOUT"].map((l) => (
              <span key={l} className="text-[3.5px] tracking-[0.2em]" style={{ color: "rgba(0,0,0,0.4)" }}>{l}</span>
            ))}
          </div>
        </div>
        {/* Full-bleed hero — photo or gradient */}
        <div className="relative flex-1">
          <ImgFallback className="absolute inset-0 h-full w-full object-cover" />
          {!photo && (
            <div className="absolute inset-0" style={{ background: "linear-gradient(170deg, #E8E2D6 0%, #C4B89A 60%, #A08060 100%)" }} />
          )}
          {/* Text overlay bottom */}
          <div className="absolute bottom-0 inset-x-0 px-2 pb-1.5" style={{ background: photo ? "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)" : "none" }}>
            <div className="text-[7px] font-light leading-tight" style={{ color: photo ? "#fff" : "#1A1814", letterSpacing: "0.08em" }}>
              COLLECTION<br /><span className="font-thin">SS 2026</span>
            </div>
          </div>
        </div>
        {/* Thin strip — category marquee */}
        <div className="flex items-center gap-2 px-2 py-0.5 overflow-hidden" style={{ borderTop: "1px solid rgba(0,0,0,0.07)", background: "#FAF8F2" }}>
          {["READY-TO-WEAR", "·", "MADE-TO-ORDER", "·", "STOCKISTS"].map((t, i) => (
            <span key={i} className="text-[3px] tracking-[0.2em] shrink-0" style={{ color: "rgba(0,0,0,0.35)" }}>{t}</span>
          ))}
        </div>
      </div>
    );
  }

  /* ── ACCESSORIES (jewelry / bags / leather goods) ───────────────────────── */
  if (layout === "accessories") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "#FAFAF5" }}>
        {/* Nav */}
        <div className="flex items-center justify-between px-2 py-1" style={{ borderBottom: "1px solid #EDE7D0" }}>
          <span className="text-[5px] font-medium tracking-[0.3em] uppercase" style={{ color: "#2C1E08", fontFamily: "Georgia, serif" }}>{mark}</span>
          <div className="rounded-full px-1.5 py-0.5 text-[3.5px] font-semibold tracking-widest" style={{ background: "#C9A962", color: "#fff" }}>SHOP</div>
        </div>
        {/* Product grid — 2 + 1 layout */}
        <div className="flex flex-1 gap-0.5 p-1">
          <div className="flex flex-col gap-0.5 w-[55%]">
            <div className="relative flex-1 rounded overflow-hidden" style={{ background: "#EDE7D0" }}>
              <ImgFallback className="absolute inset-0 h-full w-full object-cover opacity-80" />
              {!photo && <div className="absolute inset-0 flex items-center justify-center text-[10px]" style={{ color: "#C9A962" }}>◇</div>}
            </div>
            <div className="h-[35%] rounded" style={{ background: "#E0D4B0" }} />
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            <div className="flex-1 rounded" style={{ background: "#D8CBAA" }} />
            <div className="h-[40%] rounded flex items-end p-1" style={{ background: "#2C1E08" }}>
              <div className="text-[3px] font-semibold tracking-widest" style={{ color: "#C9A962" }}>NEW</div>
            </div>
          </div>
        </div>
        {/* Category tags */}
        <div className="flex gap-1 px-1 pb-1">
          {["Jewelry", "Bags", "Belts"].map((c) => (
            <div key={c} className="rounded-full px-1.5 py-0.5 text-[3.5px]" style={{ background: "#EDE7D0", color: "#2C1E08" }}>{c}</div>
          ))}
        </div>
      </div>
    );
  }

  /* ── STREETWEAR (drop culture / hype / limited edition) ─────────────────── */
  if (layout === "streetwear") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "#0A0A0A" }}>
        {/* Announcement — countdown */}
        <div className="px-2 py-0.5 text-center" style={{ background: "#FFE600" }}>
          <span className="text-[3.5px] font-black tracking-widest" style={{ color: "#0A0A0A" }}>DROP 04 · 00:12:47:23</span>
        </div>
        {/* Nav */}
        <div className="flex items-center justify-between px-2 py-0.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="text-[6px] font-black tracking-tight text-white">{mark}</span>
          <span className="text-[3.5px] font-bold" style={{ color: "#FFE600" }}>WAITLIST</span>
        </div>
        {/* Hero — big text + photo */}
        <div className="relative flex-1">
          <ImgFallback className="absolute inset-0 h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[22px] font-black leading-none tracking-tighter text-white" style={{ lineHeight: 0.9 }}>04</div>
            <div className="text-[4.5px] font-black tracking-[0.4em] mt-0.5" style={{ color: "#FFE600" }}>LIMITED DROP</div>
          </div>
          {/* Product strip */}
          <div className="absolute bottom-0 inset-x-0 flex gap-0.5 p-1">
            {["#1A1A1A", "#222", "#1A1A0A"].map((c, i) => (
              <div key={i} className="flex-1 aspect-square rounded-sm flex items-end p-0.5" style={{ background: c, border: "1px solid rgba(255,230,0,0.2)" }}>
                <span className="text-[3px] font-bold" style={{ color: "#FFE600" }}>{["TEE", "CAP", "HOODIE"][i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── ACTIVEWEAR (gym / running / performance) ────────────────────────────── */
  if (layout === "activewear") {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "#0A0A0F" }}>
        {/* Nav */}
        <div className="flex items-center justify-between px-2 py-1" style={{ borderBottom: "1px solid rgba(0,255,135,0.12)" }}>
          <span className="text-[5.5px] font-black tracking-tight text-white">{mark}</span>
          <div className="rounded px-1.5 py-0.5 text-[3.5px] font-black" style={{ background: "#00FF87", color: "#0A0A0F" }}>SHOP</div>
        </div>
        {/* Hero */}
        <div className="relative flex-1">
          <ImgFallback className="absolute inset-0 h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, #0A0A0F 100%)" }} />
          <div className="absolute inset-x-0 top-[16%] px-2">
            <div className="text-[9px] font-black uppercase leading-none text-white tracking-tight">Built<br />for<br />This.</div>
          </div>
          {/* Product cards */}
          <div className="absolute bottom-0 inset-x-0 flex gap-0.5 px-1 pb-1">
            {[["TIGHTS", "8 900 F"], ["BRAS", "5 900 F"], ["KITS", "14 000 F"]].map(([cat, p]) => (
              <div key={cat} className="flex-1 rounded-sm px-1 py-0.5" style={{ background: "rgba(0,255,135,0.08)", border: "1px solid rgba(0,255,135,0.15)" }}>
                <div className="text-[3.5px] font-black text-white">{cat}</div>
                <div className="text-[3px] mt-0.5" style={{ color: "#00FF87" }}>{p}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── GENERIC fallback ──────────────────────────────────────────────────── */
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: bg }}>
      {visual.previewImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={visual.previewImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
      ) : null}
      <p className="absolute inset-x-0 top-[28%] z-10 text-center text-[14px] font-black uppercase tracking-tight text-white drop-shadow">{mark}</p>
    </div>
  );
}
