# Kebu — Implementation Status

**Last updated:** 2026-09-08  
**Owner:** Engineering (lead agent + human review)

Status labels (strict):

| Label | Meaning |
|-------|---------|
| **NOT STARTED** | No real end-to-end path |
| **IN PROGRESS** | Partial stack; gaps remain |
| **BLOCKED** | Waiting on migration, credentials, legal, or external approval |
| **IMPLEMENTED** | Full stack works in dev with migrations applied |
| **TESTED** | IMPLEMENTED + automated tests + manual slice verification |
| **PRODUCTION READY** | TESTED + deployed config + adversarial audit passed |

Do **not** mark PRODUCTION READY without Definition of Done (see `docs/product/ENGINEERING-MANDATE.md`).

**Apply migrations locally/Supabase before judging DB-backed features.** Many slices require `005`–`017` + builder migrations.

---

## Summary

| Product area | Status | Notes |
|--------------|--------|-------|
| Shared auth & session | **TESTED** | Supabase auth, middleware session · **Forgot password** `/forgot-password` → email link → `/reset-password` |
| **Kebu unified account / identity graph** | **IN PROGRESS** | Product law: `docs/product/KEBU-UNIFIED-ACCOUNT.md`. One login for Search·Mail·Builder·Cloud·Business — not separate product accounts. Control center + product permissions **NOT STARTED**. Mail as comm layer **NOT STARTED**. |
| **Kebu Account model** (Personal + Business) | **IN PROGRESS** | P1 workspace switcher **IMPLEMENTED** (061). Mail, permissions control center **NOT STARTED**. |
| **Kebu global access philosophy** | **IMPLEMENTED** (docs + rules) | **Build for everyone. Empower Africans with more.** `docs/product/KEBU-GLOBAL-ACCESS-PHILOSOPHY.md` · `kebu-global-access.mdc` |
| **Kebu master engineering contract** | **IMPLEMENTED** (docs + rules) | `docs/product/KEBU-MASTER-ENGINEERING-INSTRUCTION.md` · `kebu-master-engineering.mdc` · build→Design QA→audit→repair · Supabase E2E mandate |
| **Kebu Product Architect Phase** | **IMPLEMENTED** (docs + rules) | `docs/product/KEBU-PRODUCT-ARCHITECT-PHASE.md` · `kebu-product-architect.mdc` — decompose before code; product density; no MVP aesthetics; vertical slices not horizontal shells |
| **Kebu Product Rules (five specs, quality gate, no fake UI)** | **IMPLEMENTED** (docs + rules) | `docs/product/PRODUCT_RULES.md` · `DEFINITION_OF_DONE.md` · `QUALITY_GATE.md` · `DESIGN_SYSTEM.md` · `kebu-no-fake-functionality.mdc` · Playwright visual regression **NOT STARTED** |
| **CI gate chain + GitHub Actions** | **IN PROGRESS** | `docs/CI_PIPELINE.md` · `.github/workflows/ci.yml` · `npm run ci` · `kebu-ci-gate.mdc` — typecheck/lint/test failures must be repaired before green deploy |
| **Engineering Health / Bug Sentinel** | **NOT STARTED** | `docs/ENGINEERING_HEALTH.md` — nightly checks + internal dashboard + controlled AI triage |
| **Feature folder structure (`features/`)** | **NOT STARTED** (documented) | `docs/FOLDER_STRUCTURE.md` — adopt incrementally on new slices |
| **Kebu pricing philosophy** | **IMPLEMENTED** (docs + catalog) | `docs/product/KEBU-PRICING.md` · `kebu-pricing.mdc` · `lib/billing/plans.ts` · `/pricing`. Free→Pro ($0/$2/$5/$10/$20) + Student $1. Limit enforcement + transaction fees + student verification **NOT STARTED**. |
| Kebu Builder — core editor | **IMPLEMENTED** | On-canvas duplicate/remove/move + inline text; Aesthetics apply CSS vars + `aestheticId` persist |
| Kebu Builder — merchant site hub | **IMPLEMENTED** | `/my-sites/[id]` — **Kebu Business** IA tree (`lib/navigation/kebu-business-nav.ts`) |
| Kebu Builder — publish multipage sync | **IMPLEMENTED** | Portfolio design worlds sync pages before go-live (`ensureProjectPagesBeforePublish`). **Owner drafts (May Lecor):** seed sync on every `GET /api/projects/[id]` via `MAYLECOR_SEED_REVISION` — draft preview updates without publish; live still needs Publish. |
| Kebu My Space (`/business`) | **IMPLEMENTED** | Tabs: Overview · Businesses (register) · Sites · Analytics · Messages · You & help. Inbox hub `/messages`. |
| Kebu Builder — publish & hosting | **IMPLEMENTED** | Subdomain publish + Free `$0` entitlement (036/038 / `FIX_free_publish.sql`). Mark **TESTED** after one manual Free publish on your Supabase. |
| Kebu Builder — custom domains | **IN PROGRESS** | API + UI + middleware + tests; migration **015**; DNS target `cname.vercel-dns.com` (accepts `*.vercel.app`); repair **030**; **must deploy latest code** for verify to stop expecting `*.kebu.africa` |
| Kebu Builder — pages CRUD | **IMPLEMENTED** | B2 Pages panel + API; see Creation Stack roadmap for B8 next |
| Kebu Builder — SEO/settings | **IN PROGRESS** | Advanced SEO: JSON-LD, auto description, sitemap.xml/robots.txt routes, Search Console field; Domain & SEO panel outside editor |
| Support desk (help with user sites) | **IN PROGRESS** | `/support` + `KEBU_SUPPORT_ADMIN_EMAILS`; audited open/edit via service role on project GET/sections/assets |
| Kebu Builder — stores/commerce | **IN PROGRESS** | Shop admin: Products · Orders · Customers · Payments · Abandoned · Messages. **JOKO product pay** (K21 renamed) · PayPal · Paystack · Wave. **Fulfillment** + **customer profiles** · **Demo order 1/2** for merchants. Apply `APPLY_SHOP_ORDERS.sql` through **055**. |
| Kebu Shop (merchant admin) | **IN PROGRESS** | Dashboard · analytics · alerts (**067**) · Joko-default + Cauris + ledger (**068**) · SN→GH shipping (**069**) · **seller trust (Kebu ID + AfriID gate for Joko / product soft-cap)** |
| Kebu Studio | **IN PROGRESS** | **Brand DNA** (`/studio/brand`, API, migration **076**) + **Creative Director campaigns** (`/studio/campaigns`, generate pack from DNA). Music timeline V1–V3 on `/studio/video`. Fonts/brand apply/posters. **Apply 076.** **Later:** folders/version · elements pack · live cursors · CapCut-complete |
| Kebu Reach | **IN PROGRESS** | **S10a** tracked `/r/…` · **S10b** paid Reach Board + CPC bidding + viewport impressions + wallet (**074**). **NOT:** Search/Shop/RECT multi-inventory · card charge for ads · fake ROI |
| Kebu Builder ↔ Kebu ID link | **IMPLEMENTED** | `business_id` on projects; dashboard shows sites; publish syncs website URL |
| Kebu Business Infrastructure — Kebu ID | **TESTED** | Draft create + dashboard + security tests |
| Kebu Business Infrastructure — Registration | **IMPLEMENTED** | Tracker + documents; gov steps blocked honestly |
| Business events (RSVP / tickets) | **IMPLEMENTED** | Migration **052** · `/business/[id]` Events · public `/e/{publicId}` · offline queue · mark paid by owner |
| Business invoices · contracts · launch | **IMPLEMENTED** | Migration **053** · send via Resend or share link · public `/i/` `/c/` · launch checklist + popup copy · portal modules by category |
| Agency artists · press kits | **IMPLEMENTED** | Migration **056** · `/business/[id]` Artists · Press · public `/k/{publicId}` · creative role can edit |
| Agency artist campaigns | **IMPLEMENTED** | Migration **057** · release/promo plans tied to artist + press kit |
| Agency reels · music videos | **IMPLEMENTED** | Migration **058** · `/business/[id]` · public `/a/{publicId}` + kit embeds |
| Kebu Business Infrastructure — Business Readiness | **IMPLEMENTED** | Server calc; `/business/[id]` + `/ka-score` (labeled Kebu Score) |
| Kebu Business Infrastructure — Full Kebu Score | **NOT STARTED** | No `ka_scores` migration yet — readiness ≠ full score |
| Opportunity OS — Country Explorer | **TESTED** | Standalone product; UI→API→Supabase (`009`); trust labels + sources; `/opportunity/countries` |
| Kebu Opportunity OS — for-you personalization | **IN PROGRESS** | Intake + “For you” on `/opportunity` — Kebu feature; not Opportunity OS explore |
| Opportunity OS — other explore slices | **NOT STARTED** | Cards, discovery, trade, import replacement, etc. |
| Opportunity OS — program listings (DB) | **Opportunity OS** | **IMPLEMENTED** | `/opportunity/listings` · `/api/opportunity/listings` · detail `/opportunity/[id]` · save `/api/opportunity/saved` · seed `POST /api/opportunity/listings/seed` · migration **060** metadata |
| Sample `/opportunity/[id]` & `/api/opportunities` | **Opportunity OS** | **IMPLEMENTED** | Wired to Supabase `opportunities` — no in-memory sample in API/detail |
| Kebu Domains (product) | **IN PROGRESS** | Connect domain slice (subset of Builder) |
| Kebu Analytics | **IN PROGRESS** | Site beacons (`032`) + Shop analytics + **My Space → Analytics** loads real `/api/projects/[id]/analytics` (72h) |
| Kebu AI — improve/generate | **IN PROGRESS** | Server routes; metering incomplete |
| Kebu Cloud | **NOT STARTED** | Compatibility only |
| Kebu Mail | **NOT STARTED** | `docs/product/KEBU-MAIL.md` — real email via provider abstraction; personal `@kebu.africa` free; business on verified domains |
| Billing / JOKO hosting | **IN PROGRESS** | Monthly renew, autopay toggle, expire/suspend live sites; founder exempt |
| Site health cron | **IN PROGRESS** | Cron route; needs `CRON_SECRET` + deploy |

