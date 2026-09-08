# Kebu Creation Stack — organized roadmap

**Last updated:** 2026-09-07  
**Focus:** Site Builder · Shop · Studio (Canva-type editor) — under one Kebu Account / Kebu Business.

**Rule:** One vertical slice at a time. UI → API → Supabase → refresh → test. No fake nav.  
**Product law:** `docs/product/KEBU-BUILDER-NEXT-GEN.md` · **Live status:** `docs/IMPLEMENTATION_STATUS.md`  
**Priority lock (2026-09-07):** Shopify-**feel** editor density OK · scale/security/Data Saver · **performance + backend correctness over more aesthetic screens**. No mass new design worlds unless assigned.

---

## How the three products connect

```
KEBU ACCOUNT
     │
     ├── Personal Kebu (free) — profile, opportunity, future mail/search
     │
     └── Business Kebu (Kebu ID workspace)
              │
              ├── /my-sites/[id]     ← merchant HOME (nav tree)
              │
              ├── WEBSITE BUILDER    /create/[id]     sections · pages · publish
              ├── SHOP               /shop/[projectId] products · orders · checkout
              └── STUDIO             /studio/[id]      posters · brand · graphics
                        │
                        └── (future) Studio → Builder → Shop → Reach pipeline
```

**Shop is separate from the website editor** (Shopify model). Builder chooses layout; Shop owns catalog, orders, payments.

---

## Route map (what exists today)

| Route | Product | Purpose | Status |
|-------|---------|---------|--------|
| `/start` | Account | Pick Explore / Business / Studio workspace | ⚠️ Partial |
| `/my-sites` | Business | All sites | ✅ Live |
| `/my-sites/[id]` | **Home** | Merchant hub + Kebu Business nav tree | ✅ Live |
| `/create` | Builder | Builder home / site list | ✅ Live |
| `/create/new` | Builder | New site (template / AI / blank) | ⚠️ Partial |
| `/create/[id]` | **Website editor** | Sections · pages · media · aesthetics · Yande | ⚠️ Core live, gaps below |
| `/create/[id]/preview` | Builder | Preview before publish | ⚠️ Partial |
| `/create/domains` | Domains | Connect custom domain | ⚠️ Partial (B4 verified) |
| `/create/aesthetics` | Builder | Aesthetics marketplace | ✅ Live |
| `/shop` | Shop | Shop hub (pick store) | ✅ Live |
| `/shop/[projectId]` | **Shop admin** | Products · orders · payments · … | ⚠️ Tabs live, gaps below |
| `/studio` | Studio | Design library + AI history | ✅ Live |
| `/studio/templates` | Studio | Template discovery | ✅ Live |
| `/studio/new` | Studio | AI campaign | ✅ Live |
| `/studio/[id]` | **Studio editor** | Canva-class canvas | ✅ Live |
| `/sites/[subdomain]` | Public | Published website | ✅ Live |
| `/sites/[subdomain]/[page]` | Public | Multi-page public | ✅ Live |

---

## 1. WEBSITE BUILDER — every page & slice

### 1A. Merchant entry (Home)

| Slice ID | What | Status | Route / files |
|----------|------|--------|-------------|
| H1 | Site merchant hub + nav tree | ✅ Live | `/my-sites/[id]`, `site-merchant-hub.tsx`, `kebu-business-nav-tree.tsx` |
| H2 | Quick actions (edit site, shop, analytics, Yande) | ✅ Live | Same |
| H3 | Traffic / insights on home | ⚠️ Partial | `site-detail-insights.tsx` |
| H4 | Domain & SEO panel on home | ⚠️ Partial | `site-domain-seo-panel.tsx` |
| H5 | Themes / aesthetics from home | ⚠️ Partial | `site-themes-panel.tsx` |

### 1B. Website editor (`/create/[id]`)

