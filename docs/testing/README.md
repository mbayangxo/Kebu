# Testing documentation

## CI gate chain (mandatory before merge/deploy)

See **`docs/CI_PIPELINE.md`**.

```
TypeScript → Lint → Unit → Integration → Database → RLS → E2E → Build
```

**Any failure → DEPLOYMENT STOPS.**

```bash
npm run ci              # all gates in order
npm run typecheck
npm run lint
npm test                # unit (+ integration/db/rls when named *.integration.test.ts etc.)
npm run test:e2e        # Playwright (needs KEBU_E2E_BASE_URL)
npm run build
```

---

## Test tiers

| Tier | File pattern | Gate |
|------|--------------|------|
| Unit | `tests/**/*.test.ts` | 3 |
| Integration | `tests/**/*.integration.test.ts` | 4 |
| Database | `tests/**/*.db.test.ts` | 5 |
| RLS | `tests/**/*.rls.test.ts` | 6 |
| E2E | `tests/**/*.spec.ts` (Playwright) | 7 |

Vitest config: `vitest.config.ts` — extend with separate projects as tiers grow.

---

## Layout (current)

| Path | Scope |
|------|--------|
| `tests/kebu-id/` | Kebu ID, registration, security contracts |
| `tests/create/` | Builder schemas, SEO, domains, templates |
| `tests/shop/` | Commerce, cart, payments |
| `tests/billing/` | Pricing |
| `tests/opportunity/` | Country explorer |
| `tests/kebu-id/e2e-draft-business.spec.ts` | Playwright E2E |

---

## Required per slice

Every feature: `docs/product/DEFINITION_OF_DONE.md` — not only unit tests for API/DB features.

---

## Current gaps (honest)

- Dedicated `*.db.test.ts` / `*.rls.test.ts` tiers — **NOT STARTED**  
- Some unit test / typecheck failures to repair  
- Full-repo ESLint — cleanup in progress  
- Playwright baselines — **NOT STARTED**  
- CI E2E with staging secrets — configure in GitHub  

Status: `docs/IMPLEMENTATION_STATUS.md`
