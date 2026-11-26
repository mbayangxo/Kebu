# What a real QA environment needs, to run the tests that are currently blocked

## November 5 follow-up on the current shared source

The manual browser investigation in section 5 is historical. The canonical
`scripts/verify-generation-local.mjs` harness on shared commit `3ddd1797` passed
all seven cases in `tests/generation/browser.local.test.ts` and all 73 generation
checks with zero failures/skips in [run 41982722295](https://github.com/mbayangxo/Kebu/actions/runs/41982722295).
Use that existing harness before reproducing the manual recipe or scheduling
application fixes inferred from that recipe's failures. This corrects the current
acceptance status without discarding the original investigation. Managed hosted
Auth/QA and Lambda-specific packaged Chromium acceptance remain separate.

Current engineering priorities and scope are in the [closeout register](../KEBU_CLOSEOUT_REGISTER.md).

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

## 5. `@sparticuz/chromium` — investigated fully on 2026-11-05, the package itself is not the real blocker

`@sparticuz/chromium` is declared in `package.json` (`140.0.0`), pinned in `package-lock.json`
with a real `resolved` URL and `integrity` hash, and genuinely absent from `node_modules` in this
sandbox. Downloaded the exact tarball the lockfile points to and verified its SHA-512 matches
the lockfile's `integrity` field exactly — **it is a legitimate, resolvable, lockfile-correct
dependency, not a broken or corrupted one.** It's simply never been installed in this container
(along with its two unique transitive deps, `follow-redirects` and `tar-fs`) — most likely
because it's a 66MB package (a brotli-compressed Chromium binary built specifically for AWS
Lambda/AL2023, per its own `bin/chromium.br` + `bin/al2023.tar.br`) that a smaller sandbox image
would have reason to exclude. Confirmed it's genuinely installable here (`npm info` resolves it,
a verified-by-hash manual tarball extraction succeeds) — this is a capacity/provisioning choice
for this container, not a network or platform-compatibility failure.

**The more important finding: the package was never actually the thing blocking any current
test.** `inspectCandidate()`'s real browser-launch runtime path (`lib/generation/browser.ts:60`)
has a second, general-purpose way to get a Chromium executable that has nothing to do with
`@sparticuz/chromium` at all — `CREATIVE_CHROMIUM_EXECUTABLE_PATH`, which `browserConfiguration()`
checks before ever touching the Vercel-only sparticuz branch. Pointed it at this environment's
own pre-installed Playwright Chromium (`/opt/pw-browsers/chromium`) and used it to actually run
`tests/generation/browser.local.test.ts` — a complete, real, Playwright-driven integration suite
for this exact code path that had **never been confirmed to execute at all**: it silently always
hit `describe.skipIf(!origin||!executable)` (0 of 7 sub-tests ever ran, no failure visible,
nothing in any sweep report) because nobody had ever documented the companion dev-server setup
it needs.

Standing up that companion dev server and working through its actual error responses (not
guessing) surfaced a real, previously-undocumented requirement: `requireUser()`
(`lib/create/auth.ts:13`) needs `NEXT_PUBLIC_SUPABASE_ANON_KEY` set, which nothing about this
test or `@sparticuz/chromium` had ever mentioned — without it, a request this test expects to
fail with 401 was failing with 503 instead, for an unrelated reason. Setting it took the suite
from 0/7 executing to 1/7 passing outright, with the full env-var recipe now documented as a
header comment directly in `tests/generation/browser.local.test.ts` so this doesn't have to be
rediscovered again. Two sub-tests remain genuinely failing past that point, for reasons that are
now specific and diagnosable (not "never ran"): a timeout waiting on a client-set `window`
property whose upstream fetch depends on this test's own in-process REST fixture answering within
a 15s window, and a disabled submit button whose `loaded`/`configured` gating hasn't been traced
to its root condition yet. Documented precisely, with file:line references, in that same header
comment.

**To fully close this out:** (a) if `@sparticuz/chromium`'s own Lambda-specific binary ever needs
testing specifically (as opposed to the general browser-automation logic, which the
`CREATIVE_CHROMIUM_EXECUTABLE_PATH` path already proves works), that can only be meaningfully
done on real Vercel/Lambda infrastructure — its binary is built for AL2023 and isn't a generic
Linux Chromium; (b) the two remaining `browser.local.test.ts` failures need another pass tracing
the specific timeout causes named above, now that the suite actually runs and reports real
signal instead of silently skipping.
