# Product reference library (for Builder + UX maturity)

Kebu does **not** clone Shopify, Wix, Canva, Spotify, or Figma. Those products are **reference points for maturity** — interaction quality, information architecture, density, hierarchy, **what a complete product feels like** — **not** visual templates to copy.

**Canonical explanation:** `docs/product/KEBU-BUILDER-PRODUCT-THINKING.md`

---

## Can Cursor “see” Shopify / Spotify / Canva automatically?

**No — not reliably.** Do not assume accurate visual/interactive models from product names alone.

Cursor may use web tools and docs, but for **sophisticated interaction design** you must provide **evidence** in this folder. Without it, agents guess — and produce generic “hero + three boxes + footer” or wrong chrome (e.g. giant central Spotify player).

**Say:** “Shopify-**level** merchant OS depth” — **not** “build Shopify.”

Products agents **cannot** model accurately from names alone:

- Current Shopify theme editor (section/block tree, contextual settings, live preview, responsive preview, undo/redo)
- Spotify web (discovery / library / playback — not “a big music player”)
- Canva editor (templates, canvas, elements, export)
- Wix AI site flow (prompt → site → hybrid edit)

**Provide evidence** in this folder:

- **Product benchmark dossiers** — `docs/reference/{shopify,spotify,canva}/PRODUCT-BENCHMARK.md` (systems + workflow, not names)  
- Screenshots · screen recordings · exported design references  
- URLs to public documentation  
- Interaction descriptions  
- **Annotated screenshots** — GOOD / BAD / IMPORTANT  

Without references, agents will guess — and produce generic “hero + three boxes + footer” or wrong Spotify-like chrome.

---

## Folder layout

Add files as you capture them (gitignore large videos if needed; keep PNG/WebP):

```
docs/reference/
  shopify/
    dashboard.png
    theme-editor.png
    section-tree.png
    contextual-settings.png
    theme-store.png
    mobile-editor.png
    product-editor.png
  spotify/
    home.png
    search.png
    library.png
    artist.png
    album.png
    player-chrome.png          # IMPORTANT: persistent but subordinate — not giant center player
  canva/
    home.png
    templates.png
    editor.png
    elements.png
    text.png
    export.png
  wix/
    ai-site-flow.png
    editor.png
  quality/
    reference-good-1.png
    reference-bad-generic-hero.png
  kebu/                        # our own target quality bar
    maylecor-target.png
    kdirection-target.png
    dklns-target.png
    ndaoan-target.png
    ndeye-luxury-fashion-mock.png   # optional: AI world target (Editorial Atelier)
```

**Status:** PNG screenshots mostly **NOT STARTED** — dossiers exist; add images as you capture them.

Optional: sibling `*.notes.md` per image with annotations.

---

## Annotation format (recommended)

```markdown
# theme-editor.png

**GOOD:** Section tree + live preview + contextual settings on selection; responsive toggle.

**BAD:** Do not copy Shopify admin chrome or billing UX — merchant OS is Kebu Business.

**IMPORTANT:** Changes apply to structured sections — we use Kebu schema, not Liquid.
```

```markdown
# player-chrome.png

**GOOD:** Playback always available; discovery remains primary.

**IMPORTANT:** Player is persistent but visually subordinate — do NOT turn Kebu into a giant central player.
```

---

## How agents should use this

1. Read `docs/product/KEBU-PRODUCT-ARCHITECT-PHASE.md` — **decompose before code** for new major surfaces.  
2. Read `docs/product/KEBU-BUILDER-NEXT-GEN.md` — design worlds, AI pipeline, creative studio editor.  
3. Read `docs/product/CURSOR-BUILDER-INSTRUCTION.md` before Builder UX slices.  
4. Read annotated references **when assigned** a UX slice — do not invent competitor UI from names.  
5. Never ship generic section stacks when the brief calls for editorial / luxury / cinema-grade composition.  
6. Output **structured Kebu schema + design tokens** — not one-off JSX/CSS patches.

---

## Public documentation (when screenshots unavailable)

Use official product docs for **workflow facts only** — still label as inspiration, not copy source:

- Shopify: Online Store themes — sections, blocks, theme editor (shopify.dev)
- Wix: AI site builder + editor hybrid model (wix.com product pages)

---

## Paste block for Cursor sessions

See **`docs/product/CURSOR-BUILDER-INSTRUCTION.md`** for the full master instruction to paste before slice work.
