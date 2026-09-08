# Kebu Builder — next-generation requirements

## How to frame this for Cursor (mandatory)

**Wrong instruction (produces a clone):**

> “Build a Shopify clone.” / “Build like Wix but for Africa.”

That yields the same product with different colors — AI site gen + visual editor + store + marketing dashboard in one generic shell.

**Correct instruction:**

> Build a **new-generation African commerce + website creation operating system** that **exceeds** Shopify, Wix, Squarespace, and current AI builders **in the areas that matter to Kebu users** — while remaining globally usable.

**Why “feature parity” is not enough:** Incumbent platforms already combine AI site generation, visual editing, ecommerce, marketing, analytics, inventory, SEO, and multichannel selling. Kebu must go **beyond assembling the same checklist**. Win on:

| Dimension | Kebu must exceed |
|-----------|------------------|
| **Product shape** | **Kebu Business** workspaces — merchant **runs a business**, not only edits a webpage |
| **AI** | **Agent** that iterates on brand, layout, copy, conversion — not “generate site → done” |
| **Intelligence** | **WHAT HAPPENED → WHY → ACT** — not dashboards alone (Shopify is adding AI insights; Kebu makes action central) |
| **Commerce** | **Africa-native adapters** (mobile money, WhatsApp, COD, cross-border) — not one-country PSP hard-code |
| **Opportunity** | **Kebu Opportunity OS** + growth handoffs — not generic “business tips” |
| **Design** | **Design worlds** + creative studio editor — not Modern Store 1/2/3 templates |
| **Engineering** | **End-to-end only** — no fake buttons, dead nav, or mock analytics |

Competitors = **maturity references** via **reference dossiers** + screenshots (`docs/reference/`) — **not** assumed knowledge from the product name.

**Template Intelligence:** `docs/product/KEBU-TEMPLATE-INTELLIGENCE.md` · **Design quality:** `docs/product/KEBU-DESIGN-QUALITY-STANDARD.md` · **Product thinking (references, AI pipeline):** `docs/product/KEBU-BUILDER-PRODUCT-THINKING.md` · **Cursor paste:** `docs/product/CURSOR-BUILDER-INSTRUCTION.md`

The goal is not “more toggles than Shopify.” The goal is to make **creating → launching → operating → understanding → marketing → growing** a business dramatically easier, without forcing users to stitch unrelated tools together.

Full engineering contract: `docs/product/ENGINEERING-MANDATE.md` · Ecosystem map: `docs/KEBU-ECOSYSTEM.md` · Live status: `docs/IMPLEMENTATION_STATUS.md`.

Agent rule: `.cursor/rules/kebu-builder-next-gen.mdc`.

---

## Core journey (connected, not bolted-on)

```
IDEA → BRAND → WEBSITE → STORE → DOMAIN → EMAIL → PRODUCTS → CHECKOUT
→ CUSTOMERS → MARKETING → ANALYTICS → BUSINESS INTELLIGENCE → GROWTH → EXPANSION
```

Merchant should feel they are **running a business**, not only editing a webpage. **Different pages and different workspaces** are correct — the website editor is one workspace inside **Kebu Business** (`/my-sites/[id]`, Shop, Analytics, Growth, …). **Only expose a nav item when its underlying functionality exists.** Dead nav is prohibited.

### Product areas (17 — compatibility map)

Build as **separate but connected** workspaces. Link only when live; otherwise label **NOT IMPLEMENTED**.

| # | Area | Role |
|---|------|------|
| 1 | **Home** | Merchant hub for this site/business (`/my-sites/[id]`) |
| 2 | **Website** | Multi-page editor, sections, design system, SEO |
| 3 | **AI Builder** | Create/redesign from description, brand, reference — structured output only |
| 4 | **Shop** | Storefront admin hub |
| 5 | **Products** | Catalog, variants, inventory |
| 6 | **Orders** | Fulfillment, refunds architecture |
| 7 | **Customers** | Profiles, history, messaging |
| 8 | **Marketing** | Email, social, Reach, affiliates, promotions |
| 9 | **Analytics** | Real events → traffic, sales, conversion |
| 10 | **Business intelligence** | WHAT HAPPENED → WHY → WHAT TO DO NEXT |
| 11 | **Growth** | Kebu Opportunity OS handoffs (markets, expansion) — API boundary |
| 12 | **Domains** | Connect, DNS, verify |
| 13 | **Email** | Business mail on verified domains — Kebu Mail |
| 14 | **Kebu Studio** | Creatives → Product → Website → campaigns |
| 15 | **Kebu Cloud** | App deploy/hosting — future product |
| 16 | **Team** | Kebu ID roles and invites |
| 17 | **Settings** | Themes, aesthetics, site config |

