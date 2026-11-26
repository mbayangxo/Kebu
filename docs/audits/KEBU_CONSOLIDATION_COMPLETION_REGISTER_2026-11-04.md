# Kebu Consolidation Completion Register — 2026-11-04

**Commit progression — cite the specific SHA each piece of evidence actually ran against, not a blended "the branch":**
- `2eefe10228e3b0e2e022a8a1982e1752d4e693d8` (branch `fix-daily-sweep-2026-11-04`, linear descendant of `consolidation-2026-11-04`) — the commit §1–§3 and §4's *original* numbers were produced against (2026-11-04 audit pass).
- `b413c187...` and `f510ff13e7bddc059fb4a3f0346328807acfd141` (branch `audit-2026-11-04`, linear descendants of the above) — the two fixes from that same audit pass, plus the register itself.
- `f510ff13e7bddc059fb4a3f0346328807acfd141` is also the exact commit this 2026-11-05 tightening pass's own fresh re-run (§4, rewritten below) ran against — a linear descendant of everything above, nothing rebased or rewritten.

**Purpose of this document.** This is the single reference for "is this actually done," per the
user/Codex's explicit instruction that self-reported test counts don't establish real behavior.
Every row below cites concrete evidence (file:line, a real command run, a real test name) or says
`BLOCKED: <reason>` rather than a claim. Nothing here should be read as "production-verified" —
nothing in this sandbox has real hosted Supabase or real payment-provider credentials, and that
limit is structural, not a gap in effort.

---

## 1. Migration-history reconciliation (Codex point 2)

