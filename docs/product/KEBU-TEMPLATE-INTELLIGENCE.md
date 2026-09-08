# Kebu — Template Intelligence System

**Status:** Architecture law + partial implementation (flagship design worlds). **NOT** 30 generic templates.

**Agent rules:** `kebu-builder-next-gen.mdc` · **Quality gate:** `docs/product/KEBU-DESIGN-QUALITY-STANDARD.md`  
**References:** `docs/reference/REFERENCE-DOSSIER-FORMAT.md`

---

## Problem

AI is good at generating **a template** — bad at generating a **good design system of templates** without constraints.

Default output = Dribbble concept / generic Bootstrap = **Hero + three cards + button** × N color variants.

**Failed standard:** If it looks AI-generated, it **failed quality review** and must be redesigned.

---

## Wrong architecture

```
templates/
  template1.jsx
  template2.jsx   # same IA, different colors
  template3.jsx
```

---

## Target architecture (composition, not static pages)

```
business_categories/     # fashion, beauty, restaurant, electronics, …
design_systems/          # tokens: type, color, spacing, motion
layout_systems/          # grid, editorial, gallery, menu-first, …
section_library/         # approved Kebu section types + blocks
template_compositions/   # named recipes per archetype
content_models/          # fields per business type
theme_tokens/            # per-project applied tokens
```

A **template** = intelligently selected **composition** of sections + tokens + content model — rendered through approved components (`SiteRenderer`), **not** static HTML.

**Code today (partial):** `lib/create/template-catalog.ts`, `templates-seed.ts`, flagship worlds (May Lecor, K-Direction, …), `website-v1` schema. **Target:** explicit `business_categories` + composition registry — slice-by-slice.

---

## Business archetypes change IA — not just colors

| Archetype | Required IA / merchandising (examples) |
|-----------|----------------------------------------|
| **Fashion** | Editorial photography, lookbooks, collections, storytelling, variants, campaign imagery, strong type, mobile browse |
| **Restaurant** | Menu, locations, hours, reservations/order CTA, food photography, specials, delivery, story, reviews |
| **Beauty** | Routine/category nav, benefits, ingredients, bundles, concerns, education, reviews |
| **Furniture** | Room imagery, dimensions, materials, finishes, lifestyle, delivery, collections |
| **Electronics** | Specs, comparison, compatibility, warranties, accessories, financing |
| **Jewelry** | Gallery, negative space, museum product presentation |
| **Services** | Booking, trust, team, case studies, clear CTA |

---

## Example compositions (design worlds)

**Fashion Luxury**

```
Editorial Hero + Featured Collection + Campaign Story + Product Rail
+ Lookbook + Brand Story + Social Proof + Newsletter
```

**Restaurant**

```
Atmospheric Hero + Menu Categories + Signature Dishes + Story
+ Location + Hours + Reservation + Reviews
```

Same **section library** — different **composition** and **tokens**.

---

## Theme marketplace (target)

Categories: Luxury Fashion · Streetwear · Beauty · African Fashion · Jewelry · Restaurant · Café · Bakery · Furniture · Electronics · Home Goods · Art · Creator · Services · …

**Each category:** multiple **genuinely different art directions** — not 20 copies of one layout.

---

## Development process (mandatory)

1. **ONE exceptional template / design world** end-to-end (FE → schema → publish → mobile).  
2. **Design-quality review** — all 10 questions pass.  
3. Document **principles that made it succeed**.  
4. Next archetype — **distinct** composition + art direction.  

**Forbidden:** Generate 30 templates at once to satisfy a count.

---

## AI’s role

1. Select **business_category** + **design world**  
2. Compose from **section_library** + **content_models**  
3. Apply **theme_tokens**  
4. Run **design review** (self-critique) before showing user  
5. Persist **structured website-v1** — user edits hybrid AI/manual  

Never: prompt → arbitrary JSX blob.

---

## Related

- Builder: `docs/product/KEBU-BUILDER-NEXT-GEN.md`  
- Cursor paste: `docs/product/CURSOR-BUILDER-INSTRUCTION.md`  
- Design quality: `docs/product/KEBU-DESIGN-QUALITY-STANDARD.md`  
- Status: `docs/IMPLEMENTATION_STATUS.md`
