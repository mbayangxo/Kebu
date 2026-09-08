# Kebu Maps + African infrastructure sovereignty

**Cursor law:** Kebu Maps is a **practical navigation product first**, then African intelligence layers. Infrastructure sovereignty is **progressive** — own software and data early; physical data centers later. Do **not** ship empty Maps shells or fake “we own Africa’s CDN” claims.

Umbrella: `docs/KEBU-CORE-PRODUCT-ARCHITECTURE.md` · Status: `docs/IMPLEMENTATION_STATUS.md`.

---

## Thesis

Kebu is not merely “African Google.” It is **Africa’s digital layer for knowing, building, working, trading, and finding opportunity — increasingly running on infrastructure Africa controls.**

Maps, Search, B2B, Opportunity OS, **Yande** (AI) / **Yande Code**, Cloud, Mail, Jobs, Network are **windows into the same African digital infrastructure** — not random features.

---

## Part A — Kebu Maps

### 1. Practical map first (non-negotiable)

Before special layers, Maps must answer well:

- Where am I? Where is this place? How far / how long?
- Drive, walk, bike, transit, **local transport** options
- Actual **streets visible**
- Road reality: paved? rainy-season passable? bridges, rivers, checkpoints, ferries
- What businesses are actually there?

Data sources (progressive): licensed/open geo · satellite/aerial · community mapping · eventually Kebu mapping ops. **Do not require photographing every street on day one.**

### 2. African road intelligence

Beyond “road: available”:

| Attribute (examples) | Notes |
|----------------------|--------|
| Paved / unpaved | Verified when possible |
| Last verified | Timestamp |
| Flood risk / rainy season | Seasonal |
| Motorcycle / truck accessible | Vehicle class |
| Cellular coverage | Poor/none for N km |
| Fuel / services gaps | Distance to next station |

**User reports** (e.g. “road washed out”) → multi-signal verification → update. Community contribution is part of the product.

### 3. Kebu Farm Map (mode)

Farmers need a different mode than restaurant search:

Boundaries · fields · water · wells · irrigation · soil/rainfall/weather (sourced) · storage · mills · markets · ag suppliers · transport · buyers.

Queries: nearest rice mill · buyers within 100 km · sell harvest · fastest route to market city.

**Connects to Kebu B2B / Commerce** when those modules exist.

### 4. Production maps

Tap a region → what is produced → where it goes → who buys → where processed → exported → **what infrastructure is missing**.

### 5. Infrastructure gap layers

Energy · water · connectivity · transportation · manufacturing (factories, processing, warehouses, industrial zones) — where reliable data exists.

Question Maps + Yande should eventually answer: **What infrastructure is preventing this region from becoming an industrial center?**

### 6. “Africa Needs” layer

Not only “what’s here?” — **what’s missing?**

Population / output / processing / road access / cold storage → potential opportunities (cold storage, processing, logistics, solar, water, warehouses) → link to **Opportunity OS** (businesses, funding, grants, suppliers, investors, programs).

**Opportunity OS on a map.**

### Build rule for Maps

1. Navigation + streets + POIs (real data)  
2. Road condition / verification  
3. Business / farm / production layers  
4. Infrastructure gaps + Africa Needs + Opportunity OS  

One vertical slice at a time. Label **NOT IMPLEMENTED** until end-to-end.

---

## Part B — Ownership & infrastructure stack

**Problem:** Beautiful frontend on foreign-owned cloud/search/maps/mail/AI is not sovereignty.

Progressive levels (do not skip financially — **regional hubs**, not 54 full DCs day one):

| Level | Own | Notes |
|-------|-----|--------|
| **1 Software** | Apps, APIs, UX, algorithms, schemas | May run on existing cloud initially |
| **2 Data** | Business directory, opportunities, resources, geo, marketplace, economic intel, UGC maps | **Strategic asset** — protect early |
| **3 Network** | African CDN / edge / caching / regional storage | Lower latency & international bandwidth cost |
| **4 Kebu Cloud** | Compute, storage, DB, AI inference, developer envs in African regions | Product for African startups (“host on Kebu”) |
| **5 Physical** | Kebu data centers, renewables where viable, fiber/terrestrial/subsea paths | Long-term |

**Regional hubs** (e.g. West / East / Central / North / Southern Africa) + smaller **edge/cache nodes** per country — not one DC per country initially.

### Kebu CDN (ambition)

Prefer: User → African edge → content  
Over: User → Europe/US → Africa  

Benefits Kebu **and** other African sites when exposed as infrastructure.

### Kebu Infrastructure product (later)

African developers: Kebu Compute · Storage · Database · CDN · AI · Email · **Maps API** · Search API · Payments · Auth (Kebu ID) — build on African infrastructure instead of assembling ten foreign services.

### Yande Code ↔ infrastructure

> “Build me a food delivery app for Dakar” → Yande Code builds → Kebu Cloud hosts → Maps locations → Payments → Mail → Kebu ID auth → Yande assistant → Analytics.

One identity, one stack.

### Public APIs (platform, not only destination)

Maps · Business (permissioned) · Opportunities · Payments · Identity · Yande AI — so others build delivery, farm, logistics, tourism apps on Kebu.

---

## Part C — Low-data engineering requirement

Not marketing. Every major action should ask: **How many KB did this require?**

Modes: Normal · **Data Saver** · **Ultra** (text-first) · **Offline** (cache + queue + sync).

Maps/Search: text cards first; imagery on demand.

---

## Part D — Learn from Africa

```
Observe → Learn → Verify → Improve
```

Roads, businesses, resources, grants still-open, prices, routes — multi-source evidence. Africans contributing makes the infrastructure more accurate.

### The loop to protect

```
Africans use Kebu → Search / Business / Maps → Kebu Data → Yande AI
→ better intelligence → better opportunities → more businesses
→ more usage → more infrastructure → more African ownership
```

---

## Cursor / Phase One

- **Maps is not a launch prerequisite.** Build ID → Business → Builder → Yande first. Maps gets better once Kebu already has businesses, products, and places.
- Phase 1 Maps: licensed/open geo + Kebu experience/datasets. Phase 2: verify locations, farm maps, road reports. Phase 3–4: own dataset / infra.
- Document architecture only until a Maps slice is **explicitly assigned**.
- Do not fake live road conditions or Africa Needs without data + sources + confidence.
- Prefer open/licensed base maps before claiming exclusive imagery.
- Continue current Phase One slices in `docs/IMPLEMENTATION_STATUS.md`.