### Kebu Business — merchant OS map (canonical IA)

```
KEBU BUSINESS
│
├── Home
│
├── Website
│   ├── Overview
│   ├── Pages
│   ├── Navigation
│   ├── Design System
│   ├── Sections
│   ├── Media
│   ├── SEO
│   ├── Forms
│   └── Settings
│
├── AI Builder
│   ├── Create from idea
│   ├── Create from photos
│   ├── Redesign
│   ├── Add section
│   ├── Change style
│   ├── Rewrite copy
│   └── Optimize page
│
├── Shop
│   ├── Overview
│   ├── Products
│   ├── Collections
│   ├── Inventory
│   ├── Orders
│   ├── Customers
│   ├── Discounts
│   ├── Gift cards
│   ├── Subscriptions
│   ├── Reviews
│   └── Checkout
│
├── Marketing
│   ├── Campaigns
│   ├── Email
│   ├── Social
│   ├── Kebu Reach
│   ├── Affiliates
│   ├── Creator campaigns
│   └── Promotions
│
├── Analytics
│   ├── Overview
│   ├── Sales
│   ├── Customers
│   ├── Products
│   ├── Traffic
│   ├── Conversion
│   ├── Retention
│   ├── Profitability
│   └── AI Insights
│
├── Business
│   ├── Kebu ID
│   ├── Kebu Score
│   ├── Team
│   ├── Documents
│   ├── Business profile
│   └── Opportunities
│
├── Growth
│   ├── Market opportunities
│   ├── New African markets
│   ├── Export opportunities
│   ├── Competitors
│   └── Recommendations
│
├── Domains
├── Email
└── Cloud
```

**Code:** `lib/navigation/kebu-business-nav.ts` · **UI:** `KebuBusinessNavTree` on `/my-sites/[id]`.

Link only **live** and **partial** destinations. Show **Soon** for not-implemented items — never dead global nav.

### Target business OS map (legacy summary)

Future areas (Studio, Cloud, Reach, Mail, Search, …) stay **compatibility only** until assigned. Mark **NOT IMPLEMENTED** — never fake.

---

## Website editor — must be exceptional (not generic 3-panel SaaS)

The merchant **business OS** (`/my-sites/[id]`, Shop, Analytics) is separate from the **website editor**. The editor must not feel like “left sidebar + canvas + right sidebar” alone.

**Target interaction:**

| Layer | Role |
|-------|------|
| **Center** | Full-bleed live site — the product |
| **Left rail** | Pages + section tree (structure) |
| **Right / contextual** | Design system + section controls on canvas click |
| **Bottom command bar** | **Ask your site** — agent edits without burying AI in a side panel |
| **Floating chrome** | Publish, device, undo — minimal on flagship design worlds |

Hybrid loop always: **AI → manual → AI → manual**. Never force drag-only or prompt-only.

**Five creation modes** (`/create/new`):

| Mode | Status |
|------|--------|
| **AI** | Live — describe business; structured draft |
| **Template** | Live — design worlds; fully transformable |
| **Blank** | Live — empty canvas |
| **Import** | NOT IMPLEMENTED — URL → editable `website-v1` |
| **Code** | NOT IMPLEMENTED — dev extensions alongside schema |

Serve a **17-year-old beginner** and a **professional developer** on the same stack.

---

## AI = agent, not generator

Wrong: Generate website → done.

Right: continuous iteration on the **same project**:

