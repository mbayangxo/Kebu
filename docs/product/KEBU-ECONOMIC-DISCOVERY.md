# Kebu — Economic Discovery & Monetization Architecture

**Not an ad network. An economic discovery system for the next 20 years.**

**Agent rule:** `.cursor/rules/kebu-economic-discovery.mdc`  
**Search spec:** `docs/product/KEBU-SEARCH.md` · **Account:** `docs/product/KEBU-UNIFIED-ACCOUNT.md` · **Pricing:** `docs/product/KEBU-PRICING.md`

---

## Core thesis

Kebu/RECT should create an **economic discovery system** — not just an ad network.

**Google’s basic unit:** the webpage.  
**Kebu’s basic unit (target):** the **opportunity · entity · transaction · relationship**.

**Wrong:** “African Google.”  
**Right:** Search built around **intent and usefulness** — discovery that connects to **build, sell, trade, and scale** inside one Kebu Account.

---

## The ecosystem flywheel

```
SEARCH → DISCOVER → UNDERSTAND → BUILD → SELL → GET CUSTOMERS → SCALE
```

Multiple monetization mechanisms at **every stage** — not advertising alone.

**RECT** = **cultural infrastructure** (create, distribute, monetize culture) — **not** part of Kebu the media company. **Kebu** = build and operate. **Reach** connects them. Spec: `docs/product/KEBU-RECT-ECOSYSTEM.md`.

---

## 1. Kebu Search — discovery (hub product)

**Core Kebu product** on **one Kebu Account** — real crawl/index/rank engine; AI **on top with citations** — never chat-as-search.

### Search modes (user chooses)

| Mode | Purpose |
|------|---------|
| 🔎 **Web** | General internet |
| 🌍 **Africa** | African websites, businesses, content |
| 💼 **Business** | Companies, suppliers, manufacturers |
| 🛍️ **Products** | Things available to buy (especially on Kebu) |
| 🧑🏾‍💻 **People & Talent** | Creators, developers, designers, professionals |
| 📚 **Research** | Papers, reports, market intelligence |
| 🚢 **Trade** | Suppliers, exporters, importers, routes |
| 💡 **Opportunities** | “What can I build?” (Opportunity OS — trust-labeled) |
| 🎬 **Culture** | RECT content |
| 📍 **Local** | Businesses/services near you |

### Ask Kebu (eventually)

AI **synthesizes** retrieved information and **shows sources** — does not replace the index.

### Example: “Chocolate Senegal”

Kebu does **not** only return websites. Surfaces (when indexed + entitled):

| Surface | Example |
|---------|---------|
| 🛍️ Products | Senegalese chocolate brands on Kebu Shop |
| 🏭 Businesses | Manufacturers (Kebu Business Profiles) |
| 🚢 Trade | Export/import context (sourced) |
| 💡 Opportunity | Gap analysis — **only with reliable data + trust labels** |
| 👩🏾‍💼 People | Makers, designers, distributors |
| 🎬 Culture | RECT videos |
| 📰 News | Industry developments (sourced) |
| 📊 Intelligence | Market data (tiered — see §11) |
| 🛠️ Build | “Start a chocolate business” → Builder handoff |
| 💰 Finance | Programs (when Capital slice exists — separate, consent-gated) |

**Search sits above** Reach, Marketplace, Leads, Profiles, Trade, Builder, Cloud — as **discovery layer**.

Build **one mode + one index slice** at a time. See `docs/product/KEBU-SEARCH.md`.

---

## 2. Kebu Reach — connecting money to attention

**Infrastructure layer** between Kebu (businesses) and RECT (audiences/creators) — AdSense-**like** but **not banner-dependent**.

See also: `docs/product/KEBU-RECT-ECOSYSTEM.md` (Reach sits between African businesses and RECT audiences).

Businesses pay for (slice-by-slice):

- Search placement · product discovery · sponsored recommendations  
- Creator campaigns · community sponsorships · business listings  
- Event promotion · app promotion · lead generation · customer acquisition  

**Affordability:** small businesses start with **tiny budgets** — a Senegalese business should not need **$500** just to experiment.

**Status:** **S10a live** (tracked promote links). Full ad/placement network **NOT STARTED** until later slices. Spec: `docs/product/KEBU-REACH.md`.

---

## 3. Kebu Marketplace — transaction fees

Monetize **transactions**, not only attention.

User searches → finds Kebu business → **buys** → small **Kebu transaction fee** (+ payment processing).

Applies over time to: products · services · tickets · digital goods · bookings · B2B purchasing · …

Transparent fees; higher plans may reduce fee (`docs/product/KEBU-PRICING.md`).

**Status:** Shop checkout partial; platform transaction fee **NOT STARTED**.

---

## 4. Kebu Leads

Powerful for African SMEs.

Query: *“solar installer Dakar”* → **verified businesses** → customer **Request quote** → qualified companies receive lead.

Business pays per lead or via subscription — different from CPM banners.

**Status:** NOT STARTED.

---

## 5. Kebu Business Profiles

**Google Business Profile + company page + mini-site** — built into Kebu.

Discoverable infrastructure, not only standalone websites:

Business name · location · products · services · team · website · email · socials · certifications · **Kebu Score** · reviews · countries served · export capabilities · wholesale flags · …

