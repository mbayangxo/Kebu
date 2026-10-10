# Kebu — Implementation Status

### 2026-10-10 UTC — cleanup closed; live configuration boundary rechecked

Fresh hosted readback confirms zero original synthetic users, projects, products, sessions and orders. Cleanup is **COMPLETE**; earlier residue observations below are historical. No additional deletion was issued during this recheck.

The application checkpoint still passes full CI and fixture-backed running-app QA. Full readiness remains **BLOCKED** at the live configuration boundary: Vercel preview still shares the paused production Supabase URL, the integration exposes no Kebu-qa server credential, and the existing browser remains at Supabase sign-in. The workspace has no QA/provider credentials. The complete preview binding must use Kebu-qa URL, matching public key and QA server key together before hosted application tests. Genuine signed-in, AI/payment/email/storage, non-Wave closure, legacy reconciliation, independent-session races and stable-host load remain unverified. The AI, payment and email providers still lack configured credentials. See `evidence/3j/paid-delivery-verification.json`.

### 2026-10-10 UTC — paid delivery and provider expiry checkpoint

Digital entitlements now originate atomically from verified payment, preserve the purchased file, and enforce paid state, expiry and download quotas at redemption. Private email jobs use leases and stable retry keys; merchant metadata does not expose tokens. PayPal/Paystack/Wave checks bind the exact stored checkout and tender. Provider initiation locks the reservation before external creation; verified Wave expiry restores recorded deductions once. Missing restoration targets roll back the whole operation. Four canonical migrations applied only to Kebu-qa.

Full CI passes: **5,665 tests, 116 skips, zero lint errors / 288 warnings, production build**. 44 actual SQL transaction checks and hosted rollback assertions pass with zero new probe residue. Phone/desktop fixture-backed browser journeys pass, with a real unauthenticated merchant API returning 401. See `evidence/3j/paid-delivery-verification.json` and the paid-delivery CI/UI logs.

Full readiness remains **BLOCKED**. The preview public Supabase URL targets paused production, rather than Kebu-qa; a complete verified QA credential binding is needed before hosted writes. Genuine signed-in journeys, real AI/payment/email/storage verification, non-Wave provider closure, legacy reconciliation, independent-session races and stable-host load checks remain open. The original synthetic user/project/product remain; the latest cleanup request was interrupted and readback confirmed residue. No production changes, deployment, push, merge or pause action occurred. The five-minute cron schedule still needs a compatible hosting plan.

### 2026-10-10 UTC — checkout retry, gift-credit and full-return repair checkpoint

Single/cart attempt IDs now survive lost confirmations, refresh and offline sync; project/fingerprint-bound private receipts serialize saves and replay the existing order. Offline sync retains variant/destination/gift-recipient data and refuses incomplete confirmations. Full gift credit settles atomically; gift/cash refund receipts restore credit once; separately confirmed resalable full returns restore recorded stock once and archive the order. Merchant refund/return controls now work for fulfilled orders and disable recorded restocks. Three additional migrations applied only to Kebu-qa. 32 actual SQL transaction checks, hosted rollback probes (zero new residue), phone/desktop fixture-backed browser journeys and real unauthenticated API denial pass. Final full CI exits 0: 5,617 tests / 116 skips, zero lint errors / 289 warnings, production build.

Full readiness remains **BLOCKED**: genuine signed-in S8 and independent-session checkout/quota races; real provider amount/refund contracts and payment-gated digital delivery; reservation expiry/provider closure and unused legacy reservation reconciliation; real AI key/output and quality; stable-host performance; original synthetic fixture cleanup. Browser still redirects to Supabase sign-in, Vercel metadata has no ANTHROPIC_API_KEY, and the original synthetic rows remain after the prior connector request-state failure. No repeated cleanup loop. See `evidence/3j/checkout-repairs.md` and `retry-return-verification.json`. App changes are not deployed; no production/push/merge/pause action.

### 2026-10-10 UTC — checkout transaction and reconciliation repair checkpoint

Single/cart checkout now atomically saves headers, all items, inventory and tender effects. Service-only provenance enables replay-safe cancellation and exact variant/gift restoration. Payment callback recording and externally returned refund receipts commit atomically once; provider identity and stored PayPal bindings are enforced. Shipping/channel/Mbolo/email drift reconciled. Three canonical migrations applied only to Kebu-qa; 28 focused checks and hosted rollback assertions pass with zero new residue. Final typecheck/lint/5,604 tests pass (116 skips); build passed after clearing an internal Turbopack font cache failure, with failed/recovered logs retained.

Full readiness/3J remain BLOCKED: signed-in QA, real AI configuration/quality, provider refund/return/tender and creation retry/expiry journeys, legacy reservation reconciliation, independent-session quota and stable-host performance remain open. Original synthetic fixture cleanup still fails with connector Invalid or expired requestState. See `evidence/3j/checkout-repairs.md`. App changes are not deployed; no production/push/merge/pause action.

