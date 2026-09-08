# Kebu Builder — slice backlog

**Last updated:** 2026-09-07  
**Current focus:** Creation Stack **W9** mobile edit parity (deviceOverrides). Aesthetics A–E locked; next worlds only when assigned. Prefer backend correctness + Data Saver over more aesthetic screens.

---

## Phase A — Builder (priority)

| ID | Slice | Status | Definition of done |
|----|-------|--------|-------------------|
| **B1** | AI preview → confirm → apply | **IMPLEMENTED** | Preview API returns intents + definition; canvas shows preview; apply persists; discard reverts; command bar + Yande sidebar |
| **B1b** | May Lecor portrait + nav + moveable hero | **IMPLEMENTED** | May studio cutout replaces Elle stock; default nav (Shop · May's World · About · Press · Mayjor Good); canvas drag + upgrade-maylecor sync |
| **B1c** | May cutout parallax + motion in builder | **IMPLEMENTED** | Scroll-linked cutout motion in editor; loop animations (bob/float/spin); click pulse; defaults in `maylecor-ksendr-defaults` |
| **B1d** | Cutout click links | **IMPLEMENTED** | `layerLinks` + extra cutout `href`; editor link field; live site + preview navigation |
| **B2** | Pages manager UI | **IMPLEMENTED** | Dedicated **Pages** rail tab; add/rename/reorder/delete via `/api/projects/[id]/pages`; refresh persists |
| **B3** | Publish + multipage E2E verification | **IMPLEMENTED** | Snapshot builds all pages; `validateWebsiteDefinition` passes; public `/sites/{subdomain}/{slug}` routes |
| **B4** | Custom domains complete | **IMPLEMENTED** | DNS verify API; Vercel attach; middleware routing tested; Starter+ plan gate |
| **B5** | One new design world end-to-end | **IMPLEMENTED** | Fashion Atelier multipage world (`design-worlds/fashion-atelier-world.ts`) + tests |
| **B6** | AI change preview polish | **IMPLEMENTED** | Section-level accept/reject; partial apply API; `BuilderAiPreviewPanel` |
| **B7** | Reference screenshots in `docs/reference/` | **IMPLEMENTED** | Annotated notes packs (`kebu/`, `shopify/SCREENSHOTS.notes.md`) + dossiers |

---

## Phase B — Commerce

| ID | Slice | Status |
|----|-------|--------|
| **C1** | Shop order webhooks → verified `payment_status` | **IMPLEMENTED** | Paystack webhook integration test; server-only paid status |
| **C2** | Billing limit enforcement (server-side) | **IMPLEMENTED** | `enforce-limits.ts`; domains + products gated; unit tests |
| **C3** | Playwright E2E checkout smoke | **IMPLEMENTED** | `playwright.config.ts` + `e2e-checkout-smoke.spec.ts` (env-gated) |

---

## Phase C — Account & platform

| ID | Slice | Status |
|----|-------|--------|
| **P1** | Unified Kebu Account workspace switcher | **IMPLEMENTED** | `active_business_id` on profile; `/api/me/workspace`; sidebar Personal ↔ Business switcher |
| **P2** | Kebu Opportunity OS entitlement gate | **IMPLEMENTED** | `account_entitlements`; sync from African ID; for-you API + UX gate |
| **P3** | Opportunity Card slice (master spec #2) | **IMPLEMENTED** | `opportunity_cards` migration + seed; `/opportunity/cards`; public API |

---

## NOT STARTED (do not fake)

Kebu Mail · Kebu Search engine · Kebu Studio canvas · Property Infrastructure · Full KA Score · Bug Sentinel dashboard · Playwright visual regression

---

## Phase D — Creation Stack (Site Builder · Shop · Studio)

| ID | Slice | Status |
|----|-------|--------|
| **B8** | Inline horizontal section editor (Shopify canvas) | **IMPLEMENTED** |
| **W13** | Header / footer universal sections | **IMPLEMENTED** — `site_chrome` on projects, compose at publish/preview, builder sidebar |
| **W14** | Forms section E2E | **NOT STARTED** |
| **W15** | Blog | **IMPLEMENTED** |
| **W16** | Popups / modals | **IMPLEMENTED** |
| **W9** | Full mobile edit parity | **IMPLEMENTED** (hero · nav · text · features · faq · products headings/copy via `deviceOverrides`) |
| **C4–C8, C9, C12, C6, C7** | Shop commerce slices | **C6 gift redeem IMPLEMENTED**; **C8 subscriptions IMPLEMENTED** (product flag → public subscribe → renewal cron → merchant pause/cancel); C4/C5/C7/C9/C12 live |
| **AN1** | Full analytics accrual + dashboard DoD | **IMPLEMENTED** (funnel events + Shop Analytics tab) |
| **S1** | Studio canvas (Canva-type) | **IMPLEMENTED** (see roadmap) |

Full ordered queue: `docs/product/KEBU-CREATION-STACK-ROADMAP.md`

---

## Current focus

**Next assigned slice:** Harden Data Saver / performance on remaining shop paths; then next incomplete Creation Stack item (not more aesthetics unless assigned).

Phase A–C complete. Phase D: B8 ✅ → W13 ✅ → W14 ✅ → W15 ✅ → W16 ✅ → **W9 ✅** → Shop gaps → AN1 ✅.
