# Kebu — Core Product Architecture

**Cursor framing:** Kebu is **Africa’s productivity, commerce, discovery, and opportunity cloud** — not “an African Shopify,” not a Google clone, not a pile of disconnected apps.

**Core philosophy:** **Build for everyone. Empower Africans with more.** Kebu does not lock technology away from the world. It builds infrastructure from an African perspective and adds an **entitlement-gated opportunity layer** for verified Africans. Spec: `docs/product/KEBU-GLOBAL-ACCESS-PHILOSOPHY.md` · rule: `kebu-global-access.mdc`.

Full Builder next-gen: `docs/product/KEBU-BUILDER-NEXT-GEN.md` · **Opportunity OS** (standalone): `docs/OPPORTUNITY-OS-MASTER-SPEC.md` · **Kebu Opportunity OS** (for-you): `docs/KEBU-OPPORTUNITY-OS.md` · Engineering: `docs/product/ENGINEERING-MANDATE.md` · Status: `docs/IMPLEMENTATION_STATUS.md`.

Agent rule: `.cursor/rules/kebu-core-architecture.mdc`.

---

## Umbrella (do not fragment into separate companies)

```
                         KEBU
                           │
       ┌───────────────────┼────────────────────┐
       │                   │                    │
    DISCOVER            CREATE               WORK
       │                   │                    │
   Kebu Search        Kebu Builder          Kebu Mail
   Kebu Directory     Kebu Cloud            Kebu Drive
   Kebu Network       Kebu Commerce         Kebu Jobs
   Kebu Maps
       │                   │                    │
       └───────────────────┼────────────────────┘
                           │
                     OPPORTUNITY
                           │
                    Opportunity OS
                           │
          ┌────────────────┼────────────────┐
          │                │                │
       Funding          Grants          Contracts
       Resources        Programs        Procurement
       Trade            Investors        Partnerships
       Jobs             Tenders          Incubation
```

Underneath everything: **Kebu Account (one identity) · Kebu Profile · Kebu ID · Yande · Kebu Data · Kebu Infrastructure**.

**One account, entire universe** — Search, Mail, Builder, Cloud, Business, Analytics, Reach connect to the same login. Spec: `docs/product/KEBU-UNIFIED-ACCOUNT.md`.

Full account model: `docs/product/KEBU-ACCOUNT-MODEL.md` · rule: `kebu-account-model.mdc`.

---

## Kebu Account — Personal Kebu + Business Kebu

```
                         KEBU ACCOUNT
                              │
                ┌─────────────┴─────────────┐
                │                           │
         PERSONAL KEBU                BUSINESS KEBU
                │                           │
     Email · Search · Studio basic   Builder · Shop · Analytics
     Personal Cloud · Profile        Domains · Team · Cloud · Score
                │                           │
                └─────────────┬─────────────┘
                              │
              Shared platform · Kebu ID = business identity only
```

**Personal Kebu:** FREE entry — monetize **business infrastructure**, not the young person.  
**Business Kebu:** **Create a Business** → Kebu ID workspace — no second login.  
**Personal eligibility ≠ Kebu ID.**

---

**Opportunity OS** is a **separate product** (economic intelligence, explore) — own schemas, UI, and deploy boundary; integrates with Kebu via **APIs only** (e.g. Build This). **Kebu Opportunity OS** is a **Kebu ecosystem feature** (for-you personalization inside a Kebu account). **Do not merge** the two identities or databases. Neither belongs in Website Builder nav.

**Kebu is globally accessible technology infrastructure.** Kebu is **not** an “Africans-only internet.” Anyone may use Search, Account/ID, Mail, Builder, Cloud, Domains, Analytics, Business tools, Reach, and related public infrastructure.

**Kebu Opportunity OS** is an **Africa-focused intelligence and economic empowerment layer** with **eligibility-based access** for verified Africans. The public may **discover** that Opportunity OS exists; protected African opportunity intelligence requires entitlement — not a per-page re-verification loop.

