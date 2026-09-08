# Kebu — CI Pipeline

**Rule:** If any required gate fails → **DEPLOYMENT STOPS.**

**Nothing is “built”** until UI, business logic, database, authentication, permissions, error states, and backend are **connected and tested end-to-end** — then this pipeline passes.

**Related:** `docs/product/DEFINITION_OF_DONE.md` · `docs/DEPLOYMENT.md` · `docs/product/TESTING.md`

---

## Gate order (mandatory)

```
TypeScript (tsc --noEmit)
    ↓ fail → STOP
Lint (eslint)
    ↓ fail → STOP
Unit tests (Vitest — pure logic, schemas, validators)
    ↓ fail → STOP
Integration tests (API routes + contracts; mocked or test Supabase)
    ↓ fail → STOP
Database tests (migrations apply; schema invariants; constraints)
    ↓ fail → STOP
RLS tests (cross-tenant isolation; role matrix)
    ↓ fail → STOP
E2E tests (Playwright — critical journeys; staging secrets)
    ↓ fail → STOP
Production build (next build)
    ↓ fail → STOP
→ eligible for deploy review
```

**No skipping gates** for “just a UI change.” Shared types, RLS, and routes break silently otherwise.

---

## Local commands

```bash
npm run typecheck      # Gate 1
npm run lint           # Gate 2
npm run test           # Gates 3–5 (see test layout below)
npm run test:e2e       # Gate 6 (when configured)
npm run build          # Gate 7
npm run ci             # All required gates in order
```

---

## Test layout (enforce boundaries)

| Gate | Path pattern | Purpose |
|------|--------------|---------|
| Unit | `tests/**/*.test.ts` (default) | Pure functions, Zod schemas, nav, pricing |
| Integration | `tests/**/*.integration.test.ts` | API handlers, service wiring |
| Database | `tests/**/*.db.test.ts` | Migration smoke, SQL invariants |
| RLS | `tests/**/*.rls.test.ts` | Tenant A cannot read/write tenant B |
| E2E | `tests/**/*.spec.ts` · Playwright | Full browser journeys |

**Add tests in the correct tier** when implementing a slice — not only unit tests for API-heavy features.

---

## CI workflow

GitHub Actions: `.github/workflows/ci.yml`

Required on `main` and pull requests:

1. `npm run typecheck`
2. `npm run lint` *(full-repo lint cleanup in progress — gate is mandatory)*
3. `npm test`
4. `npm run build`

E2E + live Supabase DB/RLS jobs run when secrets are configured (`KEBU_E2E_BASE_URL`, `SUPABASE_TEST_URL`, …).

---

## Deployment coupling

```
PR → CI (all gates) → human review → merge
    → staging deploy → staging E2E → production deploy
```

See `docs/DEPLOYMENT.md`. **Never deploy** with failing CI.

---

## Cursor rule

Before claiming a slice complete:

```bash
npm run ci
```

Fix failures at **root cause** — do not disable gates, skip tests, or suppress TypeScript errors.

Agent rule: `.cursor/rules/kebu-ci-gate.mdc`

---

## Current honest status

| Gate | Status |
|------|--------|
| TypeScript | Required — fix errors before merge |
| Lint | Required — legacy noise being reduced |
| Unit | **338+** tests; some failures to repair |
| Integration | Partial — expand per slice |
| Database | **NOT STARTED** as dedicated tier |
| RLS | Partial (security contracts in `tests/kebu-id/`) |
| E2E | Playwright installed; minimal specs |
| Build | Required |

Track in `docs/IMPLEMENTATION_STATUS.md`.