---

## 1. Kebu Builder

### AI website builder & visual editor
| Slice | Status | Routes / files |
|-------|--------|----------------|
| Create project from template | **IN PROGRESS** | `/create`, `/api/projects/create-website` |
| Visual editor + section autosave | **IMPLEMENTED** | B8 inline section stack on canvas; sidebar DnD; autosave |
| Aesthetics (named looks / color kits) | **IMPLEMENTED** | `lib/create/site-aesthetics.ts` → theme + CSS vars on `.kebu-site`; settings PATCH |
| Aesthetics store + owned library + developer sell | **IMPLEMENTED** | User gallery = **2 aesthetics per business type** (`user-aesthetics-catalog.ts`); Inspired-style visual gallery `/create/aesthetics` + detail `/create/aesthetics/[slug]`; owner brands = `owner_portfolio` only. Buy/accept → owned → apply draft → publish; `040_aesthetics_marketplace.sql`. My Sites stays separate (`/my-sites`). |
| Data Saver + KB budgets + offline queue | **IMPLEMENTED** | Modes across **Builder · Shop · Account** (AppShell dock + Account settings). Queued `place_order` + `save_section` (honest “Not saved yet”). Ultra text-first. App SW `sw-kebu-app.js` network-first for visited shells; sites keep `sw-site.js`. KB: open site/builder/shop/account, save section/profile, place order, upload. |
| Kebu Builder — product thinking doc | **IMPLEMENTED** (docs) | `docs/product/KEBU-BUILDER-PRODUCT-THINKING.md` — mature product feel vs visual clone; reference evidence required |
| Reference screenshots (`docs/reference/*.png`) | **NOT STARTED** | Dossiers live; upload annotated screenshots before sophisticated UX slices |
| AI improve (Yande) | **IN PROGRESS** | `/api/projects/[id]/ai-improve/preview` + `/apply` · command bar + sidebar preview → apply; **B1 IMPLEMENTED** — section-level accept/reject **NOT STARTED** |
| AI generate (words → site) | **IN PROGRESS** | `/create/new?mode=ai` → `create-website`; multi-page structured draft; LLM fallback honest |
| Undo/redo | **IMPLEMENTED** | Client-only history |
| Multi-page sites | **IN PROGRESS** | `/api/projects/[id]/pages` |
| **Kebu Template Intelligence System** | **IN PROGRESS** | Archetype IA + compositions. **LAYERS Beauty** design world **IMPLEMENTED** (`layers-beauty` · Home/Shop/About/Gallery/FAQ/Journal/Contact/Gifts · gallery pair). Fashion Atelier exists. Next worlds one-at-a-time. `docs/product/KEBU-TEMPLATE-INTELLIGENCE.md` |
| Theme fonts (display/body load) | **IMPLEMENTED** | Builder Theme settings + `SiteThemeFonts` Google loader for public/private sites; Steelfish via Tilda @font-face (self-host pending CDN allow) |
| Flagship site layouts (May Lecor · DkLNS · Ndaoan · K-Direction · RECT · **For The Mayjor Good**) | **TESTED** | Portfolio auto-create; May = `owner_portfolio` only; local cutouts (no Wix gallery CDN); multipage artist IA |
| Per-site named aesthetics (Shopify-style) | **IMPLEMENTED** | `033_project_themes.sql` + marketplace apply; drafts + one live; publish swaps; Kebu JSON only; `/create/[id]/themes` |
| Preview | **IN PROGRESS** | `/create/[id]/preview` |
| Link project to Kebu ID business | **IMPLEMENTED** | `business_id` required on create; `/create/new?businessId=` |