**Kebu Maps:** practical navigation first (streets, routing, real POIs), then African road/farm/production/infrastructure/“Africa Needs” intelligence. Spec: `docs/KEBU-MAPS-AND-INFRASTRUCTURE.md`.

**Infrastructure sovereignty:** own software + **data** early; African CDN/edge → Kebu Cloud → physical regional hubs progressively — not day-one DCs in every country.

---

## Global platform, African intelligence layer

**Kebu is globally accessible technology infrastructure.** Anyone in the world may create a Kebu account and use public products (Search, Mail, Builder, Cloud, Domains, Analytics, Business tools, Reach, etc.) when those modules are live.

**Kebu Opportunity OS** is an **Africa-focused intelligence and economic empowerment layer** with **eligibility-based access** for verified Africans — not an “Africans-only internet.”

The public may **discover** that Opportunity OS exists (marketing, Search snippets, explainers). Protected African opportunity intelligence, trade/resource layers, and program matching require entitlement — not a separate login island.

```
                    KEBU ACCOUNT
                 Identity + login
                          │
     ┌────────────────────┼────────────────────┐
     │                    │                    │
 PUBLIC SERVICES    BUSINESS SERVICES    AFRICAN SERVICES
 (global)           (global)             (entitlement-gated)
     │                    │                    │
 Search              Builder              Kebu Opportunity OS
 Mail                Cloud                (for-you; entitlement)
 Domains             Analytics            → calls Opportunity OS APIs
 AI                  Reach                for explore intelligence
                     Business tools       Startup programs
```

### Product access matrix

| Product | Who can use |
|---------|-------------|
| Kebu Search | Anyone |
| Kebu Account / ID | Anyone |
| Kebu Mail | Anyone (personal free target) · business on verified domain |
| Kebu Builder | Anyone |
| Kebu Cloud | Anyone |
| Kebu Domains | Anyone |
| Kebu Analytics | Anyone |
| Kebu Business tools | Anyone |
| Kebu Reach | Anyone |
| Kebu Opportunity OS (for-you + protected intelligence) | Verified Africans (entitlement) |
| Opportunity OS explore (standalone product; deep datasets) | Product-specific access; Kebu users via API + entitlement |
| African resource / trade intelligence (Opportunity OS) | Verified Africans when surfaced through Kebu |
| African startup ecosystem programs | Verified Africans (entitlement; per-program rules may apply) |

**Verify once** through the African identity / eligibility system Kebu establishes (legal + technical). Account receives an entitlement such as **`african_opportunity_access: verified`** (product copy may show **African Access: Verified**). Opportunity OS and related modules **check entitlement server-side** — never trust browser flags. **Not** per-page re-verification.

```
Kebu Account → Access Entitlements → african_opportunity_access = true | false
```

Example: `james@…` (France) → Search, Mail, Builder, Cloud, Domains, Analytics. `may@…` (Senegal, verified) → same **plus** Kebu Opportunity OS (for-you) after verification; explore intelligence from **Opportunity OS** via API boundary.

Personal eligibility ≠ **Kebu ID** (business identity). Keep them separate in data model and UX copy.

**Kebu Search stays open globally** — it should become a genuinely useful search product worldwide while Africa’s deepest economic intelligence remains the differentiated advantage for entitled users.

---

## Core principles

1. Africa-first (product quality and intelligence depth — **not** global exclusion from the platform)  
2. Mobile-first  
3. Low-bandwidth-first  
4. Offline-capable wherever practical  
5. Minimize data consumption  
6. Support African languages progressively  
7. Do not copy Western SaaS blindly  
8. Build around African business structures, markets, payments, infrastructure  
9. Products share identity and data  
10. Simple for ordinary users; powerful for advanced users  
11. **End-to-end always** — UI ↔ API ↔ authz ↔ DB ↔ refresh ↔ tests; no fake buttons or disconnected shells  
12. Nav only when functionality exists  

---

## Core identity