| Item | Finding | Evidence |
|---|---|---|
| Duplicate-timestamp collision (`20261103130000` shared by `security_events_log.sql` and `shop_shipping_options.sql`) | Already fixed by the Nov 3 sweep — `shop_shipping_options` renamed to `20261103135000`. Re-ran the hygiene checker fresh on this exact commit. | **Executed check** — `node scripts/check-migration-hygiene.mjs` → `Migration hygiene OK: 125 unique timestamped canonical migrations; no legacy bundles are executable.` |
| Stray reference to the old timestamp missed by the rename | **Found a real one, fixed it.** `lib/shop/cart-order.ts:420` still told a developer to "Apply migration 20261103130000" for shipping-option errors — that timestamp now belongs to an unrelated table. | **Source inspection + executed SQL test.** Fixed in commit `b413c187` on this audit branch; regression test `tests/shop/cart-order.test.ts` ("points the shipping-option-columns-missing error at a migration file that actually exists with that name") reads the live source and the live migrations directory and fails if they ever diverge again. |
| Did the rename break any ordering/dependency relationship? | No. `shop_joko_fulfillment.sql` (`20261104020000`) references `shop_shipping_options(id)` by table name, not by migration timestamp, and sorts after `20261103135000` either way. | **Source inspection** — `grep -n shop_shipping_options supabase/migrations/20261104020000_shop_joko_fulfillment.sql:37` |
| Was either colliding migration (`security_events_log` or `shop_shipping_options`, under either timestamp) ever applied to a real database? | **Production: confirmed no, via migration HISTORY, not table-absence inference** (table-absence alone can't rule out apply-then-remove, as Codex correctly pointed out — this is the stronger check). A direct, read-only query against production's actual `supabase_migrations.schema_migrations` ledger — the table Supabase itself uses to record every migration that has ever run — returns **zero rows with `version LIKE '202611%'`**; the most recent applied migration is `20261028052630 builder_twenty_pages` (Oct 28). No migration from this session's work, under any timestamp, has ever been applied, applied-then-removed, or otherwise touched production. **QA (`skqnxyaeimvbyrmdfzvk`): BLOCKED** — unreachable from this environment both via the Supabase connector's project list and at the DNS level (`db.skqnxyaeimvbyrmdfzvk.supabase.co` does not resolve); not attempted this pass either. This is an *access* limitation of this session's connector, not evidence that QA itself is missing or broken — see `docs/audits/KEBU_QA_ENVIRONMENT_REQUIREMENTS.md` for exactly what would unblock it. | **Source inspection + executed SQL query** (read-only `select version, name from supabase_migrations.schema_migrations where version like '202611%'` against production, run by the orchestrating session; not repeated this pass since the fact doesn't change). |
| Fresh-install migration test, on this exact commit | **Passed, for real**, against a real local PostgreSQL 16.15 server (not PGlite, not mocked) started for this audit. | **Executed SQL test** — `tests/platform/migration-upgrade-path.local-pg.test.ts` — 2 tests passed, run via `DATABASE_URL=postgresql://postgres@127.0.0.1:55499/postgres npx vitest run` |
| Upgrade-from-existing-data migration test, on this exact commit | **Passed, for real**, same run — seeds representative pre-existing rows (shaped like production's real `help_requests`/`platform_cron_runs` data) before applying new migrations on top; proves no data loss, no constraint violation. | **Executed SQL test** — same test file/run as above |

## 2. `lib/adapter/index.ts` — investigated, not touched

**Finding: a complete, substantial, never-integrated subsystem — not dead code, not mid-integration, genuinely standalone.**

Evidence:
- 18 files, ~160KB total (`compile.ts`, `compile-capabilities.ts`, `compile-motion.ts`, `compile-sections.ts`, `compile-theme.ts`, `compile-extensions.ts`, `compile-report.ts`, `certification.ts`, `provenance.ts`, `validate.ts`, `diagnostics.ts`, `ir.ts`, `versions.ts`, `motion.ts`, `assets.ts`, `fonts.ts`, `components.ts` + `index.ts`) — a versioned IR-to-WebsiteDefinition compiler with capability negotiation and gap reporting. Not a stub; genuinely built out.
- `git log --follow -- lib/adapter/index.ts` shows exactly one commit, a large "recover Kebu source" checkpoint — no incremental history, no attributable feature request to trace.
- `grep -rli "aesthetic adapter" docs/` — zero hits. No doc, spec, or roadmap item names it.
- **Only one file outside the adapter's own `tests/adapter/*` suite touches it**: `tests/create/phase3b-capabilities.test.ts`, which imports `normalizeIRMotionSpecs` from `lib/adapter/compile-motion` *alongside* the real, live `buildDefinitionFromProjectParts` from `lib/create/editor-definition`, to verify a **data-contract shape match** between the two — it does not call the adapter from inside the Builder's real code path.
- **Confirmed: zero real production code** (`lib/create/*`, `app/components/create/*`, `app/create/*`) imports anything from `lib/adapter/*`. The Builder/SiteRenderer never calls into it at runtime.

**Disposition (user decision, 2026-11-05): preserve, do not delete, do not wire up.** A doc comment was added to the top of `lib/adapter/index.ts` itself stating this status plainly — source inspection, see commit on `register-tightening-2026-11-05`. **This subsystem does not count toward any "done" or "completed" claim in this register or anywhere else** — it remains explicitly "not integrated, pending a confirmed product requirement" (a plausible but unconfirmed fit: an external-design-import pipeline, e.g. Figma-style aesthetic spec → Kebu site). No runtime caller exists, none was added. If a real product requirement for it surfaces later, its actual integration point needs to be built deliberately, not inferred from this evidence.

## 3. Feature chain-trace (UI → API → implementation → migration → authz → test)

| Feature | UI entry point | API route | Authz guard (evidence) | Migration | Test coverage | Evidence class (this trace) |
|---|---|---|---|---|---|---|
| JOKO Fulfillment opt-in | `app/components/shop/shop-shipping-panel.tsx` (seller) | `app/api/admin/fulfillment/route.ts`, `[id]/route.ts` | `assertAdminCookie` (route.ts:10, [id]/route.ts:21) | `20261104020000_shop_joko_fulfillment.sql` | `tests/shop/full-customer-journey.db.test.ts` (chained, real local Postgres) | **Source inspection** (chain) + **executed SQL test** (journey) — freshly verified this pass |
| JOKO status-transition ops queue | `app/admin/fulfillment/page.tsx` | same as above | same as above | same | same | Same as above |
| Refund action | `app/admin/fulfillment/page.tsx:117,219` (real `onClick` → real `fetch`) | `app/api/admin/shop-orders/[id]/refund/route.ts` | admin-gated (route reuses the fulfillment admin guard) | `record_shop_refund()` RPC, added during consolidation | Exercised in `full-customer-journey.db.test.ts`'s refund step | **Source inspection + executed SQL test** — freshly verified this pass |
| Shipping options (merchant config) | `app/components/shop/shop-shipping-panel.tsx` | same shop-shipping-panel API surface | `assertShopProjectAccess` — **previously reported** (`feature-shop-shipping-checkout` fork, 2026-11-03), not independently re-read this pass | `20261103135000_shop_shipping_options.sql` | `tests/shop/shipping-options.local-pg.test.ts` — **previously reported** (same fork); not re-run this pass | **Previously reported only** — UI/route/migration paths confirmed by file existence this pass, but the authz-guard body and the test's pass/fail were not independently re-verified here |
| Seller payout request | (seller-facing payout UI, not re-located this pass) | `app/api/projects/[id]/payouts/request/route.ts` | `requireUser` + `assertShopProjectAccess` (route.ts:27,31,68) + `assertSameOriginMutation` (route.ts:61) | `20261103180000_shop_seller_balance_and_payouts.sql` | `tests/shop/payouts-and-balance.db.test.ts` — **previously reported** (`feature-shop-checkout-security` fork, 2026-11-03) | Authz guard: **source inspection, freshly re-read this pass**. Test result: **previously reported**, not re-run this pass |
| In-account help request | `app/account/help/page.tsx` | `app/api/account/help/route.ts` | `requireUser` — guard body not independently re-read this pass, confirmed by file presence only | restored `20261103140000_help_requests_cron_runs.sql` | `tests/platform/help-request-replies-rls.local-pg.test.ts` | **Executed SQL test — freshly re-run this pass**, passed for real (see §4) |
| Help-request two-way reply | `app/account/help/page.tsx` | `app/api/account/help/[id]/replies/route.ts` | `requireUser` (route.ts:19) + `assertSameOriginMutation` (route.ts:16) | same | same | Same as above |
| Admin security signals | `app/admin/record/page.tsx` ("Security signals (24h)" panel, line 454) | `app/api/admin/record/route.ts` | admin-cookie gated | `20261103130000_security_events_log.sql` | `tests/platform/security-events-rls.local-pg.test.ts` | **Previously reported** (`feature-account-security-dashboard-v2` fork, 2026-11-03); not re-run this pass |
| May's World fan community | `app/components/create/public-site-community.tsx`, wired via `site-renderer.tsx` | `app/api/public/sites/[subdomain]/community/*` | real RLS + identity-lock trigger | `20261103120000_site_fan_community.sql` | 13 RLS tests | **Previously reported in full** (`feature-mays-world-fan-community` fork, 2026-11-03); not independently re-verified at all this pass |
| Marketplace 85/15 split | `app/create/developers/page.tsx`, `app/studio/assets/sell/page.tsx` | `app/api/developer/payouts/route.ts` | developer-profile-scoped | pre-existing | `tests/studio/developer-earnings-balance.test.ts` | **Previously reported** (`fix-marketplace-split-85-15`, 2026-11-03); not re-run this pass |

**No "exercised only by its own tests" cases found this pass** among the routes actually traced — every one above has a confirmed real UI→API chain by file presence. This does not cover every file touched across all ten original branches (out of scope for the time available); it covers the money/security-critical surface the user and Codex specifically named. **Rigor note**: four of the nine rows above rest substantially on an earlier fork's own report rather than this pass's independent re-execution — those are marked "previously reported" rather than "verified," per Codex's explicit instruction not to conflate the two. Treat those four as not yet independently confirmed by this register.

## 4. QA results — exact commands, exact commit, exact exit codes, separate counts per run

**Rigor note (2026-11-05 tightening pass): the two numbers below are each from one specific,
separately-recorded command run against one specific commit — not blended, and corrected where
a fresh re-run contradicted an earlier claim.** Codex caught that the original register blended
a "1 failure" figure with a different, "failures when forced" description without reconciling
them; this section replaces that with three discrete, individually-recorded runs.

**Environment for this run**: local PostgreSQL 16.15, freshly initialized this pass
(`initdb`/`pg_ctl` via `setpriv --reuid postgres`, since this sandbox runs as root and Postgres
refuses to `initdb` as root), listening on `127.0.0.1:55777`. Not PGlite, not a container image
with pre-seeded state, not reused from any prior pass.

**Run 1 — typecheck.** Command: `npx tsc --noEmit`. Commit: `f510ff13e7bddc059fb4a3f0346328807acfd141`.
**Exit code: 0.** Output: empty (no errors). *Correction to an earlier framing*: the prior
register described the known `@sparticuz/chromium` gap as showing up here; it does not — `tsc`
is fully clean on this exact commit, full stop.

**Run 2 — lint.** Command: `npx eslint .`. Commit: same. **Exit code: 0.** `0 errors, 358
warnings` (pre-existing style warnings, none new).

**Run 3 — full test suite against real Postgres.** Command:
`DATABASE_URL="postgresql://postgres@127.0.0.1:55777/postgres" npx vitest run`. Commit: same.
**Exit code: 1.** Exact summary line, copied verbatim from the run log:
```
 Test Files  8 failed | 463 passed | 44 skipped (515)
      Tests  6935 passed | 418 skipped (7353)
```
(The 8 failed files fail at suite-setup — `createKcdDb`/connection-establishment throws before
any individual `it()` executes — so they contribute 0 to the Tests passed/skipped line; they're
counted only in the Test Files line. 6935 + 418 = 7353 reconciles exactly.)

The 8 failed files, named individually — **every one is the QA-only guard already documented
below, zero new or unexplained failures**:
`tests/create/builder-qa-authz.test.ts`, `builder-qa-isolation.test.ts`, `builder-qa-rpc.test.ts`,
`tests/creative-core/db/kcd-apply.db.test.ts`, `kcd-pages.db.test.ts`, `kcd-parity.db.test.ts`,
`kcd-responsive-state.db.test.ts`, `kcd-storage.db.test.ts`.

**Run 4 — production build.** Command: `npx next build`. Commit: same. **Exit code: 0.**
Completed successfully, full route manifest printed. *Correction to an earlier framing*: the
prior register implied the build fails on the chromium gap; re-run fresh, it does not — the
build is clean on this exact commit.

**Run 5 — the specific chromium-gap claim, re-checked in isolation.** Command:
`npx vitest run tests/generation/browser-configuration.test.ts`. Commit: same. **Exit code: 0.**
`1 passed (1 file), 2 passed (2 tests)`. *Correction, stated plainly*: the earlier register's
"Failed: 1 — tests/generation/browser-configuration.test.ts... @sparticuz/chromium genuinely
absent" claim does not reproduce. Read why: `browserConfiguration()` in `lib/generation/browser.ts`
only calls `require.resolve("@sparticuz/chromium")` inside a `try/catch` that returns `null` on
any failure (by design — source inspection, `lib/generation/browser.ts:21`), and this unit test
only exercises that function's config logic via env-var stubs; it never forces the real runtime
`await import("@sparticuz/chromium")` path that `inspectCandidate()` takes. `@sparticuz/chromium`
genuinely is absent from `node_modules` in this sandbox (re-confirmed: `ls node_modules/@sparticuz`
→ not found) — that part of the original claim is true — but it does not make this specific test
fail, and does not make the build fail either. The real, narrower exposure is `inspectCandidate()`'s
own runtime path on Vercel, which no current test exercises either way; see
`docs/audits/KEBU_QA_ENVIRONMENT_REQUIREMENTS.md` §5.

**Skipped: 44 files / 418 tests (Run 3)** — breakdown unchanged from the prior pass: PGlite
unavailable for suites that specifically require it (distinct from the native-Postgres suites
this run exercised directly), and other per-file `describe.skipIf` guards unrelated to database
availability (feature flags, optional provider credentials).

**Environmentally blocked, named specifically (the 8 failures from Run 3)**:
- `tests/creative-core/db/kcd-apply.db.test.ts`, `kcd-pages.db.test.ts`, `kcd-parity.db.test.ts`,
  `kcd-responsive-state.db.test.ts`, `kcd-storage.db.test.ts` — all five **refuse by design** to
  run against anything but the real QA database: `assertQaDatabase()` in
  `tests/creative-core/db/kcd-db.ts:26-29` throws unless the connection string contains
  `postgres.skqnxyaeimvbyrmdfzvk`, and explicitly rejects the production ref too. A real,
  intentional safety guard in the test code itself, confirmed by reading its actual thrown error
  this run (`KCD DB suites refuse to run: DATABASE_URL is not the QA database`) — not something
  this pass should or could override with a local substitute.
- `tests/create/builder-qa-authz.test.ts`, `builder-qa-isolation.test.ts`, `builder-qa-rpc.test.ts`
  — require `SUPABASE_QA_DESIGNATED=true` plus real `SUPABASE_QA_URL`/`SUPABASE_QA_ANON_KEY`/
  `SUPABASE_QA_SERVICE_ROLE_KEY`/`SUPABASE_QA_DB_URL` (real hosted GoTrue + PostgREST). None exist
  in this sandbox. Full requirements for unblocking either category:
  `docs/audits/KEBU_QA_ENVIRONMENT_REQUIREMENTS.md` §1–§2.

**A real, previously-hidden bug the prior audit pass's forced run surfaced and fixed** (carried
forward from the 2026-11-04 pass, re-confirmed still fixed in this run — it's part of why Run 3's
6935 passed includes tests that used to silently never execute): `tests/create/builder-rpc-anon-grants.db.test.ts`
only needs `DATABASE_URL` (no QA-only guard) — but its migration loader only ever read from the
active `supabase/migrations/` directory, while `004_create_projects.sql` (which it needs) lives
in `migrations_archive/legacy/` since an earlier reconciliation moved it there. Because this
test's `describe.skipIf(!DATABASE_URL)` meant it silently never ran in any CI/sweep that lacked a
real Postgres wired to `DATABASE_URL`, this break had never been caught before the 2026-11-04
audit. Fixed in commit `b413c187` with the same archive-fallback pattern `kcd-db.ts` already
uses. This remains exactly the category of risk the user/Codex flagged: a test file existing and
"passing" (by skipping) proves nothing about whether the code underneath it still works.

