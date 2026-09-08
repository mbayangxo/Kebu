# Kebu Search — product specification

**Status:** Future foundational product — **NOT STARTED** as full engine. See `docs/IMPLEMENTATION_STATUS.md`.

**Agent rules:** `.cursor/rules/kebu-search.mdc` · `.cursor/rules/kebu-economic-discovery.mdc`  
**Economic discovery architecture:** `docs/product/KEBU-ECONOMIC-DISCOVERY.md`

---

## Framing for Cursor (mandatory)

**Wrong:**

> African Google  
> Search → ChatGPT answer  
> A search box wired only to an LLM  
> “Build search” as a chat wrapper  

That produces **invention without retrieval** — untrustworthy for commerce, trade, and opportunity questions.

**Correct:**

> Build **Kebu Search** as an **economic discovery engine** — intent and usefulness, not ten blue links.  
> A **core Kebu product** on the **same Kebu Account** as Builder, Mail, and Cloud.  
> Real **crawl/index/rank**; AI sits **on top with citations** — **never instead of** search.

Kebu Search remains **globally open** (see `docs/product/KEBU-GLOBAL-ACCESS-PHILOSOPHY.md`).

**Basic unit (target):** opportunity · entity · transaction · relationship — not only webpages.

---

## Search modes (user selects)

| Mode | Index focus |
|------|-------------|
| 🔎 **Web** | General internet |
| 🌍 **Africa** | African sites, businesses, content |
| 💼 **Business** | Companies, suppliers, manufacturers |
| 🛍️ **Products** | Buyable goods (Kebu Shop + indexed catalog) |
| 🧑🏾‍💻 **People & Talent** | Creators, developers, designers, professionals |
| 📚 **Research** | Papers, reports, market intelligence |
| 🚢 **Trade** | Exporters, importers, suppliers, routes |
| 💡 **Opportunities** | “What can I build?” — Opportunity OS, trust-labeled |
| 🎬 **Culture** | **RECT** videos and creator content |
| 📍 **Local** | Nearby businesses and services |

Build **one mode + one honest index** per vertical slice.

---

## Architecture (required pipeline)

```
Collect / crawl / ingest (per source)
        ↓
Index (per mode / entity type)
        ↓
Rank
        ↓
Search API + UI
        ↓
Optional: Ask Kebu (AI summary WITH citations)
        ↓
Actions: Build · Buy · Lead · Reach · Trade · … (same Kebu Account)
```

Every production path must expose **source metadata** (URL, entity id, trust label, fetched_at).

---

## Example: “Chocolate Senegal”

| Surface | Content (when indexed) |
|---------|------------------------|
| Products | Senegalese chocolate on Kebu Shop |
| Businesses | Manufacturers — Business Profiles |
| Trade | Export/import context (sourced) |
| Opportunity | Gap analysis — **Verified/Estimated only** |
| People | Makers, distributors |
| Culture | RECT content |
| News | Industry items (sourced) |
| Intelligence | Market data (tiered) |
| Build | Handoff to Builder / Create Business |
| Finance | Programs (future Capital — honest labeling) |

This is what makes Kebu **fundamentally different** from webpage-only search.

---

## Architecture (engineering)

- Real **crawl/collect → index → rank** — not frontend-only  
- **Modular indexes** — add sources without rewriting core  
- **Separate product domains** — Builder, Opportunity OS integrate via APIs + shared identity  
- **Low-bandwidth-first** result cards  
- **Forbidden:** chat-as-search, fake results, empty Search home, AI without citations  

---

## Contextual search + actions (with permission)

Opt-in personalization (business profile, workspace) → action chips: Build · Opportunity · Mail · Cloud · Analytics · Reach · Leads.

Server-stored consent · revocable in account control center. See `docs/product/KEBU-UNIFIED-ACCOUNT.md`.

---

## Build order (vertical slices)

1. Search UI + honest empty state OR **narrow first index** (Kebu businesses + published sites + Kebu ID public pages)  
2. One mode live end-to-end (e.g. **Business** or **Products**)  
3. Add modes incrementally  
4. **Culture** (RECT) as indexed source — not separate login  
5. **Ask Kebu** only after retrieval works  

**Phase One honest corpus:** Opportunity OS entities (trust-labeled) + Kebu business/site records — not a fake global crawler.

---

## Related docs

Economic discovery: `docs/product/KEBU-ECONOMIC-DISCOVERY.md` · Unified account: `docs/product/KEBU-UNIFIED-ACCOUNT.md` · Architecture: `docs/KEBU-CORE-PRODUCT-ARCHITECTURE.md` · Opportunity OS: `docs/OPPORTUNITY-OS-MASTER-SPEC.md`