- “Make the homepage feel more expensive.”
- “Move the product collection higher.”
- “Make mobile feel completely different from desktop.”
- “Checkout conversion dropped — figure out why.” → reads analytics → “Create a campaign to fix it.”

**Change preview before apply** is the target UX (in progress). Today: Yande applies structured schema edits via `/api/projects/[id]/ai-improve`; user publishes when live should update.

**Kebu Business Copilot** (shop + site + Kebu ID, authorized only): ask how the business is doing → prioritized actions → user confirms → Kebu executes (campaign, discount, localized page, Reach). **Execution slice NOT IMPLEMENTED** — insights + honest ACT placeholders only until assigned.

---

## Business intelligence + Opportunity OS connection

Analytics must answer **what happened → why it matters → what to do next** — not clone Shopify dashboards.

Example intelligence (when data exists):

- Senegal sales +18% · Côte d’Ivoire visitors +43%
- High Abidjan traffic, low purchases → test shipping / localized campaign
- Mobile conversion 2.1× desktop · Product X = 38% revenue · X+Y basket pattern

**ACT** buttons (create CI campaign, translate store, localized landing page, shipping option, Reach) — only when end-to-end; otherwise label **NOT IMPLEMENTED**.

**Kebu Opportunity OS** supplies market/expansion context via API — standalone **Opportunity OS** explore stays separate.

---

## Kebu Studio + brand system

Studio generates brand-aware creatives (social, ads, flyers, email, packaging, lookbook, …). **Brand tokens flow** Studio → Product → Website → Reach. Changing brand colors in Studio should propagate where the brand system is connected (slice-by-slice).

---

## Africa-native commerce + Sell Anywhere

**Country adapters** (not one hard-coded market): mobile money, regional PSPs, COD, WhatsApp, social selling, delivery, pickup, multi-currency, languages, regional tax, cross-border, wholesale, B2B, distributors.

**Native rail (not bolted-on payments):** AfriID + Kebu ID trust → **Joko** default settlement → **ALK** when live; Wave/Orange/M-Pesa/Paystack/Flutterwave as options. Full law: `docs/product/KEBU-AFRICA-COMMERCE-RAILS.md`.

**Sell Anywhere** (`/shop/[projectId]?tab=sell`): one inventory · one order system · one customer record · one analytics — channels include Kebu Store, WhatsApp (partial/live), Search, RECT, social, physical, marketplace, affiliate, external (most **NOT IMPLEMENTED** — architecture page is honest).

---

## Website creation modes

| Mode | Intent |
|------|--------|
| **AI** | Describe the business/site; AI builds **editable structured Kebu schema** (not an HTML blob) |
| **Template** | Professional starting point; user can substantially transform it |
| **Blank** | Full creative control |
| **Import** | Analyze an existing site → reconstruct as editable Kebu project |
| **Code** | Advanced users may use real code where the architecture allows |

Serve the 17-year-old beginner **and** the professional developer.

---

## AI website builder (12 capabilities — structured output only)

When assigned, support:

1. Create from description  
2. Create from uploaded images  
3. Create from brand information  
4. Create from an existing website reference  
5. Redesign an existing Kebu site  
6. Generate pages  
7. Generate sections  
8. Rewrite content  
9. Generate imagery where supported  
10. Optimize layouts  
11. Optimize conversion  
12. Optimize mobile design  

**Mandatory:** AI output becomes **editable Kebu structured data** (`website-v1`) — never an uneditable HTML blob.

---

## Website builder (full surface — build slice-by-slice)

Multi-page sites · reusable sections/components · navigation · headers/footers · responsive layouts · desktop/mobile editing · typography · spacing · colors · backgrounds · gradients · imagery · video · animation · forms · popups · modals · menus · blogs · portfolios · landing pages · custom layouts · SEO · accessibility · performance.

Templates are **starting points** — users must be able to substantially transform them (design worlds, not rigid skins).

---

## Visual editor (non-negotiable)

Select · move · resize · edit text · replace images · change styles · duplicate · delete · reorder sections · undo · redo · preview · save · publish. **Refresh must keep edits** (Supabase persistence).

---

## Shop (commerce — when assigned)