## 5. "Features actually work: Browser → real API → database → visible result" — honest finding, current not permanent

**This exact end-to-end chain — a real browser, hitting the real Next.js API route over real HTTP,
backed by a real authenticated session, writing to a real database — could not be produced for any
feature in this sandbox. This is a property of THIS ENVIRONMENT TODAY (missing binaries, missing
credentials), not an architectural impossibility for Kebu generally — see
`docs/audits/KEBU_QA_ENVIRONMENT_REQUIREMENTS.md` for exactly what a real QA environment would
need to close this gap, per blocked suite.**

Every server-side Supabase call in this codebase (`createServerClient`/`createClient` in
`lib/supabase/server.ts`, `createServiceClient` elsewhere) goes through `@supabase/supabase-js`,
which talks to a real **PostgREST** (`/rest/v1/*`) and **GoTrue** (`/auth/v1/*`) HTTP API — not raw
Postgres wire protocol. Confirmed by reading `lib/supabase/server.ts` directly: `createServerClient`
calls `supabase.auth.getUser()`, which the SSR client deliberately re-verifies against the Auth
server's `/auth/v1/user` endpoint rather than locally decoding the JWT (a documented Supabase safety
choice). Checked for a PostgREST binary in this sandbox (`command -v postgrest`, filesystem search)
— **not installed**. No real hosted Supabase credentials exist here either (confirmed earlier this
session). There is no third option: without one of (a) real hosted Supabase or (b) a real
PostgREST+GoTrue binary pair, no app route — old or new, today's work or last month's — can be
driven end-to-end from a browser in this environment.

