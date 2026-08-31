# Kebu Architecture Overview

## Platform shape

```
                    ┌─────────────────────────────────────┐
                    │         Shared Kebu Core            │
                    │  auth · Kebu ID · billing · AI ·    │
                    │  audit · notifications · storage    │
                    └─────────────────┬───────────────────┘
          ┌───────────┬───────────────┼───────────────┬───────────┐
          ▼           ▼               ▼               ▼           ▼
    Kebu Builder  Opportunity OS   Kebu Cloud    Kebu Mail   Analytics
    (Phase One)   (Phase One)      (future)      (future)    (future)
```

## Runtime (Phase One)

| Layer | Technology |
|-------|------------|
| Web app | Next.js App Router (`app/`) |
| API | Route handlers (`app/api/`) |
| Auth | Supabase Auth + `@/lib/supabase/*` |
| Database | Supabase Postgres + RLS |
| Public sites | `/sites/[subdomain]` + middleware rewrites |
| Payments | Adapter pattern (`lib/joko/`, Stripe store routes) |
| AI | `lib/create/ai-*`, agent routes under `app/api/agents/` |

## Domain modules (code)

| Domain | Primary paths |
|--------|----------------|
| Builder | `lib/create/`, `app/create/`, `app/sites/` |
| Opportunity | `lib/opportunity/`, `app/opportunity/`, `app/api/opportunity/` |
| Kebu ID | `lib/kebu-id/`, `app/business/`, `app/api/businesses/` |
| Store | `app/store/`, `app/api/store/` |
| Billing | `lib/billing/`, `app/api/billing/`, `app/api/projects/[id]/billing/` |

## Middleware routing

- `*.kebu.africa` → `/sites/{subdomain}`  
- Verified custom domains → same (service role lookup)  
- Main hosts → platform app  

File: `middleware.ts`, `lib/create/resolve-custom-domain.ts`

## Data boundaries

- **User** — Supabase `auth.users`, profile  
- **Business** — `businesses`, `kebu_ids`, `business_members`  
- **Website project** — `projects`, `sections`, `deployments`, `site_domains`  
- **Opportunity** — country/opportunity tables (see migrations 004+)  
- **Commerce** — store tables (separate from builder projects today)  

**Gap:** unify `projects.business_id` ↔ Kebu ID across builder and store (planned slice).

## Security baseline

- RLS on tenant tables  
- `requireUser()` / membership checks in APIs  
- Rate limits on builder/business mutations  
- No secrets in client bundles  
- Public deployments: live snapshots only  

See `docs/security/README.md`.

## What we do not build in Phase One

Kebu Cloud product surface, Kebu Mail, full Analytics product, LMS, office suite — compatibility only until assigned.

Status: `docs/IMPLEMENTATION_STATUS.md`
