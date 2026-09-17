# Kebu — Existing Product UX, UI & Information Architecture Audit (September 2026)

Read-only audit. No code changes were made. Scope: Kebu core/account/business, Opportunity OS, Kebu Website Builder, Kebu Shop, and Kebu Studio (partially built) — the products that actually exist today. Search, Cloud, and Mail are not audited as implementation; Section 16 below sets the principles they should inherit when built.

Built from a systematic codebase inventory (routes, nav definitions, and representative components across each product area), not from spec docs alone — every finding below traces to actual code.

---

## 1. Current Kebu product map

What exists in code today, independent of what the docs describe:

- **Global shell** — four separately-coded navigation systems that don't share a data source: a marketing header (`app/components/nav.tsx`), a marketing link set (`lib/navigation/marketing-nav.ts`), an in-app product-switcher sidebar (`app/components/kebu-nav-shell.tsx`), and a second, independently-defined mobile bottom bar (`app/components/mobile-nav.tsx`). No breadcrumb component exists anywhere in the repo.
- **Business** — `/business`, `/business/[id]` (a genuinely rich dashboard: readiness, registration, documents, legal structure, team, owners), `/id`, `/ka-score` (a stub redirect), `/build-business` (a second, disconnected "create a business" flow), plus a Shopify-style `KebuBusinessNavTree` that lives *inside* the Builder, not standalone.
- **Opportunity OS** — a real, Supabase-backed core (`/opportunity`, country explorer, personalized for-you feed, listings, entitlement-gated) surrounded by ~20 orphaned routes reachable only by direct URL, several of which are raw, unguarded LLM completions ("AI Engine" pages) and one confirmed duplicate (`/opportunities`, a static 676-line manifesto with different branding, unlinked from `/opportunity`).
- **Kebu Builder** — `/create/[id]` (editor), `/my-sites` (owned sites list), `/templates` and `/create/aesthetics` (a confirmed duplicate — same "Aesthetic Gallery" surface at two URLs), `/sites/[subdomain]` (published output). A 6-tab left rail (Sections, Pages, Aesthetic Editor, Photos, Nav, Shop) plus an out-of-band SEO link that leaves the Builder for `/my-sites/[id]`.
- **Kebu Shop** — not a separate app: commerce state attached to a Builder site, rendered through the same `site-renderer.tsx` pipeline. Merchant admin at `/shop/[projectId]` is broad and mostly real (orders, payments, analytics, discounts). `/store/[slug]` is a confirmed legacy redirect kept alive as a dead top-level route.
- **Kebu Studio** — partially built as intended, but further along than its own docs suggest: a schema-validated multi-page canvas document model, a real composition/timeline contract for video, 33 backing API routes, full CRUD/autosave/undo-redo. Already visually forked from the rest of the app (its own hardcoded hex palette instead of the shared `KEBU` token object other products use).
- **~20 additional top-level routes** (`capital`, `capital-stack`, `bankability`, `budget-intel`, `start`, `starts`, `build`, `industry`, `procurement`, `regulatory`, `remittance`, `sovereignty`, `gatekeepers`, `afcfta`, `market`, `compare`, `network`, `feed`, `social`, `collective`, `agents`, `assistant`, `blueprint`, `brand`, `reach`, `scan`, `map`, `programs`, `grants`, `path`, `goals`, `matches`) exist as real, buildable pages with no inbound link from any of the four nav systems — reachable only by typing the URL.

## 2. Current information architecture

As actually coded, not as documented:

- **No single source of truth for "what are Kebu's products."** `nav.tsx`'s `PRIMARY` array, `kebu-nav-shell.tsx`'s `PRODUCTS` array, and `marketing-nav.ts` each enumerate a different subset with different labels for the same destination (e.g., the business cluster is "My KEBU" in one, "Alkebulan" in another). Shop is missing from the marketing header entirely.
- **Two different mobile bottom bars** with different tab sets, chosen by route rather than a single switch (`mobile-nav.tsx`'s `TABS` vs. `kebu-nav-shell.tsx`'s `MobileBottomTabs`).
- **The account/business boundary is not enforced in the data model or the UI.** `/account` contains a personal Afrique ID card and billing; `/business` contains a "you" tab. Personal-identity surfaces live in both places.
- **Business management is subordinate to the website/shop builder**, not a hub in its own right — the richest Business nav tree (`kebu-business-nav.ts`) is mounted *inside* `site-merchant-hub.tsx` as one of ten sidebar sections (below Orders, Products, Growth, Content, Markets, Finance, Analytics, Online Store, Shop, Apps), with "Business" (Kebu ID/Score/Team/Documents) last.
- **Three nav entries — Growth, Kebu ID, Team — all resolve to the identical URL** (`/business/{id}`), landing on the same full dashboard rather than a focused view each time.
- **Builder's site-wide settings are split across two disconnected surfaces:** the in-Builder "Aesthetic Editor" tab (theme, hero image, popup, favicon, meta) and the separate `/my-sites/[id]` route (domain, SEO again, analytics, theme switching) — the same SEO fields are editable in both places with no sync indicator.
- **"Aesthetic/theme" is three different features under overlapping names**: `/create/aesthetics` (pick a look for a new site), `/my-sites/[id]`'s theme library (switch an existing site's look), and the Builder's own "Aesthetic Editor" tab (edit the current theme's tokens).
- **Opportunity OS's real, linked product (`/opportunity`) and its unlinked ~20-route periphery use different design systems, different data patterns (Supabase-backed vs. hardcoded static arrays vs. raw LLM completion), and are never cross-referenced.**

## 3. Recommended information architecture

Every change below is justified by a specific problem found above, not aesthetic preference.

1. **Establish one navigation manifest** (a single typed array/config) that `nav.tsx`, `kebu-nav-shell.tsx`, `mobile-nav.tsx`, and `marketing-nav.ts` all read from, instead of four independently maintained lists. This alone would eliminate the mislabeling, missing-Shop-link, and inconsistent-mobile-tabs problems in one structural move.
2. **Make Business a standalone top-level hub**, not a buried section inside the site/shop builder's sidebar. A business owner's mental model is "my business owns a website and a shop," not "my website's sidebar happens to contain my business." Move `KebuBusinessNavTree`'s Business-identity items (Kebu ID, Kebu Score, Team, Documents) to be the *entry point* at `/business/[id]`, with Website and Shop presented as things the business owns and links out to — not the reverse.
3. **Collapse Kebu Score/KA Score/"readiness" into one name, one page, one explanation.** Currently `/ka-score` redirects away, the card says "Kebu Score · Business Readiness," and docs say "KA Score" — pick one term, give it a real landing page (not a redirect stub), and explain it in one sentence at first use everywhere it appears.
4. **Give Builder one settings hierarchy instead of two.** Site-wide settings (domain, SEO, theme, chrome) should live entirely inside the Builder as a panel/drawer, not require navigating to a separate route that loses canvas context. If `/my-sites/[id]` needs to exist for a pre-editor overview, it should link into the Builder's settings panel rather than duplicating the same fields.
5. **Merge the three "aesthetic" surfaces into one hierarchy**: a "Theme" concept with "current theme" + "change theme" (opens the gallery) + "customize tokens" (the editor), all reachable from one place, one name.
6. **Delete or redirect every confirmed duplicate route**: `/store` → already redirects, remove the top-level segment; `/templates` → redirect to `/create/aesthetics`; `/opportunities` → either merge its content into `/opportunity` or redirect and retire it.
7. **Either link the ~20 orphaned routes into a real nav structure or retire them.** An unlinked but functioning page is worse than a 404 — it's a maintenance and trust liability (see the raw-LLM "AI Engine" pages under Opportunity OS Problems below). Every route should be reachable by navigation, not just URL guessing, or it shouldn't exist as a public route at all.
8. **Add one real breadcrumb/location-trail primitive** and use it inside Business, Opportunity OS, and Builder wherever there's more than one level of drill-down (e.g., Business → a specific business → a specific document). `BackLink`'s single-step `router.back()` is not a substitute.

## 4. Global Kebu UX problems

