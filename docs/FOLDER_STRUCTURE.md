# Kebu — Folder structure

**Goal:** Prevent a giant messy codebase — clear boundaries so Cursor (and humans) know where code belongs.

**Current repo:** Next.js App Router — `app/`, `lib/`, `tests/` (migration in progress).  
**Target:** Feature modules + shared UI — adopt **incrementally** on new slices; do not big-bang refactor.

---

## Target layout

```
src/                          # optional future root — today use repo root
  app/                        # Next.js routes only (thin pages)
  components/
    ui/                       # Shared primitives (Button, Input, Modal, …)
    [domain]/                 # Domain-specific presentation (shop/, business/, create/)
  features/                   # Vertical feature modules (preferred for new work)
    auth/
    properties/               # future Property
    listings/
    search/
    bookings/
    payments/
    messaging/
    verification/
    construction/
    create/                   # builder domain logic (migrate from lib/create over time)
    shop/
    kebu-id/
  lib/
    supabase/                 # clients, middleware, key-role
    validation/               # shared Zod schemas
    permissions/              # RBAC helpers
    analytics/
  hooks/
  types/
  config/

supabase/
  migrations/
  functions/                  # edge functions when used
  seed/                       # dev/test seed scripts
  tests/                      # SQL/RLS test helpers (optional)

tests/
  **/*.test.ts                # unit
  **/*.integration.test.ts    # integration
  **/*.db.test.ts             # database
  **/*.rls.test.ts            # RLS isolation
  **/*.spec.ts                # Playwright E2E

docs/
  product/                    # PRODUCT_RULES, DoD, quality, specs
  screens/                    # per-screen specs
  user-flows/
  decisions/                  # ADRs
  reference/                  # benchmark dossiers + screenshots
```

---

## Rules

### 1. Thin routes

`app/**/page.tsx` and `app/api/**/route.ts` should **orchestrate** — heavy logic lives in `features/` or `lib/`.

### 2. Shared UI once

`components/ui/*` — one Button, one Modal. **Search before creating.**  
Rule: `.cursor/rules/kebu-component-reuse.mdc`

### 3. Feature colocation

New slice → prefer `features/[domain]/`:

```
features/shop/
  api/           # route handlers or server actions (if not in app/api)
  components/
  hooks/
  schemas/
  services/
  types/
  index.ts       # public exports
```

### 4. No duplicate domains

Before adding `lib/foo` and `features/foo`, pick **one** home.

### 5. Tests mirror features

`tests/shop/` ↔ `features/shop/` · `tests/kebu-id/` ↔ Kebu ID domain.

### 6. Migrations only in `supabase/migrations/`

Document in `docs/migrations-to-apply/` when parallel track used. Never ad-hoc prod DDL.

---

## Current mapping (honest)

| Today | Target |
|-------|--------|
| `app/components/create/` | `components/create/` or `features/create/components/` |
| `app/components/shop/` | `features/shop/components/` |
| `lib/create/` | `features/create/` (gradual) |
| `lib/billing/` | `features/billing/` |
| `tests/*` | Keep; add `.integration.test.ts` / `.rls.test.ts` tiers |

**Do not** rename entire tree in one PR — migrate per assigned slice.

---

## Documentation map (repo root `docs/`)

| File | Purpose |
|------|---------|
| `PRODUCT.md` | → `product/PRODUCT_RULES.md` |
| `ARCHITECTURE.md` | System overview |
| `DATABASE.md` | → `database/README.md` |
| `SECURITY.md` | → `security/README.md` |
| `DESIGN-SYSTEM.md` | → `product/DESIGN_SYSTEM.md` |
| `FEATURES.md` | Feature index |
| `TESTING.md` | → CI + testing docs |
| `CI_PIPELINE.md` | Gate chain |
| `DEPLOYMENT.md` | Deploy flow |
| `BUG_PROTOCOL.md` | → `product/BUG_PROTOCOL.md` |
| `COUNTRY_EXPANSION.md` | Country modules |