**Gaps:** Full Playwright E2E for editor; much uncommitted work not on Vercel.

### Publish, subdomains, hosting
| Slice | Status |
|-------|--------|
| Publish to `*.kebu.africa` | **IMPLEMENTED** | Live URL = `/sites/{sub}` on app host. Free auto-entitlement: `FIX_free_publish.sql` or APPLY_ALL_PENDING / Phase One 010+036+038. Manual E2E → **TESTED**. |
| Public site renderer | **IN PROGRESS** | `/sites/[subdomain]`; **all** SiteRenderer sites get `kebu-site` responsive base (`kebu-site-responsive.css`) — not May Lecor only |
| Middleware subdomain rewrite | **IMPLEMENTED** |
| Live deployment snapshot | **IN PROGRESS** | `deployments` table |
| Sync published URL to business profile | **IMPLEMENTED** | On publish when `business_id` set |
| Hosting billing (JOKO) | **IN PROGRESS** | Tiers Free/$0 · Starter $2 · **Shop $5 (hero)** · Business $10 · Pro $20 (+ Student $1). Catalog + `/pricing` + subscribe by `tier`; Free auto-entitlement for publish (**038 RLS**); autopay + expire cron **035/036**. Limits/store gates not fully enforced yet. Needs JOKO env + cron. |