**Last updated:** 2026-10-10
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
| **Engineering Health / Bug Sentinel** | **IN PROGRESS** | Spec still full Sentinel. Ops slice: Kebu Record shows cron runs + failing site probes (**083**). Full Bug Sentinel later. |
| **Feature folder structure (`features/`)** | **NOT STARTED** (documented) | `docs/FOLDER_STRUCTURE.md` — adopt incrementally on new slices |
| **Kebu pricing philosophy** | **IMPLEMENTED** (docs + catalog) | `docs/product/KEBU-PRICING.md` · limits enforced: customDomain · store · maxProducts · **maxWebsites** · **AI monthly metering (081)**. Student verification / transaction fees still later. |
| Kebu Builder — core editor | **IMPLEMENTED** | On-canvas duplicate/remove/move + inline text; Aesthetics apply CSS vars + `aestheticId` persist |
| Kebu Builder — Phase 3B device composition (per-device order, visibility, presentation overrides) | **TESTED** (all automated gates green; **human visual sign-off approved 2026-09-27**: responsive compositions, H1 Fit-content Hero incl. Phone first viewport, reference intent. Responsive composition first approved 2026-09-26. Hero slice + hardening 2026-09-27: Hero height/Auto default + balanced Auto padding, image, overlay, device align, Aesthetic photo, legacy template Hero fields (T1), Undo/Redo through the canonical save boundary (B1), one save-ordering model for autosave/Save draft/Undo/Redo (S1–S2), Add/Duplicate on the same boundary (S3), app-wide post-hydration remount removed (R1). **H1 (Hero Fit content) visually approved by human review 2026-09-27.** Round 9: Undo/Redo of Add/Remove/Move persisted in the same ordered model (O5); template second call-to-action + editorial-hero template fields (O6) and editorial-hero photo/height controls (E1) fixed. **O6 second call-to-action visually approved by human review 2026-09-27.** See `docs/product/PHASE-3B-QA-SIGNOFF.md`) | Desktop/Tablet/Phone compositions via `lib/create/device-composition.ts`; published pages re-compose the single DOM for the viewport (DOM = screen-reader = Tab order); site chrome pinned; responsive state (Customize / Needs review / Reset) persisted; theme fonts self-hosted (no CSP errors). Section-props save boundary `lib/create/section-props-boundary.ts` (PATCH, batch, add); save ordering `lib/create/section-save-coordinator.ts`. Migration `20260924040000` + security fix `20260925012420` (no anon EXECUTE on builder RPCs). **Automated evidence (QA project, 2026-09-27, reconciled Builder release `builder/release-reconciled`):** `npm run ci` green on Node 20.20.2 (1810 passed / 53 skipped, build 202/202) · QA DB suites 50 passed / 3 documented skips · Gate 2 Builder E2E 8/8 with 14/14 contract probes · responsive DOM/focus 5/5 · console/fonts 4/4 · Hero 11/11 · save ordering 4/4 · Undo/Redo 6/6 · structure Undo/Redo (O5) 5/5 · second CTA (O6) 5/5 · R1 remount on the production build 4/4 · QA baseline before = after. Final human visual sign-off complete (2026-09-27). Frozen full-tree evidence (1873 passed, rounds 5–9) retained as history. Commerce + Platform Jobs are a separate, unverified train. |
| Kebu Builder — merchant site hub | **IMPLEMENTED** | `/my-sites/[id]` — **Kebu Business** IA tree (`lib/navigation/kebu-business-nav.ts`) |
| Kebu Builder — publish multipage sync | **IMPLEMENTED** | Portfolio design worlds sync pages before go-live (`ensureProjectPagesBeforePublish`). **Owner drafts (May Lecor):** seed sync on every `GET /api/projects/[id]` via `MAYLECOR_SEED_REVISION` — draft preview updates without publish; live still needs Publish. |
| Kebu My Space (`/business`) | **IMPLEMENTED** | Tabs: Overview · Businesses (register) · Sites · Analytics · Messages · You & help. Inbox hub `/messages`. |
| Kebu Builder — publish & hosting | **IMPLEMENTED** | Subdomain publish + Free `$0` entitlement (036/038 / `FIX_free_publish.sql`). Mark **TESTED** after one manual Free publish on your Supabase. |
| Kebu Builder — custom domains | **IN PROGRESS** | API + UI + middleware + tests; migration **015**; DNS target `cname.vercel-dns.com` (accepts `*.vercel.app`); repair **030**; **must deploy latest code** for verify to stop expecting `*.kebu.africa` |
| Kebu Builder — pages CRUD | **IMPLEMENTED** | B2 Pages panel + API; see Creation Stack roadmap for B8 next |
| Kebu Builder — SEO/settings | **IN PROGRESS** | Advanced SEO: JSON-LD, auto description, sitemap.xml/robots.txt routes, Search Console field; Domain & SEO panel outside editor |
| Support desk (help with user sites) | **IN PROGRESS** | `/support` + `KEBU_SUPPORT_ADMIN_EMAILS`. Help requests: `/contact` → `help_requests` → `/admin/record` mark Helped (**083**). |
| Kebu Builder — stores/commerce | **IN PROGRESS** | Shop admin: Products · Orders · Customers · Payments · Abandoned · Messages. **JOKO product pay** (K21 renamed) · PayPal · Paystack · Wave. **Fulfillment** + **customer profiles** · **Demo order 1/2** for merchants. Apply `APPLY_SHOP_ORDERS.sql` through **055**. |
| Kebu Shop (merchant admin) | **IN PROGRESS** | Dashboard · analytics · alerts (**067**) · Joko-default + Cauris + ledger (**068**) · SN→GH shipping (**069**) · **seller trust (Kebu ID + AfriID gate for Joko / product soft-cap)** · Partner checkout **`amount_xof` + phone** + fulfill via `POST /v1/messages/send` (**code ready**; live pay **ops-gated** on Joko `db:setup` + matching secrets — ADR `2026-09-08-joko-partner-api-align`) |
| Kebu Studio | **IN PROGRESS** | Design OS S17–S20 + S9b. Video: music V1–V3 · storyboard · **Quick Edit montage** · **clip speed UI** · **captions** (transcript + Whisper when keyed) · **color grade** · **chroma settings** · **nested sequences**. Apply **077–080**. **Not full NLE:** canvas chroma export · multicam · LUTs · proxies · 4K pro export · nested live edit-in-place |
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
| Kebu Analytics | **IN PROGRESS** | Site beacons (**032**) + Shop insights + My Space. **Depth:** top pages · referrers · countries · 30-day range on site detail. Beacon → DB → dashboard loop live. |
| Kebu AI — improve/generate | **IN PROGRESS** | Server routes + **monthly AI metering** (`account_ai_usage_events` **081**) on improve · website AI create · Studio generate. Apply **081**. **B6 section accept/reject** in sidebar + command bar; canvas merges accepted sections only. |
| Kebu Cloud | **NOT STARTED** | Compatibility only |
| Kebu Mail | **NOT STARTED** | `docs/product/KEBU-MAIL.md` — real email via provider abstraction; personal `@kebu.africa` free; business on verified domains |
| Billing / JOKO hosting | **IN PROGRESS** | Monthly renew, autopay toggle, expire/suspend live sites; founder exempt |
| Site health cron | **IN PROGRESS** | Cron route + Vercel schedule; needs `CRON_SECRET` + deploy |

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
| AI improve (Yande) | **IN PROGRESS** | `/api/projects/[id]/ai-improve/preview` + `/apply` · command bar + sidebar preview → apply; **B6 section accept/reject IMPLEMENTED** (checkboxes + partial canvas merge) |
| AI generate (words → site) | **IN PROGRESS** | `/create/new?mode=ai` → `create-website`; multi-page structured draft; LLM fallback honest |
| Undo/redo | **IMPLEMENTED** | Client-only history |
| Multi-page sites | **IN PROGRESS** | `/api/projects/[id]/pages` |
| **Kebu Template Intelligence System** | **IN PROGRESS** | Archetype IA + compositions. **LAYERS Beauty** design world **IMPLEMENTED** (`layers-beauty` · Home/Shop/About/Gallery/FAQ/Journal/Contact/Gifts · gallery pair). Fashion Atelier exists. Next worlds one-at-a-time. `docs/product/KEBU-TEMPLATE-INTELLIGENCE.md` |
| Theme fonts (display/body load) | **IMPLEMENTED** | Builder Theme settings + `SiteThemeFonts` Google loader for public/private sites; Steelfish via Tilda @font-face (self-host pending CDN allow) |
| Flagship site layouts (May Lecor · DkLNS · Ndaoan · K-Direction · RECT · **For The Mayjor Good**) | **TESTED** | Portfolio auto-create; May = `owner_portfolio` only; local cutouts (no Wix gallery CDN); multipage artist IA |
| Per-site named aesthetics (Shopify-style) | **IMPLEMENTED** | `033_project_themes.sql` + marketplace apply; drafts + one live; publish swaps; Kebu JSON only; `/create/[id]/themes` |
| Preview | **IN PROGRESS** | `/create/[id]/preview` |
| Link project to Kebu ID business | **IMPLEMENTED** | `business_id` required on create; `/create/new?businessId=` |
| 3C Creative Document Core (KCD) | **IN PROGRESS** | S1 core + S2 legacy adapter + S3 renderer boundary + S4 storage authority complete + tested (one canonical site-chrome semantic; byte-identical HTML vs 3B; `apply_node_ops` ≡ core on 180 random transactions; migration `20260930010000` applied to **QA only**; Gate 2 green on both paths). Builder renders via KCD only behind the QA-only `KEBU_KCD_RENDER` flag — S5 operations/history in progress (responsive-state/history foundations plus authorized operation API, normalization, retry transport and Builder coordinator wiring, durable checkpoints, legacy write guards and eight supplemental local browser checks; separate QA operation flag off by default; see `evidence/3c/s5/README.md`; source writer audit recorded; approved page lifecycle operations implemented with atomic history and canonical acknowledgements (local CI and ten supplemental browser journeys pass; follow-up migration developed and tested locally only); catalog writer uses conflict-safe system transactions with separate pending-sync status/retry; React section memoization, incremental responsive iframe updates, selected-project response guards and mobile hydration/header fixes implemented and exercised locally; device measurements recorded; full authenticated QA gates pending). S6 native primitive editor and mixed renderer implemented locally: labelled capability-driven controls, nesting/reparenting, responsive children, a11y/media and shared transactional history; sparse canonical iframe updates and selection; controlled local browser checks at 1440/768/390 pass, authenticated QA and S7 publish/live parity remain open (`evidence/3c/s6/README.md`). **Release rule:** S4 migration before S4 code. **3B finding:** go-live refuses multi-page sites with site chrome (`docs/product/3C-S3-SITE-CHROME-CHARACTERIZATION.md` §12). Design + progress: `docs/product/3C-DESIGN-FREEZE.md` §21 · Phase roadmap 3C→3J (3H Brand Brain, 3I Generative Experience Engine, 3J Torture Gate — roadmap only): `docs/product/KEBU-CREATIVE-CORE-ROADMAP.md` |

