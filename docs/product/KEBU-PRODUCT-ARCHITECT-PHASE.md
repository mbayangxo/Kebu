# Kebu — Product Architect Phase

**STOP. DO NOT WRITE APPLICATION CODE** until this phase completes for the assigned product/category.

**Agent rule:** `.cursor/rules/kebu-product-architect.mdc`  
**Authoritative:** `docs/product/PRODUCT_RULES.md`  
**Engineering contract:** `docs/product/KEBU-MASTER-ENGINEERING-INSTRUCTION.md`  
**After blueprint:** vertical slices only · Design QA · no MVP aesthetics · quality gate

---

## Five specifications (give Cursor all five)

| # | Spec | Document |
|---|------|----------|
| 1 | Product | Area specs + slice assignment |
| 2 | Visual | `docs/product/DESIGN_SYSTEM.md` |
| 3 | Interaction | `docs/product/UX_SPECIFICATION.md` · `docs/screens/` |
| 4 | Engineering | `docs/product/KEBU-MASTER-ENGINEERING-INSTRUCTION.md` |
| 5 | Completion | `docs/product/DEFINITION_OF_DONE.md` · `docs/product/QUALITY_GATE.md` |

---

## The failure mode we are fixing

Cursor hears **“Build Canva”** → produces **AI prompt + triangle preview**.

You meant: **complete professional design platform** (discovery → edit → assets → export → persistence).

Same for **Spotify** (not a player — navigation, library, discovery, queue, states, …) and **Shopify** (not sidebar + editor — commerce OS).

**Root cause:** Cursor interprets ambition as a **request for a simplified prototype**.

**Fix:** **Product decomposition first** — then vertical slices — then visual/functional QA.

---

## Phase 0 — Product Architect (mandatory before code)

You are the **Product Architect**. Your first job is **NOT** to build a simplified version.

**Understand the complete product.** Output = **implementation blueprint** — only then may engineering begin.

### Decompose into (minimum)

1. **Information architecture**  
2. **Navigation architecture**  
3. **Screen inventory**  
4. **User journeys**  
5. **Feature inventory**  
6. **Interaction inventory**  
7. **Component inventory**  
8. **Data model**  
9. **Application state model**  
10. **Permission model**  
11. **Loading / empty / error / success states** (per surface)  
12. **Responsive behavior**  
13. **Keyboard interactions** (where applicable)  
14. **Backend requirements** (Supabase, RLS, migrations)  
15. **Integration requirements**  
16. **Testing requirements**  

**Do not simplify** because implementation is hard. Document complexity; break into implementable slices.

**Do not substitute visual approximation for functionality.**  
**Do not create a prototype** unless explicitly requested.

---

## Per-surface UX decomposition

For **every major surface**, answer:

| Question | Required |
|----------|----------|
| What does the user **see**? | ✓ |
| What can they **do**? | ✓ |
| What happens on **click**? | ✓ |
| **No data** state? | ✓ |
| **Error** state? | ✓ |
| **Loading** state? | ✓ |
| After **success**? | ✓ |
| **Mobile** behavior? | ✓ |
| **Keyboard shortcuts**? | ✓ |
| **Persists after refresh**? | ✓ |

That is the difference between a **screen** and a **product**.

---

## Product density (not “simple = empty”)

> **Do not interpret simplicity as removing functionality.**

The interface needs information density, hierarchy, contextual controls, navigation depth, and interaction richness appropriate for a **mature professional application**.

**Do not:** oversized cards · giant buttons · excessive whitespace · one prominent action because it is easy to implement.

The product should feel like a **real app used daily by professionals** — not a landing-page prototype.

This directly attacks the **“big player with three buttons”** problem.

---

## Reference product analysis (not clone)

Use Canva / Spotify / Shopify / etc. as **quality references**:

- Analyze **publicly observable** IA, interaction patterns, hierarchy, workflow depth  
- **Do not copy** proprietary assets, branding, or source code  
- Create or extend **Reference Benchmark** docs — `docs/reference/{product}/PRODUCT-BENCHMARK.md`

**Goal is not “exactly like Shopify.”** Goal is:

> Understand **why** it works. Reproduce **level of sophistication and completeness** with **our own product and visual identity**.

Maturity targets (examples):

| Bar | Dimension |
|-----|-----------|
| **Shopify-level** | UX maturity · commerce OS depth |
| **Canva-level** | Creative tooling completeness |
| **Spotify-level** | Content discovery + app shell |
| **Airbnb-level** | Trust + marketplace flows |
| **Apple-level** | Polish |

