# Kebu Account Model — Personal Kebu + Business Kebu

**Unified identity (full vision):** `docs/product/KEBU-UNIFIED-ACCOUNT.md`  
**Agent rule:** `.cursor/rules/kebu-account-model.mdc`

One **Kebu Account** (login). One identity graph. **Not** separate accounts for Search, Builder, Cloud, Mail, or Analytics.

---

## One identity, entire universe

```
                         KEBU ACCOUNT
                              │
                    Kebu Profile + (optional) Business Kebu IDs
                              │
       ┌──────────────┬───────┼────────┬──────────────┐
       ↓              ↓       ↓        ↓              ↓
   Kebu Search     Kebu Mail  Builder  Cloud      Opportunity OS
       │              │       │        │         (API-connected)
       └──────────────┴───────┼────────┴──────────────┘
                              ↓
                         Kebu Business
                    Store · Analytics · Score · Reach
```

Signup once → profile · personal email (target) · dashboard · saved searches · workspaces — activate products as needed.

---

## Personal vs business layers

```
                         KEBU ACCOUNT
                              │
                ┌─────────────┴─────────────┐
                │                           │
         PERSONAL KEBU                BUSINESS KEBU
                │                           │
        may@kebu.africa              hello@ / orders@ / support@…
        Search · Studio · Cloud      Builder · Shop · team · Score
                │                           │
                └─────────────┬─────────────┘
                              │
         Shared: auth · billing · Yande · permissions · data graph
         Kebu ID = business entity only (not personal eligibility)
```

**Do not** merge personal and business inboxes, permissions, or billing without explicit user action.

---

## 1. Personal Kebu — free entry (monetize the business, not the person)

**Philosophy:** Don’t charge a young African person just to participate in the digital economy. A 17-year-old gets Kebu free; at 21 they launch a company and **then** need business email, website, domain, store, analytics, Cloud, ads — **already inside Kebu**.

### Personal Kebu should be **FREE** (target)

For Africans, seriously consider **permanently free personal Kebu email** (e.g. `may@kebu.africa` or future domain architecture).

**Free personal account (target includes):**

| Capability | Notes |
|------------|--------|
| Kebu email | Personal address on Kebu domain |
| Kebu Search | Core product; globally open |
| Kebu Studio **basic** | Not full Canva clone day one |
| Personal files / storage | Modest quota |
| Basic AI | Metered fairly |
| Basic calendar / tasks | Future |
| Kebu profile | Person — not Kebu ID |
| Saved searches · saved opportunities · bookmarks | Personal library |
| Saved projects · Cloud starter credits | Activate when needed |

You **monetize the business they create**, not the person’s right to exist online.

---

## 2. Business Kebu — one click, no second account

User clicks **Create a Business**. Kebu creates a **separate business workspace** (Kebu ID) under the same account.

```
MAY (Kebu Account)
│
├── Personal Kebu
│   └── may@kebu.africa
│
└── May Fashion (Kebu ID / Business Kebu)
    ├── hello@mayfashion…
    ├── orders@…
    ├── support@…
    └── accounting@…
```

- **Kebu Mail** = communication layer for personal + business addresses; switch context, not login.
- Business mail and data belong to the **entity**, not the founder’s personal inbox.
- **Team invites** → business workspace only — not May’s personal Kebu.

Implementation today: Kebu ID + `business_id` on projects + team invites (partial). Mail split + workspace switcher + permission center = **NOT STARTED / IN PROGRESS**.

---

## 3. Privacy & permissions (control center)

**Your Kebu Account is your control center** — not “Kebu knows everything.”

Users see connected services (Search, Mail, Builder, Cloud, Analytics, …) and **revoke** cross-product access.

Example opt-in: *“Search may use my business profile to personalize results.”* — server-stored consent; auditable.

See `docs/product/KEBU-UNIFIED-ACCOUNT.md` § Privacy.

---

## 4. Personal Kebu = youth entry point

A 16–22-year-old should not need AWS + Canva + Google Workspace + GitHub + Shopify + Mailchimp + Figma.

**What do you want to create?** — Design · Website · App · Business · Learn (No watching) · Opportunity · Search · Email · Deploy.

**Forbidden:** fake hub buttons; separate product signups.

---

## 5. Pricing architecture

Full spec: **`docs/product/KEBU-PRICING.md`**. Personal Kebu **FREE**. Business infrastructure: Free → Pro ($0/$2/$5/$10/$20) + Student $1.

---

## 6. Security & data model (non-negotiable)

| | Personal | Business |
|--|----------|----------|
| **Identity** | User profile · eligibility · personal entitlements | **Kebu ID** · team RBAC · business records |
| **Authz** | User owns personal data | Business roles; no self-elevation via browser |
| **Billing** | Personal tier (free default) | Business subscriptions · usage |
| **AI (Yande)** | Personal context boundaries | Business context only with RBAC + consents |

Personal eligibility (`african_opportunity_access`) ≠ **Kebu ID**. See `kebu-id.mdc`.

---

## Related

- Unified account: `docs/product/KEBU-UNIFIED-ACCOUNT.md`
- Global access: `docs/product/KEBU-GLOBAL-ACCESS-PHILOSOPHY.md`
- Studio: `docs/product/KEBU-STUDIO.md`
- Builder: `docs/product/KEBU-BUILDER-NEXT-GEN.md`
- Search: `docs/product/KEBU-SEARCH.md`
- Pricing: `docs/product/KEBU-PRICING.md`
- Status: `docs/IMPLEMENTATION_STATUS.md`
