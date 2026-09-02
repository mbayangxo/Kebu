# Kebu — Implementation Status

**Last updated:** 2026-08-31  
**Owner:** Engineering (lead agent + human review)

Status labels (strict):

| Label | Meaning |
|-------|---------|
| **NOT STARTED** | No real end-to-end path |
| **IN PROGRESS** | Partial stack; gaps remain |
| **BLOCKED** | Waiting on migration, credentials, legal, or external approval |
| **IMPLEMENTED** | Full stack works in dev with migrations applied |
| **TESTED** | IMPLEMENTED + automated tests + manual slice verification |
| **PRODUCTION READY** | TESTED + deployed config + adversarial audit passed |

Do **not** mark PRODUCTION READY without Definition of Done (see `docs/product/ENGINEERING-MANDATE.md`).

**Apply migrations locally/Supabase before judging DB-backed features.** Many slices require `005`–`017` + builder migrations.

---

## Summary

| Product area | Status | Notes |
|--------------|--------|-------|
| Shared auth & session | **TESTED** | Supabase auth, middleware session |
| Kebu Builder — core editor | **IN PROGRESS** | Sections, autosave, templates; gaps in E2E |
| Kebu Builder — publish & hosting | **IN PROGRESS** | Subdomain publish; billing/JOKO slice local |
| Kebu Builder — custom domains | **IN PROGRESS** | API + UI + middleware + tests; migration **015**; DNS target `cname.vercel-dns.com` (accepts `*.vercel.app`); repair **030**; **must deploy latest code** for verify to stop expecting `*.kebu.africa` |
| Kebu Builder — pages CRUD | **IN PROGRESS** | API exists; full DoD not verified |
| Kebu Builder — SEO/settings | **IN PROGRESS** | Advanced SEO: JSON-LD, auto description, sitemap.xml/robots.txt routes, Search Console field; Domain & SEO panel outside editor |
| Support desk (help with user sites) | **IN PROGRESS** | `/support` + `KEBU_SUPPORT_ADMIN_EMAILS`; audited open/edit via service role on project GET/sections/assets |
| Kebu Builder — stores/commerce | **IN PROGRESS** | Shop UI moved out of builder → `/shop` (Shopify-style). Catalog API = `project_products`. Legacy `/store/*` generate path still exists; checkout E2E not complete |
| Kebu Shop (merchant admin) | **IN PROGRESS** | `/shop` hub + `/shop/[projectId]` catalog; not inside site editor |
| Kebu Builder ↔ Kebu ID link | **IMPLEMENTED** | `business_id` on projects; dashboard shows sites; publish syncs website URL |
| Kebu Business Infrastructure — Kebu ID | **TESTED** | Draft create + dashboard + security tests |
| Kebu Business Infrastructure — Registration | **IMPLEMENTED** | Tracker + documents; gov steps blocked honestly |
| Kebu Business Infrastructure — Business Readiness | **IMPLEMENTED** | Server calc; `/business/[id]` + `/ka-score` (labeled Kebu Score) |
| Kebu Business Infrastructure — Full Kebu Score | **NOT STARTED** | No `ka_scores` migration yet — readiness ≠ full score |
| Kebu Opportunity OS — Country Explorer | **TESTED** | UI→API→Supabase (`009`); trust labels + sources on detail; `/map` redirects here; apply migrations in prod |
| Kebu Opportunity OS — other slices | **NOT STARTED** | Hub no longer shows fake clickable future cards |
| Sample `/opportunity/[id]` & `/api/opportunities` | **IN PROGRESS** | Still `SAMPLE_OPPORTUNITIES` — not Opportunity OS DB |
| Kebu Domains (product) | **IN PROGRESS** | Connect domain slice (subset of Builder) |
| Kebu Analytics | **NOT STARTED** | Store analytics API partial; no business dashboard |
| Kebu AI — improve/generate | **IN PROGRESS** | Server routes; metering incomplete |
| Kebu Cloud | **NOT STARTED** | Compatibility only |
| Kebu Mail | **NOT STARTED** | Compatibility only |
| Billing / JOKO hosting | **IN PROGRESS** | Webhook + subscribe routes; env-dependent |
| Site health cron | **IN PROGRESS** | Cron route; needs `CRON_SECRET` + deploy |

---

## 1. Kebu Builder