Products · variants · collections · inventory · orders · customers · discounts · gift cards · reviews · subscriptions architecture · digital products architecture · shipping · taxes architecture · checkout · refunds · fulfillment — all Supabase-backed.

---

## African commerce (adapter architecture)

Mobile money · regional payment providers · cards · cash-on-delivery · local delivery · pickup · WhatsApp commerce · multi-currency · regional markets · cross-border · African languages · B2B · wholesale · distributors. **Provider adapters** — never hard-code one country or one PSP.

---

## Analytics (real events only)

Minimum events: `page_view` · `product_view` · `search` · `add_to_cart` · `checkout_started` · `purchase` · `refund` · `signup` · `lead` · `email_click` · `campaign_click`.

Reports: traffic · sales · revenue · conversion · AOV · acquisition · retention · repeat purchases · product performance · cart abandonment · traffic source · device · geography · campaign performance. **No fake analytics.**

---

## Business intelligence + Kebu Business Copilot

Transform analytics into plain-language advice: WHAT HAPPENED → WHY IT MATTERS → WHAT TO DO NEXT.

Copilot (authorized data only): business health · best products · sales changes · promotion ideas · returning customers · growing markets · churn · weekly actions. Destructive or financial actions require confirmation. **No fake copilot.**

---

## Marketing · Studio · Sell anywhere

**Marketing:** email · social · Kebu Reach · creator campaigns · affiliates · promotions · coupons · abandoned-cart recovery · segmentation — architecture first when assigned.

**Studio:** social posts · ads · flyers · presentations · product graphics · banners · email graphics · logos · brand kits · packaging · catalogs · video workflows as architecture allows. Flow: Studio asset → Product → Website → Reach.

**Sell anywhere (architecture):** one catalog/inventory → Kebu website · Search · RECT · social · messaging · retail · marketplaces · affiliates — orders return to **one** central order system.

---

## Domains · Email · Kebu ID

Connect domains · DNS · business email · aliases · team mailboxes · separate personal vs business identity. No secrets in frontend.

One Kebu Account → Personal Kebu + Business Kebu (Kebu ID) + Builder · Shop · Cloud · Search · Mail · Studio · Analytics · **Kebu Opportunity OS** (when entitled). Proper org/membership architecture.

---

## AI = agent, not one-shot generator

**Words → full site is first-class:** describe the business → Yande drafts a **multi-page editable** `website-v1` site → user edits → publish. Hub: `/create/new?mode=ai`.

Not: generate website → done (locked).

Yes: **tell Kebu what to change** after the draft exists.

**Yande roles** (same model, different permissions): Business · Customer · Sales · Marketing · Finance · Research · Code. Spec: `docs/YANDE-AND-BUILDER.md`. Customer Agent is **NOT IMPLEMENTED** until catalog + policies + authz exist — no empty “Add Yande” nav.

**Business Copilot:** real data only; confirmation for money/destructive ops. No fake copilots.

---

## Visual editor bar

Real select / move / resize / text / image / style / duplicate / delete / reorder / undo / redo / preview / save / publish. Changes persist in Supabase; **refresh must keep edits**.

---

## Shop + Africa-native commerce

Full commerce path when assigned: products, variants, collections, inventory, orders, customers, discounts, checkout, refunds, fulfillment, etc. — all in Supabase.

**First-class Africa-native architecture** (country **adapters**, not one-country hard-code):

- mobile money · regional payment providers · cards · COD workflows  
- WhatsApp / social selling · local delivery · pickup  
- multi-currency · African languages · regional tax · cross-border  
- wholesale / B2B / distributors  

**Sell Anywhere (architecture):** one catalog / inventory / customers / orders / analytics across Kebu store, Search, social, messaging, physical, marketplaces, affiliates — when those channels exist.

---

## Analytics → intelligence → act

Real events only (e.g. page_view, product_view, add_to_cart, checkout_started, purchase, …). No fake dashboards.

**Business intelligence:** WHAT HAPPENED → WHY IT MATTERS → WHAT TO DO NEXT (e.g. CI traffic up, mobile converting, promote X+Y, test shipping to Côte d’Ivoire) with **Act** actions when implemented.