### Custom domains & Kebu Domains
| Slice | Status |
|-------|--------|
| Connect owned domain (DNS + verify) | **IN PROGRESS** | Migration **015**; repair **030** if old `*.kebu.africa` targets in DB; deploy DNS fix to prod |
| Middleware custom host routing | **IN PROGRESS** | Needs `SUPABASE_SERVICE_ROLE_KEY` |
| DNS instructions (CNAME → Vercel) | **IMPLEMENTED** | `cname.vercel-dns.com` or `*.vercel.app`; not `{sub}.kebu.africa` |
| Namecheap guidance (no fake purchase) | **IMPLEMENTED** |
| Sell domains / registrar API | **NOT STARTED** |
| DNS management UI | **NOT STARTED** |

### Stores, orders, payments
| Slice | Status |
|-------|--------|
| Store create/publish | **IN PROGRESS** | `/api/store/*` |
| Products, cart, checkout | **IN PROGRESS** | Catalog + UPC + cart (`046`) + stock (`047`). Apply `APPLY_SHOP_ORDERS.sql`. |
| Multi-item cart checkout | **IMPLEMENTED** | Live FAB cart · Add to cart · `shop_order_items` · draft upsert · WhatsApp multi-line · never browser-paid |
| Abandoned cart recovery | **IMPLEMENTED** | `shop_cart_drafts` · live draft POST · Shop → Abandoned (idle ≥30m) · WhatsApp / Resend recovery · mark recovered · never marks paid |
| Product stock / inventory | **IMPLEMENTED** | Optional `track_stock` + `stock_qty`; decrement on order/cart; restore on cancel; Shop Products UI |
| Product UPC + order numbers | **IMPLEMENTED** | `upc`/`sku` on products (unique per shop); `order_number` + snapshots on orders; WhatsApp + Shop Orders UI |
| Shopper accounts + purchase history | **IMPLEMENTED** | Kebu auth on live shop `/sites/{sub}/account` · `customer_user_id` on orders (`048`) · profile per store · history (status ≠ paid from browser) |
| Wishlist | **IMPLEMENTED** | `shop_wishlists` (`049`) · Wishlist button on products · account page list · signed-in only |
| Customer ↔ merchant messaging | **IMPLEMENTED** | `shop_message_threads` + `shop_messages` (`050`) · customer My account · Shop → Messages reply |
| Send / buy-for-someone (gift link) | **IMPLEMENTED** | Apply **059** · checkout gift toggle · `/g/{gift_…}` · merchant Orders shows recipient |
| Shop discounts | **IMPLEMENTED** | `shop_discount_codes` · Shop → Discounts · Place order field · campaign attach (Shop link or `discountCodeId` on campaign create) |
| Kebu Studio email designer | **NOT STARTED** | Compatibility only — do not ship empty Studio shells. Plain campaigns + Create poster embed only. |
| K21 / Wave / Orange architecture | **IN PROGRESS** | **Joko = native rail**; buyers **pay in Cauris** (Joko’s currency) with XOF/NGN equivalents (`lib/shop/cauris.ts`). Wave · Paystack · PayPal · Orange = coverage. Ledger events **068**. Product law: `KEBU-AFRICA-COMMERCE-RAILS.md`. **ALK clearing · USSD · auto cross-border logistics = NOT STARTED.** |
| Orders verified webhooks | **IN PROGRESS** | JOKO + PayPal + Paystack + Wave shop webhooks; browser never sets paid |