**Confirming this isn't a gap specific to today's work**: `tests/shop/e2e-checkout-smoke.spec.ts`,
which predates today, is gated behind `KEBU_E2E_SHOP_SUBDOMAIN` — a real, live, deployed Vercel
preview with a published test shop. That env var has never been set in this session (confirmed:
no deployment of any recent branch exists — checked via Vercel MCP deployment history earlier this
session), so this smoke test has also never actually executed, for the same structural reason.

**What this sandbox genuinely CAN and DID prove instead, and why it's real evidence, not a
downgrade — labeled by evidence class (per the four categories in §3):**
- **Executed SQL test.** Direct-SQL tests against a real local PostgreSQL server (this audit
  started one fresh: `/usr/lib/postgresql/16/bin/initdb` + `pg_ctl`, port 55499/55777 depending on
  pass) with the real migrations applied, real RLS policies enforced by real Postgres roles (not
  simulated) — `migration-upgrade-path`, `help-request-replies-rls`, `security-events-rls`, and
  (previously reported, not re-run this pass) `shipping-options`, `payouts-and-balance`. This
  proves the database layer — the actual last line of defense — behaves correctly under real
  Postgres semantics.
- **Fixture browser check.** Real-browser rendering tests (`tests/create/e2e-maylecor-fixture-live.spec.ts`,
  `world-visitor.local.spec.ts`) via a dev-only fixture route that renders real React components
  with real props, explicitly labeled by their own authors as "not hosted authentication/SQL proof."