**Gaps:** Full Playwright E2E for editor; much uncommitted work not on Vercel.

### Publish, subdomains, hosting
| Slice | Status |
|-------|--------|
| Publish to `*.kebu.africa` | **IMPLEMENTED** | Live URL = `/sites/{sub}` on app host. Free auto-entitlement: `FIX_free_publish.sql` or APPLY_ALL_PENDING / Phase One 010+036+038. Manual E2E → **TESTED**. |
| Public site renderer | **IN PROGRESS** | `/sites/[subdomain]`; **all** SiteRenderer sites get `kebu-site` responsive base (`kebu-site-responsive.css`) — not May Lecor only |
| Middleware subdomain rewrite | **IMPLEMENTED** |
| Live deployment snapshot | **IN PROGRESS** | `deployments` table |
| Sync published URL to business profile | **IMPLEMENTED** | On publish when `business_id` set |
| Hosting billing (JOKO) | **IN PROGRESS** | Tiers Free/$0 · Starter $2 · **Shop $5 (hero)** · Business $10 · Pro $20 (+ Student $1). Catalog + `/pricing` + subscribe by `tier`; Free auto-entitlement for publish (**038 RLS**); autopay + expire cron **035/036**. Server limits: customDomain · store · maxProducts · **maxWebsites** · AI metering (**081**). **Vercel cron** for `billing-monthly`; charged autopay activates in-cron. Needs JOKO env + `CRON_SECRET`. |

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
| Products, cart, checkout | **IN PROGRESS** | Catalog + UPC + cart (`046`) + stock (`047`). **Phone-first** checkout; email optional (required for card/PayPal). **SMS on fulfill** (Africa’s Talking). Email OTP APIs optional (082). Apply `APPLY_SHOP_ORDERS.sql`. |
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
| Heritage verification form | **IMPLEMENTED** | `AfriqueIdVerificationForm` component; collects type, country, region, ethnic group, surname, ancestry lineage — migration **084** (`heritage_notes` JSONB column); POST `/api/me/afrique-id` stores notes + sets `pending` |
| Verification request (unverified \| rejected \| expired) | **IMPLEMENTED** | Users cannot self-set verified; `canRequest` includes expired re-verification — migration **085** (RLS update policy fix) |
| RLS update policy fix | **IMPLEMENTED** | Migration **085**: identity_type updates no longer silently fail for non-pending users; only admin-controlled statuses (verified/suspended/manual_review) are blocked from self-update |
| Africa-only signup gate | **IMPLEMENTED** | `app/signup/page.tsx` — 3-state gate (question → continental/diaspora → blocked); `african_origin` stored in auth metadata |
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
| 084 | African ID heritage notes | `heritage_notes` JSONB column on `afrique_ids` — stores ancestry verification data from form |
| 085 | African ID RLS update fix | Replaces old update policy (blocked identity_type changes for non-pending users) with one that only blocks admin-controlled statuses |

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
| 9 | AI metering / cost controls | **IMPLEMENTED** | Migration **081** · `GET /api/account/usage` · improve / create / Studio generate |
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