| Slice ID | What | Status | Notes |
|----------|------|--------|-------|
| **B8** | **Inline horizontal section stack (Shopify-style)** | **IMPLEMENTED** | `+ Add section` between blocks on canvas; `insertAfterSectionId` API; section label chrome |
| W1 | Section add / delete / duplicate / reorder | ✅ Live | Sidebar DnD + inline stack |
| W2 | Click section in preview → edit | ✅ Live | `builder-editable-preview.tsx` |
| W3 | Inline text edit | ✅ Live | SiteRenderer editor mode |
| W4 | Pages manager (add/rename/reorder/delete) | ✅ Live | `builder-pages-panel.tsx`, B2 |
| W5 | Media library + drop on canvas | ✅ Live | `site-assets-panel.tsx` |
| W6 | Aesthetics / design system apply | ✅ Live | `builder-aesthetics-panel.tsx` |
| W7 | Navigation editor | ⚠️ Partial | `nav-links-editor.tsx` |
| W8 | Undo / redo | ✅ Live | Client history |
| W9 | Mobile / tablet / desktop preview | ✅ Live | Device frame + deviceOverrides for hero/nav/text/features/faq/products |
| W10 | Autosave + offline queue | ✅ Live | `offline-queue.ts` |
| W11 | Publish → public URL | ✅ Live | B3/B4 |
| W12 | Multi-page publish sync | ✅ Live | B3 |
| W13 | Header / footer as universal sections | ✅ Implemented — `projects.site_chrome`, publish compose, builder sidebar |
| W14 | Forms section (submit → DB/email) | ✅ Implemented | `form` section · public submit API · merchant GET submissions |
| W15 | Blog + posts | ❌ Not started | |
| W16 | Popups / email capture modals | ❌ Not started | |
| W17 | SEO panel in editor (meta, OG, JSON-LD) | ⚠️ Partial | Some on merchant home |
| W18 | May Lecor / flagship canvas modes | ✅ Live | Parallax, cutout links B1c/B1d |

### 1C. AI Builder (inside `/create/[id]` + `/create/new`)

| Slice ID | What | Status |
|----------|------|--------|
| A1 | Create from idea (structured JSON site) | ⚠️ Partial |
| A2 | Yande improve — preview → apply | ✅ B1/B6 |
| A3 | Command bar “Ask your site” | ✅ Live |
| A4 | Create from photos | ✅ Implemented |
| A5 | Redesign existing site | ✅ Mode chip + AI improve path |
| A6 | Generate page / section | ✅ Mode chip + focus page slug |
| A7 | Rewrite copy | ✅ Mode chip (copy-only bias) |
| A8 | Optimize conversion / mobile | ✅ Mode chip (CTA / WhatsApp / mobile) |

### 1D. Builder slice order (do in this sequence)

1. ~~**B8** — Inline horizontal section editor~~ ✅  
2. **W13** — Header / footer section system  
3. ~~**W14** — Forms section E2E~~ ✅  
4. **W15** — Blog  
5. **W16** — Popups / modals  
6. ~~**W9** — Mobile edit parity~~ ✅  
7. **A4–A8** — AI builder (one mode per slice)

### Master queue (assigned)

**Builder:** B8 ✅ → W13 → W14 ✅ → W15 → W16 → W9  
**Shop:** Pages tab DoD → C4 ✅ variants → C5 ✅ collections → C9 refunds → C12 COD/WhatsApp → C6 gift cards → C7 reviews → C8 subscriptions → **AN1** analytics  
**Studio:** S1 ✅ canvas → S2 ✅ templates → S3 ✅ brand kit → S6 ✅ Builder handoff → S7 ✅ Shop export

---

## 2. SHOP — every tab & slice

**Admin URL:** `/shop/[projectId]?tab=…`  
**Public:** cart/checkout on `/sites/[subdomain]/…`

### 2A. Shop tabs (what’s built)

| Tab | Panel | Status | E2E path |
|-----|-------|--------|----------|
| **Products** | `shop-products-panel` / `site-products-panel` | ✅ Live | CRUD → DB → storefront |
| **Pages** | `shop-pages-panel` | ⚠️ Partial | Shop page layout links |
| **Orders** | `shop-orders-panel` | ✅ Live | List · open · fulfill · demo order |
| **Analytics** | `shop-analytics-panel` | ⚠️ Partial | Real orders + pageviews |
| **Sell anywhere** | `shop-sell-anywhere-panel` | ⚠️ Partial | Architecture / honest limits |
| **Messages** | `shop-messages-panel` | ✅ Live | Customer messages |
| **Abandoned** | `shop-abandoned-carts-panel` | ✅ Live | Cart drafts |
| **Customers** | `shop-customers-panel` | ✅ Live | Profiles |
| **Discounts** | `shop-discounts-panel` | ✅ Live | Codes |
| **Payments** | `shop-payments-panel` | ⚠️ Partial | Paystack · PayPal · Wave · JOKO |