### AI website builder & visual editor
| Slice | Status | Routes / files |
|-------|--------|----------------|
| Create project from template | **IN PROGRESS** | `/create`, `/api/projects/create-website` |
| Visual editor + section autosave | **IN PROGRESS** | `/create/[id]`, `/api/projects/[id]/sections` |
| AI improve (Yande) | **IN PROGRESS** | `/api/projects/[id]/ai-improve` |
| AI generate | **IN PROGRESS** | `lib/create/ai-generate.ts` |
| Undo/redo | **IMPLEMENTED** | Client-only history |
| Multi-page sites | **IN PROGRESS** | `/api/projects/[id]/pages` |
| Templates (May Lecor ksendr + K-Direction Wix canvas) | **TESTED** | Russian cutouts hosted locally (transparent PNGs on pink bg — no black Tilda CDN boxes); click→upload/swap/drag; Media/nav/social; run `FIX_SECTION_TYPES_031.sql` |
| Preview | **IN PROGRESS** | `/create/[id]/preview` |
| Link project to Kebu ID business | **IMPLEMENTED** | `business_id` required on create; `/create/new?businessId=` |

**Gaps:** Full Playwright E2E for editor; much uncommitted work not on Vercel.

### Publish, subdomains, hosting
| Slice | Status |
|-------|--------|
| Publish to `*.kebu.africa` | **IN PROGRESS** |
| Public site renderer | **IN PROGRESS** | `/sites/[subdomain]` |
| Middleware subdomain rewrite | **IMPLEMENTED** |
| Live deployment snapshot | **IN PROGRESS** | `deployments` table |
| Sync published URL to business profile | **IMPLEMENTED** | On publish when `business_id` set |
| Hosting billing (JOKO) | **IN PROGRESS** | **BLOCKED** without env + migration 010 |

### Custom domains & Kebu Domains
| Slice | Status |
|-------|--------|
| Connect owned domain (DNS + verify) | **IN PROGRESS** | Migration **015**; repair **030** if old `*.kebu.africa` targets in DB; deploy DNS fix to prod |
| Middleware custom host routing | **IN PROGRESS** | Needs `SUPABASE_SERVICE_ROLE_KEY` |
| DNS instructions (CNAME → Vercel) | **IMPLEMENTED** | `cname.vercel-dns.com` or `*.vercel.app`; not `{sub}.kebu.africa` |
| Namecheap guidance (no fake purchase) | **IMPLEMENTED** |
| Sell domains / registrar API | **NOT STARTED** |
| DNS management UI | **NOT STARTED** |

### Stores, orders, payments
| Slice | Status |
|-------|--------|
| Store create/publish | **IN PROGRESS** | `/api/store/*` |
| Products, cart, checkout | **IN PROGRESS** | Partial |
| K21 / Wave / Orange architecture | **IN PROGRESS** | Adapter pattern partial |
| Orders verified webhooks | **IN PROGRESS** | Stripe/store webhooks exist |

### Website analytics
| Slice | Status |
|-------|--------|
| Store analytics API | **IN PROGRESS** |
| Builder site analytics dashboard | **NOT STARTED** |
| Event pipeline | **NOT STARTED** |

---

## 2. Kebu Opportunity OS

| Slice | Status |
|-------|--------|
| Country Explorer (DB) | **TESTED** | `/opportunity/countries`, APIs, trust labels, sources UI, tests — migration **001+009** required in prod |
| Opportunity intake + personalization | **IMPLEMENTED** | `/opportunity/intake` → profile in DB → `/opportunity` For you plan, stories, filtered countries — migration **026** |
| Country detail + AI analysis | **IMPLEMENTED** | AI path needs `ANTHROPIC_API_KEY` (honest 503 without it) |
| Industry / resource / trade explorers | **NOT STARTED** |
| Build This Opportunity → Builder | **NOT STARTED** |
| Hub (`/opportunity`) | **IMPLEMENTED** | Gates on intake; personalized feed when profile complete |
| Legacy sample opportunity pages | **IN PROGRESS** | `/opportunity/[id]`, `/api/opportunities` still use sample data — do not confuse with OS |

---

## 3. Kebu Cloud

**NOT STARTED** — Do not ship placeholder dashboards. Phase One uses Builder hosting only.

---

## 4. Kebu Mail

**NOT STARTED** — Depends on verified custom domains + mail provider boundary.

---

## 5. Kebu Analytics (product)

**NOT STARTED** as unified product. Partial store analytics only.

---

## 6. Kebu Business Infrastructure

### Afrique ID (personal account identity)
| Slice | Status |
|-------|--------|
| Linked to auth user (1:1) | **IMPLEMENTED** | Auto-provision on profile load — migration **027** |
| Account UI + sidebar | **IMPLEMENTED** | `/account`, dashboard, sidebar show `AFRI-{CC}-01-…` |
| Verification request (pending only) | **IMPLEMENTED** | Users cannot self-set verified |
| Public verified card | **IMPLEMENTED** | `/id/{publicId}` when eligibility = verified |

