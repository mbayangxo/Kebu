# Kebu ID, Registration & KA Score — implementation status

Human specs: `.cursor/rules/kebu-id.mdc` · `.cursor/rules/kebu-ka-score.mdc` · `docs/KEBU-ECOSYSTEM.md`

This document maps your product spec to what exists in the repo **today** and what the next slices are.

---

## Business Registration progress tracker

**Canonical steps (UI on `/business/[id]`):**

| Step | Server auto-complete today? |
|------|------------------------------|
| Application Started | Yes — on business create |
| Documents Uploaded | Yes — when founder ID + business plan uploaded (migration 017) |
| Identity Verified | Yes — when registration profile fields are complete |
| Government Review | **Blocked** — needs gov connector + submit flow |
| Payment Confirmed | **Blocked** — needs registration payment flow |
| Registration Approved | **Blocked** — admin/gov integration |
| Registration Certificate Ready | **Blocked** |
| Tax Registration | **Blocked** |
| Business Active | **Blocked** |

**DB:** `registration_progress` per business (migration 007, timeline alignment 016)  
**UI:** `RegistrationProgressTimeline` — ✓ complete · ⏳ current · ⬜ pending  
**Code:** `lib/kebu-id/readiness.ts` → `REGISTRATION_TIMELINE`

Steps only advance via **approved server events** — never from the browser alone.

---

## Kebu ID — Slice 1 (mostly complete)

| Requirement | Status |
|-------------|--------|
| Create draft business + public Kebu ID | Done — `POST /api/businesses` |
| Founder RBAC, audit, idempotency | Done |
| Dashboard reload / cross-user denied | Done — tests in `tests/kebu-id/` |
| Country modules | Senegal only (`lib/kebu-id/countries/sn.ts`) |
| Verification levels 2–4 | Not yet |
| Team invites, beneficial owners | Not yet |
| Claim existing company with proof | Not yet |
| Public Kebu ID card (non-draft) | Always 404 for drafts (by design) |

**Migrations:** 005 → 006 → 007 (apply in order)

---

## KA Score vs Business Readiness (important)

| System | What it is | Where |
|--------|------------|--------|
| **Business Readiness** | Server-side profile + document completion for registration; bands Building → Opportunity Ready; explainable factors | `/business/[id]` · `/ka-score` · `business_readiness_scores` |
| **KA Score (Kebu Score)** | Full business score from verified platform activity — identity, orders, fulfillment, compliance, etc. | **Not built yet** — no `ka_scores` tables |
| **`/ka-score` page** | Loads real Business Readiness from `/api/businesses` (Supabase) | **Implemented** — not full KA Score; labeled honestly |

A hard-coded or client-only score card is **not** KA Score.

### KA Score first slice (when assigned)

1. Real Kebu ID business  
2. Server calculation from approved DB fields  
3. `ka_scores` + versions + factors + explanations stored  
4. Owner view + missing requirements + history  
5. Field update → recalculation  
6. Cross-business access denied; browser cannot set score  

**Do not include in first slice:** lending, investment approval, K21 financial history, customer reviews, gov contract eligibility.

### KA Score data model (future migration)

`ka_scores` · `ka_score_versions` · `ka_score_categories` · `ka_score_factors` · `ka_score_events` · `ka_score_recommendations` · `ka_score_explanations` · `ka_score_appeals` · `ka_score_manual_reviews` · `ka_score_data_consents`

---

## Recommended build order

1. ~~**Registration:** document upload → advance `documents_uploaded`~~ **Done (017)**  
2. **Registration:** gov submit (real connector per country) → `government_review`  
3. **Builder ↔ Kebu ID:** link website/store projects to `business_id`  
4. **KA Score slice 1:** migration + server calc from registration + publish state  
5. **KA Score slice 2+:** orders, fulfillment, compliance, appeals  

---

## Apply migrations

```text
005_kebu_id_draft_business.sql
006_kebu_id_lock_draft_status.sql
007_business_registration.sql
016_registration_timeline.sql   ← registration step labels + payment/tax steps
```

Then verify on a real business: `/business/register` → dashboard → registration tracker + readiness.