- Four independent navigation systems with inconsistent labels and destinations for the same concepts (see §2).
- No breadcrumb component anywhere in the codebase — the only wayfinding primitive is a single-step back button.
- No account/business boundary enforcement — identity surfaces are duplicated across `/account` and `/business`.
- Five overlapping "get started" entry points (`start`, `starts`, `build`, `build-business`, `welcome`) with no shared naming, no cross-linking, and no way for a user to know which is canonical.
- No shared design-system primitives at all (see §10) — every product area hand-styles its own buttons, modals, and overlays.

## 5. Product-specific UX problems

### Business
- Buried inside the website/shop builder's sidebar rather than standing as its own hub; "Business" is the *last* of ten sections a user scrolls past.
- Three nav items (Growth, Kebu ID, Team) all point at the identical URL with no differentiated view.
- "Documents" nav item routes to the registration wizard, not the real, functioning documents panel.
- Kebu Score/KA Score is a stub redirect with no explanation of what the number means or how to improve it; "verification" exists only as an unrendered database field plus one passive sentence in an unrelated editor.
- A second, fully disconnected "create a business" flow (`/build-business`) produces nothing tied to the real Kebu ID entity a user might have already created.
- Billing has no implemented surface anywhere in Business, despite a defined pricing/tier system existing in the docs.
- (Positive, worth preserving as the model for the rest: Team and Kebu ID are real, honestly built, and explained in plain language — "similar to an EIN in the United States.")

### Opportunity OS
- The real, linked, Supabase-backed product (`/opportunity`) is surrounded by roughly a dozen unlinked "AI Engine" pages that pass a hardcoded system prompt straight to an LLM and render the output as fact, with no retrieval, sourcing, or confidence labeling — a direct contradiction of the product's own written law against being "a ChatGPT wrapper" that must never "invent opportunities without evidence."
- A duplicate entry point (`/opportunities`, 676 lines of hardcoded static content, different visual system) exists alongside the real `/opportunity`, with no cross-link or redirect between them.
- No country → city/town hierarchy exists despite this being a stated goal — location is handled as free-text country filters only.
- `/market` is architecturally a separate classifieds product wearing Opportunity OS's branding, disconnected from the rest of the discovery data model.
- A self-acknowledged dead stub (`/map`, "Legacy hard-coded map") proves the team already knows some of this needs cleanup — it hasn't yet been applied to the other ~19 orphaned routes.

### Kebu Builder
- No single consistent model for where a setting lives: page-level, site-level, and account-level settings are mixed within the same "Aesthetic Editor" tab, and site-wide settings additionally leak into a separate route entirely (see §2 and §3).
- The same underlying object (header/footer chrome) is editable through two different UI patterns depending which tab you start from — the "Nav" tab bypasses the breadcrumb drill-down the "Sections" tab uses for the identical data.
- Three separate ways exist to switch which page you're editing (a top-bar selector, a second selector inside the Sections tab, and the full Pages tab) with no clear reason for the redundancy.
- The AI assistant ("Ask Yande") is a canvas-covering floating panel that defaults to open on load, rather than a persistent, dismissable top-bar entry point consistent with how Preview/Undo/Publish are presented.
- (From the prior bug-level audit, still open: a fake "Save draft" button, a missing "unsaved changes" save-state, no beforeunload guard, and templates shipping with no imagery — see `KEBU-BUILDER-UX-AUDIT-2026-09.md` for full detail.)