**Growth** connects Builder to **Kebu Opportunity OS** via trust-labeled intelligence and API handoffs. **Opportunity OS** (standalone explore) remains a separate product — do not dump empty Opportunity shells into Builder nav.

---

## Studio · Marketing · Domains · Email · ID

- **Studio:** brand kits and creatives that flow into Product → Website → campaigns (future product; basic branding in Builder OK).  
- **Marketing:** email, social, Reach, affiliates, abandoned cart — architecture first when assigned.  
- **Domains / Email:** connect DNS; business mailboxes on verified domains; separate personal vs business identity.  
- **One account:** Personal Kebu + Business Kebu (Kebu ID) + memberships — proper org architecture.

---

## End-to-end + quality

```
UI → state → validation → API → auth → authz → logic → Supabase → response → UI
```

**Never** mark complete because the frontend looks finished.

**Forbidden:** placeholder dashboards, fake analytics/buttons, dead nav, mock production data, disconnected APIs, fake AI/checkout/publish.

**If not built:** label **NOT IMPLEMENTED**.

---

## Bug standard (honest)

Do **not** claim “zero bugs.” Software always has defects.

**Required practice:** actively discover → reproduce → fix at the **root cause** (FE → API → BE → DB → external) → add regression coverage when practical → do not ignore or paper over failures.

---

## Development method

One vertical slice at a time. Example order of *completeness*, not parallel shells:

1. Template → edit → save → refresh → preview → publish → public URL  
2. AI create → edit → save → publish  
3. Product → cart → checkout → order → merchant view  
4. Analytics event → store → report → insight  

Inspect the repo first. Do not rewrite working paths unnecessarily. Read `docs/IMPLEMENTATION_STATUS.md` before coding.

---

## Final standard

Kebu should not merely be cheaper than Shopify. Aim to be:

**simpler** for beginners · **more powerful** for advanced users · **more AI-native** · **more creative** · **more business-intelligent** · **more Africa-native** · **more connected** · **more affordable** · **more privacy-conscious**

Do not compromise engineering quality to achieve low pricing. Build excellent software first.

---

## Product maturity references (not clones)

Shopify, Wix, Squarespace, Canva, Spotify, and Figma are **reference points for product maturity** — section trees, contextual controls, discovery UX, density — **not** implementation templates.

**Do not assume** an agent knows current Shopify/Spotify/Canva from the product name. For important UX, add annotated screenshots to `docs/reference/` (see `docs/reference/README.md`). **Paste block for Cursor:** `docs/product/CURSOR-BUILDER-INSTRUCTION.md`.

**Can Cursor see Shopify/Spotify automatically?** **No** — not reliably. Provide screenshots, recordings, annotated references, and public doc URLs.

**Promise:** *Describe the business. Get a beautiful, functioning business online. Then keep building it with AI.*

---

## First screen — “What are you building?”

Do **not** dump new users into a settings dashboard.

1. **What are you building?** — conversational brief (business type, audience, positioning, culture, commerce, booking, etc.)
2. **Business architecture** — proposed IA (Home, Shop, Collections, Story, Appointments, …) shown to the user **before** paint
3. **Creative direction** — named design world + typography, photography, color, spacing, motion, product presentation
4. **Preview site** — polished multi-page result, not “hero + three boxes + footer”

### Example brief (luxury fashion — Ndeye)

> “I own a luxury Senegalese fashion brand called Ndeye. Handmade dresses and accessories. Editorial, expensive, feminine, distinctly West African without looking stereotypical. Shop collections, our story, book private appointments.”

**Extracted model:** business type fashion · positioning luxury · audience women · personality editorial/feminine/sophisticated · culture Senegalese/West African · commerce yes · appointments yes.

**Proposed IA (shown before paint):** Home · Shop (New Arrivals, Dresses, Accessories) · Collections · Our Story · Appointments · Contact · Cart.

**Creative direction:** Editorial Atelier — typography, photography, color system, spacing, buttons, product presentation, animation.

---

## AI pipeline (mandatory — not prompt → JSX)

