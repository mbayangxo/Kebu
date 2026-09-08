# Opportunity OS — Master Product Specification

**Engineering law:** **Opportunity OS is a separate product** from Kebu.

| Product | Identity | Purpose |
|---------|----------|---------|
| **Opportunity OS** | Standalone economic intelligence, discovery, research, strategy, and action platform | Continent-scale **explore** — evidence, gaps, trade, resources, opportunity cards, research labs |
| **Kebu Opportunity OS** | Kebu ecosystem feature (not Builder) | **For you** — what opportunities match *this person* or *this business* inside a Kebu account |

They may integrate through **APIs** (e.g. Build This → Kebu Builder / Kebu ID). They must **not** be merged into one product identity, one database schema, or one UI shell.

Kebu-specific layer: `docs/KEBU-OPPORTUNITY-OS.md` · Kebu umbrella: `docs/KEBU-CORE-PRODUCT-ARCHITECTURE.md` · Status: `docs/IMPLEMENTATION_STATUS.md` · Agent rules: `.cursor/rules/opportunity-os-master.mdc` · `.cursor/rules/kebu-opportunity-os.mdc`.

---

## Repository note (current)

Country Explorer and related APIs live under `/opportunity` in the Kebu monorepo **for now**. Treat code as **Opportunity OS product domain** (`lib/opportunity/*`, `app/opportunity/countries/*`, `app/api/opportunity/countries/*`) — separate schemas, RLS, and future deploy boundary from Kebu Builder. **Kebu Opportunity OS** (`for-you`, intake) must not absorb Opportunity OS explore surfaces.

---

## 1. Mission

Systematically discover opportunities that people, businesses, researchers, investors, governments, and organizations are missing.

Answer: what exists · what is missing · imports/exports · resources · who captures value · where value leaves · where value is created · gaps · import-replace potential · raw export without value-add · underdeveloped industries · problems worth solving · businesses that could exist · technology shifts · emerging markets · **intra-African trade** · what Africa can build for itself · **what Africa should build next**.

---

## 2. Core philosophy

**Not:** news site · directory · ChatGPT wrapper · database dump · market-research brochure · government stats dashboard alone.

**Is:**

```
DATA → RESEARCH → PATTERNS → GAPS → OPPORTUNITY → BUSINESS MODEL → ACTION
```

Framing: **verify the economics** — not ideology. Never fabricate facts. Label: **FACT · ESTIMATE · INFERENCE · OPPORTUNITY HYPOTHESIS · Verified · AI-generated · Requires validation**.

---

## 3. Country intelligence

Every country eventually gets an Opportunity OS profile (economy, trade, resources, agriculture, fisheries, mining, manufacturing, energy, tech, health, education, tourism, logistics, finance, housing, infrastructure, culture, media, creative industries, telecom, digital economy, climate, water, food systems, …).

Each section: current state · problems · import dependencies · exports · value-addition gaps · market gaps · local/foreign competitors · emerging opportunities · relevant technologies · potential businesses.

**First vertical slice (in flight):** Country Explorer — one country end-to-end with real DB + sources + trust labels.

---

## 4. Resource intelligence

Map minerals, agriculture, fisheries, forests, energy, human capital, manufacturing capability, cultural assets, land, water, renewables, technical talent.

For each: origin · who extracts · who processes · export destinations · importers · end products · highest-value chain link · value potentially lost on raw export · what could be built locally. **Sourced data only.**

---

## 5. Import replacement engine

Per country + product: import value · source countries · local production · competitors · raw material availability · processing · equipment · skills · local/regional/export markets → **“Could this be produced competitively here?”** with why/why-not. Do not claim every import should be replaced.

---

## 6. Value-addition engine

Show chains: RAW → PROCESSING → INTERMEDIATE → FINISHED → BRAND → EXPORT MARKET. Identify gaps (e.g. cocoa → ingredients → chocolate → African brand → regional/global market).

---

## 7. African intercontinental trade

Not only “export to Europe.” Country A products · Country B demand · trade gap · logistics · regulations · potential business. Queries like “products Senegal could sell to Nigeria.”

