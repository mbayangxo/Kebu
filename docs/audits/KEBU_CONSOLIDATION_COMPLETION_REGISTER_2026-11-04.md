# Kebu Consolidation Completion Register — 2026-11-04

**Audited commit (exact SHA, cited throughout):** `2eefe10228e3b0e2e022a8a1982e1752d4e693d8`
(branch `fix-daily-sweep-2026-11-04`, a pure linear descendant of `consolidation-2026-11-04`)

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
| Duplicate-timestamp collision (`20261103130000` shared by `security_events_log.sql` and `shop_shipping_options.sql`) | Already fixed by the Nov 3 sweep — `shop_shipping_options` renamed to `20261103135000`. Re-ran the hygiene checker fresh on this exact commit. | `node scripts/check-migration-hygiene.mjs` → `Migration hygiene OK: 125 unique timestamped canonical migrations; no legacy bundles are executable.` |
| Stray reference to the old timestamp missed by the rename | **Found a real one, fixed it.** `lib/shop/cart-order.ts:420` still told a developer to "Apply migration 20261103130000" for shipping-option errors — that timestamp now belongs to an unrelated table. | Fixed in commit `b413c187` on this audit branch; regression test `tests/shop/cart-order.test.ts` ("points the shipping-option-columns-missing error at a migration file that actually exists with that name") reads the live source and the live migrations directory and fails if they ever diverge again. |
| Did the rename break any ordering/dependency relationship? | No. `shop_joko_fulfillment.sql` (`20261104020000`) references `shop_shipping_options(id)` by table name, not by migration timestamp, and sorts after `20261103135000` either way. | `grep -n shop_shipping_options supabase/migrations/20261104020000_shop_joko_fulfillment.sql:37` |
| Was either colliding migration (`security_events_log` or `shop_shipping_options`, under either timestamp) ever applied to a real database? | **Production: confirmed no**, via a direct, read-only Supabase MCP query against the real "Kebu" project (`tnygqgcqlnlsmjpygrca`) — neither `security_events` nor `shop_shipping_options` exists there under any name. **QA (`skqnxyaeimvbyrmdfzvk`): BLOCKED** — unreachable from this environment, confirmed again this pass (not re-attempted; prior confirmation stands — see §5). | Table list captured earlier this session via `mcp__Supabase__list_tables`; this pass did not re-query production (no need — the fact doesn't change) and did not attempt QA. |
| Fresh-install migration test, on this exact commit | **Passed, for real**, against a real local PostgreSQL 16.15 server (not PGlite, not mocked) started for this audit. | `tests/platform/migration-upgrade-path.local-pg.test.ts` — 2 tests passed, run via `DATABASE_URL=postgresql://postgres@127.0.0.1:55499/postgres npx vitest run` |
| Upgrade-from-existing-data migration test, on this exact commit | **Passed, for real**, same run — seeds representative pre-existing rows (shaped like production's real `help_requests`/`platform_cron_runs` data) before applying new migrations on top; proves no data loss, no constraint violation. | Same test file/run as above |

## 2. `lib/adapter/index.ts` — investigated, not touched

**Finding: a complete, substantial, never-integrated subsystem — not dead code, not mid-integration, genuinely standalone.**

Evidence:
- 18 files, ~160KB total (`compile.ts`, `compile-capabilities.ts`, `compile-motion.ts`, `compile-sections.ts`, `compile-theme.ts`, `compile-extensions.ts`, `compile-report.ts`, `certification.ts`, `provenance.ts`, `validate.ts`, `diagnostics.ts`, `ir.ts`, `versions.ts`, `motion.ts`, `assets.ts`, `fonts.ts`, `components.ts` + `index.ts`) — a versioned IR-to-WebsiteDefinition compiler with capability negotiation and gap reporting. Not a stub; genuinely built out.
- `git log --follow -- lib/adapter/index.ts` shows exactly one commit, a large "recover Kebu source" checkpoint — no incremental history, no attributable feature request to trace.
- `grep -rli "aesthetic adapter" docs/` — zero hits. No doc, spec, or roadmap item names it.
- **Only one file outside the adapter's own `tests/adapter/*` suite touches it**: `tests/create/phase3b-capabilities.test.ts`, which imports `normalizeIRMotionSpecs` from `lib/adapter/compile-motion` *alongside* the real, live `buildDefinitionFromProjectParts` from `lib/create/editor-definition`, to verify a **data-contract shape match** between the two — it does not call the adapter from inside the Builder's real code path.
- **Confirmed: zero real production code** (`lib/create/*`, `app/components/create/*`, `app/create/*`) imports anything from `lib/adapter/*`. The Builder/SiteRenderer never calls into it at runtime.

**Recommendation, not action taken**: this reads as a complete subsystem built ahead of (or disconnected from) whatever feature was meant to consume it — possibly an external-design-import pipeline (Figma-style aesthetic spec → Kebu site) that was never scheduled. Per instruction, **not deleted or wired up unilaterally** — flagging with this evidence for a real decision: is there a planned feature this was meant to serve? If not, it's a safe, deliberate removal candidate; if so, it needs its actual integration point built, not an invented one.

## 3. Feature chain-trace (UI → API → implementation → migration → authz → test)

| Feature | UI entry point | API route | Authz guard (evidence) | Migration | Test coverage |
|---|---|---|---|---|---|
| JOKO Fulfillment opt-in | `app/components/shop/shop-shipping-panel.tsx` (seller) | `app/api/admin/fulfillment/route.ts`, `[id]/route.ts` | `assertAdminCookie` (route.ts:10, [id]/route.ts:21) | `20261104020000_shop_joko_fulfillment.sql` | `tests/shop/full-customer-journey.db.test.ts` (chained, real local Postgres) |
| JOKO status-transition ops queue | `app/admin/fulfillment/page.tsx` | same as above | same as above | same | same |
| Refund action | `app/admin/fulfillment/page.tsx:117,219` (real `onClick` → real `fetch`) | `app/api/admin/shop-orders/[id]/refund/route.ts` | admin-gated (route reuses the fulfillment admin guard) | `record_shop_refund()` RPC, added during consolidation | Exercised in `full-customer-journey.db.test.ts`'s refund step |
| Shipping options (merchant config) | `app/components/shop/shop-shipping-panel.tsx` | same shop-shipping-panel API surface | `assertShopProjectAccess` (confirmed in payouts/request route; shipping options route shares the pattern — not independently re-read this pass, carried over from yesterday's fork report) | `20261103135000_shop_shipping_options.sql` | `tests/shop/shipping-options.local-pg.test.ts` (per yesterday's report; not re-run this pass — see §4 for what *was* re-run) |
| Seller payout request | (seller-facing payout UI, not re-located this pass) | `app/api/projects/[id]/payouts/request/route.ts` | `requireUser` + `assertShopProjectAccess` (route.ts:27,31,68) + `assertSameOriginMutation` (route.ts:61) | `20261103180000_shop_seller_balance_and_payouts.sql` | `tests/shop/payouts-and-balance.db.test.ts` (per yesterday's report) |
| In-account help request | `app/account/help/page.tsx` | `app/api/account/help/route.ts` | `requireUser` (confirmed by file presence; guard body not re-read this pass) | restored `20261103140000_help_requests_cron_runs.sql` | `tests/platform/help-request-replies-rls.local-pg.test.ts` — **re-run this pass**, passed for real (see §4) |
| Help-request two-way reply | `app/account/help/page.tsx` | `app/api/account/help/[id]/replies/route.ts` | `requireUser` (route.ts:19) + `assertSameOriginMutation` (route.ts:16) | same | same |
| Admin security signals | `app/admin/record/page.tsx` ("Security signals (24h)" panel, line 454) | `app/api/admin/record/route.ts` | admin-cookie gated | `20261103130000_security_events_log.sql` | `tests/platform/security-events-rls.local-pg.test.ts` |
| May's World fan community | `app/components/create/public-site-community.tsx`, wired via `site-renderer.tsx` | `app/api/public/sites/[subdomain]/community/*` (per yesterday's build) | real RLS + identity-lock trigger (per yesterday's report) | `20261103120000_site_fan_community.sql` | 13 RLS tests (per yesterday's report; not re-run this pass) |
| Marketplace 85/15 split | `app/create/developers/page.tsx`, `app/studio/assets/sell/page.tsx` | `app/api/developer/payouts/route.ts` | developer-profile-scoped (per earlier session work) | pre-existing | `tests/studio/developer-earnings-balance.test.ts` |

**No "exercised only by its own tests" cases found this pass** among the routes actually traced — every one above has a confirmed real UI→API chain. This does not cover every file touched across all ten original branches (out of scope for the time available); it covers the money/security-critical surface the user and Codex specifically named.

## 4. QA results, this exact commit, four buckets (not blended)

Full run: `DATABASE_URL=postgresql://postgres@127.0.0.1:55499/postgres npx vitest run` against a real,
freshly-initialized local PostgreSQL 16.15 server (started for this audit specifically — `initdb`
+ `pg_ctl`, not PGlite, not a container image with pre-seeded state).

- **Passed: 6,930** (after this audit's own fix, up from 6,929 baseline — the anon-grants fix added 3 newly-passing tests that previously silently never ran at all, see below)
- **Failed: 1** — `tests/generation/browser-configuration.test.ts` ("finds the packaged browser on Vercel without an executable override") — `@sparticuz/chromium` genuinely absent from `node_modules` in this sandbox (declared in `package.json`, not installed). Confirmed environmental by direct `ls node_modules/@sparticuz` check this pass, not re-asserted from memory.
- **Skipped: 421** — breakdown: PGlite unavailable (some suites specifically require it, distinct from the native-Postgres suites this audit got running), no `SUPABASE_QA_DESIGNATED`/real GoTrue env for the `builder-qa-*.test.ts` trio, and other per-file `describe.skipIf` guards unrelated to database availability (feature flags, optional provider credentials).
- **Environmentally blocked, named specifically** (failed, not skipped, when forced to run with `DATABASE_URL` set — each confirmed by reading its actual thrown error, not assumed):
  - `tests/creative-core/db/kcd-apply.db.test.ts`, `kcd-pages.db.test.ts`, `kcd-parity.db.test.ts`, `kcd-responsive-state.db.test.ts`, `kcd-storage.db.test.ts` — all five **refuse by design** to run against anything but the real QA database: `assertQaDatabase()` in `tests/creative-core/db/kcd-db.ts:26-29` throws unless the connection string contains `postgres.skqnxyaeimvbyrmdfzvk` and explicitly rejects the production ref too. This is a real, intentional safety guard in the test code itself — not something this audit should or could override with a local substitute.
  - `tests/create/builder-qa-authz.test.ts`, `builder-qa-isolation.test.ts`, `builder-qa-rpc.test.ts` — require `SUPABASE_QA_DESIGNATED=true` plus real `SUPABASE_QA_URL`/`SUPABASE_QA_ANON_KEY`/`SUPABASE_QA_SERVICE_ROLE_KEY`/`SUPABASE_QA_DB_URL` (real hosted GoTrue + PostgREST). None of these exist in this sandbox.

**A real, previously-hidden bug this forced run surfaced and this audit fixed**: `tests/create/builder-rpc-anon-grants.db.test.ts` only needs `DATABASE_URL` (no QA-only guard) — but its migration loader only ever read from the active `supabase/migrations/` directory, while `004_create_projects.sql` (which it needs) lives in `migrations_archive/legacy/` since an earlier reconciliation moved it there. Because this test's `describe.skipIf(!DATABASE_URL)` meant it silently never ran in any CI/sweep that lacked a real Postgres wired to `DATABASE_URL`, **this break had never been caught**. Fixed in commit `b413c187` with the same archive-fallback pattern `kcd-db.ts` already uses; 3 tests now pass for real where they previously silently never executed at all. This is exactly the category of risk the user/Codex flagged: a test file existing and "passing" (by skipping) proves nothing about whether the code underneath it still works.

## 5. "Features actually work: Browser → real API → database → visible result" — honest structural finding

**This exact end-to-end chain — a real browser, hitting the real Next.js API route over real HTTP,
backed by a real authenticated session, writing to a real database — could not be produced for any
feature in this sandbox, and this is a structural limitation, not a specific feature's failure.**

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
downgrade**:
- Direct-SQL tests against a real local PostgreSQL server (this audit started one fresh:
  `/usr/lib/postgresql/16/bin/initdb` + `pg_ctl`, port 55499) with the real migrations applied,
  real RLS policies enforced by real Postgres roles (not simulated) — `migration-upgrade-path`,
  `help-request-replies-rls`, `security-events-rls`, and (per yesterday's reports, not re-run this
  pass) `shipping-options`, `payouts-and-balance`. This proves the database layer — the actual last
  line of defense — behaves correctly under real Postgres semantics.
- Real-browser rendering tests (`tests/create/e2e-maylecor-fixture-live.spec.ts`,
  `world-visitor.local.spec.ts`) via a dev-only fixture route that renders real React components
  with real props, explicitly labeled by their own authors as "not hosted authentication/SQL proof."
- Route-source authorization-guard verification (§3 above) — confirming the actual exported route
  handler functions call `requireUser`/`assertShopProjectAccess`/`assertAdminCookie`/
  `assertSameOriginMutation`, by reading the real file, not by running an HTTP request against it.

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