### Kebu ID
| Slice | Status |
|-------|--------|
| Draft business + public ID | **IMPLEMENTED** | Migrations 005–006 |
| Founder RBAC + audit | **IMPLEMENTED** |
| Business dashboard | **IMPLEMENTED** |
| Verification levels 2–4 | **NOT STARTED** |
| Team invites | **NOT STARTED** |
| Claim existing company | **NOT STARTED** |

### Business registration
| Slice | Status |
|-------|--------|
| Registration wizard | **IMPLEMENTED** |
| Progress tracker UI (9 steps) | **IMPLEMENTED** | Honest blocked labels for gov steps |
| Document upload → `documents_uploaded` | **IMPLEMENTED** | Migration **017**; Supabase Storage |
| Government submit | **BLOCKED** | Mock connector only — labeled honestly |
| Payment / approval / tax / active steps | **BLOCKED** | Await gov integration slice |

### Kebu Score
| Slice | Status |
|-------|--------|
| Business Readiness (profile + docs) | **IMPLEMENTED** | Shown on `/ka-score` as **Kebu Score · Business Readiness** |
| Full Kebu Score (`ka_scores` schema) | **NOT STARTED** |
| Naming | **User-facing = Kebu Score** | “KA Score” is an internal alias only |

---

## 7. Kebu AI

| Slice | Status |
|-------|--------|
| Provider abstraction | **IN PROGRESS** |
| Website improve/generate | **IN PROGRESS** |
| Opportunity analysis | **IN PROGRESS** |
| Metering / cost controls | **NOT STARTED** |
| Business-bound RBAC for AI context | **IN PROGRESS** |

---

## 8. Shared infrastructure

| System | Status |
|--------|--------|
| Authentication (Supabase) | **TESTED** |
| API rate limiting | **IN PROGRESS** | `lib/api-guard.ts` — builder/AI/public + **auth** (admin login) |
| Platform hardening (anti-abuse) | **IN PROGRESS** | Signed admin session cookie; HSTS; `/shop`+`/support` auth gate; same-origin on publish/sections; XSS block on section save |
| RLS on core tables | **IN PROGRESS** |
| Audit logs (business) | **IMPLEMENTED** |
| Billing core | **IN PROGRESS** |
| Notifications | **IN PROGRESS** |
| File storage (business docs) | **IMPLEMENTED** | Migration 017 |
| Search | **NOT STARTED** |
| API gateway | **NOT STARTED** (Next.js routes only) |

---

## Migrations checklist

| Migration | Purpose | Required for |
|-----------|---------|--------------|
| 005–007 | Kebu ID + registration | Business flows |
| 008 | Website builder core | `/create`, publish |
| 009 | Opportunity Country Explorer | `/opportunity/countries` |
| 010 | JOKO billing | Paid hosting / publish gate |
| 011–013 | Templates, SEO | Editor SEO tab |
| 014 | Builder extensions | Health cron, marketplace tables |
| 015 | Custom domains | Domain connect |
| 016 | Registration timeline labels | Progress tracker sync |
| 017 | Business documents | Document upload slice |

---

## Known hard gates (not ignored)

1. **Publish** requires active JOKO hosting (or `JOKO_BILLING_DEV_BYPASS=true` in dev) — migration **010** + env.
2. **Custom domain routing** needs `SUPABASE_SERVICE_ROLE_KEY` in middleware.
3. **Document upload / domains / SEO** need migrations **013–017** applied in Supabase.
4. **Country Explorer** empty until migration **009** (+ optional admin seed).

**Post-migration manual verify:** see `docs/VERIFY-AFTER-MIGRATIONS.md` (Country Explorer · documents · domains).

---

## Next recommended vertical slices (one at a time)

1. **Apply migrations 009–017** and manually verify Country Explorer + document upload + domains  
2. **Publish path → TESTED** — billing bypass/dev + E2E publish  
3. **Replace sample `/api/opportunities` with DB** or clearly label sample on those routes  
4. **Full Kebu Score slice 1** — `ka_scores` + server calc from readiness + activity  
5. **Build This Opportunity** — one country → Kebu ID + Builder  

---

## Related docs

- Mandate: `docs/product/ENGINEERING-MANDATE.md`
- Architecture: `docs/architecture/OVERVIEW.md`
- Ecosystem map: `docs/KEBU-ECOSYSTEM.md`
- Kebu ID / score detail: `docs/KEBU-ID-KA-SCORE-STATUS.md`
- Testing: `docs/testing/README.md`
