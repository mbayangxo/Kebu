# Kebu Roadmap

Aligned with **master engineering instruction** (`docs/product/KEBU-MASTER-ENGINEERING-INSTRUCTION.md`). **One vertical slice at a time.** Build → audit → repair → verify → next slice.

Status detail: [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)

## Phase 1 — Account & business core (foundation — start here for new foundational work)

Virtually everything else (Builder, Cloud, Search, Mail, Analytics, Opportunity OS, Score) depends on **Kebu Account + Kebu ID + Supabase + workspace/business**.

| Slice | Status |
|-------|--------|
| Supabase Auth | TESTED |
| **Unified Kebu Account** (one identity, all products) | IN PROGRESS (docs; partial code) |
| Account control center + product permissions / consents | NOT STARTED |
| Kebu Mail as identity comm layer (personal `@kebu.africa` free + business on verified domains; provider abstraction) | NOT STARTED — `docs/product/KEBU-MAIL.md` |
| Kebu ID draft + public ID | IMPLEMENTED |
| Organizations / businesses / `business_id` on projects | IN PROGRESS |
| Team invites / permissions | IN PROGRESS |
| Registration wizard | IMPLEMENTED |
| Registration documents upload | IMPLEMENTED (migration 017) |
| Registration tracker (honest blocked gov steps) | IMPLEMENTED |
| Business Readiness score | IMPLEMENTED |
| Full KA Score (`ka_scores` schema) | NOT STARTED |
| Verification levels | NOT STARTED |

## Phase 2 — Kebu Builder

| Slice | Status |
|-------|--------|
| Templates + editor + autosave | IN PROGRESS |
| Publish + subdomains | IN PROGRESS |
| Custom domains connect | IN PROGRESS |
| Multi-page | IN PROGRESS |
| Builder ↔ business_id link | IMPLEMENTED |

## Phase 3 — AI website generation

Editable schema only — NOT STARTED as full slice.

## Phase 4 — Commerce

NOT STARTED

## Phase 5 — Analytics (real events)

NOT STARTED

## Phase 6 — Kebu Search (economic discovery)

| Slice | Status |
|-------|--------|
| Economic discovery architecture (12 revenue systems) | DOCUMENTED — `docs/product/KEBU-ECONOMIC-DISCOVERY.md` |
| First honest index (Kebu businesses + sites) | NOT STARTED |
| Search modes (one at a time) | NOT STARTED |
| Reach · Leads · B2B Trade · Intelligence tiers | NOT STARTED |

## Phase 7 — Opportunity OS

Country Explorer IMPLEMENTED · Build This Business NOT STARTED

## Phase 8 — Kebu Cloud

NOT STARTED

## Phase 9 — Mail / Domains / Reach / RECT interlock

| Slice | Status |
|-------|--------|
| Kebu + RECT architecture (build vs culture) | DOCUMENTED — `docs/product/KEBU-RECT-ECOSYSTEM.md` |
| Kebu Reach (business ↔ audience connector) | NOT STARTED |
| RECT Creator Marketplace + campaign attribution | NOT STARTED |
| Create Store → Kebu Builder handoff | NOT STARTED |
| Mail / Domains product | NOT STARTED (domain connect partial in Builder) |

## Phase 10 — Kebu Property (African property infrastructure)

**NOT STARTED** — spec only: `docs/product/KEBU-PROPERTY-INFRASTRUCTURE.md`

| Version | Scope |
|---------|--------|
| V1 (Senegal) | Discover · Verify (Property Passport) · Connect · Save · Message |
| V2 | Applications · reservations · payments |
| V3 | Diaspora transaction mode |
| V4 | Build My Home + construction escrow |
| V5 | Property OS / management |
| V6 | Property intelligence |

Do not build listing marketplace without Passport + Scam Shield architecture.

---

Do not build future phases until the current slice passes Definition of Done.
