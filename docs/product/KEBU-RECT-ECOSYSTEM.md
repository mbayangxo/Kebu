# Kebu + RECT — Ecosystem Interlock

**Kebu is not the entertainment company. RECT is not the business OS. They interlock.**

**Agent rule:** `.cursor/rules/kebu-rect-ecosystem.mdc`  
**Related:** `docs/product/KEBU-ECONOMIC-DISCOVERY.md` · `docs/product/KEBU-UNIFIED-ACCOUNT.md` · `docs/product/KEBU-BUILDER-NEXT-GEN.md`

---

## Simplest distinction

| | Mission |
|--|---------|
| **KEBU** | **Build and operate** — account, business, commerce, cloud, search discovery, intelligence infrastructure |
| **RECT** | **Create, distribute, discover, and monetize culture** — audiences, creators, cultural distribution |
| **Kebu Reach** | **Infrastructure connecting them** — money to attention (not banner-only) |

**Wrong:** Merge Kebu into a media/entertainment company.  
**Wrong:** RECT as a standalone silo with no business infrastructure.  
**Right:** **Kebu builds economic infrastructure. RECT builds cultural infrastructure. Reach connects money to attention.**

---

## African digital ecosystem (target)

```
                    AFRICAN DIGITAL ECOSYSTEM
                         ┌───────────┐
                         │   KEBU    │
                         │   BUILD   │
                         └─────┬─────┘
                               │
            ┌──────────────────┼──────────────────┐
            ↓                  ↓                  ↓
       Kebu Builder       Kebu Cloud        Opportunity OS
            │                  │                  │
            └──────────────────┼──────────────────┘
                               ↓
                      African businesses
                               │
                               ↓
                         ┌───────────┐
                         │   KEBU    │
                         │   REACH   │
                         └─────┬─────┘
                               │
                  audiences / creators / ads
                               │
                               ↓
                         ┌───────────┐
                         │   RECT    │
                         │  CREATE   │
                         └─────┬─────┘
                               │
       ┌───────────────────────┼─────────────────────┐
       ↓                       ↓                     ↓
  Rect Music              Rect Digital          Rect Station
       ↓                       ↓                     ↓
    Artists                 Shows/Films              Media
       │                       │                     │
       └───────────────────────┼─────────────────────┘
                               ↓
                      African audiences
                               ↓
                    creators / communities
                               ↓
                         Kebu Reach
```

RECT **creates demand**. Kebu **captures economic value** for the people behind the culture.

---

## RECT cultural network (concepts — build slice-by-slice)

Working names / surfaces (not all live):

Rect Music · Rect Digital · Rect Station · Rect Live · Rect Cinema · Rect Vibes · Rect Edge · Rect Safari · Rect Canvas · Rect Originals · …

Each builds **audiences**. Audiences create **economic value**. Kebu gives creators tools to **capture** that value.

**Kebu Search — Culture mode** indexes RECT content (with attribution) — RECT does not fork a second identity system; **same Kebu Account** where users cross over.

**Repo note:** RECT Artist OS schemas are **separate product domain** — do not paste into Kebu Phase One Supabase without an assigned integration slice. See `docs/IMPLEMENTATION_STATUS.md`.

---

## Creator business profile (not just followers)

A RECT creator should have a **creator business profile** (Kebu ID / Business Profile when connected):

```
Creator: Fatou
25,000 followers
8,400 engaged audience
  3,200 Senegal · 2,100 Côte d'Ivoire · 1,400 Nigeria · …
```

Kebu/RECT can tell brands: *“This creator’s audience matches your target.”* — based on **permissioned, aggregated** data — not creepy surveillance.

**Monetization paths (creator keeps majority; RECT platform fee):**

Sponsored content · affiliate sales · merchandise · subscriptions · digital products · tickets · livestreams · brand campaigns · fan memberships · commerce · licensing · collaborations · …

---

## RECT Creator Marketplace (beyond follower ads)

Brand posts a campaign:

```
Campaign: New Senegalese skincare launch
Budget: 500,000 CFA
Looking for: 10 creators
Audience: Senegal, women 18–30
Content: short video + story
Deadline: 2 weeks
```

Creators apply → RECT matches → **Kebu Reach** tracks **views → clicks → sales** → creators build **performance reputation** (not vanity follower counts).

**Status:** NOT STARTED — document architecture only until assigned end-to-end slice.

---

## Create Store → Kebu (creator commerce handoff)

```
RECT creator clicks "Create Store"
        ↓
Kebu Builder / Shop (same Kebu Account)
        ↓
creatorname.kebu… + products + merch + tickets + digital goods
        ↓
Kebu: store infra · payments · analytics · Kebu ID
RECT: audience · distribution · "New from Fatou" surfaces
Reach: acquisition · campaign attribution
```

**RECT provides audience. Kebu provides business infrastructure. Reach provides customer acquisition.**

Handoff = **API + account** — never auto-publish without creator confirm.

---

## Example: complete creator → business pipeline

1. Senegalese 21-year-old builds fashion audience on **RECT**  
2. RECT: *“12,000 engaged followers”* → **Start a business**  
3. **Kebu** asks what to sell; she uploads photos  
4. AI + Builder: brand → logo → site → store → product pages → domain → business email  
5. She launches  
6. RECT surfaces products in culture feed — *“New from Fatou”*  
7. Watch → click → buy  
8. Analytics in **Kebu**; revenue to **business payment infra**  
9. Optional: **Reach** campaigns · **Search** Culture/Business discovery · **Score** over time  

```
CREATE → AUDIENCE → BUSINESS → REVENUE → DATA → FINANCING → SCALE
```

Financing = **Kebu Capital** (future, regulated, separate) — Score flags readiness; never auto-fund.

---

## Engineering boundaries

| Rule | Detail |
|------|--------|
| **Kebu ≠ media co** | No Kebu-owned entertainment catalog as core product; RECT owns culture UX |
| **Shared account** | One Kebu Account when creator crosses into commerce — not second login |
| **Reach = connector** | Attribution, campaigns, placement — infra layer |
| **Separate schemas** | RECT social/artist DB ≠ Kebu business DB — integrate via APIs |
| **Privacy** | Audience insights = permissioned, aggregated, revocable |
| **End-to-end slices** | Marketplace, Create Store handoff, Reach tracking — one at a time |
| **Forbidden** | Fake creator stats · fake campaign ROI · RECT Netflix clone inside Kebu Builder nav |

---

## Long-term flywheel

```
RECT (culture) → audiences
Kebu (build) → businesses
Reach (connect) → customers
Search (discover) → intent
Marketplace (transact) → fees
Capital (future) → scale
```

**More powerful than “African AdSense”** — a full **creator-to-business operating environment**.

---

## Related

- Economic discovery: `docs/product/KEBU-ECONOMIC-DISCOVERY.md`  
- Unified account: `docs/product/KEBU-UNIFIED-ACCOUNT.md`  
- Global access: `docs/product/KEBU-GLOBAL-ACCESS-PHILOSOPHY.md`  
- Status: `docs/IMPLEMENTATION_STATUS.md`  
- Roadmap: `docs/ROADMAP.md`