### 2026-10-05 — S7 publishing implementation / local S8 verification

Native immutable/hash-verified publishing and live loading are implemented behind the existing QA-only flags. Publishing uses consistent-source staging and an atomic locked source comparison with deployment/project/history rollback. Old website-v1 deployments retain their loader path. Native links and pre-hydration device visibility are verified; iframe transport now retains unchanged pages/nodes for large-document edits. See `docs/decisions/3C-S7-publishing-boundary.md` and `evidence/3c/s7/README.md` for evidence and remaining gates. Authenticated QA, R1 authenticated production-build checks, human visual sign-off, the new-project default decision and rollout remain open. No production migration/deploy/merge occurred; S6 work is preserved.

Continuation: 19 publishing/security/rollback SQL assertions passed on the real QA PostgreSQL project. All staged definitions and test data were rolled back; an independent query confirmed the original counts and function hashes. A reproduced lost-response bug is fixed: uncertain commits now show an honest warning, validate acknowledgements and never retry automatically. The editor failure journey passed with the saved draft retained. This adds real QA SQL evidence, not JWT-authenticated browser or multi-connection concurrency sign-off; the release gates above remain open.

### 2026-10-06 UTC — S7 concurrency runner prepared

Four true multi-connection publishing race tests are supplied for a disposable local PostgreSQL database, with observed lock barriers, bounded timeouts, actual migrations and database teardown. The runner remains **BLOCKED / unexecuted** here because a non-root PostgreSQL server cannot be started under this environment's permissions and no local admin URL is available. Seven destination guards are executable; the common bootstrap is verified by the existing single-session PostgreSQL/WASM tests. See `evidence/3c/s7/concurrency/README.md`. This is test preparation, not S8, authenticated QA or release completion.

## 2026-10-06 UTC — independent PostgreSQL races completed

All four publishing races and seven destination guards passed on disposable PostgreSQL 17.11 with independent backend connections. The lock observer now follows queued blocker chains; application code did not change. Database teardown left zero test databases, and the authorized nonpersistent sandbox was stopped. See `evidence/3c/s7/concurrency/README.md` and retained initial/final logs. This supersedes the earlier concurrency execution blocker; authenticated QA, credential rotation confirmation and release gates remain open.

### 2026-10-06 — tablet header visual regression

Visual review identified and reproduced the 768px page-selector/save-status overlap. The toolbar now uses two rows below 1024px and a nonshrinking page selector. Five viewport layout cases and four existing editor/publish journeys passed (nine browser tests); the regression fails against the old header. See `evidence/3c/s7/visual-review/README.md` and before/after captures. Full visual sign-off, authenticated QA and rollout remain open.

### 2026-10-07 — 3D first spatial slice

Native drag/resize, bounded geometry, layer depth, inherited locks and independent device overrides are implemented through canonical operations and existing history. Shared preview/public rendering includes pre-hydration geometry; spatial publishing requires renderer 3 with a local-only forward migration. Full CI passed (5,275 tests; 110 environment-dependent skips; lint 0 errors/289 warnings; 201-page build). The final browser matrix passed all 32 cases, and all nine local performance budgets passed. See `docs/decisions/3D-spatial-first-slice.md` and `evidence/3d/README.md`. Alignment/snapping/guides, extended constraints/transforms and full 3D art direction remain open, as do authenticated QA and release gates. No production migration/deploy/push/merge occurred.