—not a Frankenstein copy of all five.

---

## Example: Spotify benchmark table

| Area | Expected |
|------|----------|
| Navigation | Multi-level |
| Search | Full search experience |
| Home | Personalized discovery |
| Library | Albums, artists, playlists, podcasts |
| Player | Persistent **global** player (subordinate visually) |
| Queue | Dedicated interaction |
| Artist | Full artist experience |
| Album | Full album experience |
| Playlist | Full playlist management |
| Mobile | Different responsive composition |
| States | Loading / empty / error / offline |

Full dossier: `docs/reference/spotify/PRODUCT-BENCHMARK.md`

---

## Property platform benchmarks (example)

Do **not:** “Build African Mubawab.”

**Do:** benchmark quality bars — then **original** African property infrastructure:

| Reference | Learn |
|-----------|--------|
| Mubawab | Property discovery |
| Airbnb | Booking UX |
| Zillow | Property intelligence |
| Stripe | Financial UX clarity |
| Uber | Real-time status |
| Shopify | Merchant/admin OS |
| Notion | Information organization |

Spec: `docs/product/KEBU-PROPERTY-INFRASTRUCTURE.md` — original product, reference **quality** only.

---

## Build order: vertical slices (not horizontal layers)

**Bad:**

```
Entire frontend → entire backend → connect (empty shell)
```

**Good (example pattern):**

```
Slice 1: Home → real Supabase → album → artist → play → persistent player
Slice 2: Search → DB → results → play
Slice 3: Library → save → refresh → persists
```

Each slice = **real product functionality** end-to-end. See master engineering instruction.

---

## Design QA loop (mandatory — do not accept “looks good”)

After implementation:

1. **Open the running application**  
2. Inspect **every implemented screen** visually  
3. Compare to **approved design spec** + references  
4. Identify deficiencies: spacing · typography · hierarchy · density · alignment · navigation · proportions · component consistency · responsiveness · interaction feedback · polish  
5. **Fix** deficiencies  
6. **Reinspect**  
7. Repeat until screen meets **Design Quality Standard** — `docs/product/KEBU-DESIGN-QUALITY-STANDARD.md`

**If it looks AI-generated or MVP-ish, it failed.**

---

## NO “MVP-looking” UI

**Do not use MVP aesthetics** unless the user explicitly requests an MVP.

Early implementation must still use **final design language**: spacing system · typography · navigation patterns · component architecture · interaction quality.

> **Implement fewer complete features rather than many superficial features.**

**8 phenomenal screens that work** > **47 screens with fake buttons and cards.**

---

## Development formula (canonical)

```
Reference product(s)
    ↓
Decompose entire product (Architect Phase — no code)
    ↓
Define OUR version (original identity)
    ↓
Design system + screen specifications
    ↓
Data architecture (Supabase + RLS + migrations)
    ↓
Vertical feature slices (one at a time)
    ↓
Real backend + persistence + auth
    ↓
Visual QA loop
    ↓
Functional QA + adversarial audit
    ↓
Regression tests
    ↓
Only then → next feature
```

If dependency slice broken → **STOP and repair** before continuing.

---

## Cursor first prompt (paste)

```
STOP. DO NOT WRITE APPLICATION CODE.

You are the Product Architect. Reverse-engineer the product category into a complete specification.

Output: IA, navigation, screen inventory, journeys, features, interactions, components, data model, state, permissions, all UI states, responsive/keyboard, backend, integrations, tests.

Use reference dossiers in docs/reference/ — do not assume product knowledge from names alone.

Do not simplify into a prototype. Do not substitute visual approximation for functionality.

Product density = professional app, not landing page.

When blueprint is approved, build ONE vertical slice end-to-end with Supabase. Then Design QA. Then next slice.

No MVP-looking UI. Fewer complete features > many fake screens.
```

Then assign the specific product + slice.

---

## Related

- Master engineering: `docs/product/KEBU-MASTER-ENGINEERING-INSTRUCTION.md`  
- Builder: `docs/product/KEBU-BUILDER-NEXT-GEN.md` · `docs/product/CURSOR-BUILDER-INSTRUCTION.md`  
- Template Intelligence: `docs/product/KEBU-TEMPLATE-INTELLIGENCE.md`  
- Design quality: `docs/product/KEBU-DESIGN-QUALITY-STANDARD.md`  
- Reference dossiers: `docs/reference/REFERENCE-DOSSIER-FORMAT.md`  
- Status: `docs/IMPLEMENTATION_STATUS.md`
