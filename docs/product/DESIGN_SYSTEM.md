# Kebu — Design System (application shell)

**Purpose:** Measurable visual + interaction spec — not “make it beautiful.”

**Quality bar:** `docs/product/KEBU-DESIGN-QUALITY-STANDARD.md`  
**Site/theme tokens (Builder):** `lib/create/site-aesthetics.ts` (`--kebu-*` CSS variables per published site)

This document governs **Kebu product UI** (dashboard, Builder chrome, Business hub, Shop admin, etc.). Published merchant sites use **design worlds** + per-site tokens — not this shell verbatim.

---

## Typography roles

| Role | Use |
|------|-----|
| **Display** | Marketing hero, major page titles |
| **Heading** | Section / panel titles |
| **Subheading** | Card titles, list group headers |
| **Body** | Primary reading text |
| **Caption** | Secondary labels, hints |
| **Metadata** | Timestamps, counts, badges text |

**Rules:** One display font + one body font per surface · consistent line-height · no arbitrary font-size jumps.

---

## Spacing scale (px)

Use the scale — do not invent one-off margins:

```
4 · 8 · 12 · 16 · 24 · 32 · 48 · 64
```

**Density:** Professional application density — not landing-page whitespace. See `PRODUCT_RULES.md`.

---

## Radius

| Token | Use |
|-------|-----|
| **small** | Inputs, chips |
| **medium** | Cards, panels |
| **large** | Modals, major containers |
| **pill** | Tags, toggle tracks |

Published sites: `--kebu-radius` from theme spacing mode in `site-aesthetics.ts`.

---

## Motion

| Context | Duration |
|---------|----------|
| Micro-interaction (hover, toggle) | 120–180ms |
| Panel / drawer transition | 180–250ms |
| Modal | 200–300ms |
| Page transition | Subtle; prefer opacity/transform over layout thrash |

Respect `prefers-reduced-motion`.

---

## Interaction principles

- Buttons: **hover · pressed · focus · disabled** — always  
- Cards: hover affordance where clickable  
- Menus / popovers: animate open/close intentionally  
- Destructive actions: confirm where data loss or money involved  
- Nothing important appears/disappears **instantly** without reason  
- Focus rings visible for keyboard users  

---

## Component library (product shell)

**Before creating a new component**, search the repo for an existing one. Reuse or extend — do not duplicate visually similar primitives.

Target shared primitives (implement incrementally; use consistently):

```
Button · Input · Select · Dropdown · Modal · Drawer · Tabs · Toast · Tooltip
Card · Avatar · Badge · Navigation · DataTable · CommandMenu · EmptyState · Skeleton
```

**Rule:** `.cursor/rules/kebu-component-reuse.mdc`

When a primitive does not exist yet, implement **once** in a shared location, then consume — not per-screen one-offs.

---

## Reference images

Assign roles explicitly:

- Reference A → navigation density  
- Reference B → typography hierarchy  
- Reference C → card / list behavior  
- Reference D → editor / canvas interaction  

Store in `docs/reference/` with annotations — `docs/reference/README.md`.

**Do not copy** branding or proprietary artwork.

---

## Builder vs shell

| Layer | System |
|-------|--------|
| **Kebu app chrome** | This design system + shared components |
| **Merchant published site** | Design world + structured schema + `--kebu-*` site tokens |
| **Kebu Studio** (future) | Extends creative tooling spec — `docs/product/KEBU-STUDIO.md` |

Do not conflate merchant site aesthetics with admin shell — both must be polished.
