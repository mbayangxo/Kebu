# Kebu Unified Account — one identity, entire universe

**Core line:** One **Kebu Account** — not ten product logins.

**Agent rules:** `kebu-account-model.mdc` · `kebu-global-access.mdc` · `kebu-search.mdc`  
**Related:** `docs/product/KEBU-ACCOUNT-MODEL.md` · `docs/product/KEBU-GLOBAL-ACCESS-PHILOSOPHY.md`

---

## The missing layer

Users must **not** feel like they create accounts for Search, Cloud, Builder, Mail, and Analytics separately.

They create **one Kebu identity**. The entire Kebu universe connects to it — **from architecture day one**, not bolted on later.

---

## The Kebu experience (target)

```
                         KEBU ACCOUNT
                              │
                    Kebu ID + Kebu Profile
                              │
       ┌──────────────┬───────┼────────┬──────────────┐
       ↓              ↓       ↓        ↓              ↓
   Kebu Search     Kebu Mail  Builder  Cloud      Opportunity
   (core product)              │        │              OS
       │              │       │        │              │
       └──────────────┴───────┼────────┴──────────────┘
                              ↓
                         Kebu Business
                              │
              ┌───────────────┼────────────────┐
              ↓               ↓                ↓
          Store           Analytics         Kebu Score
              │
              ↓
         Kebu Reach
              │
              ↓
        Customers / Creators
              │
              ↓
            RECT
```

**Kebu Search** is a **core Kebu product** under the same umbrella — **not** a separate company.

**Opportunity OS** (explore) remains a **separate product domain** (own schemas/APIs) but connects through the **same Kebu Account** and APIs — not a second login.

---

## One signup → one identity graph

Someone visits **Kebu Search** and sees **Create Kebu Account**. They sign up **once**.

Immediately (as slices ship), the same account unlocks:

| On signup / account (target) | Notes |
|------------------------------|--------|
| **Kebu ID** (person layer) | Profile identity — distinct from business Kebu ID |
| **Kebu email** | Personal address e.g. `may@kebu.africa` |
| **Kebu profile** | Person — not business entity |
| **Personal dashboard** | Control center for connected services |
| **Saved searches** | Search history / library |
| **Saved opportunities** | Opportunity OS bookmarks (when entitled) |
| **Saved businesses** | Watchlist / follows |
| **Bookmarks** | Cross-product |
| **Cloud workspace** | Starter credits / projects |
| **Website-builder workspace** | Sites tied to account |

They **activate what they need** — no second signup for Builder vs Mail vs Cloud.

**Forbidden:** separate auth systems per product · duplicate profile tables per product · “Sign up for Kebu Search” vs “Sign up for Kebu Builder” as different accounts.

---

## Personal vs business (same account)

```
May (Kebu Account)
├── Personal Kebu
│   └── may@kebu.africa
│
└── May Fashion (Business Kebu / Kebu ID)
    ├── hello@mayfashion…
    ├── orders@…
    ├── support@…
    └── accounting@…
```

- **Kebu Mail** (future) = real email on same account — personal `may@kebu.africa` (free) + business on verified domains — **not** fake inbox. Spec: `docs/product/KEBU-MAIL.md`
- User **switches context** (Personal ↔ May Fashion) — not separate logins.
- **Employees** get business workspace access — **not** May’s personal Kebu.

See `docs/product/KEBU-ACCOUNT-MODEL.md`.

---

## Kebu Search + context (with permission)

Search should become a **personal/business operating environment** — not generic links only.

Example: May searches *“How do I start a cosmetics business?”*

If she has **opted in** to connect her business workspace, Kebu Search may surface **action-oriented** results:

| Surface | Example action |
|---------|----------------|
| **Build** | Create cosmetics store in Builder |
| **Opportunity** | Relevant African markets (trust-labeled; entitlement where required) |
| **Suppliers** | Retrieved supplier/index results |
| **Regulations** | Sourced requirements |
| **Website** | Create the store |
| **Cloud** | Deploy an app if needed |
| **Mail** | Create `hello@…` |
| **Analytics** | Track the business |
| **Reach** | Find customers |

**Requires:** real retrieval + citations · RBAC · **explicit permission** — not “Kebu knows everything about you.”

---

## Privacy: control center, not surveillance

**Wrong philosophy:** “Kebu knows everything about you.”

**Right philosophy:** **Your Kebu Account is your control center.**

Users must see **Connected services** and **revoke access**:

```
Connected services
☑ Search
☑ Mail
☑ Builder
☑ Cloud
☑ Analytics
☐ Business data sharing (for Search personalization)
☐ Opportunity personalization
```

Example permission: *“Kebu Search may use my business profile to personalize results.”* — **opt-in**, auditable, revocable.

Especially critical as email + cloud + business + identity + search + payments + analytics live under one ecosystem.

**Engineering:** centralized **consents / product permissions** table — server-enforced; never trust browser flags alone.

---

## The Kebu flywheel (why one account matters)

```
Student joins (free Cloud / curiosity)
  → discovers Builder (“I can build a website here”)
  → domain
  → email
  → African opportunity (Search / Opportunity OS)
  → store
  → first customer
  → analytics
  → cloud infrastructure
  → financing readiness (Score / future Capital)
```

They **never leave the ecosystem** — because it was **one thread** from signup.

**Not:** “Let’s make an African Google.”  
**Yes:** “Build the digital environment where an African person goes **curiosity → skill → idea → company → customers → growth**.”

---

## Architecture requirements (non-negotiable)

| Requirement | Implementation direction |
|-------------|-------------------------|
| **Single Supabase Auth user** | One `auth.users` row per person |
| **Shared profile + entitlements** | Personal profile; `african_opportunity_access`; product flags |
| **Business workspaces** | Kebu ID + RBAC + team invites |
| **Product permissions / consents** | Explicit opt-in for cross-product context (Search, Yande, etc.) |
| **Unified dashboard** | Account control center — connected services + revoke |
| **No duplicate product auth** | Builder/Search/Cloud/Mail use same session |
| **Context switching** | Personal ↔ Business workspace in chrome — not new login |

**Current repo (honest):** Supabase Auth + profile + Kebu ID + partial team — **unified signup hub, mail, Search engine, permission center NOT STARTED**. Build foundation slice before claiming unified experience.

---

## Build order (foundation first)

1. **Kebu Account + profile + session** (exists — audit)  
2. **Kebu ID + business workspace + RBAC** (partial — complete end-to-end)  
3. **Account control center UI** (connected services — honest states)  
4. **Product permissions / consents** (DB + API + UI)  
5. **Unified entry** (Search or home → one signup → dashboard)  
6. **Search slice** with optional contextual actions (permission-gated)  
7. Mail, Cloud, Reach — each as vertical slice on same account  

See `docs/ROADMAP.md` · `docs/IMPLEMENTATION_STATUS.md`.

---

## Related

- Global access: `docs/product/KEBU-GLOBAL-ACCESS-PHILOSOPHY.md`  
- Search engine: `docs/product/KEBU-SEARCH.md`  
- Master engineering: `docs/product/KEBU-MASTER-ENGINEERING-INSTRUCTION.md`