Wrong:

```
Prompt → generate JSX → make it look reasonable
```

Right:

```
Prompt
  → understand business + audience + conversion goals
  → information architecture
  → design direction (design world)
  → component selection from approved Kebu schema
  → content structure + pages
  → commerce / booking / business hooks
  → render
  → critique + improve loop
  → persist structured website-v1
  → user edit (manual + AI hybrid)
  → publish
```

AI output is always **editable structured Kebu schema** + **design system tokens** — never arbitrary production HTML/CSS injection.

---

## Design worlds (not “Modern Store 1/2/3”)

Templates are **design worlds** where business logic and visual composition change together:

| World | Example positioning |
|-------|---------------------|
| **Editorial Atelier** | Luxury fashion — large photography, minimal nav, magazine storytelling |
| **Modern Heritage** | African contemporary — architectural layouts, sophisticated cultural language (not tourist kitsch) |
| **Clinical Luxury** | Beauty — product-focused, education + routines |
| **Night Market** | Restaurant — immersive food, menu-first, reservations prominent |
| **Gallery** | Jewelry — negative space, museum/editorial product |
| **Culture Magazine** | Music — artist imagery, releases, events, editorial (May Lecor / K-Direction class) |

Flagship portfolio sites (May Lecor, K-Direction, DkLNS, Ndaoan House) are **reference implementations** of design worlds — not generic `hero` + `features` + `contact` stacks.

---

## Creative studio editor (target interaction model)

Center: **the actual website** (full bleed when appropriate).

| Zone | Contents |
|------|----------|
| **Left** | Pages (Home, Shop, About, …) |
| **Left (second panel)** | Structure — Header, Hero, Collection, Story, Products, … (section tree) |
| **Right** | Design — typography, colors, layout, spacing, animation, images |
| **On canvas click** | Contextual controls for that section/block (Shopify-like pattern, Kebu-native elegance) |

Hybrid loop: **AI → manual → AI → manual** — never force AI-only or drag-only.

---

## AI command bar + change preview

Persistent **Ask your site** bar (Yande):

- “Make the website feel more expensive.”
- “Make this feel Senegalese but not touristy.”
- “Add a Valentine’s collection.”

Before apply, AI shows **intent**:

```
I'm going to:
• Replace hero composition
• Reduce navigation density
• Change heading typography
• Reorganize featured collection
[Apply changes]
```

System-level reasoning (typography, spacing, art direction, CTA hierarchy) — not one random CSS property.

### Reasoning examples (design system — not one property)

**“Make the website feel more expensive”** → reduce visual clutter · strengthen typography · increase photography prominence · simplify navigation · adjust spacing · refine palette · improve product presentation · CTA hierarchy.

**“Make this feel more Senegalese but don’t make it touristy”** → photography direction · typography · palette · art direction · copy · subtle cultural detail — **not** decorative pattern on every section.

---

## AI Design Director (post-launch)

Yande knows brand, business, customers, products, design system, pages, conversion goals, and **real analytics**.

Example insights (when data exists):

- “Homepage traffic is high but collections get few clicks — move Featured Collection above brand story.”
- “Mobile product cards are too tall — reduce scroll fatigue.”

This is **product/design intelligence**, not a chatbox on the side.

---

## Why portfolio sites looked “cheap” (honest gap)

Early Builder paths often used **generic section stacks** (`navigation`, `hero`, `text`, `features`) without a design world or bespoke layout component. That produces beginner-looking sites even when copy is good.

**Fix direction:** flagship sites use **dedicated layout section types** (e.g. `legally-blonde-hero`, `kdirection-home`) + full multipage sync + premium art direction — not the default agency template. DkLNS / Ndaoan / K-Direction nav 404s = missing page sync in DB (upgrade + publish), not “template exists in seed only.”

Build one design world end-to-end before adding another generic template. See **Template Intelligence System** (`docs/product/KEBU-TEMPLATE-INTELLIGENCE.md`) and **Design Quality Standard** (`docs/product/KEBU-DESIGN-QUALITY-STANDARD.md`). **If it looks AI-generated, it failed review.**