### 2026-10-07 — 3D alignment, snapping and guides

Six container alignment commands, parent/sibling edge and centre snapping, transient guides, a Snap toggle and Alt bypass are implemented using existing geometry operations, responsive overrides and history. Full local verification passed: 37 browser cases, final five alignment cases after visual refinement, nine performance budgets, 5,289 unit/integration tests (110 environment skips), zero lint errors (289 existing warnings), typecheck and a clean 201-page production build. See `docs/decisions/3D-alignment-snapping-guides.md` and `evidence/3d/alignment/README.md`. This closes alignment/snapping/guides; constraints/transforms and responsive art direction remain open. Signed-in QA remains deferred. No production migration/deploy/push/merge occurred.

### 2026-10-08 UTC — 3D constraints and transforms

Per-device container constraints (start/centre/end/stretch/proportional), bounded rotation/scales, reference-preserving geometry edits and local pointer mapping inside transformed groups are implemented through canonical operations/history. Renderer 4 realizes the settings before hydration and retains older snapshots; the forward migration was exercised only in disposable PostgreSQL/WASM. Final CI passed: 5,306 tests / 110 environment skips, zero lint errors / 289 existing warnings, typecheck and clean 201-page build. All 47 browser cases and nine performance budgets passed. See `docs/decisions/3D-constraints-transforms.md` and `evidence/3d/constraints/README.md`. Internal use and completion of the remaining planned stages are the user's goal; the explicit continuation list is `docs/product/INTERNAL-TESTING-COMPLETION.md`. Nested per-device order and richer responsive art direction remain open in 3D, followed by 3E–3J. Signed-in QA remains deferred; no production migration/deploy/push/merge.

### 2026-10-08 UTC — 3D nested per-device order

Move up/down, hierarchy and native section/group child lists now resolve independent tablet/phone order with desktop inheritance and reset. Hidden/new/removed/reparented children retain deterministic ordering, subtree copies remap internal order references, and geometry remains unchanged. Public direct-child/link-wrapper CSS realizes order before hydration; snapshots require renderer 5. Local migration save/replay/publish assertions passed. Full CI: 5,313 tests / 110 environment skips, typecheck, zero lint errors / 289 existing warnings, clean 201-page build. All 56 browser cases and nine performance budgets passed. See `docs/decisions/3D-nested-device-order.md` and `evidence/3d/nested-order/README.md`. Responsive art direction and final 3D gate remain, followed by 3E–3J; signed-in QA stays deferred. No production migration/deploy/push/merge.


### 2026-10-08 UTC — 3D responsive art direction / local development gate

Bounded pixel font size, line height, letter spacing and image focal points are native independent device settings. Public pages now render device layout, typography, copy and images before hydration. Inactive variants are excluded from layout/accessibility/focus; canonical node identities remain unique. Shared controls retain existing operations/history/locks. Renderer 6 is required for new art-direction publications; older native snapshots retain their original compatibility requirements. A regression verifies hash-valid renderer-2 responsive snapshots remain readable while understated new capabilities are rejected.

The complete browser matrix passed 66 cases; after avoiding redundant appearance CSS, all 25 public cases and nine performance cases passed again. The initial phone-100 performance miss is retained, and the final unchanged budgets passed 9/9. Node 20.20.2 passed typecheck, lint (0 errors / 289 existing warnings), 5,322 tests / 110 environment skips and a clean 201-page production build. Generated Turbopack font imports failed with reused cache; clearing only generated .next output fixed the clean build. No application font/build workaround was introduced. See docs/decisions/3D-responsive-art-direction.md and evidence/3d/art-direction/README.md. The 3D development gate and Node 20 verification are complete locally. Signed-in S8 QA, human final sign-off, default/rollout decisions and 3E–3J remain open; no production migration/deploy/push/merge.


### 2026-10-08 UTC — 3E native motion engine / local development gate

Strict version-1 native motion/interaction payloads now have canonical save commands, inverse history, reload/copy preservation, device enablement/reset and a compact inspector accordion. Runtime and explicit editor replay share a browser-native engine. Entrance and hover/link-focus animations use separate wrappers, preserving authored rotation/scale and fully visible SSR content. Reduced-motion changes cancel effects; coarse pointers, JavaScript-off output and missing animation/observer support remain readable. Native effects require renderer 7; older valid snapshots stay readable. Forward local SQL validates command and insertion/restoration paths while retaining owner/journal/service-only publication boundaries.

The complete browser matrix passed 80 cases, followed by 14 final motion cases; nine unchanged performance budgets passed. Node 20.20.2 CI: typecheck, zero lint errors / 289 existing warnings, 5,343 tests / 110 environment skips and clean 201-page build. See docs/decisions/3E-motion-engine.md and evidence/3e/README.md. The local 3E gate is closed. Continue at 3F/3G rich media/editorial, then 3H–3J; signed-in S8 and internal-readiness/release checks remain open. No production migration/deploy/push/merge.


### 2026-10-08 UTC — 3F rich media / 3G editable editorial composition

Native bounded masks/effects, semantic rich text runs and accessible native video now share canonical operations, device overrides, locks, inverse history and immutable publishing. Video uses existing owned-media selection, explicit native playback, preload=none, posters/caption language and honest errors. Safe structured text remains escaped and readable without JavaScript. Renderer requirements advance through 8–11 while older valid snapshots remain readable.

