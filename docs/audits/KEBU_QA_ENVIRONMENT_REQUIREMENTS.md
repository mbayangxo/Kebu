# What a real QA environment needs, to run the tests that are currently blocked

**Purpose.** Several real, already-written integration tests cannot execute in this sandbox —
not because they're broken, but because this sandbox lacks specific infrastructure they
require. This document states precisely what's missing, per blocked suite, so whoever has
access to provision a real QA environment knows exactly what to set up. This is a property of
*this environment, today* — missing binaries and missing credentials — not an architectural
limitation of Kebu itself.

## 1. The KCD QA-only suites (5 files)

`tests/creative-core/db/kcd-apply.db.test.ts`, `kcd-pages.db.test.ts`, `kcd-parity.db.test.ts`,
`kcd-responsive-state.db.test.ts`, `kcd-storage.db.test.ts`.

**What they need:** a `DATABASE_URL` whose connection string contains `postgres.skqnxyaeimvbyrmdfzvk`
(the QA project ref) — enforced by `assertQaDatabase()` in `tests/creative-core/db/kcd-db.ts:26-29`,
which explicitly refuses both an unset URL and the production ref. This is a deliberate safety
guard in the test code itself, not a missing feature — these tests are written to run only
against the real QA database, by design, so a local substitute can never satisfy them.

**What's currently blocking it:** `db.skqnxyaeimvbyrmdfzvk.supabase.co` does not resolve from
this sandbox's network (confirmed via direct DNS lookup failure, multiple times this session),
and the Supabase MCP connector available in this session does not list that project at all
(confirmed via `list_projects` — only the production "Kebu" project, ref `tnygqgcqlnlsmjpygrca`,
is visible). **This session cannot tell which side the limitation is on** — whether QA's own
network/firewall rejects this sandbox, or whether this session's connector was simply never
scoped to include that project/organization. Resolving that distinction needs someone with
direct access to both the QA Supabase project's settings and this session's connector
configuration (`https://claude.ai/customize/connectors`) to compare.

**To unblock:** either (a) run these tests from an environment that has real network reachability
to `db.skqnxyaeimvbyrmdfzvk.supabase.co`, with a `DATABASE_URL` pointing at it, or (b) grant a
session's Supabase connector access to that project's organization so it becomes visible and
reachable the way the production project already is.

## 2. The Builder QA-authz suites (3 files)

`tests/create/builder-qa-authz.test.ts`, `builder-qa-isolation.test.ts`, `builder-qa-rpc.test.ts`.

**What they need:** `SUPABASE_QA_DESIGNATED=true` plus real `SUPABASE_QA_URL`,
`SUPABASE_QA_ANON_KEY`, `SUPABASE_QA_SERVICE_ROLE_KEY`, `SUPABASE_QA_DB_URL` — i.e. a full,
real, running Supabase stack for the QA project: not just a reachable Postgres, but PostgREST
(`/rest/v1/*`) and GoTrue (`/auth/v1/*`) actually serving HTTP requests, since these tests mint
real GoTrue JWTs and exercise real RLS under real signed-in sessions.

**What's currently blocking it:** none of those four env vars are set anywhere in this
environment, and even if they were, the same network-reachability question in §1 applies.

**To unblock:** run from an environment with those four real QA credentials set, and confirmed
network access to the QA project's REST/Auth endpoints (not just its Postgres port).

## 3. The browser-driven E2E smoke test (pre-existing, not from this session's work)

`tests/shop/e2e-checkout-smoke.spec.ts`.

**What it needs:** `KEBU_E2E_SHOP_SUBDOMAIN` pointing at a real, live, deployed site with a
published test shop — i.e. an actual Vercel deployment reachable over the public internet.

**What's currently blocking it:** no deployment of this branch (or any recent branch) exists.
Checked via Vercel MCP deployment history: the most recent production deployment predates this
session's work entirely, and no preview deployment of any of today's or yesterday's branches has
ever been created.

**To unblock:** deploy the branch under test to a real Vercel preview (not production), set
`KEBU_E2E_SHOP_SUBDOMAIN` to a real published test shop's subdomain on that deployment, and run
the suite against it.

## 4. Any "real browser → real API → real database" journey, for any feature

**What it needs:** this is the general case §1-3 are specific instances of. Every server-side
Supabase call in this codebase goes through `@supabase/supabase-js`, which talks to real
PostgREST and GoTrue HTTP APIs — not raw Postgres wire protocol (confirmed by reading
`lib/supabase/server.ts`: `createServerClient` calls `supabase.auth.getUser()`, which
deliberately re-verifies against GoTrue's `/auth/v1/user` rather than locally decoding the JWT).
There is no PostgREST or GoTrue binary installed in this sandbox (checked: `command -v postgrest`
— not found), and no real hosted Supabase credentials exist here.

**To unblock, for any feature, generally:** either (a) real hosted Supabase project credentials
(URL + anon key + service role key) with confirmed network reachability from wherever the test
runs, or (b) a real deployed instance (preview or production) to drive a browser against, or
(c) a local PostgREST + GoTrue stack stood up alongside the test Postgres (heavier than this
sandbox currently sets up, but not impossible in a differently-provisioned environment).

## 5. The one browser dependency that's a separate, smaller gap

`@sparticuz/chromium` — declared in `package.json`, not present in `node_modules` in this
environment. This affects the real runtime path `lib/generation/browser.ts`'s `inspectCandidate()`
takes on Vercel (`await import("@sparticuz/chromium")`), used for AI-generation visual review.
**Correction to an earlier report**: `tests/generation/browser-configuration.test.ts` itself does
NOT fail from this gap — re-run fresh on commit `f510ff13` and it passes 2/2; the function it
tests (`browserConfiguration()`) only ever calls `require.resolve` inside a try/catch that
returns `null` on failure, by design, and the unit test never forces the real runtime import path.
The actual gap only matters if `inspectCandidate()` itself is ever exercised on Vercel without
the package installed — not reproduced by any current test. **To unblock** (if ever needed): add
`@sparticuz/chromium` to `node_modules` in whichever environment runs that code path.
