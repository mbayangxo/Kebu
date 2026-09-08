# Kebu Property — African Property Infrastructure

**Status:** **NOT STARTED** — product law and architecture only until explicitly assigned as a vertical slice.

**Agent rule:** `.cursor/rules/kebu-property-infrastructure.mdc`

---

## Framing (mandatory)

Do **not:** “Build African Mubawab.”

**Product Architect Phase first** — then original African property infrastructure.

**Quality benchmarks** (learn depth, not branding):

| Reference | Learn |
|-----------|--------|
| Mubawab | Property discovery |
| Airbnb | Booking UX |
| Zillow | Property intelligence |
| Stripe | Financial UX clarity |
| Uber | Real-time status |
| Shopify | Merchant/admin OS depth |
| Notion | Information organization |

Create an **original** platform at the **quality bar** of these references — see `docs/product/KEBU-PRODUCT-ARCHITECT-PHASE.md`.

**Moat:** Property data + verification data + transaction history + professional reputation + construction history + fraud intelligence + African market knowledge — **not the UI**.

Connects to **one Kebu Account** (diaspora mode, payments, Mail, Builder for “Build Here”, Cloud, Search discovery, KA/Property Trust Scores with explainability). **Do not** fork a second login.

---

## 1. Trust is the product — Property Passport

Every property gets a **Property Passport** (e.g. `SN-SAL-004821`).

| Section | Fields (examples) |
|---------|-------------------|
| **Property** | Location, coordinates, size, type, photos, construction status |
| **Ownership** | Owner identity verified, docs, seller authorization, history where available |
| **Physical verification** | GPS, boundary, site visit, photos/video, inspection date |
| **Legal** | Document status, restrictions, land classification, required approvals |
| **Transaction** | Listed, reserved, sold/rented, transaction history |

**Never say “Verified” when everything isn’t verified.**

Show honest progress: **“7/9 verification checks completed”** — with checklist detail.

---

## 2. Scam Shield (African-specific)

Automatic flags on listing/post:

- Duplicate listings · same photos on multiple properties · suspiciously low prices  
- Multiple accounts claiming same property · inconsistent location  
- Suspicious phone numbers · recently created accounts · repeated complaints  
- Changed ownership info · listings not reverified  

Outcomes: **⚠️ Verification required** · **🔴 Listing restricted** — **before** someone gets scammed (not report-after-the-fact only).

---

## 3. African internet reality

**PWA · mobile-first · low bandwidth.**

- Progressive image load · maps that don’t destroy data plans  
- Search/save/notify/continue applications on weak connectivity  
- Compressed photo upload · lightweight messaging  
- Eventually: **WhatsApp / SMS / USSD** entry points — not everyone needs full app  

Align with Kebu Data Saver / offline queue patterns where shared.

---

## 4. Payment orchestration — cash doesn’t disappear

**Do not** force digital-only day one.

**One transaction ledger** regardless of payment method. Country adapters, e.g.:

| Country | Methods (examples) |
|---------|-------------------|
| **Senegal** | Wave, Orange Money, cards, bank transfer, cash-assisted |
| **Morocco** | Cards, bank transfer, local options |
| **Nigeria** | Naira ecosystem, bank, mobile money where live |

Platform **records** the transaction even when customer pays cash with assisted confirmation workflow.

Reuse Kebu payment adapter pattern — never browser-set “paid”.

---

## 5. Diaspora Property Mode (major product)

User selects **🇺🇸 I’m abroad** (or other diaspora) → guided workflow:

Find property → Verify → Hire inspector → Hire lawyer/notary → Make offer → Pay securely → Track transaction → Build → Manage

One platform — not 15 disconnected vendors.

---

## 6. Property Professionals network

Not a dumb directory. Verified profiles with:

Notaries · lawyers · surveyors · architects · inspectors · contractors · realtors · property managers · trades · security · cleaning · solar · …

Each profile: verified identity · license where applicable · completed jobs · reviews · response rate · projects · disputes · platform history → **Professional Trust Score** (transparent, evidence-based).

---

## 7. Trust scores (transparent — not black box)

**Property Trust Score** (example 92/100):

Documentation · Location · Ownership verification · Physical inspection · Listing accuracy · Recency — each sub-score explained.

**Professional Trust Score** — verified work, reviews, completion rate, disputes.

Separate from **Kebu Score (KA Score)** on Kebu ID for general business readiness — may share patterns but **property scores are property-domain** with own schema and appeals.

---

## 8. Construction — BUILD HERE

Land in Saly → **BUILD HERE** → what to build (modern home, container, villa, rental units, Airbnb, restaurant, retail) → design → estimate (X–Y CFA) → configure (bedrooms, pool, solar, water, garage, …) → **project created**.

