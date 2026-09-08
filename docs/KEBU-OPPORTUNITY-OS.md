# Kebu Opportunity OS

**Kebu ecosystem feature** — not Website Builder · not the standalone **Opportunity OS** product.

Standalone product spec: `docs/OPPORTUNITY-OS-MASTER-SPEC.md`.

---

## What it is

Helps a **signed-in Kebu user or business** discover opportunities **relevant to them**:

- grants, tenders, programs aligned to profile  
- trade/resource hints matched to country and goals  
- personalized “start here” steps  
- optional handoff to Kebu ID · Builder · Shop when the user chooses  

Core question: **What could *I* / *my business* pursue?**

---

## What it is not

- Not the continent-scale **explore** engine (that is **Opportunity OS** — separate product).  
- Not merged into Builder nav or editor chrome.  
- Not a duplicate of Opportunity OS Country Explorer / Opportunity Cards / Research Lab UI.

---

## Access (Kebu account entitlements)

Kebu is **globally accessible** for Builder, Mail, Cloud, Search, etc.

**Kebu Opportunity OS** protected personalization and deep African economic intelligence layers require **one-time verified African entitlement** on the Kebu account (e.g. `african_opportunity_access: verified`; UX: **African Access: Verified**). Check **server-side** — not per page, not browser flags.

Public may **discover** that Opportunity OS / Kebu Opportunity exist without accessing protected datasets.

**Kebu Search stays open globally.**

Personal eligibility ≠ **Kebu ID** (business identity).

---

## Integration with Opportunity OS (API boundary)

| Direction | Rule |
|-----------|------|
| Opportunity OS → Kebu | **Build This with Kebu** creates drafts (business, site project) — **never auto-publish** |
| Kebu → Opportunity OS | Read-only or licensed API calls to explore data/cards — respect entitlements and rate limits |
| Data | **Separate schemas** — no giant shared “opportunity” table mixing products |

---

## Current repo (honest)

| Surface | Product | Status |
|---------|---------|--------|
| `/opportunity/countries` · country APIs | **Opportunity OS** | Country Explorer slice — TESTED per `docs/IMPLEMENTATION_STATUS.md` |
| `/opportunity` for-you · intake · `/api/opportunity/for-you` | **Kebu Opportunity OS** | IN PROGRESS — must stay logically separate from explore |
| `/opportunity/[id]` sample listings | **Neither** — demo/sample; not Opportunity OS DB |

Future: clearer route/branding split (e.g. explore on Opportunity OS host; for-you under Kebu account hub).

---

## Build order (Kebu side only)

1. Intake + profile persistence (done/in progress)  
2. For-you matching from **verified** Opportunity OS entities (when API/slice exists) — not hard-coded sample cards  
3. Entitlement gate on for-you APIs  
4. Build This handoff to Builder / Kebu ID  

Do **not** implement Opportunity OS explore slices inside Kebu Opportunity OS UI.
