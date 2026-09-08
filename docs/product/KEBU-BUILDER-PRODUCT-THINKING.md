# Kebu Builder — Product thinking (not visual cloning)

**This is what “Canva-level” / “Spotify-level” / “Shopify-level” actually means.**

**Cursor paste:** `docs/product/CURSOR-BUILDER-INSTRUCTION.md`  
**Full spec:** `docs/product/KEBU-BUILDER-NEXT-GEN.md`  
**References:** `docs/reference/README.md`

---

## What you are NOT asking for

You are **not** asking Cursor to clone visual appearance.

You **are** asking it to understand what a **mature product feels like** — interaction density, hierarchy, responsiveness, polish, edge-case handling, completeness — then build **Kebu** with that level of **product thinking**.

Saying **“Canva,” “Spotify,” or “Shopify”** to Cursor is **not sufficient**. It hears a **category noun** → produces category-**ish** (textarea + triangle, giant player, sidebar + buttons).

---

## Can Cursor see Shopify / Spotify / Canva automatically?

**No — not reliably** in the way you need.

Cursor may use web tools, docs, and training — but you must **not assume** an accurate visual/interactive model of:

- Current **Shopify theme editor** (section/block tree, contextual settings, live preview, responsive preview, undo/redo)
- Current **Spotify web** (discovery / library / playback — not “a big music player”)
- Current **Canva editor** (templates, canvas, elements, export)
- **Wix AI** flow (prompt → site → hybrid edit)

For sophisticated UX work, **provide evidence:**

| Evidence | Use |
|----------|-----|
| Screenshots | Density, hierarchy, layout |
| Screen recordings | Interaction timing, transitions |
| Exported design references | Typography, spacing targets |
| Public documentation URLs | Workflow facts only — not copy source |
| Annotated screenshots | **GOOD** / **BAD** / **IMPORTANT** |

Folder: `docs/reference/` — see layout in `docs/reference/README.md`.

**If references are missing:** agent must **say so** — not invent competitor UI from memory.

---

## What we are building (not “Shopify but with AI”)

**Not:**

- “Shopify but with AI”
- “Wix with another chatbot”
- “Modern Store 1 / 2 / 3” with different hex codes

**Yes:**

> **AI Website + Commerce + Brand Operating System**

**Promise:**

> Describe the business. Get a beautiful, **functioning** business online. Keep building with AI.

Website + store + booking + content + marketing + analytics + customers + AI.

**Killer differentiator:**

| Wrong | Right |
|-------|-------|
| AI-generated website | AI **creative/product director** that understands what makes a good site **for that business** |

---

## First screen

**Not:** dashboard full of settings.

**Yes:**

> **What are you building?**  
> Tell us about your business.

Conversational canvas — user describes brand, audience, commerce, appointments, cultural direction.

---

## Example: luxury Senegalese fashion (Ndeye)

**User says:**

> “I own a luxury Senegalese fashion brand called Ndeye. Handmade dresses and accessories. Editorial, expensive, feminine, West African without stereotype. Shop collections, our story, book private appointments.”

**AI extracts:**

- Business type: fashion  
- Positioning: luxury  
- Audience: women  
- Personality: editorial / feminine / sophisticated  
- Culture: Senegalese / West African  
- Commerce: yes · Appointments: yes  

**AI proposes IA before paint:**

```
Home · Shop (New Arrivals, Dresses, Accessories) · Collections
· Our Story · Appointments · Contact · Cart
```

**AI proposes creative direction:** Editorial Atelier — typography, photography, color, spacing, buttons, product presentation, animation.

**User sees:** polished **multi-page site** — not Hero → three boxes → footer.

---

## AI pipeline (why previous builds looked cheap)

**Cheap path (forbidden):**

```
Prompt → Generate JSX → Make it look reasonable
```

**Required path:**

```
Prompt
  ↓ Understand business + audience + conversion goals
  ↓ Information architecture
  ↓ Select design world (not generic template)
  ↓ Select components + content structure
  ↓ Generate pages
  ↓ Connect commerce / booking / business functions
  ↓ Render
  ↓ Critique + improve
  ↓ Persist (Supabase)
  ↓ Hybrid edit (AI ↔ manual)
  ↓ Publish
```

**AI does not primarily generate HTML/JSX.**  
It generates: **structured Kebu schema + design system tokens + IA + components + pages + commerce hooks.**

---

## Design worlds (not Template #1 / #2 / #3)

