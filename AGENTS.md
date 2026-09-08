<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Kebu

**Authoritative product law:** `docs/product/PRODUCT_RULES.md` — read before modifying the application.

## Core instruction (strict)

- **Do not optimize for producing code quickly.** Optimize for a **correct, polished, maintainable** product.
- **Do not confuse visual completeness with functional completeness.**
- **Do not create placeholders where real functionality is required.**
- **Do not silently simplify requirements.**
- **Do not move past a broken feature** — stop and repair dependencies first.
- When something fails: root cause → fix → regression test (`docs/product/BUG_PROTOCOL.md`).
- Before any feature is complete: verify from the **user’s perspective in the running application** (`docs/product/QUALITY_GATE.md`).
- **Standard:** Would a demanding user perceive this as a **professionally built product**?

Production African productivity / commerce / discovery / opportunity cloud (Phase One focus). Follow `.cursor/rules/` (**product architect**, **no fake functionality**, master engineering, constitution, core architecture, ecosystem, builder next-gen, vertical-slice, Kebu ID, Kebu Score, Opportunity OS).

## Five specifications (major work)

1. **Product** — `docs/product/PRODUCT_RULES.md` + area specs  
2. **Visual** — `docs/product/DESIGN_SYSTEM.md`  
3. **Interaction** — `docs/product/UX_SPECIFICATION.md` · `docs/screens/`  
4. **Engineering** — `docs/product/KEBU-MASTER-ENGINEERING-INSTRUCTION.md`  
5. **Completion** — `docs/product/DEFINITION_OF_DONE.md` · `docs/product/QUALITY_GATE.md`

**Never say “Build Canva/Shopify/Spotify.”** Say **“[Our product] at Canva-level quality”** — reference dossiers in `docs/reference/`, not category nouns.

- **Thesis:** Africa’s productivity cloud under one **Kebu** umbrella — **Build for everyone. Empower Africans with more.** Not an African Shopify clone. Architecture: `docs/KEBU-CORE-PRODUCT-ARCHITECTURE.md` · Global access: `docs/product/KEBU-GLOBAL-ACCESS-PHILOSOPHY.md`. Maps + sovereignty: `docs/KEBU-MAPS-AND-INFRASTRUCTURE.md`.
- **Yande** = Kebu AI; Maps = practical navigation first, then African intelligence layers.
- **Framing:** next-gen **African commerce + website OS** — `docs/product/KEBU-BUILDER-NEXT-GEN.md` · **Product thinking (not visual clone):** `docs/product/KEBU-BUILDER-PRODUCT-THINKING.md` · **Template Intelligence:** `docs/product/KEBU-TEMPLATE-INTELLIGENCE.md` · **Design quality:** `docs/product/KEBU-DESIGN-QUALITY-STANDARD.md` · **Cursor paste:** `docs/product/CURSOR-BUILDER-INSTRUCTION.md` · **Reference dossiers + screenshots:** `docs/reference/` (never assume agent knows Shopify/Spotify/Canva from names).
- **Audience:** African youth — plain language, next-action UX, mobile/low-bandwidth reality.
- **Kebu ID** = business identity · **Kebu Score / KA Score** = business score · **One Kebu Account** = **one identity** for Search, Mail, Builder, Cloud, Analytics, Business — not separate product logins. `docs/product/KEBU-UNIFIED-ACCOUNT.md` · Personal + Business: `docs/product/KEBU-ACCOUNT-MODEL.md` · **Opportunity OS** = standalone explore (API-connected) · **Kebu Opportunity OS** = for-you in Kebu — **not** Builder.
- **Pricing:** youth-affordable tiers — Free/$0 · Starter $2 · **Shop $5 (hero)** · Business $10 · Pro $20 · Student $1 — `docs/product/KEBU-PRICING.md`. Personal Kebu FREE. Multi-revenue beyond subscription; capability tiers ≠ punishment for success.
- **Kebu + RECT:** Kebu **builds and operates**; RECT **creates culture** — interlocked via Reach, Search Culture index, Create Store → Builder. **Kebu is not the media company.** `docs/product/KEBU-RECT-ECOSYSTEM.md`
- **Kebu Search** = **economic discovery engine** (not African Google) — real crawl/index/rank; entity/opportunity-centric results; AI on top with citations — **never chat-as-search**. `docs/product/KEBU-SEARCH.md` · `docs/product/KEBU-ECONOMIC-DISCOVERY.md`
- **No watching** = Kebu brand principle — learn by **building**, not lecture courses. Spec: `docs/product/KEBU-NO-WATCHING.md`.
- **Full-stack only** — end-to-end always connected. **Product Architect Phase before code:** `docs/product/KEBU-PRODUCT-ARCHITECT-PHASE.md`. **Master engineering:** `docs/product/KEBU-MASTER-ENGINEERING-INSTRUCTION.md`. Work **one vertical slice** → **Design QA** → **adversarial audit** → repair → next slice.
- **No MVP-looking UI** — final design language even for early slices; **fewer complete features > many fake screens** (see Product Architect Phase).
- **Bugs:** discover → reproduce → root-cause fix → regress; never ignore. **Never hide errors** for a functional-looking UI. **Stop and repair broken dependencies** before stacking new slices.
- **CI gate chain** — `npm run ci` before done: TypeScript → Lint → Tests → Build; **deployment stops on failure** — `docs/CI_PIPELINE.md` · `kebu-ci-gate.mdc`
- **Nothing “built”** until UI + logic + DB + auth + permissions + errors + backend tested E2E — `docs/product/DEFINITION_OF_DONE.md`

- **Status before coding:** read `docs/IMPLEMENTATION_STATUS.md`; update it when a slice reaches IMPLEMENTED / TESTED.

Human constitution: `docs/KEBU-CONSTITUTION.md` · Architecture: `docs/KEBU-CORE-PRODUCT-ARCHITECTURE.md` · **CI:** `docs/CI_PIPELINE.md` · **Deploy:** `docs/DEPLOYMENT.md` · **Folder structure:** `docs/FOLDER_STRUCTURE.md` · **Kebu + RECT:** `docs/product/KEBU-RECT-ECOSYSTEM.md` · **Economic discovery:** `docs/product/KEBU-ECONOMIC-DISCOVERY.md` · **Unified account:** `docs/product/KEBU-UNIFIED-ACCOUNT.md` · **Account model:** `docs/product/KEBU-ACCOUNT-MODEL.md` · **Kebu Mail:** `docs/product/KEBU-MAIL.md` (NOT STARTED — real email, provider abstraction) · **Pricing:** `docs/product/KEBU-PRICING.md` · Studio: `docs/product/KEBU-STUDIO.md` · Maps/infra: `docs/KEBU-MAPS-AND-INFRASTRUCTURE.md` · Ecosystem: `docs/KEBU-ECOSYSTEM.md` · Builder: `docs/product/KEBU-BUILDER-NEXT-GEN.md` · Search: `docs/product/KEBU-SEARCH.md` · **No watching:** `docs/product/KEBU-NO-WATCHING.md` · Opportunity OS: `docs/OPPORTUNITY-OS-MASTER-SPEC.md` · Kebu Opportunity OS: `docs/KEBU-OPPORTUNITY-OS.md` · **Live status:** `docs/IMPLEMENTATION_STATUS.md`