### Website analytics
| Slice | Status |
|-------|--------|
| Store analytics API | **RETIRED (memory)** | Legacy `/api/store/analytics` → 410. Real path: Shop → Analytics + site beacons |
| Builder site analytics dashboard | **IN PROGRESS** | `/create/sites/[id]` — devices + Web Analytics / Speed / Observability / Runtime Logs · links to Shop analytics |
| Event pipeline | **IN PROGRESS** | `site_analytics_events` + `/api/sites/analytics` beacon |
| Shop analytics (orders → insights) | **IMPLEMENTED** | `/api/projects/[id]/shop-analytics` · Shop → Dashboard/Analytics · order sources + visitor geography/referrers · WHAT/WHY/NEXT from Supabase |

---

## 2. Opportunity OS + Kebu Opportunity OS (separate products)

**Opportunity OS** = standalone economic intelligence platform (explore). Spec: `docs/OPPORTUNITY-OS-MASTER-SPEC.md`.  
**Kebu Opportunity OS** = Kebu for-you feature. Spec: `docs/KEBU-OPPORTUNITY-OS.md`. **Not Builder.** Integrate via APIs only.

| Slice | Product | Status |
|-------|---------|--------|
| Country Explorer (DB) | **Opportunity OS** | **TESTED** | `/opportunity/countries`, APIs, trust labels, sources UI, tests — migration **001+009** required in prod |
| Program listings (grants/loans/tenders) | **Opportunity OS** | **IMPLEMENTED** | `/opportunity/listings` · DB `opportunities` · track save · migration **001+060** · seed `POST /api/opportunity/listings/seed` |
| Country detail + AI analysis | **Opportunity OS** | **IMPLEMENTED** | AI path needs `ANTHROPIC_API_KEY` (honest 503 without it) |
| Industry / resource / trade explorers | **Opportunity OS** | **NOT STARTED** | After assigned slice order |
| Opportunity Card | **Opportunity OS** | **IMPLEMENTED** | `/opportunity/cards` · `/api/opportunity/cards` · migration **063** · curated Senegal seed |
| Discovery · Import replacement · Value addition | **Opportunity OS** | **NOT STARTED** | Per master spec slice order |
| Intake + personalization | **Kebu Opportunity OS** | **IMPLEMENTED** | `/opportunity/intake` → profile → `/opportunity` For you — migration **026** |
| Build This → Kebu handoff | **Both** | **PARTIAL** | Card detail links to Builder / Kebu ID — full API handoff slice not started |
| Hub (`/opportunity`) | **Kebu Opportunity OS** | **IMPLEMENTED** | Intake gate + entitlement gate + personalized feed when verified |
| Legacy sample opportunity pages | **Opportunity OS** | **IMPLEMENTED** | DB-backed; seed curated listings via admin endpoint |
| Entitlement gate (`african_opportunity_access`) on for-you APIs | **Kebu Opportunity OS** | **IMPLEMENTED** | `account_entitlements` migration **062** · sync from African ID · server check on `/api/opportunity/for-you` |
| Unified account workspace switcher (Personal ↔ Business) | **Kebu Account** | **IMPLEMENTED** | migration **061** · `/api/me/workspace` · sidebar switcher |

---

## 3. Kebu Cloud

**NOT STARTED** — Do not ship placeholder dashboards. Phase One uses Builder hosting only.

---

## 4. Kebu Mail

**NOT STARTED** — Full spec: `docs/product/KEBU-MAIL.md` · Rule: `kebu-mail.mdc`