Business logic and visual composition **change together**.

| World | Archetype | Character |
|-------|-----------|-----------|
| **Editorial Atelier** | Luxury fashion | Large photography, minimal nav, magazine storytelling |
| **Modern Heritage** | African contemporary | Architectural layouts, textile-inspired detail |
| **Clinical Luxury** | Beauty | Product-focused, editorial photography, education |
| **Night Market** | Restaurant | Immersive food photography, menu-first, reservations |
| **Gallery** | Jewelry | Negative space, museum feel |
| **Culture Magazine** | Music / RECT | Artist imagery, releases, events, editorial |

Spec: `docs/product/KEBU-TEMPLATE-INTELLIGENCE.md`  
Flagship references in repo: May Lecor, K-Direction, DkLNS, Ndaoan.

---

## System-level AI reasoning (not one CSS tweak)

**“Make the website feel more expensive”** → AI reasons:

- Reduce visual clutter  
- Strengthen typography  
- Increase photography prominence  
- Simplify navigation  
- Adjust spacing · refine palette  
- Change product presentation · CTA hierarchy  

→ Applies to **design system**, not `background-color` alone.

**“More Senegalese, not touristy”** → creative direction:

- Photography · typography · palette · art direction · copy · subtle cultural detail  

→ **Not** African pattern on every section.

---

## Editor = creative studio (not generic CMS)

Shopify’s section/block tree + contextual settings = **good underlying pattern** — Kebu makes the **interaction model** more elegant.

| Region | Role |
|--------|------|
| **Center** | Actual website (full bleed on flagships) |
| **Left** | Pages + section structure tree |
| **Right / contextual** | Design + section controls on canvas click |
| **Bottom** | **✨ Ask your site** — AI command bar |

Hybrid always: **AI → manual → AI → manual** (Wix is moving here too — Kebu goes further on design intelligence).

---

## AI command bar — preview before apply

**Target UX** (slice not complete):

User: *“The website feels boring. Improve it.”*

AI responds with **intent preview:**

```
I'm going to:
• Replace the hero composition
• Reduce navigation density
• Change heading typography
• Add editorial product imagery
• Reorganize the featured collection
• Adjust mobile spacing

[Apply changes]
```

**Status:** command bar live; **preview → confirm → apply** — **NOT IMPLEMENTED** (applies directly today). See `builder-site-command-bar.tsx`.

---

## AI Design Director (post-launch)

Not just generator — **persistent intelligence** using:

- Brand · business · customers · products · design system · pages · conversion goals · **real analytics**

Examples:

- “Homepage traffic high but collections low — move Featured Collection above brand story.”  
- “Mobile product cards too tall — unnecessary scrolling.”  

**WHAT HAPPENED → WHY → WHAT TO DO** — not fake copilot charts.

---

## Master Cursor instruction (paste)

```
We are building an original AI-native commerce and website platform — Kebu Builder.

Shopify, Wix, Squarespace, Canva, Spotify, and Figma are reference points for
PRODUCT MATURITY — interaction quality, IA, density, hierarchy — NOT implementation templates.

Study publicly observable workflows where references are provided in docs/reference/.
Do NOT assume knowledge from the product name alone.

The product must NOT be a simplified imitation.

Build the complete underlying system required for the experience to be genuinely useful.

When a feature appears in the interface, it must have real functionality (Supabase E2E)
OR be explicitly marked NOT IMPLEMENTED.

Prioritize: product quality, interaction quality, design coherence, responsiveness,
state management, accessibility, performance, backend correctness
— over the number of screens produced.

Read docs/product/PRODUCT_RULES.md and docs/IMPLEMENTATION_STATUS.md first.
Product Architect Phase before new major surfaces. One vertical slice at a time.
npm run ci before claiming done.
```

Then attach reference screenshots + slice assignment.

---

## Honest implementation status

| Capability | Status |
|------------|--------|
| Design worlds (flagships) | Partial — May Lecor, K-Direction, etc. |
| Structured schema AI output | Partial |
| Creative studio editor chrome | Partial |
| Command bar | Live |
| Change preview → apply | **NOT IMPLEMENTED** |
| AI Design Director (analytics-driven) | **NOT IMPLEMENTED** |
| Reference screenshots in `docs/reference/` | **NOT STARTED** (dossiers only) |
| Import / Code creation modes | **NOT IMPLEMENTED** |

Live tracker: `docs/IMPLEMENTATION_STATUS.md`
