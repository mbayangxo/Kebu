# Kebu — Features index

Feature is **NOT built** until UI + logic + Supabase + auth + permissions + error states + tests pass CI.

**Status source of truth:** `docs/IMPLEMENTATION_STATUS.md`

---

## Phase One (core)

| Feature | Domain path | Status | Spec |
|---------|-------------|--------|------|
| Auth & session | `app/login`, `lib/supabase` | TESTED | — |
| Kebu Account (unified) | account, profile | IN PROGRESS | `product/KEBU-UNIFIED-ACCOUNT.md` |
| Kebu ID (business identity) | `lib/kebu-id`, `tests/kebu-id` | IN PROGRESS | `KEBU-ID-SLICE-1.md` |
| Website Builder | `app/create`, `lib/create` | IMPLEMENTED | `WEBSITE-BUILDER-SLICE.md` |
| Publish & hosting | publish API, subdomains | IMPLEMENTED | — |
| Custom domains | domains API | IN PROGRESS | — |
| Shop / commerce | `app/shop`, shop APIs | IN PROGRESS | — |
| Payments adapters | JOKO, PayPal, … | IN PROGRESS | — |
| Site analytics | analytics events | IN PROGRESS | — |
| Billing / plans | `lib/billing` | IMPLEMENTED (catalog) | `product/KEBU-PRICING.md` |
| Business ops | events, invoices, team | IN PROGRESS | — |
| Opportunity OS (explore) | `app/opportunity/countries` | Partial | `OPPORTUNITY-COUNTRY-EXPLORER.md` |
| Kebu Opportunity OS (for-you) | `/opportunity` | Partial | `KEBU-OPPORTUNITY-OS.md` |
| Afrique ID | `/api/me/afrique-id` | IN PROGRESS | — |

---

## Future (do not build until assigned)

| Feature | Spec |
|---------|------|
| Kebu Search | `product/KEBU-SEARCH.md` |
| Kebu Studio | `product/KEBU-STUDIO.md` |
| Kebu Mail | ecosystem docs | **NOT STARTED** — `docs/product/KEBU-MAIL.md` |
| Kebu Property | `product/KEBU-PROPERTY-INFRASTRUCTURE.md` |
| KA Score | `kebu-ka-score.mdc` |
| Engineering Health / Bug Sentinel | `ENGINEERING_HEALTH.md` |
| Reach / RECT integrations | `product/KEBU-RECT-ECOSYSTEM.md` |

---

## Per-feature Definition of Done

Every feature slice: `docs/product/DEFINITION_OF_DONE.md` + `docs/CI_PIPELINE.md`