| Area | Status |
|------|--------|
| Product law + provider abstraction design | **IMPLEMENTED** (docs) |
| Personal `@kebu.africa` (free) | **NOT STARTED** |
| Real send/receive (internet mail) | **NOT STARTED** |
| Inbox UI (Inbox/Sent/Drafts/…) | **NOT STARTED** |
| Business mail on verified domain | **NOT STARTED** — depends on custom domains slice |
| Shared mailboxes + RBAC | **NOT STARTED** |
| SPF/DKIM/DMARC automation | **NOT STARTED** |
| Provider adapter (v1) | **NOT STARTED** |

**Forbidden until slice assigned:** fake inbox · simulated send · separate Mail signup.

---

## 5. Kebu Analytics (product)

**NOT STARTED** as unified product. Partial store analytics only.

---

## 6. Kebu Business Infrastructure

### African ID — AID (personal account identity)
| Slice | Status |
|-------|--------|
| Linked to auth user (1:1) | **IMPLEMENTED** | Auto-provision on profile load — migration **027** |
| ID types: indigenous \| visitor | **IMPLEMENTED** | Migration **037**; PATCH `/api/me/afrique-id` |
| Public IDs | **IMPLEMENTED** | New: `AID-{CC}-01-…`; legacy `AFRI-…` still valid |
| Account UI + sidebar | **IMPLEMENTED** | `/account`, dashboard, sidebar; type picker on account |
| Verification request (pending only) | **IMPLEMENTED** | Users cannot self-set verified |
| Public verified card | **IMPLEMENTED** | `/id/{publicId}` when eligibility = verified |

### Kebu ID
| Slice | Status |
|-------|--------|
| Draft business + public ID | **IMPLEMENTED** | Migrations 005–006 |
| Founder RBAC + audit | **IMPLEMENTED** |
| Business dashboard | **IMPLEMENTED** |
| Seller registration form (AfriID bind · informal · delivery · years · supply) | **PARTIAL** | Spec: `docs/product/KEBU-AFRIID-KEBU-ID-REGISTRATION.md`. **Seller trust sell-path:** Kebu ID + AfriID for Joko / product soft-cap **IMPLEMENTED**. `informal_unregistered` SN structure **IMPLEMENTED**. Delivery / years / supply fields still **NOT STARTED**. |
| Business credit file (ops → lending inputs) | **PARTIAL** | Shop/order data exists; dedicated credit-file product **NOT STARTED** |
| Verification levels 2–4 | **NOT STARTED** |
| Team invites | **IMPLEMENTED** | Apply **055** · `/business/[id]` Team · `/invite/{token}` · roles include manager/creative |
| Artist press kits | **IMPLEMENTED** | Apply **056** · `/business/[id]` Artists · Press · public `/k/{publicId}` |
| Artist campaigns | **IMPLEMENTED** | Apply **057** · promo/release plans linked to artist + press kit |
| Reels · music videos | **IMPLEMENTED** | Apply **058** · `/business/[id]` · public `/a/{id}` · shown on press kit |
| Claim existing company | **NOT STARTED** |

### AfriID (African ID / AID)
| Slice | Status |
|-------|--------|
| Account-linked AID + eligibility states | **IMPLEMENTED** | `afrique_ids` · indigenous/visitor |
| Public verified card | **IMPLEMENTED** | `/id/{publicId}` when verified |
| Deep signup (skills · financial status · diaspora birth/residence · optional ethnic/kin/land) | **NOT STARTED** | Spec: `docs/product/KEBU-AFRIID-KEBU-ID-REGISTRATION.md` |
| Gov ID / biometric verification | **NOT STARTED** |
| Continental recognition (Joko · Property · consulate) | **NOT STARTED** | Moat thesis documented; integrations unbuilt |

### Business registration
| Slice | Status |
|-------|--------|
| Registration wizard | **IMPLEMENTED** |
| Progress tracker UI (9 steps) | **IMPLEMENTED** | Honest blocked labels for gov steps |
| Document upload → `documents_uploaded` | **IMPLEMENTED** | Migration **017**; Supabase Storage |
| Government submit | **BLOCKED** | Mock connector only — labeled honestly |
| Payment / approval / tax / active steps | **BLOCKED** | Await gov integration slice |

### Kebu Score
| Slice | Status |
|-------|--------|
| Business Readiness (profile + docs) | **IMPLEMENTED** | Shown on `/ka-score` as **Kebu Score · Business Readiness** |
| Full Kebu Score (`ka_scores` schema) | **NOT STARTED** |
| Naming | **User-facing = Kebu Score** | “KA Score” is an internal alias only |

---

## 7. Kebu AI

