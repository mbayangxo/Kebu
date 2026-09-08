# Kebu — Master Constitution (human reference)

Full product law for Kebu (Africa’s productivity, commerce, discovery, and opportunity cloud — Phase One focus).

Agent-enforced copies live in `.cursor/rules/`:

- `kebu-constitution.mdc` — mission, DoD, phases, prohibitions
- `kebu-rect-ecosystem.mdc` — Kebu build/operate · RECT culture · Reach connector
- `kebu-global-access.mdc` — Build for everyone; Empower Africans with more
- `kebu-master-engineering.mdc` — full-stack Supabase contract; build→audit→repair loop
- `kebu-builder-next-gen.mdc` — not a Shopify clone; business OS framing; AI agent; Africa-native; bug standard
- `kebu-ecosystem.mdc` — youth audience, Phase One vs future products, UX/affordability/mobile
- `kebu-vertical-slice.mdc` / `kebu-single-slice.mdc` — one slice at a time
- `kebu-id.mdc` — Kebu ID = business identity
- `kebu-ka-score.mdc` — Kebu Score / KA Score = business readiness/performance
- `kebu-core-architecture.mdc` — Kebu as African productivity cloud; modules under one umbrella
- `kebu-opportunity-os.mdc` — Kebu Opportunity OS (for-you inside Kebu)
- `kebu-search.mdc` — Kebu Search = real crawl/index/rank engine; AI on top; never chat-as-search
- `kebu-no-watching.mdc` — brand principle: learn by building, not lecture courses

- `kebu-product-architect.mdc` — decompose before code; no simplified prototypes
- `kebu-no-fake-functionality.mdc` — no dead buttons / fake AI / placeholder-as-real
- `kebu-component-reuse.mdc` · `kebu-do-not-degrade.mdc` · `kebu-ambiguity.mdc`
- `kebu-ci-gate.mdc` — CI gate chain; nothing built until npm run ci passes

**Authoritative product process:** `docs/product/PRODUCT_RULES.md` · DoD · Quality gate · Design system.

Long-form ecosystem map (future products = compatibility only): `docs/KEBU-ECOSYSTEM.md`.

Umbrella architecture: `docs/KEBU-CORE-PRODUCT-ARCHITECTURE.md`.

Maps + infrastructure sovereignty: `docs/KEBU-MAPS-AND-INFRASTRUCTURE.md`.

Builder product requirements (Cursor framing): `docs/product/KEBU-BUILDER-NEXT-GEN.md`.

Opportunity OS (standalone): `docs/OPPORTUNITY-OS-MASTER-SPEC.md` · Kebu Opportunity OS: `docs/KEBU-OPPORTUNITY-OS.md`.

## Naming

| Concept | Meaning |
|--------|---------|
| **Kebu** | Umbrella — Africa’s productivity, commerce, discovery, and opportunity cloud |
| **Kebu Account** | One login — **one identity** for Search, Mail, Builder, Cloud, Business (not separate product accounts) |
| **Personal Kebu** | Free entry layer on the account — email, Search, profile, personal tools |
| **Business Kebu** | Entity workspace (Kebu ID) — Create a Business; team; business mail |
| **Kebu ID** | Which business this is |
| **Kebu Score / KA Score** | How that business is developing |
| **Opportunity OS** | Standalone economic intelligence platform (**explore**) |
| **Kebu Opportunity OS** | Kebu feature: personalized matching (**for you**) |
| **Kebu Maps** | Practical navigation first, then African geographic/economic intelligence |
| **Yande** | Kebu AI (assistant); **Yande Code** builds onto the Kebu stack later |

**Pricing (Builder + Shop):** Free $0 · Starter $2 · **Shop $5 (hero)** · Business $10 · Pro $20 · Student $1. Personal Kebu FREE. Spec: `docs/product/KEBU-PRICING.md`. Do **not** anchor on $29+/mo Shopify-style pricing for youth.

**Do not merge Opportunity OS with Kebu Opportunity OS or Website Builder.** **Do not** ship empty Maps or claim African DC ownership before it exists.

## Global platform vs African empowerment

**Build for everyone. Empower Africans with more.**

Kebu is **globally accessible technology infrastructure** — African-built, **not** an “Africans-only internet.” Anyone may use public Kebu products when live.

**Kebu Opportunity OS** adds an **Africa-focused intelligence layer** for **verified Africans** — to close the opportunity gap. That is **more for eligible users**, not **less for the world**.

