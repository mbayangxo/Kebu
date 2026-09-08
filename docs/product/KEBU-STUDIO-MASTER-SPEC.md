# Kebu Studio — Master Product Specification

**Status:** Canonical product law · **2026-09-07** (north star updated **2026-09-08**)  
**Related:** `KEBU-STUDIO.md` · `KEBU-STUDIO-CANVA-BLUEPRINT.md` · **North star:** `KEBU-STUDIO-CREATE-NORTH-STAR.md` · Canva = **quality bar only** (`docs/reference/canva/`)

---

## IMPORTANT

Kebu Studio is a **first-class Kebu product**. It is **NOT a Canva clone**.

Do **not** copy Canva’s UI, proprietary assets, code, layouts, branding, illustrations, templates, or distinctive design language.

Build a **world-class creative platform** with comparable or greater capability and an **original Kebu** experience.

**Mission:** Give African users the same class of creative power that expensive/global tools provide — beautiful, fast, intuitive, affordable, AI-native, mobile-friendly, professional.

> “I have an idea.” → Kebu Studio helps me create it — as a **connected creative system**, not one disconnected Instagram file.

**North star (AI Creative Director · one project → everything · Brand DNA · Design → Sell · African formats · Music Intelligence):** see `docs/product/KEBU-STUDIO-CREATE-NORTH-STAR.md`.

---

## 1. What Kebu Studio is

Creative creation layer of Kebu — **one studio**, not Canva bolted onto CapCut:

**Law:** `Kebu Studio = Visual Creation Studio + Music Intelligence` — **not a DAW**.  
ADR: `docs/decisions/2026-09-08-studio-visual-music-intelligence-not-daw.md` · Video: `KEBU-STUDIO-VIDEO-ARCHITECTURE.md`

| Area | Scope |
|------|--------|
| **Design** | Graphics, presentations, branding, documents |
| **Image** | Photo edit, AI images, product photography |
| **Video** | Quick / Smart / Full Timeline — CapCut-level → pro NLE |
| **Audio** | Voice, music under **Music Intelligence** (not a DAW) |
| **AI** | Generate, edit, transform, animate, resize · Create for me / Teach me |
| **Brand** | Kits + reusable assets |
| **Publish** | Social, web, print, Shop, Reach |

**Ceiling:** same as professionals worldwide. **Entry:** dramatically easier and cheaper.

Video architecture: `KEBU-STUDIO-VIDEO-ARCHITECTURE.md` · composition contract: `lib/studio/composition.ts`.

Eventually: 3D · advanced motion · interactive · deep collab — only when assigned end-to-end.

---

## 2–30. Capability map (build slice-by-slice)

| # | Area | Rule |
|---|------|------|
| 2 | Home | “What are you creating?” categories · AI / template / blank / import |
| 3 | AI creation | Structured **editable** projects — never flattened-only |
| 4 | Conversational design | Assistant **mutates** the project |
| 5 | Real editor | Drag · crop · layers · fonts · snap · undo · … — polished |
| 6 | Multi-page | Campaign pages across formats |
| 7 | Brand kit | Logo · colors · fonts · imagery · tone |
| 8 | Magic resize | Intelligent adapt — not stretch-only |
| 9–10 | Presentations · documents | When assigned |
| 11 | Video | Quick Edit · Storyboard · Full Timeline on **one** composition engine — no fake CapCut |
| 12–14 | Social · creator · business | Workflows + editable templates |
| 15 | Africa-first library | Diverse, not stereotypical |
| 16 | Localization | i18n architecture — not hard-coded |
| 17–18 | AI image · image editor | Progressive; never fake |
| 19–22 | Collab · Cloud · Builder · Mail | Real integrations only |
| 23–25 | Export · templates · search | Structured metadata |
| 26–27 | A11y · performance | Low-cost devices |
| 28–29 | Pricing · privacy | Free useful; private by default |
| 30 | Design standard | Distinctively Kebu — not generic SaaS |

Full narrative for each section lives in product planning; **engineering only implements assigned vertical slices**.

---

## Engineering non-negotiables

```
UI → state → API → backend → Supabase → response → UI → refresh persists
```

- No fake buttons · no mock “complete”  
- One vertical slice at a time  
- Bugs: reproduce → root cause → fix → regress  
- Do not destroy working Kebu paths  

---

## Active slice order (after existing S11–S16 / S8b / Reach)

| Order | Slice | Why |
|-------|-------|-----|
| Done | **S8c-lite — Music analysis + beat grid** | Soundtrack · BPM/beats · snap |
| Done | **Create for me / Teach me** | Intent toggle · persisted lessons · No watching |
| Done | **Composition architecture** | Tracks/clips/storyboard schema · beat helpers (no fake multi-track UI) |
| Next | **Canva-class editing depth** *or* **V2 Storyboard** | Per assignment — Design fonts/brand *or* Video storyboard |

### Video modes (same project)

**Quick Edit** (beginner) · **Smart Edit** (creator) · **Full Timeline** (pro) — see `KEBU-STUDIO-VIDEO-ARCHITECTURE.md`.

### Continuous ecosystem

```
Studio → Builder → Shop → Reach → (Mail) → (Cloud)
```

Surface honestly on Studio home/create. Mail/Cloud = later when live — never fake send.

Do **not** attempt §§1–30 or full CapCut checklist in parallel.

---

## Definition of done (any Studio feature)

CREATE → EDIT → SAVE → CLOSE → REOPEN → EDIT → EXPORT/VERIFY — all real.

Not done: button exists · page renders · mock data.