### 2B. Shop features still to build

| Slice ID | What | Status | Priority |
|----------|------|--------|----------|
| **C4** | Product **variants** (size, color, SKU) | ✅ Implemented | High |
| **C5** | **Collections** | ✅ Implemented | High |
| C6 | Gift cards (full, not partial link) | ✅ Redeem live | Issue + checkout apply + balance decrement + disable |
| C7 | Product reviews | ❌ Not started | Medium |
| C8 | Subscriptions (product flag → public subscribe → renewal order cron → merchant pause/cancel) | ✅ Implemented | — |
| C9 | Refunds workflow | ❌ Not started | High |
| C10 | Inventory alerts / low stock | ⚠️ Partial | Medium |
| C11 | Checkout customization | ⚠️ Partial | Medium |
| C12 | COD + WhatsApp commerce flows | ❌ Not started | High (Africa) |
| C13 | Taxes / shipping rules architecture | ❌ Not started | Medium |
| C14 | Digital products | ❌ Not started | Low |

### 2C. Public storefront commerce path

| Step | Status |
|------|--------|
| Product on live site | ✅ |
| Add to cart | ✅ |
| Checkout | ✅ |
| Payment webhook → paid status | ✅ C1 |
| Order in merchant Orders tab | ✅ |
| Customer account on site | ⚠️ Partial |
| Wishlist | ✅ |

### 2D. Shop slice order

1. **C4** — Variants  
2. **C5** — Collections  
3. **C9** — Refunds  
4. **C12** — COD / WhatsApp checkout path  
5. **C6** — Gift cards complete  
6. Analytics tab → full DoD (real funnel, not partial)

### 2E. Shop “Pages” and “Sell anywhere”

**Pages tab** — Manage store **website pages + nav menu** from Shop admin (add About, FAQ, etc.) without hunting in Builder. Partial today: lists pages, adds rows, edits nav links; **complete slice** = new page → sections → nav → public URL → refresh.

**Sell anywhere tab** — **Channel map** for one catalog sold in many places. Live: Kebu Store + WhatsApp. Partial: Social (Studio link). Not started: Search, RECT, POS, marketplaces — shown honestly, no fake Connect buttons.

---

## 3. STUDIO — Canva-type editor

**Today:** `/studio/[id]` is a **layer canvas** (text/shapes/images) with templates, brand kit, AI campaign packs (S4), and save to Supabase.

### 3A. Studio pages

| Route | Purpose | Status |
|-------|---------|--------|
| `/studio` | Design library | ✅ Live |
| `/studio/templates` | Template discovery | ✅ Browse · filter · search · preview · create |
| `/studio/new` | AI campaign | ✅ Live (+ link to gallery) |
| `/studio/[id]` | Editor | ✅ **Canva-class shell** — Elements · multi-page · pan · multi-select · align/group · Properties · upload · undo/redo · zoom · autosave · PNG |

### 3B. Studio slices (build toward Canva-level)