Explicit conversion decomposes hero, editorial-hero, split, text, image, gallery and video into ordinary section/group/text/image/video nodes. The original root ID and supported content/device settings are retained; incompatible settings refuse conversion without mutation. A review explains layout changes, cancellation and Undo. Native grid/carousel/masonry composition replaces opaque media collections. Actual SQL caught and corrected nested video placement and the restore-versus-insert distinction without broadening restoration authority.

Final verification: 147 full browser cases, 9 subsequent rich-text cases, 9/9 unchanged performance budgets, and 59 focused migration-chain SQL tests. Node 20.20.2 CI passed typecheck, zero lint errors / 289 existing warnings, 5,376 tests / 110 environment skips and a clean 201-page build. Initial failures and fixes are retained. See docs/decisions/3F-3G-rich-media-editorial.md, evidence/3f/README.md and evidence/3g/README.md. Both local gates are closed. Next: 3H Brand Brain; 3I–3J and signed-in/internal-readiness checks remain open. No production migration/deploy/push/merge.

### 2026-10-08 UTC — 3H Brand Brain / four-profile authoring slice

The 3H architect/design freeze is recorded. Brand, creative, taste and motion profiles now share the existing Brand DNA identity, strict bounded schemas, deterministic structured compilation, authenticated owner-scoped revision-protected persistence and responsive authoring at `/studio/brand`. Legacy edits advance the same revision; unsupported legacy data remains visible and the original editor remains reachable. Failed/stale/uncertain saves retain drafts. Reload/close, normal internal links and profile selection provide draft-loss protection. Large valid UTF-8 profiles persist without truncation; future and foreign data refuse editing rather than being silently discarded.

Final local gates: 27 focused schema/API/SQL tests; seven browser cases; Node 20.20.2 CI passed typecheck, zero lint errors / 289 existing warnings, 5,403 tests / 110 environment skips and a clean 202-page build. See docs/decisions/3H-brand-brain-design-freeze.md and evidence/3h/profiles/README.md. This closes the authoring/persistence slice, not all 3H. Next: Builder profile selection/application and approved asset curation, then the combined 3H gate. Signed-in S8 remains deferred. No production migration/deploy/push/merge/default change.

### 2026-10-08 UTC — 3H Brand Brain / selected native application

Saved owner profiles now inform native Builder editing through a compact inspector accordion. Palette and opt-in bounded motion apply to the selected native subtree as one KCD transaction and one Undo step, using existing permission, save, retry and canonical acknowledgement paths. Locked ancestry/descendants, legacy/future content, incompatible stored motion, oversized scopes and stale profile revisions refuse a partial application. Text formatting, device layouts and media remain intact. Profile selection survives editor refresh in the URL; permanent site/profile association is not claimed.

Local verification passed 12 focused planner/actual PostgreSQL tests, 71 native editor/profile-authoring regression cases (nine optional performance cases skipped), and five final application browser journeys across desktop/phone. Node 20.20.2 CI passed typecheck, zero lint errors / 289 existing warnings, 5,415 tests / 110 environment skips and a clean 202-page build. Visual evidence and initial locator corrections are in `evidence/3h/application/README.md`; the slice freeze is `docs/decisions/3H-builder-profile-application.md`. 3H remains in progress: permanent site/profile attachment, approved asset curation and the combined phase integration gate are next. Hosted signed-in S8 and rollout remain deferred; no production operation or default change.

### 2026-10-09 UTC — 3H final features and combined functional verification

Brand Brain now supports approved safe image URLs, labelled/ordered approval, existing Studio upload selection and uploads through the existing storage endpoint. Drafts survive failures; removing approval retains stored assets. Saved profiles attach durably to owned sites through a separate revision-protected binding with owner RLS/composite ownership constraints. Attach/detach does not mutate KCD content. Conflicts and uncertain acknowledgements require authoritative reload; incompatible profiles remain visible as unavailable attachments. Palette and opt-in motion still use one validated transaction and Undo step. The two canonical 3H migrations were exercised only in disposable PostgreSQL, not hosted Supabase.

Verification passed 55 focused schema/planner/API/actual SQL tests and all 165 combined browser cases without skips, including 18 Brand Brain journeys and 78 public-rendering regressions. Desktop/phone screenshots were inspected. Full Node 20.20.2 CI passed typecheck, lint (zero errors / 289 existing warnings), 5,431 tests / 110 environment skips and a clean 202-page production build. Evidence: `evidence/3h/complete/README.md`; final freeze: `docs/decisions/3H-completion-design-freeze.md`.

All planned 3H features and local functional QA are complete; absolute development timing sign-off remains open. Initial measurements passed eight of nine unchanged budgets; clean isolated Node 20 reruns and a same-host previous-inspector control also missed budgets with substantial variation. This does not establish a 3H performance regression or earn absolute sign-off. Preserve the measurements and recheck on a stable host before internal readiness; no budget was increased. Next development is the 3I architect phase, followed by 3J. Hosted signed-in S8 remains explicitly deferred. No production migration, advisors, deploy, default change, push or merge occurred.

### 2026-10-09 UTC — 3I blueprint / Experience DNA first slice

The full Generative Experience Engine blueprint now separates owner-authored Experience DNA, evidence-aware Reference Intelligence, metered Model Gateway and reviewed Site Director plans that enter only through validated native KCD transactions. The first vertical slice is implemented: compact native Builder site direction with goal/audience/visitor action/desired experience, ordered reference observations and desired pages. It persists in an owner-scoped revision-protected row with actual SQL validation, immutable ownership, composite project ownership FK and a security-invoker save RPC. Closing/selecting elements, page/device changes and switching inspector tabs retain drafts; navigation/discard guards prevent silent loss. Failed/conflicted/uncertain saves keep drafts and require authoritative reload. Combined UTF-8 payload size is checked before sending. Saving direction never changes actual pages or elements; references are labelled owner observations and not fetched.

