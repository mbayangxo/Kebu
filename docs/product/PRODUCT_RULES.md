# Kebu — Product Rules (authoritative)

**Read this before modifying the application.**  
Do not make implementation decisions that contradict this document.

**Agent rules:** `.cursor/rules/kebu-product-architect.mdc` · `kebu-no-fake-functionality.mdc` · `kebu-master-engineering.mdc`  
**Process:** `docs/product/KEBU-PRODUCT-ARCHITECT-PHASE.md` · **DoD:** `docs/product/DEFINITION_OF_DONE.md`

---

## Core mindset

> **Do not optimize for producing code quickly. Optimize for producing a correct, polished, maintainable product.**

> **Do not confuse visual completeness with functional completeness.**

> **The standard is not “does this technically work?” The standard is “would a demanding user perceive this as a professionally built product?”**

---

## The instruction failure (why “Build Canva” fails)

**Wrong:** “Build Canva.”  
→ AI hears a **category** → produces Canva-**ish** (textarea + triangle).

**Right:** “We are building a **production-grade** [our product]. Canva is a **reference for product quality, interaction sophistication, and workflow completeness** — not a template to copy.”  
→ Then describe **our actual product** with five specifications (below).

**One giant prompt cannot build a complex app.** Manage Cursor like a product + engineering team: spec first → one vertical slice → quality gate → next slice.

---

## Five specifications (required before major work)

| # | Spec | Document |
|---|------|----------|
| 1 | **Product** — what the application does | Product docs + slice specs · `docs/product/KEBU-BUILDER-NEXT-GEN.md` etc. |
| 2 | **Visual** — how it looks | `docs/product/DESIGN_SYSTEM.md` · `docs/product/KEBU-DESIGN-QUALITY-STANDARD.md` |
| 3 | **Interaction** — how it responds | `docs/product/UX_SPECIFICATION.md` · `docs/screens/*` |
| 4 | **Engineering** — code/backend | `docs/product/KEBU-MASTER-ENGINEERING-INSTRUCTION.md` · `docs/ARCHITECTURE.md` |
| 5 | **Completion** — what “finished” means | `docs/product/DEFINITION_OF_DONE.md` · `docs/product/QUALITY_GATE.md` |

---

## Product quality standard

This is a **production-grade application** — not a prototype, mockup, demo, concept, or UI shell.

Quality bar: interaction sophistication comparable to leading consumer software (**Canva, Spotify, Airbnb, Notion, Figma** — as **quality references**, not clones).

This means:

- Polished visual hierarchy · excellent typography · responsive layouts · intentional spacing  
- Sophisticated navigation · fast interactions  
- Useful **empty** · meaningful **loading** · graceful **error** states  
- Keyboard accessibility · mobile responsiveness · smooth transitions · persistent state  
- **Real** backend · authentication · database persistence · validation · error handling · permissions  
- **No fake functionality**

**Production-grade ≠ attractive UI only.** A feature is incomplete unless its **entire functional path** works.

See also: `docs/product/KEBU-DESIGN-QUALITY-STANDARD.md` · **No MVP-looking UI** unless explicitly requested.

---

## Reference products (quality, not clone)

Say **“Canva-level creative tooling”** — not **“build Canva.”**

Analyze publicly observable IA, interaction patterns, hierarchy, workflow depth.  
**Do not copy** branding, proprietary assets, or source code.

Dossiers: `docs/reference/{shopify,spotify,canva}/PRODUCT-BENCHMARK.md`  
Screenshots: `docs/reference/` — **required** for sophisticated UX work.

Assign references by role: *“Image A = navigation density · Image B = typography · Image C = card behavior.”*

---

## Stage A — Design before implementation

**Do not** have Cursor simultaneously invent product + UX + visual design + architecture + database + code in one pass.

**Stage A (no code):** Product Architect Phase — IA, navigation, screen inventory, journeys, components, interaction model, responsive behavior, state model.

**Stage B:** Per-screen specifications — `docs/screens/SCREEN_SPEC_TEMPLATE.md`

**Stage C:** Implement **one screen/slice** exactly per spec. **Do not simplify the interaction model.**

Full process: `docs/product/KEBU-PRODUCT-ARCHITECT-PHASE.md`

---

## NO fake functionality (“no bullshit” rule)

**Never create a visual representation of functionality that does not exist.**

If a button says **Generate with AI**, it must run the full pipeline — not open “Coming soon.”

**Forbidden in production paths:**

- Fake search · fake upload · fake payment · fake dashboard statistics  
- Fake AI generation · fake notifications · fake profiles · fake filters  
- Dead buttons · placeholder cards presented as real content  

