# ADR: Yande is the website designer (not a theme assistant)

**Date:** 2026-09-08  
**Status:** Accepted

## Product law

Africans (and all Kebu users) should **not** have to learn theme picking, section configuration, app installs, or hosting jargon to get a serious storefront online.

**Primary path:**

```
Describe the business → Yande designs the full structured site → user instructs → Yande redesigns → publish
```

Example conversation (all real product intent):

1. “Create a Senegalese fashion store. Luxury African fashion magazine. Sand, deep green, gold. Founder story under the hero. Large editorial product cards.”
2. “Make it less Shopify-looking and more like a high-end fashion website.”
3. “Add a wholesale section.”
4. “Make the mobile version completely different from desktop.”

Yande is the **designer of the site** (structured `website-v1` schema), not a chatbot sitting beside a traditional template system.

## Aesthetic store role

`/create/aesthetics` = **inspiration + starting looks** (Inspired Themes–style gallery: see finished demos).  
Optional — not the required first step. Mae / owner brands stay out of the store.

## Engineering constraints (unchanged)

- AI outputs **structured Kebu schema only** — never arbitrary production HTML/JS.
- Iterative improve via `/api/projects/[id]/ai-improve` (+ preview/apply).
- Mobile-distinct layouts may use responsive section props / separate page compositions — do not claim CapCut/Shopify clones.

## UI defaults

- `/create/new` defaults to **Describe it to Yande** (`mode=ai`).
- Aesthetic store header promotes describe path first.
- “Ask your site” command bar = same designer loop after launch.
