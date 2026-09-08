# Yande + Kebu Builder — operate the business, not only the page

**Kebu should help you run the business**, not only hand you website tools.

Maps is **not** a launch prerequisite. Full mapping is later — see `docs/KEBU-MAPS-AND-INFRASTRUCTURE.md`.

---

## Words → full site (Phase One — live)

User: describe the business in words → `POST /api/projects/create-website` `mode: "ai"` → structured `website-v1` pages in Supabase → editor → publish.

Hub: `/create` → **Describe it — Yande builds** → `/create/new?mode=ai`.

AI output is **editable Kebu schema**, never a locked HTML blob. If Anthropic is unset or generation fails, Kebu still creates a **full multi-page draft** from the words and says so honestly (`usedAi: false`).

Then: edit → Shop/products → payments → publish. **Build → Launch → Operate → Grow**.

---

## Yande roles (same Yande, different jobs + permissions)

Do **not** ship one generic chatbot that pretends to do everything.

| Role | Job | Status |
|------|-----|--------|
| **Yande Business** | Advisor/operator for the owner (“what do I do next?”) | Partial — improve + create; no fake ops dashboard |
| **Yande Customer** | Site customer-service agent | **NOT IMPLEMENTED** — no live agent until catalog + policies + authz |
| **Yande Sales** | Recommend / convert | **NOT IMPLEMENTED** |
| **Yande Marketing** | Campaigns, landing pages | **NOT IMPLEMENTED** (improve copy exists) |
| **Yande Finance** | Cash / sales analysis | **NOT IMPLEMENTED** (needs real events) |
| **Yande Research** | Markets, suppliers, grants | Opportunity OS later — sourced only |
| **Yande Code** | Build apps onto Kebu stack | **NOT IMPLEMENTED** |

Dangerous actions (refunds, cancel orders, spend money) require **explicit permission + confirmation**. Never invent product, stock, or shipping facts.

---

## Yande Customer Agent (Builder — later slice)

When assigned: **+ Add Yande** → Customer Service → choose knowledge (products, policies, FAQs, shipping) → where it appears (site / store).  

Must read **real** Shop catalog + settings. If data is missing, say so. No empty “Add Yande” button until the backend exists.

---

## Owner morning (later)

“How is my business doing?” → real sales/orders/questions only. No fake charts.

---

## Maps — delay the hard part

1. Use licensed/open geo where legal; Kebu owns **experience + African datasets + businesses + opportunities**.  
2. Collect Kebu-specific places (verify location, farms, road reports).  
3. Grow Kebu’s own dataset.  
4. Infrastructure independence last.

Launch order (do not skip to Maps): Kebu ID → Business → Builder → Yande (words + improve) → Customer Agent → Mail → Search → B2B → Opportunity OS → Jobs/Network → **Maps** → Cloud.

---

## Killer journey (north star, one slice at a time)

“I want to sell shea butter” → Yande helps: suppliers (later) → business → **website from words** → store → email → payments → customer agent (later) → wholesale/grants → Maps layers last.