- **Personal** Kebu identity + profile  
- **Business** identities (permanent **Kebu ID**)  
- Organizations, teams, permissions  
- **Kebu Score / KA Score** = explainable business reliability from verified activity (not popularity; not purchasable; not initially a regulated credit score)

---

## Products (modules — build when assigned)

| # | Product | Role |
|---|---------|------|
| 1 | **Kebu Search** | **Foundational** real search engine: crawl/collect → index → rank → results; AI **on top** with citations. Surfaces: Web · Africa · Trade · Opportunity · Research · Business · Products. Spec: `docs/product/KEBU-SEARCH.md`. **Never chat-as-search.** |
| 2 | **Kebu Mail** | Free personal (`name@…`) + business mail on verified domains (`hello@brand…`). Separate personal vs business identity. |
| 3 | **Kebu Cloud** | Files, apps, developer infra (future; ≠ Phase One site hosting). |
| 4 | **Kebu Builder** | AI-assisted website / store / portal builder (structured schema). |
| 5 | **Kebu Business** | Ops tools: CRM, inventory, invoices, customers, employees, analytics, orders, payments, workflows (grow slice-by-slice). |
| 6 | **Kebu Commerce** | **B2C** and **B2B** as distinct surfaces; one Kebu ID can enable one or both. |
| 7 | **Kebu B2B** | African industrial / wholesale discovery (MOQ, capacity, certifications, export). Internally comparable to Alibaba — **do not brand as “Alibaba for Africa.”** |
| 8 | **Kebu Network** (not “social”) | Professional discovery: cofounders, suppliers, customers, mentors, investors, partners. Not Instagram. |
| 9 | **Kebu Jobs** | Jobs + remote, tied to Kebu profile / skills / businesses. |
| 10 | **Opportunity OS** (standalone) + **Kebu Opportunity OS** | **Opportunity OS** = continent-scale explore (spec: `docs/OPPORTUNITY-OS-MASTER-SPEC.md`). **Kebu Opportunity OS** = for-you matching in Kebu (spec: `docs/KEBU-OPPORTUNITY-OS.md`). API integration only. |
| 11 | **Kebu Maps** | **Practical navigation first** (streets, routing, local transport, real POIs), then African road conditions, Farm Map, production maps, infrastructure gaps, **Africa Needs** → Opportunity OS. Spec: `docs/KEBU-MAPS-AND-INFRASTRUCTURE.md`. |
| 12 | **African Resource Intelligence** | Living country/resource map: where, production, who extracts, destinations, processing, value before/after, local industries, policy, opportunities — “what are we leaving on the table?” |
| 13 | **Value Leakage Intelligence** | Estimates of value leaving via raw export → foreign processing → import-back. Raw/processed/manufactured/local capture + assumptions + confidence + sources. Never estimates as facts. |
| 14 | **Build-It-Here Intelligence** | For a product/industry: imports, local producers, materials, equipment, cost tiers, suppliers, grants, markets. Philosophy: **verify the economics** — not “the West lies.” |
| 15 | **Yande / Yande Code** | Kebu AI: assistant + (later) build apps that deploy onto Kebu Cloud + Maps + Payments + ID — African stack, not ten foreign services. |

---

## Search framing (for Cursor)

**Wrong:** Search → ChatGPT answer · search box wired only to an LLM · chat-as-search.

**Right:** Build **Kebu Search** as a **real, end-to-end search engine** — foundational product:

```
Crawl / collect → index → rank → search → optional AI summary (with citations)
```

AI sits **on top of** retrieval, **never instead of** it. Surfaces: Web · Africa · Trade · Opportunity · Research · Business · Products · AI summary (linked).

Globally open. Low-bandwidth result cards. Spec: `docs/product/KEBU-SEARCH.md` · rule: `kebu-search.mdc`.

Do **not** ship Search without crawl/index/rank path for the surfaces you claim.

---

## Shared platform (mandatory)

Authentication · Kebu ID · business identities · search · notifications · messaging · payments · files · AI · analytics · permissions · organizations · localization · country/opportunity data.