| Slice ID | What | Status |
|----------|------|--------|
| **S1** | **Canvas editor v1** — layers, text, shapes, drag/resize | ✅ **Implemented** |
| **S1b** | **Multi-page · pan · multi-select · align/group** | ✅ **Implemented** (`CanvasDocument` v2 `pages[]`) |
| S2 | Templates (discovery gallery) | ✅ **Implemented** — `/studio/templates` · filter/search · `GET /api/studio/templates` |
| S3 | Brand kit (logo, colors, fonts) | ✅ Implemented |
| S4 | AI: “launch campaign…” → multi-asset pack + history | ✅ **Implemented** (`/api/studio/generate`, migration **070**) |
| S5 | Export PNG/PDF + WhatsApp share | ✅ PNG download + images in export · Shop handoff |
| S6 | **Studio → Builder** — apply brand to site theme | ✅ Implemented |
| S7 | **Studio → Shop** — product image → product record | ✅ Implemented |
| **S8b** | **Page timeline** — duration clips · playhead · video seek export | ✅ **Implemented** (not full CapCut multi-track) |
| S8 | Full CapCut (multi-track audio · keyframes · effects) | ❌ Later |
| **S9a** | **Share & roles** — invite by email, editor/viewer, Shared with me | ✅ **Implemented** (migration **071** — not live cursors) |
| S9 | Realtime collab (cursors / CRDT) | ❌ Not started |
| **S10a** | **Reach handoff** — Studio → tracked `/r/…` link · opens/clicks | ✅ **Implemented** (migration **072** — not paid ads) |
| **S11** | **Create & Library OS** — blank sizes · search · rename · duplicate · delete | ✅ **Implemented** |
| **S12a** | Image craft — flip · fit · replace | ✅ **Implemented** |
| S12b | Image crop | ✅ |
| S13 | Copy/paste + snap + nudge | ✅ |
| S14 | Resize artboard | ✅ |
| S15 | PDF + ZIP export | ✅ |
| S16 | Uploads library (073) | ✅ |
| S10 | Paid Reach network / RECT marketplace | **S10b** board+CPC ✅ · multi-inventory later |

### 3C. Studio slice order

1. ~~**S1** — Real canvas editor + Supabase persist~~ ✅  
2. ~~**S2** — Template gallery~~ ✅  
3. ~~**S3** — Brand kit~~ ✅  
4. ~~**S6** — Send brand to Builder~~ ✅  
5. ~~**S7** — Send asset to Shop product~~ ✅  
6. ~~**S4** — AI campaign generator~~ ✅  
7. ~~**S5** — PNG export + Canva-class editor shell~~ ✅  
8. ~~**S1b** — Multi-page · pan · align/group~~ ✅  
9. ~~**S9a** — Share & roles~~ ✅  
10. ~~**S8a** — Video layer + motion WebM~~ ✅  
11. ~~**S10a** — Reach tracked promote links~~ ✅  
12. ~~**S11** — Create & Library OS~~ ✅  
13. **S12** — Image craft (next) — see `KEBU-STUDIO-CANVA-BLUEPRINT.md`  
14. **S8 / S9 / S10** — Timeline · live cursors · paid Reach (later)  

---

## 4. Cross-links (keep merchants oriented)

| From | To | Today |
|------|-----|-------|
| Merchant home | Builder, Shop, Studio | ✅ Quick actions |
| Builder | Shop (“manage products”) | ⚠️ Nudge exists |
| Shop | Builder (“edit storefront”) | ⚠️ Links in shop header |
| Studio | Builder / Shop | ⚠️ Text links only — no asset handoff |
| Business nav tree | All areas with honest status | ✅ `kebu-business-nav.ts` |

---

## 5. Current focus (engineering)

**Next slice:** **W15 — Blog**

B8 ✅ implemented: `+ Add section` between canvas blocks · `insertAfterSectionId` on sections API · section type label on select.

**Deferred until Creation Stack core is solid:** Kebu Mail, Search, Cloud, Reach, full KA Score.

---

## 6. Definition of done (every slice)

- [ ] UI control exists and is labeled honestly if partial  
- [ ] API or server action with authz  
- [ ] Supabase table / RLS / migration if needed  
- [ ] Refresh browser — data persists  
- [ ] Loading / empty / error states  
- [ ] Unit or integration test for critical path  
- [ ] `kebu-business-nav.ts` status updated if nav item becomes live  
- [ ] `docs/IMPLEMENTATION_STATUS.md` updated when TESTED  

---

## 7. Quick reference — key files

| Area | Files |
|------|-------|
| Merchant nav | `lib/navigation/kebu-business-nav.ts`, `kebu-business-nav-tree.tsx` |
| Website editor | `app/create/[id]/page.tsx`, `builder-editable-preview.tsx`, `builder-section-list-dnd.tsx` |
| Shop admin | `app/shop/[projectId]/shop-admin-client.tsx`, `app/components/shop/*` |
| Studio | `app/studio/*`, `lib/create/create-designs.ts` |
| Backlog (completed B/C/P) | `docs/product/BUILDER-SLICE-BACKLOG.md` |