---

## 8. Opportunity discovery engine

Hypotheses from **signals** (imports, exports, prices, demand, demographics, infrastructure, resources, tech adoption, regulations, business formation, funding, patents, procurement, tenders, trade flows, climate, …). **Do not** let an LLM invent opportunities without evidence. Data + reasoning + sources.

---

## 9. Opportunity cards

Structured cards: opportunity · location · problem · evidence · why now · customer · current solutions · import dependency · local resources · required capabilities · estimated market · competition · regulatory notes · potential African markets · business models · difficulty · capital intensity · time to market · **confidence · sources**.

---

## 10. Opportunity ranking

Transparent multi-dimension model (demand, growth, import dependency, resource availability, competition, capital, technical difficulty, infrastructure, regulatory difficulty, margins, export potential, jobs, value retention, strategic importance, time to market). Show **why** scored. Speculative scores ≠ objective truth.

---

## 11. Who already did this?

African + global proof cases: what they built · where · when · problem · revenue model · market · lessons. Goal: “Someone proved this category can exist” → “Could a different version work here?”

---

## 12. Opportunity map

Interactive Africa map: Country → Industry → Resource → Problem → Opportunity.

---

## 13. Build This mode

Structured exploration: idea · customer · problem · solution · model · equipment · people · skills · startup cost range · suppliers · regulatory questions · market · competitors · pricing · GTM · African expansion · export potential.

Eventually: **“Build this with Kebu”** — **API handoff only**; products remain separate. Never auto-publish.

---

## 14–18. Research Lab · Think Lab · Challenges · Talent · News

- **Research Lab** — saved research, reports, citations, datasets, comparisons (not Builder UI).
- **Think Lab** — collective intelligence on hard problems; not social media.
- **Challenges / seminars** — research and entrepreneurship competitions.
- **Talent + opportunity** — opt-in matching only; no private data leaks.
- **News/intelligence** — why it matters · what changed · who benefits/loses · what opportunities result.

---

## 19–22. Data · AI · confidence · geography

Legitimate sources with metadata. AI = **reasoning on retrieval**, not the database. Confidence: HIGH · MEDIUM · EXPLORATORY. **Africa-first, not Africa-only** — global supply chain context required.

Preferred AI path:

```
QUESTION → QUERY UNDERSTANDING → RETRIEVAL → DATA → SOURCE VALIDATION → ANALYSIS → REASONING → OUTPUT + SOURCES/CONFIDENCE
```

---

## 23. Product experience

Home asks: **What are you trying to discover?**

Examples: opportunities in Senegal · products Senegal imports · what Senegal could manufacture · export opportunities · compare Nigeria and Ghana · growing African industries · who already solved this · research a resource · problems worth solving.

*(Kebu Opportunity OS adds a separate **For you** home inside Kebu — see `docs/KEBU-OPPORTUNITY-OS.md`.)*

---

## 24–25. Architecture · Supabase

**Separate product architecture:** frontend · API · ingestion · processing · search/index · AI/reasoning · opportunity engine · research · accounts · orgs · collaboration · billing.

Schemas (migrations + RLS): users · organizations · research_projects · countries · industries · resources · companies · trade_data · imports · exports · opportunities · opportunity_sources · opportunity_scores · research_documents · think_labs · participants · challenges · saved_items.

No secrets in frontend. End-to-end only — no fake buttons or empty “finished” pages.

---

## 26–27. Build vertically

1. **Country Explorer** (first — must work E2E)  
2. Opportunity Card  
3. Discovery engine  
4. Trade intelligence  
5. Import replacement  
6. Value addition  
7. Research Lab  
8. Think Labs  
9. …

Inspect repo → one slice → FE + API + DB → test → root-cause fixes → next.

---

## 28–29. Quality · final principle

Should feel like: economic intelligence + research platform + discovery engine + strategy platform + think lab.

Should **not** feel like: chatbot · generic dashboard · news site · directory · ChatGPT wrapper.

Help people move: wonder → evidence → opportunity → why → who did it → what it takes → how to test → build (optionally via Kebu).