Verification: 22 focused schema/API/actual PostgreSQL tests, all 72 combined browser cases without skips, seven final direction rechecks and manually inspected desktop/phone views. Full Node 20.20.2 CI passed typecheck, lint with zero errors, 5,453 tests / 110 environment skips and a clean 202-page build. An unused test import warning was removed afterward; final lint restores zero errors / 289 existing warnings. QA found and fixed SQL CASE parsing, filled text-area label associations, selection-key draft loss and Node 20 dynamic fixture imports. Evidence: `evidence/3i/experience/README.md`; blueprint: `docs/decisions/3I-generative-experience-blueprint.md`; canonical local migration: `20261009040802_experience_dna.sql`.

3I remains in progress: real Model Gateway/reference analysis, reviewed site planning and atomic KCD application are next. A manually saved brief is not AI generation. No provider call was required or made by this slice. Hosted signed-in S8, hosted migration/advisors and stable-host timing remain deferred/open readiness gates. No production operation, default change, push or merge occurred.

### 2026-10-09 UTC — 3I rebuilt engine / local implementation complete

The metered server Model Gateway, supplied-excerpt reference analysis/review, immutable native site/page/section plans and exact reviewed transaction application are implemented. Model output stays a proposal until explicit review and confirmation. The compiler checks native capabilities, assets/links, locks, responsive settings, semantics and Brand Brain limits; the SQL wrapper checks the exact saved transaction and DNA/binding/profile/all-document revisions atomically with the existing operation authority. Cancellation and uncertain acknowledgements preserve drafts and require authoritative proposal reload. Native Undo/Redo, canonical reload and detached publishing remain the same authority. The phone editing exit stays reachable above the breadcrumb.

Fresh current verification passes 50 focused checks, including nine actual PostgreSQL/PGlite role/transaction tests, all 171 combined functional browser cases, and Node 20.20.2 CI: typecheck, zero lint errors / 289 existing warnings, 5,485 tests / 111 environment skips and a clean 202-page build. Evidence: `evidence/3i/engine/README.md`; canonical local migration: `20261009083046_experience_engine.sql`. The reconstruction is saved in durable delta checkpoints, superseding the missing-source state in `docs/decisions/3I-workspace-recovery.md`.

**3I full sign-off remains open:** no Anthropic key is configured in this local server, so real-provider contract/content quality is unverified; the extra test skip is explicit and never counted as success. Reference input is a supplied excerpt, not fetched URLs/screenshots. New gateway reservations serialize with each other; legacy routes still have their separate quota race, and independent-session verification is a readiness check. Hosted migrations/advisors/signed-in S8, stable-host timing and release/default decisions remain deferred/open. Next planned development: the 3J blueprint and real-content benchmark. No production operation, push or merge occurred.

### 2026-10-09 UTC — 3J benchmark and gate harness, in progress

Restored the complete saved 3I source before new work. Added the 3J design freeze, actual-owner biography/assets manual native five-page benchmark, twelve preservation/adversarial/history/snapshot/completion-gate tests, six five-page public browser cases (1440/768/390px, JS off/on) and an explicit real-provider benchmark using production prompts/gateway. Final Node 20 CI passes typecheck, zero lint errors / unchanged 289 warnings, 5,497 tests / 112 environment skips and production build. Thirty page screenshots retained; current explicit provider run failed due to missing server key before making a model call.

**3J is not complete:** the manual reconstruction verifies content preservation, not generated quality or full styled owner-portfolio parity. Specimen-specific inspector edit/reload/history and actual persisted workflow, unsupported legacy capability parity, real-provider output/manual quality, independent-session quota, stable-host timing and deferred hosted S8 remain open. Evidence: `evidence/3j/README.md` and the deliberately blocked `gate.json`. No production operation, deployment, compatibility/default change, push or merge occurred.

### 2026-10-09 UTC — continuation checkpoint

3J local implementation and runnable QA are complete: styled five-page native portfolio, 35 focused checks, ten browser cases, persisted editing/history/publication and recovery. CI passed 5,520 tests / 116 explicit skips, typecheck, zero lint errors / 289 existing warnings and production build. Five digest tests passed after a final test-only assertion-isolation improvement. Full sign-off remains blocked by absent real AI configuration/generated-quality review, non-root native PostgreSQL process rejection (spawn EINVAL), stable-host timing and deferred hosted S8. Original asset artifacts and unsupported legacy behavior remain documented. See evidence/3j/README.md. No production operation, deployment, defaults, push or merge occurred.


### 2026-10-10 UTC — QA reservation security repair verified

Restored the saved 20dc95b source checkpoint before changing QA. Applied canonical migration `20261010003722_qa_checkout_reservation_access.sql` only to Kebu-qa: reservation RLS, removal of browser table/column privileges, and service-only execution for six privileged checkout RPCs. All function bodies and data preserved. Local PostgreSQL regression: 25 passes. Hosted role verification: 22 denials, actual service CRUD/release passed, zero residue and persistent grants confirmed. Full CI: typecheck, zero lint errors / 289 existing warnings, 5,545 passes / 116 explicit skips and 202-page build. The exposed-reservation advisor error is gone; other findings remain under review. Evidence: `evidence/3j/reservation-security.md`.

Internal readiness and full 3J remain BLOCKED: hosted legacy checkout functions reference missing columns and lack canonical branch source, real signed-in S8 is unverified, AI configuration/generated quality is absent, native independent sessions and stable-host timing remain open. The completion gate still refuses sign-off. No production operation, deployment, defaults, push, merge or project pause.