During development, mocks are acceptable **only when explicitly labeled** as development fixtures.

Implement the feature **or** do not present it as complete. Mark **NOT IMPLEMENTED** honestly.

Rule: `.cursor/rules/kebu-no-fake-functionality.mdc`

---

## Design system (not “make it beautiful”)

“Modern” is subjective. Use **measurable tokens** — `docs/product/DESIGN_SYSTEM.md`:

Typography roles · spacing scale · radius · motion durations · interaction states (hover, pressed, focus, disabled).

**Build or reuse a component library** before sprouting one-off screens. Search repo before creating new components.

---

## Vertical slices (not 40 frontend pages)

Example pattern (design platform):

1. Create project → editor → add text → save → reload → text remains  
2. Upload image → Storage → canvas → save → reload  
3. AI generation → backend → asset → canvas → persistence → history  
4. Export → **actual file**

Each slice **finished** (DoD + quality gate) before the next.

---

## AI features — same standard

**Forbidden:** `[ Generate ]` → “Your design is ready!” with no work done.

**Required chain:**

```
Prompt → validation → AI request → loading/progress → result → asset storage
→ canvas/project insertion → persistence → history (where applicable)
```

---

## When NOT to code

If requirements are **ambiguous**, do not silently invent major product decisions (navigation, pricing, data models, workflows, UI behavior).

Identify ambiguity · propose the **smallest** set of reasonable options · wait for direction **or** document the decision in `docs/decisions/`.

Rule: `.cursor/rules/kebu-ambiguity.mdc`

---

## Do not degrade

Never fix one feature by breaking another. Before modifying **shared** components, identify dependent screens and verify them after the change.

Rule: `.cursor/rules/kebu-do-not-degrade.mdc`

---

## Quality gate (after every feature)

Do **not** declare complete until passing `docs/product/QUALITY_GATE.md`:

- **Visual audit** — spacing, typography, states, mobile, no placeholder UI  
- **Functional audit** — buttons work, persist, refresh, failure paths, auth  
- **Engineering audit** — TS, lint, console, RLS, security, duplicates  

Then: **inspect running app** → list discrepancies vs spec → fix → reinspect.

---

## Definition of Done

Full checklist: `docs/product/DEFINITION_OF_DONE.md`

A feature is **NOT DONE** until UI + all states + auth + persistence + RLS + tests + visual QA + no fake functionality.

---

## Bugs

Discover → reproduce → root cause → fix → regression test.  
Never hide errors to make UI look functional.  
Protocol: `docs/product/BUG_PROTOCOL.md`

---

## Persistent project brain (doc map)

```
AGENTS.md                          ← agent entry (strict)
docs/product/PRODUCT_RULES.md      ← this file (authoritative)
docs/product/DEFINITION_OF_DONE.md
docs/product/QUALITY_GATE.md
docs/product/DESIGN_SYSTEM.md
docs/product/UX_SPECIFICATION.md
docs/product/KEBU-MASTER-ENGINEERING-INSTRUCTION.md
docs/ARCHITECTURE.md
docs/product/BUG_PROTOCOL.md
docs/product/TESTING.md
docs/IMPLEMENTATION_STATUS.md
docs/ROADMAP.md
docs/screens/                      ← per-screen specs
docs/user-flows/                   ← journey diagrams
docs/decisions/                    ← ADRs
docs/reference/                    ← benchmark dossiers + screenshots
docs/CI_PIPELINE.md
docs/DEPLOYMENT.md
docs/ENGINEERING_HEALTH.md
docs/FOLDER_STRUCTURE.md
docs/FEATURES.md
docs/COUNTRY_EXPANSION.md
```

---

## CI & “built” definition

**Nothing is built** until full E2E path + **`npm run ci`** passes.

Gate chain: `docs/CI_PIPELINE.md` · Deploy: `docs/DEPLOYMENT.md`

Bug Sentinel (future): `docs/ENGINEERING_HEALTH.md`

---

## Cursor session opener (paste)

```
Read docs/product/PRODUCT_RULES.md and docs/IMPLEMENTATION_STATUS.md before any change.

We are building [OUR PRODUCT]. [Canva/Shopify/Spotify] is a QUALITY REFERENCE — not a template.

Stage A: blueprint per KEBU-PRODUCT-ARCHITECT-PHASE.md — NO CODE until approved.
Stage B: implement ONE vertical slice per screen spec — full Supabase path.
Stage C: Quality gate + inspect running app + fix discrepancies.

No fake functionality. No MVP aesthetics. No silent simplification.
```