- **Source inspection.** Route-source authorization-guard verification (§3 above) — confirming the
  actual exported route handler functions call `requireUser`/`assertShopProjectAccess`/
  `assertAdminCookie`/`assertSameOriginMutation`, by reading the real file, not by running an HTTP
  request against it.
- None of the above is **authenticated full-stack acceptance** (the fourth category) — that
  category has zero instances anywhere in this register, for any feature, as of this pass.

**The gap, stated once, plainly**: nothing in this audit (or, as far as this audit can verify, in
any prior pass this session) has driven a real signed-in browser session through a real HTTP
request to a live `/api/...` route backed by a live database, for any feature, old or new. Closing
this gap requires either real hosted Supabase credentials or a real deployment — neither available
from inside this sandbox. Treat every "27 tests passing" or "157/157 passing" claim from prior
reports as what it actually is per §3/§4 above: real, strong evidence at the database and
business-logic layer, not full-stack production acceptance.

## 6. "Security survives integration" — database-layer evidence (the real enforcement boundary)

Rather than attempt a misleading HTTP-level check (impossible per §5), this audit verified the
**actual enforcement mechanism** directly from the real migration source — the GRANT/REVOKE
statements are the real, final word on what a signed-in-but-unauthorized user's request can do,
regardless of what the TypeScript route code says, because Postgres enforces them unconditionally:

- `supabase/migrations/20261104020000_shop_joko_fulfillment.sql:68-70` — `shop_fulfillment_orders`:
  `revoke all ... from public, anon, authenticated` then `grant select ... to authenticated` and
  `grant all ... to service_role` only. **A signed-in seller can read fulfillment status but has
  zero database-level ability to insert or update it** — confirmed by reading the actual grant
  statements, not by trusting a prior report's claim.
- Route-level guards independently confirmed present (§3): `assertAdminCookie` on both fulfillment
  routes, `requireUser` + `assertShopProjectAccess` + `assertSameOriginMutation` on the payout-request
  route, `requireUser` + `assertSameOriginMutation` on the help-reply route.

This is two independent layers (app-code guard + database grant) both confirmed present by direct
source inspection. An actual HTTP-level unauthorized/cross-user rejection test against a running
server remains blocked for the reason in §5.

## 7. Guardrails observed this pass

- No migration applied to any hosted/production database. The one Supabase MCP call made this
  session (used to establish the §1 production-schema fact) was read-only `list_tables`/
  `execute_sql` SELECT, made in an earlier turn — not repeated or expanded this pass.
- No paid resource provisioned. No deployment triggered.
- Nothing deleted or reverted without being a confirmed, reproducible defect (both fixes in §1/§4
  are exactly that — real, reproducible, root-caused, each with a regression test).
- Scope held to auditing + fixing reproducible defects; no new feature work performed.

## 8. 2026-11-05 tightening pass — what changed in this document and why

Codex reviewed this register and found five real rigor gaps, relayed by the user. This pass
addressed each, touching only this register, the new `KEBU_QA_ENVIRONMENT_REQUIREMENTS.md`, and
one doc comment in `lib/adapter/index.ts` — no other file, no re-run of the underlying feature
work:

1. **SQL checks complement, don't replace, end-to-end tests.** §5/§6 now say this explicitly and
   list zero "authenticated full-stack acceptance" instances anywhere in the register.
2. **Migration history, not table-absence, proves non-application.** §1's row now cites the real
   `supabase_migrations.schema_migrations` ledger query (zero `202611%` entries) in place of the
   weaker "table doesn't currently exist" framing.
3. **"Previously reported" vs. "freshly verified" are no longer conflated.** §3's table now has an
   explicit evidence-class column; four of nine traced features are marked "previously reported"
   with their source fork named, not "verified."
4. **Test totals reconciled with exact commands/SHA/exit codes.** §4 rewritten entirely as five
   discrete, separately-recorded runs against commit `f510ff13`, each with its own exit code.
   Two claims from the prior pass did not reproduce on a fresh re-run and are corrected in place,
   named as corrections rather than silently replaced: `tests/generation/browser-configuration.test.ts`
   passes (it never actually depended on the missing package at the unit-test level), and
   `npx next build` succeeds.
5. **Sandbox limitation reframed as current, not permanent**, with a new, separate
   `docs/audits/KEBU_QA_ENVIRONMENT_REQUIREMENTS.md` stating precisely what infrastructure a real
   QA environment would need, per blocked suite, to close the gap for good.

`lib/adapter/index.ts` disposition (§2) is now final per explicit user instruction: preserved,
documented in-source as not integrated, excluded from every completion claim in this register.