### 2026-10-10 UTC — remaining QA security, atomic stock and ledger repair

QA-only security/stock/ledger migrations applied and post-verified. Browser access to five internal RPC names removed; 18 mutable paths fixed; existing bodies retained. Canonical stock helpers now use atomic relative SQL updates, aggregate duplicate cart lines and fail closed. Recovered missing payment ledger from original migration documents with explicit owner read/service write grants. Thirty-eight focused checks and full CI passed: 5,576 passes / 116 skips, zero lint errors / 289 existing warnings and 202-page build. Ten hosted role denials, service job/stock/refund record-completion, auth trigger and shadow resistance passed. Separate hosted stock sessions refused overselling.

Internal readiness remains BLOCKED. One synthetic concurrency fixture (one auth row, project and product) remains because scoped cleanup requests fail with connector Invalid or expired requestState; exact guarded cleanup and evidence retained. Legacy checkout/cart schema drift, cancellation/refund lifecycle and payment-provider verification still require repair. Signed-in S8, real AI, quota and stable timing remain open. No production operation/deploy/default change/push/merge/pause. See `evidence/3j/remaining-repairs.md`.


### 2026-10-10 UTC — resumed cleanup and native timing verification

Original identity-guarded Kebu-qa stock fixture cleanup succeeded. Separate hosted readback confirms all three fixture IDs absent and zero users/projects. Nine controlled local native editor timing cases pass the unchanged budgets on desktop/tablet/phone at 100/500/2,000 nodes. Existing application CI remains 5,665 passes / 116 explicit skips and build passed. Explicit real-provider run still fails at missing server Anthropic configuration. No application code changed. Genuine signed-in S8, real AI/payment/email/Storage, authenticated load/concurrency and live deployment remain blocked; full readiness is not signed off. Exact prerequisites and evidence: `evidence/3j/resumed-readiness.md`.

### 2026-10-10 UTC — legacy AI quota reservation repair

Legacy website/improve/Studio model routes now share atomic service-only reservations with native Experience generation. Browser usage forgery is revoked; unavailable metering stops before provider work. QA-only migration and actual PostgreSQL/API checks pass. Final Node 20 CI passes 5,672 tests / 117 explicit skips, zero lint errors / 288 existing warnings and production build. Full concurrency proof remains unverified: local non-root process is refused and hosted observers did not capture a barrier. The committed synthetic concurrency user/project/event remain because guarded cleanup fails at connector requestState; exact identities and cleanup conditions are preserved in `evidence/3j/atomic-ai-reservation.md`. Supabase dashboard access and a fresh QA-only key are obtained, but Vercel's security prompt prevents Preview installation. No production operation or deploy. Full readiness is BLOCKED.

### 2026-10-10 UTC — Preview credentials isolated; QA fixture cleaned

Preview now points to active Kebu-qa with its public URL/publishable key and a sensitive QA server key. Existing Production values are retained in Production-only entries. Vercel metadata confirms independent environment targets. The editor no longer presented its earlier security prompt; no authentication protection was disabled.

The temporary concurrency fixture was removed through the signed-in dashboard using an identity-guarded transaction. Independent database readback confirms user/project/usage counts 0/0/0. The Git history was restored from durable checkpoints after the earlier Git directory disappeared; exact verified source is `5887965`, with GitHub main an ancestor. Automatic approval review initially blocked publishing to the newly named `mbayangxo/Kebu` branch `qa/kebu-ready-oct10` because that exact destination lacked explicit authorization. The user subsequently approved that QA branch and Preview deployment; the result is recorded below. No Production mutation occurred. Genuine provider credentials and the remaining 3J gates remain BLOCKED. Details: `evidence/3j/atomic-ai-reservation.md`.

### 2026-10-10 UTC — approved QA Preview deployed; current Supabase keys supported

The approved QA branch is published. Application source through `e0206c75` is deployed READY at https://kebu-6etaprytn-mbayangxos-projects.vercel.app/ (`dpl_A2ccKcWbTwawMFewDup8fKvtE59p`). Main and Production remain unchanged. Vercel Hobby rejects five-minute cron schedules even for Preview creation; this QA branch omits schedules only to permit testing. Do not promote or merge its scheduler configuration into Production.

Hosted configuration checking reproduced a signup blocker: both key classifiers recognized only legacy JWTs and rejected valid current publishable/secret keys. Server and browser checks now recognize the current formats, continue rejecting elevated keys in public configuration, and retain legacy compatibility. Eight regression assertions pass; four failed before the repair. Full Node 24 CI exits zero: typecheck, lint (zero errors / 288 existing warnings), 5,529 passing tests / 268 explicit skips, and 202-page production build. Additional SQL/provider suites are skipped in this restored environment because their dependencies/credentials are absent; these skips are not sign-off.

Live Supabase configuration returns HTTP 200 with `ok:true`, public role `anon` and server role `service_role`, without key values. The homepage renders in the browser; observed console errors came from the browser extension, not the app. This validates configuration formats and rendering, not genuine signed-in persistence. Protected API checks were blocked by the fetch tool's authentication classification and browser ERR_BLOCKED_BY_CLIENT, so no application authorization result is claimed. Independent QA readback confirms zero users and projects.

Full readiness remains BLOCKED by a genuine QA sign-in and S8/Storage flow, real AI credentials and output quality, payment sandbox/webhook/refund verification, Resend verified sender and recipient, Preview cron secret and authorized production scheduler, independent-session atomic quota proof, stable hosted performance and remaining release/visual gates. Account creation must be completed by the user through the secure browser handoff; provider secrets must be installed securely, never pasted into chat. The Ready Preview is available for inspection and testing, not certified for production use.