| Slice | Status |
|-------|--------|
| Provider abstraction | **IN PROGRESS** |
| Website improve/generate | **IN PROGRESS** |
| Opportunity analysis | **IN PROGRESS** |
| Metering / cost controls | **NOT STARTED** |
| Business-bound RBAC for AI context | **IN PROGRESS** |

---

## 8. Shared infrastructure

| System | Status |
|--------|--------|
| Authentication (Supabase) | **TESTED** |
| API rate limiting | **IN PROGRESS** | `lib/api-guard.ts` — builder/AI/public + **auth** (admin login) |
| Platform hardening (anti-abuse) | **IN PROGRESS** | Signed admin session cookie; HSTS; `/shop`+`/support` auth gate; same-origin on publish/sections; XSS block on section save |
| RLS on core tables | **IN PROGRESS** |
| Audit logs (business) | **IMPLEMENTED** |
| Billing core | **IN PROGRESS** |
| Notifications | **IN PROGRESS** |
| File storage (business docs) | **IMPLEMENTED** | Migration 017 |
| **Kebu + RECT ecosystem interlock** | **IMPLEMENTED** (docs + rules) | Kebu = build/operate · RECT = culture · Reach = connector. `docs/product/KEBU-RECT-ECOSYSTEM.md` · Creator Marketplace + Create Store handoff **NOT STARTED**. |
| **Kebu economic discovery architecture** | **IMPLEMENTED** (docs + rules) | 12 revenue systems beyond ads — `docs/product/KEBU-ECONOMIC-DISCOVERY.md`. Reach/Leads/Trade/Capital **NOT STARTED**. |
| Kebu Search | **NOT STARTED** | **Economic discovery hub** — not African Google. Modes: Web, Africa, Business, Products, People, Research, Trade, Opportunities, Culture (RECT), Local. Real crawl/index/rank; entity-centric results; AI with citations. `docs/product/KEBU-SEARCH.md` |
| Kebu Property (African property infrastructure) | **NOT STARTED** | Trust/Passport/Scam Shield — not listing marketplace. `docs/product/KEBU-PROPERTY-INFRASTRUCTURE.md`. V1 Senegal: Discover·Verify·Connect·Save·Message only. |
| Kebu Maps | **NOT STARTED** | Practical navigation first, then African layers. Spec: `docs/KEBU-MAPS-AND-INFRASTRUCTURE.md` |
| African CDN / Kebu Cloud infra | **NOT STARTED** | Sovereignty levels 3–5 — regional hubs later; own **data** (level 2) from day one of each module |
| Public platform APIs | **NOT STARTED** | Maps / Business / Opportunities / Payments / ID / Yande — when modules exist |
| API gateway | **NOT STARTED** (Next.js routes only) |

---

## Migrations checklist

| Migration | Purpose | Required for |
|-----------|---------|--------------|
| 005–007 | Kebu ID + registration | Business flows |
| 008 | Website builder core | `/create`, publish |
| 009 | Opportunity Country Explorer | `/opportunity/countries` |
| 010 | JOKO billing | Paid hosting / publish gate |
| 035–036 | Monthly + tiers | Autopay, Free/$0 amounts |
| 038 | Free entitlement RLS | Owners insert active Free ($0) — required for Free publish |
| 011–013 | Templates, SEO | Editor SEO tab |
| 014 | Builder extensions | Health cron, marketplace tables |
| 015 | Custom domains | Domain connect |
| 016 | Registration timeline labels | Progress tracker sync |
| 017 | Business documents | Document upload slice |
| 027 | African ID table (`afrique_ids`) | Personal AID on account |
| 037 | African ID types | `identity_type`: indigenous \| visitor |

---

## Known hard gates (not ignored)

1. **Publish** requires active JOKO hosting (or `JOKO_BILLING_DEV_BYPASS=true` in dev) — migration **010** + env.
2. **Custom domain routing** needs `SUPABASE_SERVICE_ROLE_KEY` in middleware.
3. **Document upload / domains / SEO** need migrations **013–017** applied in Supabase.
4. **Country Explorer** empty until migration **009** (+ optional admin seed).

**Post-migration manual verify:** see `docs/VERIFY-AFTER-MIGRATIONS.md` (Country Explorer · documents · domains).

---

## Scale path (100k–500k accounts) — build now, switch later

**What breaks first if ignored:** unbounded image uploads · chatty builder autosave · unindexed orders/products · AI without metering · treating every page as a full JS download.