Full philosophy: `docs/product/KEBU-GLOBAL-ACCESS-PHILOSOPHY.md`

One Kebu account → **Access Entitlements** (e.g. `african_opportunity_access: verified`, UX: **African Access: Verified**) — verify once, check server-side on Opportunity OS routes. **Kebu Search stays open globally.**

Full matrix: `docs/KEBU-CORE-PRODUCT-ARCHITECTURE.md` § Global platform, African intelligence layer.

## Builder (next-generation OS — not a clone)

Do **not** tell Cursor to “build a Shopify clone” — that produces Shopify with different colors.

Instruct: build a **new-generation African commerce + website creation operating system** that **exceeds** Shopify, Wix, Squarespace, and current AI builders **in the areas that matter to Kebu users**. Those platforms already combine AI generation, visual editing, ecommerce, marketing, analytics, inventory, SEO, and multichannel selling — Kebu must go **beyond** reassembling the same set.

**Merchant UX:** different **pages and workspaces** — running a **business** (Kebu Business IA), not only editing a webpage. Nav items only when real. AI as iterative **agent**. Africa-native commerce via adapters. Bugs: discover, reproduce, root-cause fix, regress — never ignore; never claim zero bugs.

Spec: `docs/product/KEBU-BUILDER-NEXT-GEN.md` · rule: `kebu-builder-next-gen.mdc`.

## Kebu Search (foundational product)

**Not:** Search → ChatGPT answer.

**Yes:** Web crawlers / collection → **index** → **rank** → search engine → Kebu Search → optional **AI layer with citations**.

AI sits **on top of** search, **never instead of** search. **Kebu Search stays open globally.**

Spec: `docs/product/KEBU-SEARCH.md` · rule: `kebu-search.mdc`.

## No watching (brand principle)

**No watching** = learn by **actually building** inside Kebu (sites, stores, businesses, research) — **not** traditional programming courses or lecture LMS.

Spec: `docs/product/KEBU-NO-WATCHING.md` · rule: `kebu-no-watching.mdc`.

## Opportunity OS slice order

**Opportunity OS** (standalone explore): `docs/OPPORTUNITY-OS-MASTER-SPEC.md`. **Kebu Opportunity OS** (for-you): `docs/KEBU-OPPORTUNITY-OS.md`. Integrate via APIs only.

1 Country Explorer → 2 Opportunity Card → 3 Discovery Engine → 4 Trade → 5 Import Replacement → 6 Value Addition / Leakage → 7 Build-It-Here → 8 Research Lab → 9 Think Labs → …

Early path also: Country → Industry → Resource → Import → Export → Opportunity Explorer → Stories → Case studies → Opportunity AI → Build This

Never present AI as verified fact. Static-only pages are not complete slices. Keep **explore** vs **for you** layers; do not dump Opportunity OS into Builder nav.

## Build order (platform)

Kebu ID → real activity → analytics → Kebu Score when assigned · Opportunity Country Explorer when assigned · later Opportunity slices one at a time.

**Do not build** Kebu Cloud, Studio, Docs, Learn, Labs, Ventures, or a social/talent feed unless that slice is explicitly assigned.

## Slice docs

- `docs/KEBU-ID-SLICE-1.md`
- `docs/BUSINESS-REGISTRATION-SLICE-1.md`
- `docs/WEBSITE-BUILDER-SLICE.md`
- `docs/KEBU-CORE-PRODUCT-ARCHITECTURE.md`
- `docs/KEBU-MAPS-AND-INFRASTRUCTURE.md`
- `docs/OPPORTUNITY-OS-MASTER-SPEC.md`
- `docs/OPPORTUNITY-COUNTRY-EXPLORER.md`
- `docs/KEBU-ECOSYSTEM.md`
- `docs/product/KEBU-PROPERTY-INFRASTRUCTURE.md`
- `docs/product/KEBU-RECT-ECOSYSTEM.md`
- `docs/product/KEBU-ECONOMIC-DISCOVERY.md`
- `docs/product/KEBU-UNIFIED-ACCOUNT.md`
- `docs/product/KEBU-ACCOUNT-MODEL.md`
- `docs/product/KEBU-BUILDER-NEXT-GEN.md`
- `docs/product/KEBU-GLOBAL-ACCESS-PHILOSOPHY.md`
- `docs/product/KEBU-MASTER-ENGINEERING-INSTRUCTION.md`
- `docs/product/ENGINEERING-MANDATE.md`
