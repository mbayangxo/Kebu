# Kebu — Engineering Rules

> **Canonical authority.** This file supersedes any conflicting agent rule, cursor hint, or inline comment.  
> Full context: `docs/product/KEBU-MASTER-ENGINEERING-INSTRUCTION.md` · `docs/CI_PIPELINE.md` · `docs/IMPLEMENTATION_STATUS.md`

---

## 1. The end-to-end chain rule

Every feature must work through the complete chain:

```
USER → FRONTEND UI → FRONTEND STATE
 → API / SERVER ACTION → BACKEND BUSINESS LOGIC
 → SUPABASE (DB / Storage / Auth) → BACKEND RESPONSE
 → FRONTEND STATE UPDATE → UI UPDATE
```

If any link is missing, the feature is **NOT COMPLETE**. No exceptions.

**Never:**
- frontend-only or backend-only functionality
- fake buttons or fake success messages
- hardcoded data where persistence is required
- mock DB operations in production paths
- disconnected APIs

---

## 2. Authority — ask before acting

You do **not** have authority to decide unilaterally on:

- Database security (RLS, policies, roles)
- Payment architecture
- Authentication architecture
- Financial calculations
- Data deletion
- Permissions
- Migrations
- Production infrastructure

**Ask the user first.** Present options, wait for approval, then implement.

---

## 3. Implementation checklist (run before every feature)

Before implementing any feature slice:

1. Read `ENGINEERING_RULES.md` (this file)
2. Read `ARCHITECTURE.md`
3. Inspect existing implementation
4. Identify reusable systems
5. Create an implementation plan
6. Implement the smallest complete vertical slice
7. Run `npm run typecheck`
8. Run `npm run lint`
9. Run `npm test`
10. Test failure states manually
11. Review security (permissions, RLS, CSRF, input validation)
12. Review performance (query count, indexes, ISR/cache headers)
13. Review architecture (follows existing patterns, no new abstractions)
14. Fix all discovered issues
15. Only then report the feature as complete

---

## 4. Supabase rules

- All persistence through Supabase PostgreSQL
- All database changes via migrations in `docs/migrations-to-apply/`
- RLS must be enabled on every table that holds user data
- Never bypass RLS or create undocumented DB structures
- Supabase client from `lib/supabase/` helpers — never construct raw

---

## 5. Security rules

- **CSRF**: all mutation routes (`POST`/`PATCH`/`DELETE`) call `assertSameOriginMutation(req)` first
- **Input validation**: every request body parsed through a Zod schema before any DB write
- **Auth**: every route calls `requireUser()` and checks the result before any business logic
- **Permissions**: use the dedicated `assert*` helpers — never inline raw Supabase membership queries
- **No secrets in frontend** — no API keys, no service-role keys in client bundles

---

## 6. Africa-first technical constraints

- **Offline-first**: no external image URLs (Unsplash, CDN); embed or use Supabase Storage
- **Low-data**: minimize payload sizes; ISR cache headers on all public pages
- **Mobile money**: XOF currency; Wave + Orange Money via Joko; no Stripe assumptions
- **WhatsApp + Joko**: primary messaging and payment channels

### Animation vs. asset data cost — these are separate concerns

CSS/JS animations (transitions, keyframes, transforms, IntersectionObserver scroll-reveals,
hover effects, clip-path entrances) cost essentially zero data — they are code, not media.
**Animations are encouraged.** Quality sites animate. Do not suppress motion to save data.

What actually costs data is the *assets being animated*. Keep assets lean:

| Asset type | Rule |
|---|---|
| Images | WebP format, correct size, `loading="lazy"` on below-fold images |
| Autoplay video backgrounds | Never — costs 5–20 MB per load |
| Parallax on images | Avoid — requires loading an oversized image |
| External fonts | Subset to characters used; preload critical faces |
| CSS/JS animations | Use freely — `opacity`, `transform`, `clip-path`, keyframes cost ~0 |

`prefers-reduced-motion` must be respected: wrap animated CSS in
`@media (prefers-reduced-motion: no-preference)` so users who need less motion get a
clean static version at no UX cost.

---

## 7. CI gate (mandatory before merge)

```bash
npm run typecheck   # Gate 1 — no TS errors
npm run lint        # Gate 2 — no lint errors
npm test            # Gate 3 — all unit + integration tests pass
npm run build       # Gate 4 — production build succeeds
```

Run `npm run ci` to execute all gates in order.  
**Never** disable gates, skip tests, or add `ignoreBuildErrors` for new code.

E2E (`npm run test:e2e`) runs on push when `KEBU_E2E_BASE_URL` is set.

---

## 8. Code style

- TypeScript strict; no `any` in new code
- Zod for all external inputs (request bodies, env vars, API responses)
- No comments that explain *what* — only comments for *why* (hidden constraint, non-obvious invariant)
- No feature flags or backwards-compat shims for new features
- No error handling for impossible states — trust internal guarantees

---

## 9. Test tier boundaries

| Tier | Pattern | Scope |
|------|---------|-------|
| Unit | `tests/**/*.test.ts` | Pure functions, schemas, validators |
| Integration | `tests/**/*.integration.test.ts` | API handlers, service wiring |
| Database | `tests/**/*.db.test.ts` | Migration smoke, SQL invariants |
| RLS | `tests/**/*.rls.test.ts` | Tenant isolation, role matrix |
| E2E | `tests/**/*.spec.ts` | Full browser journeys (Playwright) |

Write tests in the correct tier. API-heavy features need integration tests, not only unit tests.

---

## 10. Vercel deployment constraints (Hobby plan)

These rules exist because violating them silently blocks ALL deployments — Vercel rejects the
build before any code runs, with no clear error in the GitHub Actions CI output.

### 10a. Cron job schedules
Every cron expression in `vercel.json` must run **at most once per day** on the Hobby plan.

```
✅  "0 6 * * *"    — daily at 06:00 UTC
❌  "0 * * * *"    — hourly (rejected)
❌  "0 */2 * * *"  — every 2 hours (rejected)
```

When upgrading to Pro: tighten `process-email-flows` back to `0 * * * *` and
`cart-abandonment` back to `0 */2 * * *`.

### 10b. Edge Function bundle size
Vercel Hobby plan caps each Edge Function at **1 MB** (compressed).

**Rule: never use `export const runtime = "edge"` in any route that imports from
`lib/create/`, `lib/supabase/`, or any Zod-heavy module.** Those pull in Supabase client +
Zod + schema definitions which inflate the bundle past 1 MB.

Use `export const runtime = "nodejs"` (the default) for any route that needs Supabase/Zod.
Reserve `"edge"` only for pure, zero-import middleware or tiny response-rewrite routes.

Current edge-runtime routes: `middleware.ts` only. Everything else is nodejs.

### 10c. React hooks rules
`useState`, `useEffect`, `useRef`, and all other hooks must be called unconditionally at the
top level of a component — never inside an `if`, loop, or nested function. The lint gate
(`react-hooks/rules-of-hooks`) catches this, but the fix must be applied before pushing, not
after seeing a failed CI run.

### 10d. TypeScript strict
Run `npm run typecheck` locally before every push. The CI TypeScript gate (`tsc --noEmit`)
will fail the deployment if there are any errors. Common sources of drift:
- Function return types changing (e.g. `string | undefined` vs `number`)
- New optional fields added to shared types
- Zod schema output types not matching component prop types

### 10e. Duplicate JSX attributes
A JSX element cannot have two `style={{...}}` (or any other) attributes. Merge them into one.
TypeScript reports this as `TS17001`; it does not appear in the lint gate, only in typecheck.