### Kebu Shop
- Newsletter/subscriber marketing tools (`ShopNewsletterPanel`, `EmailFlowsPanel`) are fully built but have zero nav entry point anywhere in the app — finished work nobody can reach.
- The customer-facing storefront shows no seller-identity/trust signal at all — a `ShopSellerTrustBanner` exists but is only wired into the merchant dashboard, never into the actual buyer-facing pages.
- WhatsApp-only checkout (unpaid, manual confirmation) is the default rail with zero product nudge toward the already-built paid rails (card, Wave, Orange Money) — a real differentiation opportunity for African commerce sits unused.
- Payment credentials are global environment variables rather than per-merchant, which is a defensible aggregator model but needs an explicit payout/reconciliation story before being presented to merchants as "card payments work here."
- (Positive, worth preserving: mobile cart/product-detail are genuine bottom-sheet patterns with safe-area handling, not a shrunk desktop layout — this is the reference the rest of the app's mobile work should match.)

### Kebu Studio
- Foundation is solid and shouldn't be torn up: a generalized, schema-validated canvas/composition model with real persistence, not a demo shell.
- Already visually forked from the rest of Kebu — the working editor surfaces use zero shared `KEBU` design tokens, instead hardcoding their own hex palette, which will compound as more Studio surface is built and make a future rebrand/theming pass unable to reach it.
- One 1,354-line video-editor file is already large enough to warrant splitting before more timeline/caption features are layered on top of it.

## 6. Visual design problems

- No shared component library exists (no `components/ui/`) — grepping for shared cross-directory imports across the five product areas returns zero hits.
- At least 140 distinct hand-written button-style class combinations were found across Business/Shop/Opportunity/Builder/Studio — buttons are restyled per call site rather than driven by one primitive.
- Modal/overlay logic (`fixed inset-0` + backdrop + close handling) is independently reimplemented at least 7 times, each with its own dismissal rules — consistent with the panel/z-index findings in the earlier Builder-specific audit.
- Kebu Studio's editor surfaces use a completely separate, hardcoded color palette instead of the shared `KEBU` token object used ~130 times in Builder components and ~55 times in Business components.

## 7. Mobile problems

- Business detail pages use minimal responsive tuning (5 breakpoint-prefixed classes in a 494-line page, concentrated on outer padding only — interactive controls don't resize for touch).
- Shop's merchant order panel (592 lines) has zero responsive-prefix classes at all — same layout at every width, though it does avoid raw HTML tables in favor of stacked cards, which at least sidesteps the classic horizontal-scroll-table failure.
- Opportunity OS listing pages show almost no responsive tuning either (1 breakpoint-prefixed class in 164 lines).
- Builder's rendering of *published, end-customer* sites is genuinely mobile-first (bottom sheets, safe-area insets, thumb-zone placement) — this pattern simply hasn't propagated to the Builder's *own* admin surfaces or to Business/Opportunity OS/Shop's internal tools.

## 8. Low-bandwidth problems

- `next/image` is used zero times across Business, Shop, Opportunity OS, and Studio — every image is a raw `<img>` tag (54 total), meaning no automatic format/size optimization outside of what Builder's published-site renderer does for end customers.
- `loading="lazy"` appears only inside Builder's site-renderer (7 occurrences) — Business, Shop, and Studio have no lazy-loading at all.
- Retry logic on failed network requests exists only in two Shop utility files; Business and Opportunity OS have no retry pattern anywhere in their data fetching.
- A skeleton-loading component exists in the codebase but is used in exactly one place — everywhere else, including Business's own detail page, loading state is a plain text line ("Loading business…") with no structured placeholder.

## 9. Trust problems

- Builder's publish flow is the reference standard: distinct, specific error copy for every failure path (migration needed, billing required, network failure, generic failure), and a real success link only shown on confirmed success.
- Shop's order-fulfillment flow has a real gap: the API returns whether a customer-notification email actually sent, but the merchant-facing panel never reads or displays that value — a merchant can mark an order fulfilled with no on-screen confirmation the customer was actually notified.
- Business verification is nearly invisible: the database tracks a verification level, but no component renders it anywhere with meaning; the only in-product mention is a single passive sentence in an unrelated form.
- Opportunity OS's unlinked "AI Engine" pages are a trust problem in their own right — presenting unsourced LLM output as authoritative business/regulatory guidance with no citations or confidence indicators is the single largest trust risk found in this audit.

## 10. Design-system problems

- No shared primitives layer exists; every one of the five product areas is fully self-contained with zero cross-imports.
- The practical effect compounds every other section above: visual inconsistency (§6), mobile inconsistency (§7), and even trust gaps (§9, e.g. inconsistent error/success UI) all trace back to the same root cause — there is no shared "Kebu primitives" layer (buttons, modal, drawer, toast, skeleton, dropdown) that every product is required to build on, only a shared color/token object (`KEBU`) that not every product even uses consistently (Studio doesn't use it at all in its working surfaces).

## 11. The 20 highest-leverage improvements across existing Kebu products

1. Unify the four separate navigation manifests into one source of truth (§2, §3).
2. Fix the Builder's "Save draft" button so it actually calls a persistence function in every state (carried over from the prior Builder audit — still the single most direct violation of "no fake functionality" found across either audit).
3. Add a real "unsaved changes" state to Builder's save-status machine and a `beforeunload` guard.
4. Promote Business to a standalone top-level hub instead of a buried tab inside the site/shop builder.
5. Give Kebu Score/KA Score/"readiness" one name, one real landing page, and an inline explanation everywhere it's shown.
6. Retire or redirect the confirmed duplicate routes: `/store`, `/templates` vs `/create/aesthetics`, `/opportunities` vs `/opportunity`.
7. Either wire the ~20 orphaned routes into real navigation or remove them — especially the unguarded LLM "Engine" pages under Opportunity OS, which is also a trust and legal-exposure issue, not just an IA one.
8. Merge Builder's two disconnected site-settings surfaces (in-Builder Aesthetic Editor vs. `/my-sites/[id]`) into one.
9. Collapse the three "aesthetic/theme" features (gallery, theme library, token editor) into one coherent hierarchy.
10. Populate design-world templates with real imagery — every sampled template ships 100% empty image slots today, and empty galleries silently vanish on live sites rather than showing a placeholder (carried over from the prior audit).
11. Wire Shop's newsletter/subscriber tools into the merchant nav — they're fully built and currently unreachable.
12. Surface seller-identity/trust signals on the actual customer-facing storefront, not just the merchant dashboard.
13. Add a lightweight nudge from WhatsApp-only checkout toward the already-built paid rails (card/Wave/Orange Money) at appropriate order-value or order-count thresholds.
14. Show Shop's order-notification email-sent status to the merchant instead of silently discarding it.
15. Give Business verification a real, visible status indicator with an explanation of what it means and how to progress it.
16. Build one shared primitives layer (button, modal, drawer, toast, skeleton, dropdown) and migrate at least the highest-traffic surfaces (Builder rail, Business dashboard, Shop admin) onto it first.
17. Reconcile Kebu Studio's editor palette onto the shared `KEBU` token object before more Studio surface is built.
18. Add `next/image` and consistent `loading="lazy"` across Business, Shop, and Studio, matching the pattern Builder's own site-renderer already uses.
19. Add one real breadcrumb/location-trail component and use it in Business, Opportunity OS, and Builder wherever there's more than one level of drill-down.
20. Consolidate the five overlapping "get started" entry points (`start`, `starts`, `build`, `build-business`, `welcome`) into one funnel.

## 12. The 10 biggest problems with Kebu's current layout/information architecture

Being direct, as asked:

1. There is no single, authoritative definition of "what are Kebu's products and how do I move between them" anywhere in the code — four different navigation arrays disagree with each other.
2. Business — arguably the most important organizing concept in the entire product ("everything rolls up to a business") — is implemented as a buried sidebar section inside a different product (the website/shop builder), not as its own hub.
3. The same concept ("aesthetic"/"theme") is implemented as three different, separately-routed, separately-named features with no cross-navigation between them.
4. Site-wide settings in Builder are split across two disconnected routes with duplicated, unsynchronized fields (SEO appears in both).
5. There is no location-trail/breadcrumb primitive anywhere in the app — the deepest a user can drill (a document inside a specific business, a section inside a specific page inside a specific site) has no way back except a single-step "back" button.
6. Roughly 20 real, functioning routes exist with no path to them from any navigation system — including some of the product's highest-risk pages (unsourced LLM "engine" pages presenting themselves as regulatory/financial guidance).
7. At least three pairs of routes are direct duplicates of each other (`/opportunity` vs `/opportunities`, `/templates` vs `/create/aesthetics`, `/store` vs `/sites`), serving the same purpose with different implementations and no redirect or reconciliation.
8. The personal-identity vs. business-identity boundary isn't enforced anywhere — the same kind of content (identity, profile data) appears in both `/account` and `/business`.
9. Five different "get started" flows exist with no shared taxonomy, so a new user has no way to know which one is the "real" onboarding path.
10. There's no design-system layer underneath any of this, so even once the IA above is fixed, every product will keep re-solving the same button/modal/loading-state problems independently rather than inheriting a shared answer.

## 13. The 10 changes that would make Kebu feel dramatically more professional

Prioritized for large perceived-quality gain relative to implementation effort:

1. **Fix the fake "Save draft" button and missing unsaved-changes state in Builder.** Nothing undermines trust in a website builder faster than uncertainty about whether work is saved — and it's a small, isolated fix.
2. **Give every design-world template real hero and product imagery.** Templates are the first impression of the entire platform; empty gray boxes read as unfinished no matter how good the underlying architecture is.
3. **Merge the three "aesthetic/theme" surfaces into one.** This single confusion point makes the whole Builder feel disorganized even though most of it is well-built.
4. **Retire the confirmed duplicate/dead routes** (`/store`, `/templates`, `/opportunities`, `/map`). Nothing signals "not fully finished" like reachable dead ends.
5. **Take the unguarded LLM "Engine" pages out of Opportunity OS**, or gate them behind real retrieval/sourcing. This is both a professionalism and a liability issue — presenting raw model output as financial/regulatory fact is the single riskiest thing found in this audit.
6. **Give Business its own top-level presence**, separate from being one tab inside the site builder. This is the highest-leverage structural change for making the whole product feel coherent, since almost everything else (website, shop, team, verification) is supposed to roll up to it.
7. **Add real trust confirmation to Shop's order-fulfillment flow** (surface the email-sent status that's already being returned by the API but discarded).
8. **Adopt one shared button/modal/toast primitive set**, even starting with just the highest-traffic surfaces. The visual inconsistency across 140+ hand-styled button variants is one of the most visible signs of a product not yet operating as one system.
9. **Add a real breadcrumb/location trail.** Cheap to build, immediately makes every deep surface (a document inside a business, a section inside a page) feel navigable rather than a maze.
10. **Reconcile Kebu Studio's visual language onto the shared design tokens** before it grows further — the earlier this is done, the cheaper it stays.

## 14. Future products — design principles to inherit (Search, Cloud, Mail)

These three products do not exist yet and are not audited as implementation. When they are built, they should start from the following, all directly derived from what worked and what didn't in the products audited above:

- **Navigation**: read from the single unified navigation manifest recommended in §3 from day one — never hand-roll a separate nav array the way the four existing systems did.
- **Design primitives**: build on the shared component/primitives layer recommended in §10 rather than hand-styling their own buttons, modals, and overlays — this is the single biggest thing that would keep them from fragmenting the way the current five products have.
- **Terminology**: introduce every internal/branded term (the way "Opportunity OS," "Kebu Score," and "readiness" were introduced without explanation) with a one-sentence inline definition at first use, not as an assumed-known label.
- **Mobile**: default to the mobile-first patterns already proven in Builder's published-site rendering and Shop's customer-facing checkout (bottom sheets, safe-area insets, thumb-zone placement) rather than the desktop-first patterns found in Business, Opportunity OS, and Shop's own admin surfaces.
- **Low-bandwidth**: use `next/image` and `loading="lazy"` by default, and build a real retry/offline pattern from the start — modeled on Builder's already-working offline save queue, not the fetch-and-hope pattern found elsewhere.
- **Trust**: every action that asks the user to trust the system (a save, a send, a verification, an AI-generated result) must show an explicit, specific success/failure state before it ships — modeled on Builder's publish-error handling, not Shop's discarded email-sent status.
- **Loading/error/success states**: use the existing skeleton component broadly rather than plain loading text, and never let a fetch fail silently.
- **No fake functionality**: if Search, Cloud, or Mail ship a feature that can't yet do the real thing, label it honestly ("coming soon," as Shop's app marketplace does) rather than presenting a non-functional control as if it works.

---

### Note on scope and confidence

This audit sampled representative files and components per product area rather than reading every file in the repository (Kebu is a very large codebase). Every specific claim above traces to code that was actually read; where a finding is based on absence (e.g., "no breadcrumb component exists"), that was checked by search across the relevant directories, not inferred. Areas not deeply sampled (the full breadth of `app/api/`, every Opportunity OS sub-route, every Studio panel) may contain additional findings consistent with the patterns identified here.
