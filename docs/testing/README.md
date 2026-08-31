# Testing documentation

## Commands

```bash
npm test              # Vitest unit tests (all)
npm run typecheck     # tsc --noEmit
npm run build         # Production build
npm run lint          # ESLint (repo has legacy noise; lint changed files before merge)
```

## Layout

| Path | Scope |
|------|--------|
| `tests/kebu-id/` | Kebu ID, registration, security contracts |
| `tests/create/` | Builder schemas, SEO, domains lib, templates |
| `tests/billing/` | Pricing |
| `tests/opportunity/` | Country explorer |
| `tests/kebu-id/e2e-draft-business.spec.ts` | Playwright (optional, needs `KEBU_E2E_BASE_URL`) |

## Required per slice (Definition of Done)

| Level | When |
|-------|------|
| Unit | Pure logic, schemas, score calc |
| Integration | API route + mocked or test Supabase |
| E2E | Critical user journeys (register business, publish site, connect domain) |

## Current gaps

- **Custom domains:** lib unit tests only — no API integration/E2E  
- **Builder publish:** partial unit coverage  
- **KA Score:** no production tests (system not built)  
- **Opportunity Build This Business:** not started  

## CI recommendation

1. `npm run typecheck`  
2. `npm test`  
3. `npm run build`  
4. Playwright on staging with secrets  

Status tracked in `docs/IMPLEMENTATION_STATUS.md`.