Connects to Kebu Builder/Cloud where appropriate — structured projects, not static HTML.

---

## 9. Construction money trail — escrow / milestones

**Construction wallet / escrow:**

Client deposit → milestone approved → contractor paid → materials recorded → photos uploaded → inspection → next milestone.

Diaspora buyer sees: Foundation 100% · Plumbing 40% · Electrical 0% — **timestamped evidence**.

Huge trust + revenue opportunity — end-to-end only when assigned.

---

## 10. Property OS (after purchase — recurring revenue)

**My Property:** value · rent · tenants · bills · maintenance · insurance · security · cleaning · documents · repairs · income · expenses · occupancy.

Customer stays after transaction.

---

## 11. Short-stay / Airbnb-first-class

Property → **Short Stay:** calendar · pricing · reservations · payments · check-in · cleaning · maintenance · guest messaging · reviews · dynamic pricing recommendations (sourced, labeled estimates).

Container Airbnb use case = first-class, not bolt-on.

---

## 12. Find Land Near… (use-case search)

Not neighborhood-only:

- Land within **15 minutes of Saly beach**  
- **200–300m²** within **20 minutes** of new Dakar infrastructure  
- Land **suitable for Airbnb**  

Platform understands **use cases**, not just addresses. Ties to Kebu Search + Maps (when live).

---

## 13. Property intelligence

“Is this a good investment?” — with **mandatory labels:**

| Label | Meaning |
|-------|---------|
| **Verified fact** | Sourced, checkable |
| **Platform estimate** | Model with confidence |
| **AI prediction** | Hypothesis — requires validation |

Surfaces: tourism/rental demand · infrastructure · comparables · yield · flood/environment · transport/schools/hospitals · development activity.

---

## 14. Africa Lens — country modules

Core product same; **country layer** changes:

| | Senegal | Morocco | Nigeria |
|--|---------|---------|---------|
| Currency | CFA | MAD | Naira |
| Language | FR/Wolof (future) | AR/FR | EN + local |
| Docs / land class | SN-specific | MA-specific | NG-specific |
| Payments | Wave/Orange/… | Local | Local |

Versioned **country modules** — do not hard-code Senegal into global core (same law as Kebu ID).

---

## 15. Launch phases (do not build all at once)

### V1 — Senegal exceptionally good

| Pillar | Scope |
|--------|--------|
| **DISCOVER** | Property/land search |
| **VERIFY** | Property Passport |
| **CONNECT** | Owners + professionals |
| **SAVE** | Favorites/searches |
| **MESSAGE** | Secure communication |

### Then

| Version | Scope |
|---------|--------|
| **V2** | Applications + reservations + payments |
| **V3** | Diaspora transaction management |
| **V4** | Build My Home |
| **V5** | Property management / Property OS |
| **V6** | Investment + property intelligence |

**One vertical slice at a time.** Full stack + Supabase each time.

---

## 16. Backend domain architecture

```
PROPERTY CORE
├── Identity · Location · Ownership · Verification · Documents · History

MARKETPLACE
├── Listings · Search · Map · Favorites · Messaging

TRANSACTIONS
├── Applications · Reservations · Payments · Escrow · Documents

BUILD
├── Designs · Estimates · Contractors · Materials · Milestones · Inspections

OPERATIONS
├── Tenants · Maintenance · Cleaning · Utilities · Property managers

INTELLIGENCE
├── Property Score · Professional Score · Market data · Investment analysis · Fraud detection
```

Separate domains; shared: **Kebu Account**, auth, payments adapters, notifications, audit.

**Opportunity OS** may inform intelligence surfaces via API — do not merge schemas.

---

## 17. Admin OS (internal operations)

Team must **not** run the business only through raw Supabase tables.

Internal platform (RBAC-restricted):

- Verification queue · Fraud queue · Disputes · Transactions · Construction projects  
- Professional verification pending · System health · Bug triage (critical/medium/resolved)  

Operations team = part of the product.

---

## Engineering contract (when assigned)

Same as `docs/product/KEBU-MASTER-ENGINEERING-INSTRUCTION.md`:

- End-to-end: UI → API → Supabase → RLS → refresh  
- **Stop and repair** broken dependency slices before stacking features  
- **Never hide errors** for functional-looking UI  
- Honest verification counts — no fake “Verified”  
- Trust labels on all intelligence  

---

## Related

- Unified account: `docs/product/KEBU-UNIFIED-ACCOUNT.md`  
- Maps: `docs/KEBU-MAPS-AND-INFRASTRUCTURE.md`  
- Search: `docs/product/KEBU-SEARCH.md`  
- Kebu ID / country modules: `kebu-id.mdc`  
- Status: `docs/IMPLEMENTATION_STATUS.md`