Tied to **Kebu ID**. Feeds Search **Business** and **Local** indexes.

**Status:** Kebu ID + public pages partial; full profile schema **IN PROGRESS**.

---

## 6. Kebu B2B / Trade

**High priority** long-term.

Query: *“I need 20 tons of sesame”* → suppliers by country · import/export context · Opportunity OS trade intelligence (sourced, trust-labeled).

Revenue (eventually): supplier subscriptions · verified supplier fees · transaction fees · trade services · logistics partnerships · financing **referrals** · export documentation services.

Integrates **Opportunity OS + Search + Trade** — separate product schemas, **API + shared account**.

**Status:** NOT STARTED as commerce slice; Opportunity OS Country Explorer partial.

---

## 7. RECT — cultural infrastructure (interlocked with Kebu)

**RECT** = create, distribute, discover, monetize **culture** — Rect Music, Digital, Station, Live, Cinema, … (slice-by-slice).

**Kebu does NOT become the entertainment company.** RECT builds audiences; Kebu provides **business infrastructure** (Shop, ID, Mail, analytics, payouts).

**Creator business profile** on Kebu ID — engaged audience by geography; performance via Reach (views → clicks → sales), not followers alone.

**RECT Creator Marketplace** — brands post campaigns; creators apply; Reach tracks outcomes.

**Create Store** → Kebu Builder/Shop handoff (same account). Full pipeline: `docs/product/KEBU-RECT-ECOSYSTEM.md`.

RECT earns **platform fees**; creator keeps majority. **Culture** index in Search attributes RECT properly.

**Status:** RECT portfolio template partial in Kebu; artist/social schemas **separate**; creator marketplace + Reach attribution **NOT STARTED**.

---

## 8. Kebu Cloud

Developers pay: compute · databases · storage · deployments · bandwidth · AI inference · APIs.

**Student/developer credits** — free/cheap starter so young Africans begin inside Kebu; pay as usage grows.

**Status:** NOT STARTED.

---

## 9. Kebu Builder

Monetize: premium templates · AI overage · domains · hosting · commerce tiers · advanced analytics · team seats · custom features.

Philosophy: **Get them building first. Monetize success later.** (`docs/product/KEBU-PRICING.md`)

**Status:** tiers live; limit enforcement partial.

---

## 10. Kebu Mail + Domains

Recurring: domain/year · business email/month · storage · advanced business tools.

Connected through **one account** — not ten vendors.

**Status:** domain connect partial; Mail provisioning **NOT STARTED**.

---

## 11. Kebu Intelligence

Deeper paid intelligence for businesses/investors:

- Which African markets growing? · import/export patterns · underserved products · unprocessed commodity leakage · investment flows · cross-border demand · price trends · …

Free users: **basic** intelligence with sources.  
Paid: deeper analysis — **never invented statistics**; trust labels mandatory.

Overlaps **Opportunity OS** explore data via APIs; entitlement + product billing separate.

**Status:** NOT STARTED as product; Opportunity OS explore partial.

---

## 12. Kebu Capital — eventually

**Later** — only with legitimate business activity, privacy protections, legal review:

Grants · revenue-based financing · working capital · angel matching · crowdfunding (where legal) · incubator programs.

**Kebu Ventures / think-lab** may remain **legally separate** while connecting via APIs — Score flags readiness; **never auto-fund**.

**Status:** NOT STARTED — do not ship fake financing UI.

---

## Monetization summary

| System | Mechanism | Primary value |
|--------|-----------|---------------|
| **Search** | Discovery hub; optional premium intelligence | Intent + usefulness |
| **Reach** | Ads, placement, campaigns | Customer acquisition |
| **Marketplace** | Transaction fees | Commerce volume |
| **Leads** | Pay-per-lead / subscription | SME matching |
| **Business Profiles** | Listings, verification, premium visibility | Discoverability |
| **B2B / Trade** | Supplier fees, trade services | Cross-border commerce |
| **RECT** | Creator platform fees | Culture + commerce |
| **Cloud** | Usage-based infra | Developers |
| **Builder** | Subscriptions + add-ons | Sites + stores |
| **Mail + Domains** | Recurring | Identity + comms |
| **Intelligence** | Research tiers | Decision-makers |
| **Capital** | Financing (future, regulated) | Growth capital |

Subscriptions are **one** stream — not the only story.

---

## Engineering rules

1. **Search first** as honest index — one surface per slice.  
2. **Every revenue feature** = end-to-end (see `KEBU-MASTER-ENGINEERING-INSTRUCTION.md`).  
3. **No fake leads, fake suppliers, fake market stats.**  
4. **Trust labels** on all intelligence surfaces.  
5. **One Kebu Account** — discovery actions hand off to Builder/Shop/Reach with permission.  
6. **Nav only when real** — document NOT STARTED revenue products honestly.  
7. **RECT** indexes into Search; does not fork a second identity system.

---

## Related

- Search: `docs/product/KEBU-SEARCH.md`  
- Opportunity OS: `docs/OPPORTUNITY-OS-MASTER-SPEC.md`  
- Global access: `docs/product/KEBU-GLOBAL-ACCESS-PHILOSOPHY.md`  
- Status: `docs/IMPLEMENTATION_STATUS.md`  
- Roadmap: `docs/ROADMAP.md`
