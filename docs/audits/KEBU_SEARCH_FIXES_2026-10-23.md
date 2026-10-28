# Kebu Search — Business mode: fixes for the Oct 23 release blocker

Branch: `kebu-search-build-oct23`. Fixes commit is on top of `eab3f16`
(merge of authoritative checkpoint `a588e46d` — Studio page lifecycle +
`docs/audits/KEBU_SEARCH_REVIEW_2026-10-23.md`). No production migration
applied; no DNS/promotion change. This closes the four required items from
that review and the direct follow-up request; it does not authorize
merging, promoting, or expanding Search modes.

## What changed, and why

### 1. Live active-status enforcement (the release blocker)

`search_documents` is now never trusted alone. `public.search_businesses()`
(new migration `20261023020000_search_businesses_rpc.sql`) joins every
candidate row to `public.businesses` live and requires
`lifecycle_status = 'active'` on every call. A business that is demoted to
draft/suspended/archived, or deleted outright, can never be returned — even
if its `search_documents` row is untouched and stale. `app/api/search/businesses/route.ts`
now calls this RPC exclusively; it no longer reads `search_documents`
directly for either the "recent" or "query" path.

Stale-row **cleanup** (the other half of "add stale-index cleanup") lives in
`refreshBusinessSearchIndex` (see #3): after a complete, successful scan of
every currently-active business, it deletes any `search_documents` row
(mode='businesses') whose business is no longer in that set. This is index
hygiene, not the security boundary — the boundary is the live join above,
which has no staleness window regardless of when cleanup last ran.

### 2. Explicit, deterministic relevance ranking

`search_businesses()` ranks with `ts_rank(search_vector, websearch_to_tsquery(...))`
and orders `rank desc, updated_at desc, business_id` — a real rank, with a
tie-break that can never reorder two results between identical calls. The
previous `.textSearch(...)` call filtered matches but never ordered them.

### 3. Paginated indexing; reconcile only after a complete scan

`refreshBusinessSearchIndex` no longer stops at `.limit(5000)`. It pages
through every active business with keyset pagination (`order by id, id > cursor`),
defaulting to 500 rows/page. If any page fails, the function throws
immediately — nothing has been upserted or deleted yet, so a partial scan
can never be mistaken for the complete active set. Only once every page has
loaded does it upsert the current set, then delete `search_documents` rows
for businesses no longer in it.

### 4. Structured `category`/`country_code` columns (already fixed before this review landed; re-verified here)

`search_documents` has real `category text` and `country_code text`
columns (`20261023010000_search_index_businesses_mode.sql`). Neither the
indexer nor the API route derives them from the `summary` display string
anymore; the country filter is an exact match on the real column
(`COUNTRY_CODE_RE = /^[A-Z]{2}$/` validates the input before use), not an
unanchored `ILIKE` against free text.

## Verification evidence

### Unit/contract tests (mocked, fast)

`npx vitest run tests/search/` → **5 files, 23 tests pass** (business-index
pagination/abort/reconciliation, route→RPC call shape, migration content
checks) — rerun again after the real-SQL suite was added, see below for the
combined total.

### Real migrated SQL — not mocked

New: `tests/search/db/local-pg.ts` builds a disposable, fully local
PostgreSQL 16 database (this sandbox has a local Postgres server, started
for this work; `LOCAL_PG_TEST_URL` env var, defaults to
`postgres://postgres:localtest@127.0.0.1:5432/postgres`; the suite skips
cleanly, not fails, if unreachable). It creates the real `businesses` table
— same columns and CHECK constraints as
`supabase/migrations_archive/legacy/005_kebu_id_draft_business.sql` — then
applies the real, unmodified migration files from `supabase/migrations/`
in order: `20260920087000_search_index_phase_one.sql`,
`20261023010000_search_index_businesses_mode.sql`,
`20261023020000_search_businesses_rpc.sql`.

`tests/search/business-search.db.test.ts` — **11/11 pass**, run 3 times
consecutively with no flakiness:

- Migrations apply cleanly against a real engine; `category`/`country_code`
  are real columns.
- The real `lifecycle_status` CHECK constraint rejects a value outside
  `draft/active/suspended/archived`.
- **Reproduces the review's exact scenario and proves it's fixed**: a
  business is indexed, then transitioned `active → draft`, `active →
  suspended`, `active → archived` (one case each, `it.each`), and
  separately deleted outright. In every case, `search_businesses()` returns
  nothing for it — confirmed by directly querying that the stale
  `search_documents` row is still sitting there, untouched, while the
  function still correctly excludes it.
- Ranking: a title-text match outranks a description-only match
  (`ts_rank`, title is `setweight('A')` vs. description `setweight('B')`);
  an unrelated business is excluded entirely, not just ranked low. A tie
  (two rows, identical rank) breaks deterministically by `updated_at`, and
  the result order is identical across two separate calls.
- Country filter: exact match on the real `country_code` column.

Combined with the mocked suite: `npx vitest run tests/search/` →
**6 files, 34 tests pass**.

### Full CI (`npm run typecheck && npm run lint && npm test && npm run build`) — run individually, each to completion

- `npm run typecheck` — **passes, 0 errors**.
- `npm run lint` — **0 errors, 346 warnings** — identical to the
  pre-existing warning count recorded in `docs/KEBU_SESSION_HANDOFF.md`'s
  prior checkpoint; this slice adds zero new warnings.
- `npm test` — **6,640 passed, 338 skipped, 3 failed** (`tests/create/builder-qa-isolation.test.ts`,
  `tests/create/builder-qa-rpc.test.ts` ×1 each more) — all three failures
  are the same pre-existing `getaddrinfo ENOTFOUND db.skqnxyaeimvbyrmdfzvk.supabase.co`
  (the disposable QA cluster, unreachable from this sandbox; documented
  earlier this session and unrelated to Search). Up from the prior
  checkpoint's 6,606/338/3 by exactly the 34 tests this slice adds.
- `npm run build` — **exits 0**; `.next/server/app/kebu-search/page.js` and
  `.next/server/app/kebu-search/business/[id]/page.js` both present in the
  build output, confirming the new routes actually compiled into the
  production build, not just passed typecheck.
- `node scripts/check-migration-hygiene.mjs` — **100 unique timestamped
  canonical migrations; no legacy bundles executable** (98 before this
  slice's 2 new migration files).

### Real, populated browser journeys — desktop and mobile

The hosted Supabase project is unreachable from this sandbox (same DNS
issue documented earlier this session), and there is no Docker daemon
available to run a real local Supabase stack. Rather than stop at
error-state screenshots, this sandbox has PostgreSQL 16 installed as a real
local server, so verification used it directly:

1. `tests/search/db/seed-for-browser-check.ts` built a real disposable
   database (same harness as the `.db.test.ts` suite) and seeded two
   **active** businesses (one verified, one not) and two that must never
   be reachable — one **draft**, one **suspended** — all four fully
   indexed into `search_documents` (so the draft/suspended ones are
   genuinely stale-but-present, not simply absent).
2. `tests/search/db/postgrest-shim.mjs` — explicitly **not** PostgREST; a
   small, purpose-built HTTP server answering only the two request shapes
   `@supabase/supabase-js` sends for these two routes
   (`POST /rest/v1/rpc/search_businesses`, `GET /rest/v1/businesses?id=eq....`),
   executing real SQL against the seeded database. This is a stand-in for
   the Supabase REST layer, not a substitute for hosted acceptance against
   it — recorded here as exactly that.
3. The real `next dev` process (real route handlers, real React pages) was
   pointed at that shim via `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`,
   and driven with real Playwright/Chromium at desktop (1440×900) and
   mobile (iPhone 13 emulation) viewports.

Screenshots in `docs/audits/evidence/kebu-search-oct23/`:

| File | Shows |
| --- | --- |
| `desktop-recent.png` / `mobile-recent.png` | Homepage, no query: both active businesses listed with real trust labels and source/freshness text; draft and suspended businesses absent despite being indexed |
| `desktop-query.png` / `mobile-query.png` | Query "chocolate": both active businesses returned, **the title match ranked first** (confirms real ranking, not just filtering), trust labels correct |
| `desktop-detail-active.png` / `mobile-detail-active.png` | Detail page for the active, verified business: full real data, a working "Visit website" link, real Kebu ID (`KEBU-SN-01-000001`) |
| `desktop-detail-draft.png` / `mobile-detail-draft.png` | Detail page for the draft (indexed-but-stale) business: honest "isn't publicly listed" — no data leaked |

One real bug surfaced by this exact process and fixed before the above was
captured: the `businesses` test-fixture table in `local-pg.ts` was missing
the `region` column that the production detail route selects, which made
every detail-page request fail with `column "region" does not exist` —
a gap in the test harness, not production code. Fixed, then the full
journey above was re-run and captured clean.

All disposable databases and local processes (dev server, shim, Postgres
test DBs) were stopped and dropped after this verification; nothing from
this process was left running or committed except the reusable test
harness and these screenshots.

## What this does not claim

- No hosted Supabase acceptance (project unreachable from this sandbox).
- No production migration applied, no DNS or promotion change.
- Not a merge authorization — Search stays on this branch pending review,
  per the Oct 23 review and the direct instruction that followed it.
- The other 9 Search modes remain unimplemented (shown as disabled "soon"
  pills in the UI, not fake-clickable tabs).
