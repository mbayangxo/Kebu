# Kebu Studio / Create — Creative OS North Star

**Status:** Canonical product vision · **2026-09-08**  
**Law:** One intelligent creative system that turns an idea into something real — not 10,000 templates, not Canva feature-parity.  
**Related:** `KEBU-STUDIO-MASTER-SPEC.md` · `KEBU-STUDIO-VIDEO-ARCHITECTURE.md` · Music intelligence ADR · Yande-as-designer ADR · Brand: `KEBU-NO-WATCHING.md`

---

## Mission

You should not need to know creative software to create professional work.

A 55-year-old woman selling shea butter in Senegal should make a beautiful brand.  
A 19-year-old musician in Mali should run a professional music campaign.  
A tailor in Dakar should photograph and sell clothing.  
A farmer should create packaging and marketing.  
A filmmaker should not need five Adobe apps.  
A student should not need a powerful Mac.  
A creator should not need English to use the tool.  
A business should not need a full creative department to look professional.

**Scary Kebu ≠ template count.** Scary Kebu = one system that turns someone’s idea into something real.

---

## Naming (avoid confusion)

| Name | Role |
|------|------|
| **Kebu Studio** | Current product surface — design + video + music intelligence (`/studio`) |
| **CREATE** (umbrella) | Eventual entry: “I want to launch my clothing line” → Brand → Products → Campaign → Content → Website → Social → Store → Launch |
| **Builder / Aesthetics** | Website storefronts (Yande designs sites) — connected, not the same editor |
| **Shop** | Commerce ops after Design → Sell |

Do **not** rename nav to “Kebu Create” until CREATE orchestration is a real vertical slice. Until then: **Studio** for creative artifacts; **describe → site** lives in Builder.

---

## Core differentiators (vs Canva-class tools)

### 1. AI Creative Director

Canva mostly starts from the **artifact**. Kebu starts from the **business / idea**.

> “I need a campaign for my new clothing brand.”

Kebu asks what you’re trying to accomplish and builds a **connected creative system**:

campaign concept · moodboard · visual direction · color · type · logo treatment · photoshoot concepts · social · posters · website graphics · product pages · video concepts · captions · launch calendar

**Change visual direction → whole campaign updates.** One source of truth.

### 2. One project → everything

Example: **“May Lècor — EP Launch”** = project universe, not one Instagram post.

| Domain | Outputs |
|--------|---------|
| Brand | Cover, logo, fonts, colors, identity |
| Music | Album art, lyric visualizer, teaser, waveform video |
| Video | TikTok · Reels · YouTube · MV · trailer · lyric |
| Marketing | Posters, flyers, billboards, press kit, social |
| Commerce | Merch, mockups, storefront, product photo, QR |
| Events | Tickets, posters, stage screens, invites, schedules |

### 3. African formats (infrastructure, not stereotypes)

Languages as **creative languages**, not English→MT paste: Wolof · Pulaar · Bambara · Hausa · Yoruba · Igbo · Amharic · Somali · Swahili · Lingala · Arabic · French · English · Portuguese · …

> “Make this announcement natural in Wolof.”

### 4. African typography engine

Fonts that actually support needed scripts. Directional prompts:

> “Typeface that feels like contemporary Dakar fashion.”  
> “Sahelian luxury brand.”

Not caricatured “African fonts” — **modern African design language**.

### 5. AI photography studio

Upload **one product** → studio · lifestyle · editorial · ecommerce · campaign · model · location · lighting — **preserve the actual product** (Senegalese dress stays that dress).

### 6. Video editor — not a DAW

Multi-track · keyframes · transitions · captions · beat sync · color · AI edit — **professional results without Premiere complexity**.  
Law: Visual Creation + **Music Intelligence** (ADR).

### 7. “Make it for me”

> “Turn this 3-minute video into five TikToks.” → strongest moments · tones · captions · brand · export all five.

### 8. Brand DNA (permanent per business)

logo · colors · fonts · photography style · voice · language · products · customer · visual rules · templates · approved imagery  

Every Kebu tool reads Brand DNA — stop re-explaining the brand to AI.

### 9. Real-world production

Digital + print sizes + eventually connect to printers · sign makers · packaging · shooters · manufacturers · fulfillment (Kebu Business infrastructure).

### 10. Design → Sell

Product → photos → description → price → listing → checkout → ads → QR → WhatsApp → inventory → orders.  
One workspace instead of Canva + Shopify + CapCut + five others.

### 11. Offline-first / low-bandwidth Studio

Local save · offline edit · compressed previews · resumable uploads · low-res edit · light mobile · sync when back. Real Africa product design.

### 12. Collaboration — Kebu Rooms

Photographer · designer · owner · musician · social in one project. Comments · approvals · client **approval links** without forced accounts.

### 13. African asset marketplace

Locations · architecture · fabrics · patterns · music · photography · fonts · templates — **pay creators**. Creative economy, not scraped stock.

### 14. Cultural intelligence

Sacred/community symbols → warn · origin · licensing. Permission and context — not culture as free AI training paste.

### 15. AI that doesn’t erase the creator

Keep my photo · face · artwork · product · voice · brand · change only background. **Leverage, not replace.**

### 16. CREATE umbrella

Not Canva / Video / Design / Presentations / Websites as silos — **CREATE** understands a launch is a **project**, not a file.

---

## Engineering phases (slice discipline)

Do **not** build 1–16 in parallel. Every item = vertical slice when assigned.

| Horizon | Focus |
|---------|--------|
| **Now** | Ship unpushed Studio/aesthetics · Studio V1 music-aware timeline · Brand DNA foundation when assigned · Design → Sell hooks already in Shop/Builder |
| **Next Studio slices** | Fonts catalog · brand aesthetic apply · posters/banners/cards · Audio Reactive · Creative Director **campaign project** (mood + linked assets) |
| **Later** | AI photo preserve-product · Rooms/comments · marketplace · cultural intelligence · full CREATE orchestrator · offline Studio depth |

**Forbidden:** fake “campaign complete” · fake marketplace · stereotype African packs · DAW claims · CapCut-complete claims · cultural warnings without real policy/sources.

---

## Acceptance test (north star)

A creator or small business can say: *I described what I’m launching → Kebu built a connected creative system → I sold or published something real — without learning five tools.*
