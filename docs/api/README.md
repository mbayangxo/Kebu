# API documentation

Phase One APIs live as Next.js route handlers under `app/api/`.

## Conventions

- Authenticated routes: `requireUser()` from `@/lib/create/auth` or business membership checks  
- JSON validation: Zod schemas colocated with routes or in `lib/*/schemas.ts`  
- Rate limits: `lib/api-guard.ts` on mutation-heavy builder/business routes  
- Dynamic routes: `export const dynamic = "force-dynamic"` where DB reads occur  

## Route index (primary)

### Business / Kebu ID

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/businesses` | User | Create registration + Kebu ID |
| GET | `/api/businesses/[id]` | Member | Dashboard payload |
| PATCH | `/api/businesses/[id]` | Founder+ | Update profile |
| POST | `/api/businesses/[id]/readiness` | Founder+ | Recalculate readiness |
| GET | `/api/businesses/country-modules` | User | Country registration module |

### Builder

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET/POST | `/api/projects` | User | List/create projects |
| GET/PATCH | `/api/projects/[id]` | Owner | Project + sections |
| PATCH/POST | `/api/projects/[id]/sections` | Owner | Section CRUD |
| POST | `/api/projects/[id]/publish` | Owner | Publish deployment |
| GET/POST/DELETE | `/api/projects/[id]/domains` | Owner | Custom domains |
| POST | `/api/projects/[id]/domains/[domainId]/verify` | Owner | DNS verify |
| GET/PATCH | `/api/projects/[id]/settings` | Owner | Subdomain + SEO |
| GET/POST/PATCH/DELETE | `/api/projects/[id]/pages` | Owner | Multi-page |

### Opportunity

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/opportunity/countries` | Public | Published country list |
| GET | `/api/opportunity/countries/[code]` | Public | Curated profile + AI analyses (separate) |
| POST | `/api/opportunity/countries/[code]/ai-analysis` | User | Generate AI analysis (stored separately) |
| POST | `/api/opportunity/countries/seed` | Admin password | Upsert curated profiles from dataset |

### Public

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/public/sites/[subdomain]` | Public | Live site JSON |
| GET | `/api/public/kebu-id/[kebuId]` | Public | Draft IDs return 404 |

OpenAPI generation: **NOT STARTED**. Contract tests: partial in `tests/`.
