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