| Stage | Keep / switch |
|-------|----------------|
| ~1k–10k | Current Next + Supabase OK with indexes, CDN, image caps, rate limits, queues |
| ~100k | Read replicas / Redis cache · background workers · edge CDN · PgBouncer · observability |
| ~500k | Not one DB forever — regional/edge strategy · partition hot tables · media CDN · metered AI · payment isolation |

**Already in product for Africa:** Data Saver / Ultra / Offline · KB budgets on major actions · offline queue (honest sync) · tighter uploads · network-first shell SW.

RECT Artist OS SQL (tracks/plays/fan club/live rooms) is a **separate product schema** — do not paste into Kebu Phase One Supabase.

---

## Next recommended vertical slices (one at a time)

**Do not build** RECT social / Netflix Watch / empty Studio·Mail·Maps·Cloud·Search shells here. Those are Kebu platform modules when assigned end-to-end. Experian-style Net-30/90 trade credit = **after** real ops data → full Kebu Score (not a fake credit product now).

| # | Slice | Status |
|---|--------|--------|
| 1 | Product UPC/SKU + order numbers | **IMPLEMENTED** |
| 2 | Multi-item cart → checkout | **IMPLEMENTED** |
| 3 | Abandoned checkout + recovery | **IMPLEMENTED** |
| 4 | Live Wave / Orange / PayPal / card adapters | **IMPLEMENTED** (env-gated; Orange needs partner keys; apply **051**) |
| 5 | JOKO product pay (K21 renamed) | **IMPLEMENTED** | Env-gated JOKO checkout + webhook; WhatsApp fallback |
| 6 | Shop analytics (real order/product events → insights) | **IMPLEMENTED** | Shop → Analytics · pattern engine in `lib/shop/commerce-insights.ts` |
| — | Business events RSVP + tickets (agency/DkLNS) | **IMPLEMENTED** | Apply **052** · influencer seeding / live ticket PSP = later |
| — | Fulfillment + customer profiles + demo orders | **IMPLEMENTED** | Apply **054–055** · Shop → Orders/Customers |
| 7 | Finish publish/hosting gates + Free entitlement in prod | **IN PROGRESS** |
| 8 | Custom domain verify fully live in prod | **IN PROGRESS** |
| 9 | AI metering / cost controls | **NOT STARTED** |
| 10 | Opportunity OS industry / resource / trade explorers | **NOT STARTED** |
| 11 | Build This → Builder handoff | **NOT STARTED** |
| 12 | Team invites · Kebu ID levels 2–4 | **Team invites IMPLEMENTED (055)** · levels 2–4 still **NOT STARTED** |
| — | Agency: Artist press kit | **IMPLEMENTED** | Apply **056** · structured EPK JSON · `/k/{id}` |
| — | Agency: Artist campaigns | **IMPLEMENTED** | Apply **057** · linked to artist + press kit |
| — | Agency: Reels / MVs | **IMPLEMENTED** | Apply **058** · `/a/{id}` · kit video embeds |
| — | Agency: Studio poster editor | **NOT STARTED** | Compatibility only — do not ship empty Studio shells |
| — | Send / buy-for-someone (gift) | **IMPLEMENTED** | Apply **059** · `/g/{id}` gift link |
| 13 | Full Kebu Score (+ later trade-credit readiness) | **NOT STARTED** — after more real ops |

Also still open after foundation: finish Free hosting gates · custom domain verify in prod. Apply **059** for gifts after `shop_orders` exists (`APPLY_SHOP_ORDERS` or standalone `059_shop_gift_orders.sql`). Agency tables **056–058** are separate from shop.

---

## Related docs

- Mandate: `docs/product/ENGINEERING-MANDATE.md`
- Core architecture (African productivity cloud): `docs/KEBU-CORE-PRODUCT-ARCHITECTURE.md`
- Maps + infrastructure sovereignty: `docs/KEBU-MAPS-AND-INFRASTRUCTURE.md`
- Builder next-gen (not a Shopify clone): `docs/product/KEBU-BUILDER-NEXT-GEN.md`
- Yande + Builder (words→site; roles; Maps delayed): `docs/YANDE-AND-BUILDER.md`
- Opportunity OS (standalone) + Kebu Opportunity OS: `docs/OPPORTUNITY-OS-MASTER-SPEC.md` · `docs/KEBU-OPPORTUNITY-OS.md`
- Ecosystem map: `docs/KEBU-ECOSYSTEM.md`
- Architecture: `docs/architecture/OVERVIEW.md`
- Kebu ID / score detail: `docs/KEBU-ID-KA-SCORE-STATUS.md`
- Testing: `docs/testing/README.md`
