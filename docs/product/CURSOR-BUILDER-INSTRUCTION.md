# Cursor — Kebu Builder Master Instruction (paste block)

Use this **instead of** “build Shopify” or “make it like Spotify.”

**Full product spec:** `docs/product/KEBU-BUILDER-NEXT-GEN.md`  
**References:** `docs/reference/README.md` — **required for sophisticated UX**  
**Engineering contract:** `docs/product/KEBU-MASTER-ENGINEERING-INSTRUCTION.md`

---

## Paste into Cursor

```
Read docs/product/PRODUCT_RULES.md and docs/IMPLEMENTATION_STATUS.md before any change.

We are building [OUR PRODUCT]. [Canva/Shopify/Spotify] is a QUALITY REFERENCE — not a template to copy.

Then build ONE vertical slice end-to-end with Supabase. Design QA loop. Adversarial audit. No MVP-looking UI.

We are building an original AI-native African commerce + website operating system — Kebu Builder.

Shopify, Wix, Squarespace, Canva, Spotify, and Figma are REFERENCE POINTS for product maturity — interaction quality, information architecture, density, hierarchy — NOT implementation templates.

DO NOT assume you know the current Shopify theme editor, Spotify app, Canva editor, or Wix AI flow from the product name alone. Read docs/reference/ when screenshots exist. If references are missing, say so — do not invent competitor UI from memory.

DO NOT build “Shopify with different colors” or “Wix with another chatbot.”

DO build:
AI Website + Commerce + Brand Operating System

Promise: Describe the business → get a beautiful, functioning business online → keep building with AI.
Website + store + booking + content + marketing + analytics + customers + AI.

The AI does not primarily generate HTML/JSX. It generates:
structured Kebu schema + design system tokens + information architecture + components + pages + commerce hooks.

Pipeline:
Prompt → understand business/audience/goals → IA → design world → components → content → commerce → render → critique → persist → hybrid edit (AI ↔ manual) → publish

First screen: “What are you building?” — NOT a settings dashboard.

Templates = DESIGN WORLDS (Editorial Atelier, Modern Heritage, Clinical Luxury, …) — not “Modern Store 1/2/3.”

Editor = creative studio: center = live site; left = pages + section tree; contextual controls on canvas click; bottom = “Ask your site” with CHANGE PREVIEW before apply.

Post-launch = AI Design Director (brand + analytics → WHAT HAPPENED → WHY → ACT).

When a feature appears in UI it must work end-to-end with Supabase OR be labeled NOT IMPLEMENTED.

Prioritize: product quality, interaction quality, design coherence, responsiveness, state, a11y, performance, backend correctness — over number of screens.

If a dependency slice is broken: STOP, repair it, then continue. Never hide errors to make UI look functional.

Read docs/IMPLEMENTATION_STATUS.md before coding. One vertical slice at a time. Adversarial audit before next slice.

TEMPLATE RULES:
- Use Template Intelligence System (business archetypes + compositions) — docs/product/KEBU-TEMPLATE-INTELLIGENCE.md
- Run 10-question design review — docs/product/KEBU-DESIGN-QUALITY-STANDARD.md
- ONE exceptional template first; no template count optimization
- If it looks AI-generated, it FAILED — redesign
- Reference dossiers (not names): docs/reference/shopify|spotify|canva/PRODUCT-BENCHMARK.md
```

Then attach **your slice assignment**, e.g.:

> Implement Slice: AI change preview → confirm → apply on the command bar. Do not proceed to other slices.

---

## What Cursor cannot do reliably

| Assumption | Reality |
|------------|---------|
| “Make it like Shopify” | No accurate visual/interactive model of current Shopify editor |
| “Like Spotify” | No reliable model of discovery/library/player UX without references |
| “Like Canva” | Same — needs screenshots, recordings, annotated exports |

**Provide evidence:**

- Screenshots · screen recordings · public docs URLs  
- Annotated images: **GOOD** / **BAD** / **IMPORTANT**  
- Your own flagship targets in `docs/reference/kebu/`

---

## Reference folder (add files as you capture them)

See `docs/reference/README.md` for layout:

`shopify/` · `spotify/` · `canva/` · `wix/` · `quality/` · `kebu/`

Example annotation:

- **GOOD:** density, hierarchy, contextual controls  
- **BAD:** do not reproduce this chrome  
- **IMPORTANT:** player persistent but visually subordinate — not a giant central player  

---

## Example first-run flow (product thinking)

**User:** “I own a luxury Senegalese fashion brand called Ndeye. Handmade dresses and accessories. Editorial, expensive, feminine, West African without stereotype. Shop collections, our story, book private appointments.”

**AI extracts:** fashion · luxury · women · editorial/feminine/sophisticated · Senegalese · commerce + appointments

**AI proposes IA before paint:**

Home · Shop (New Arrivals, Dresses, Accessories) · Collections · Our Story · Appointments · Contact · Cart

**AI proposes creative direction:** Editorial Atelier — typography, photography, color, spacing, product presentation, motion

**User sees:** preview of a **polished multi-page site** — not hero + three boxes + footer.

---

## AI reasoning (system-level, not one CSS tweak)

**“Make it feel more expensive”** → reduce clutter · stronger typography · photography prominence · simplify nav · spacing · palette · product presentation · CTA hierarchy · **then apply to design system**

**“More Senegalese, not touristy”** → photography direction · typography · palette · art direction · copy · subtle cultural detail — **not** African pattern on every section

---

## Killer differentiator

Not: *AI-generated website*  
Yes: *AI creative/product director* that understands what makes a good site **for that business**.

---

## Related

- Builder spec: `docs/product/KEBU-BUILDER-NEXT-GEN.md`  
- Rule: `.cursor/rules/kebu-builder-next-gen.mdc`  
- References: `docs/reference/README.md`