Do **not** build each product as an isolated app with separate login islands.

---

## Low-data + offline (first-class, not a toggle afterthought)

**Engineering requirement:** for major actions ask **How many KB did this require?**

Modes: Normal · **Data Saver** · **Ultra** (text-first) · **Offline** (cache + queue + **Syncing…**).

Aggressive caching · compressed / on-demand images · lightweight pages · resumable uploads · queued actions · text-first results · progressive enhancement.

Offline: cached saved businesses, opportunities, docs, recent messages, search history, jobs, products, map tiles/areas where practical; draft email/invoice/application → sync when online.

Architecture assumes African connectivity — not Western product + “low data” lipstick.

---

## Infrastructure sovereignty (progressive)

See `docs/KEBU-MAPS-AND-INFRASTRUCTURE.md`.

1 Software → 2 **Data (strategic)** → 3 African CDN/edge → 4 Kebu Cloud → 5 Physical regional hubs.  
Do not build 54 data centers day one. Expose APIs so Africans build on Kebu. Own the **data graph** early even if compute still rents elsewhere.

---

## AI (Yande)

Search, summarize, compare, analyze, recommend, build (**Yande Code**), automate, monitor, match opportunities, analyze businesses/markets, identify suppliers, explain economic data, answer infrastructure/map questions with sources.

Economic/resource/map claims: **sources** + verified vs estimate. AI is not the database.

---

## Graph (long-term defensibility)

```
Person ↔ Business ↔ Product ↔ Job ↔ Opportunity ↔ Resource ↔ Institution ↔ Country ↔ Place/Road ↔ Money ↔ Market
```

Kebu AI (Yande) helps people **navigate the African economy**, not only answer chat questions.

### Learning loop (protect this) — **No watching**

Kebu brand principle: **No watching.** See `docs/product/KEBU-NO-WATCHING.md` · rule: `kebu-no-watching.mdc`.

Learn by **building** inside Builder, Shop, Opportunity, Kebu ID, Cloud — not passive courses. Yande guides **on the project**, not in a lecture LMS.

```
Africans use Kebu → Search / Business / Maps → Kebu Data → Yande
→ better intelligence → better opportunities → more businesses
→ more usage → more infrastructure → more African ownership
```

---

## Daily starting point (vision)

Not “replace Google.” Become where an African user goes to **do** something: opportunities, mail, jobs, store revenue, supplier replies, grants, Score — under one identity.

---

## Phased build (do not build everything at once)

| Phase | Focus |
|-------|--------|
| **1 Foundation** | Auth, Kebu ID, profiles, orgs, permissions, DB/API, design system, low-data foundations |
| **2 Search** | Real retrieval/index architecture (not chat-as-search) |
| **3 Mail** | Personal + business email |
| **4 Kebu Business** | Profiles + directory |
| **5 Commerce** | B2C / B2B |
| **6 Opportunity OS** + **Kebu Opportunity OS** | Standalone explore (Country Explorer in flight) + Kebu for-you layer |
| **7 Resource + Value Leakage + Build-It-Here** | Economic intelligence layers |
| **8 Jobs + Network** | Professional discovery |
| **9 Builder + Cloud** | Creation + broader deploy |
| **10 Advanced AI agents** | Autonomous ops (AI infra starts earlier) |

**Current engineering priority remains Phase One slices in `docs/IMPLEMENTATION_STATUS.md`.** This document is architecture compatibility + north star — not permission to ship empty Search/Mail/Jobs/Network shells.

---

## Domains (brand note)

Prefer short everyday email hosts when available; treat `kebu.africa` as continental/brand asset. Do **not** assume acquisition of `kebu.com`. Investigate short alternatives; do not settle strategy on a weak misspelling without a decision.

---

## Quality

End-to-end · discover → reproduce → root-cause fix → regress · never claim zero bugs · never mark UI-only work complete · label **NOT IMPLEMENTED** when unfinished.
