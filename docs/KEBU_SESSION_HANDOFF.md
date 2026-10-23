# Kebu — Session Handoff and Recovery

Updated: 2026-10-23
Status: October23 Studio group-copy repair verified locally and in remote CI/browser; hosted authenticated acceptance and production promotion OPEN.

## Source of truth
GitHub commits and reviewed branches are authoritative. This document records evidence, not release certification.

## Reconciliation evidence (2026-10-23)
- main: 71815f99c50022482e545e22e1f6e040ee1cafe4 (September 19).
- work/claude-sync-oct20 is 609 commits ahead of main, zero behind.
- work/codex-builder-frame-verified-oct21 is 623 ahead of main, zero behind.
- work/codex-studio-marquee-oct22 is 637 ahead of main, zero behind.
- Comparing Claude sync to Studio marquee: Studio marquee is 28 ahead, zero behind. Comparing Builder frame verified to Studio marquee: Studio marquee is 14 ahead, zero behind. These two branches are ancestors of Studio marquee; do not independently replay their work.
- work/codex-hosted-release-oct21 is 618 ahead of main; ancestry relative to Studio marquee not yet established.
- work/builder-p0-stabilization removes many unrelated app routes relative to main; DO NOT merge without detailed review.
- No merges, promotions, or changes to Claude's branches were performed during this checkpoint.

## Existing Studio evidence (read from docs/audits/KEBU_STUDIO_SELECTION_2026-10-22.md on Studio marquee)
- Remote CI run 39724550969: TypeScript/build passed, 6,536 tests pass, 338 skipped, 347 existing lint warnings.
- Browser run 39724550965: 44 passes; studio marquee, cancellation and editor regressions covered.
- Hosted public smoke run 39724697662: 533 passes, 35 skipped; NOT authenticated hosted acceptance.
- READY preview reported: kebu-3f6qrxx6n-mbayangxos-projects.vercel.app; production not promoted.
- These results are recorded from the branch audit, not independently rerun this session.

## Product requirements
- Builder: immersive responsive visual creation, editing, saved projects, publishing, strong design/reference parity.
- Studio: immersive creative OS, isolated canvas, back navigation, versions, rich tools, exports, templates, collaboration.
- Hosted Supabase Auth/RLS, permissions, publishing and integrations must be verified against hosted services.
- Mail provider implementation and Type Foundry original fonts/licensing remain separate workstreams.
- Preserve Claude's work, avoid stale checkout tasks.

## Open blockers and next implementation actions
1. Compare Studio marquee with hosted-release, payment, and latest Claude branches in both directions; select nonconflicting base.
2. Inspect Builder and Studio remaining feature gaps and implement isolated, testable changes on a dedicated branch.
3. Secure hosted QA access and production schema prerequisites; run signed-in Auth/RLS, publishing and integration acceptance.
4. Verify deployment status with actual deployment provider, not only a recorded preview URL.
5. Merge only reviewed changes via PR after passing CI; do not infer production readiness from local fixtures.

## Session protocol
Update this file with commit SHA, actual test evidence, deployment status, and next action. Do not mark tests passed unless run or independently verified. Never overwrite existing feature work.

## October 23 continuation — independent Studio copies
- Base reconciled by fast-forward to authoritative `4d2d96d42ab92a47386c2c6b2e8aba168c956cec`; workspace check passed clean/ahead0/behind0.
- Current base contains Studio marquee, Claude sync, hosted-release and payment-adapter branches. Hosted-release is 24 commits behind this base; payment adapters 33 behind. Older `claude/alkebulan-files-migration-aty6p0` diverges (648 current-only / 56 old-Claude-only); deliberately not merged. No checkout replay or Claude branch mutation.
- Reproduced Studio copy collision: selecting a copied grouped layer expanded selection to its original. Original focused suite: 1 failed/6 passed. Fix assigns fresh group identities per duplication, page-copy and paste operation, preserving copied membership and separating repeated copies.
- Focused final tests: 18 passed across canva-editor, editor-craft, editor-selection-movement. New browser regression covers grouped duplicate movement, undo, save/reload and original preservation; full CI/browser results pending at this checkpoint.
- Local Chromium installation failed with truncated/non-ZIP downloads; do not claim local browser acceptance. Dedicated Studio workflow includes this branch and expects 45 full cases (previously44), preserving existing touch and marquee regressions.
- Fresh hosted read-only catalog check: `reserve_account_ai_generation(uuid,uuid,uuid,integer,text)` absent; `yande_interactions` absent; usage RLS enabled but authenticated usage-table writes still granted. No migration or hosted write performed. This is catalog evidence, not JWT/RLS acceptance.
- Fresh Vercel provider read: production remains READY on `dpl_8XQYFY2rAkDvmUZ1pmdZq8uJHFj2`, source `71815f99c50022482e545e22e1f6e040ee1cafe4`. No promotion.
- Next: inspect CI/browser evidence for this exact source; fix any failures, then integrate verified checkpoint without overwriting newer remote work. Hosted schema reconciliation, signed-in acceptance, May portfolio and all25 Creative OS groups remain open.

## Latest verified runtime — October23

- Runtime `f9a07857f2b0a0b54913af529aacc0d82990658b` on `work/codex-resume-oct23`, PR https://github.com/mbayangxo/Kebu/pull/12 targets the designated shared development checkpoint. The initial runtime `c27d3337` failed typechecking because of a regression-test annotation; f9a07857 corrects it. Earlier failed CI is not counted as a pass.
- Local full CI passes: TypeScript, zero lint errors/346 existing warnings,6,604 tests passed/338 explicit skips, finalized production build. Local default heap was insufficient; verified run used6144MB. Migration hygiene98 unchanged canonical migrations passes. Focused18/18 and local Studio45/45, zero unexpected/skips/flaky; normal teardown. Alternative npm-packaged Chromium enabled actual local browser verification after standard downloads failed.
- Exact runtime remote CI39905270591 passes. Studio39905270558 passes45 full cases plus6 mandatory touch cases across3rounds, zero skips/flaky/unexpected; expected original marquee failure reproduced. Public preview smoke39905615702 is running at this checkpoint. No authenticated hosted26 result is claimed.
- Provider verified runtime preview READY: https://kebu-ifzsdaiu8-mbayangxos-projects.vercel.app / dpl_GHGJ5mPZBrcFtfCmeXgWJag65WUA. Production remains71815f99 on dpl_8XQYFY2rAkDvmUZ1pmdZq8uJHFj2. No promotion/migration/DNS/ownership changes or real model/payment calls.
- Hosted preflight script freshly executed read-only:4/7 checks fail, specifically missing reservation RPC, missing interactions table/grants, and legacy usage writes. RLS flags for existing usage/generation/campaign tables pass; this is not JWT/RLS acceptance.
- Review evidence: `docs/audits/KEBU_STUDIO_GROUP_COPIES_2026-10-23.md` and `docs/audits/evidence/studio-groups-oct23/verification.json`. Bounded COS01/07/11/18 copy-isolation improvement only; all25 groups remain partial/open.
- Next work: secure separately authorized disposable hosted QA/session configuration; review schema drift before any migration; run strict26 hosted Builder acceptance plus two-user Studio persistence/permission cases. Preserve the real13-page May portfolio; never open its old-production editor without the documented read-only backup. Continue nested/group transforms and complete page/scene journeys through ordinary tools; do not restart checkout, Mail or font work.

## October23 — page lifecycle continuation (verification in progress)
- Continuing from clean/durable4ead007d after user requested full completion. Prior runtime public preview smoke39905615702 has now passed; that previously pending job is resolved.
- Studio Page settings now exposes explicit rename and accessible earlier/later ordering. Operations preserve IDs, artwork, timing and document mirroring; deletion retains another active page or chooses the nearest survivor. Page strip scrolls horizontally rather than consuming the mobile canvas, with active-page semantics.
- Four new actual-editor tests cover desktop rename/order/undo/delete/restore/save/reopen, decoded PDF dimensions and ZIP filename order,390/834px interaction and viewer denial. Initial4/4 pass;14 focused helper/timeline/export tests pass. Initial full local CI6606/338 passes; final strip/accessibility follow-up and49-case browser/remote gates pending at this checkpoint.
- Supabase branch listing finds only main with MIGRATIONS_FAILED. Requested isolated `kebu-hosted-qa-oct23` through the Supabase cost-approval flow; tool returned `Invalid or expired requestState`. Follow-up list confirms no QA branch was created. Do not infer approval or retry through another account. Hosted26 and real two-session checks remain blocked.
- No production data, schema, DNS, ownership or publishing changed. All25 Creative OS groups remain partial/open; this closes a specific missing page UI path only after final gates pass.

## Latest page runtime and Search review
- Page runtime `1b678ee9a455707837734994b8c0364061b39f70`: exact-source CI39909692565 passes TypeScript, lint0errors/346 existing warnings,6606 tests/338 skips and finalized230-page build. Local frozen-source Studio49/49 passes with normal cleanup; remote Studio39909692429 and public smoke39910296305 pass. READY preview verified at https://kebu-aosw8441p-mbayangxos-projects.vercel.app. PR13 targets the shared checkpoint only.
- Page rename/reorder/delete/restore, undo, save/reopen, decoded PDF/ZIP order and mobile/viewer cases verified in isolated fixtures. No managed hosted JWT/RLS acceptance or production promotion claim. Evidence: `docs/audits/KEBU_STUDIO_PAGES_2026-10-23.md`.
- Hosted migration history changed externally during this work. Point-in-time06:09Z inventory improved to2/7 Yande and10/37 broader failures. This is read-only catalog evidence, not current release certification. No production schema change by this slice. The QA branch request first expired; retry was cancelled by the user. Do not retry paid branch provisioning without renewed authorization.
- Search branch `kebu-search-build-oct23`/95f8f111 was reviewed separately at the user's request.41 existing Search/KebuID tests independently pass, but an additional inactive-index regression fails: public search returns the cached listing while reading only search_documents. Other source findings: no relevance ranking order, no index pagination/stale cleanup, country/category encoded in summary. Do not merge Search until Claude fixes and verifies those boundaries. See `docs/audits/KEBU_SEARCH_REVIEW_2026-10-23.md`. No Search runtime file was edited on Claude's branch.
- Full Kebu, all25 Creative OS groups, real hosted acceptance and May portfolio/reference requirements remain incomplete. Continue from this source; do not replay old checkout or overwrite concurrent Search/Mail/Foundry work.

## October 23 — Search fixes for the stale-index release blocker

- Base: merged authoritative `a588e46d` (Studio page lifecycle + the Search review above) into `kebu-search-build-oct23` — no file overlap with Codex's Studio work; preserved as-is.
- All four review items fixed: `public.search_businesses()` (new RPC, migration `20261023020000`) joins live to `businesses.lifecycle_status` on every call — a business demoted or deleted can never be returned regardless of index staleness. Real `ts_rank` ranking with a deterministic `rank desc, updated_at desc, business_id` tie-break replaces filter-only search. `refreshBusinessSearchIndex` now paginates the full active set (keyset, no 5,000 cap) and only reconciles (deletes stale `search_documents` rows) after a complete successful scan — any page failure aborts with nothing written. `category`/`country_code` are real columns (this part was already fixed before the review landed); country filtering is now exact-match, not an unanchored ILIKE.
- Verified against real migrated SQL, not mocks: this sandbox has a local PostgreSQL 16 server (started for this work; not the unreachable hosted QA cluster). `tests/search/business-search.db.test.ts` applies the real migration files against a real database and reproduces the review's exact scenario — active → draft/suspended/archived/deleted, in each case the function excludes the business while the stale `search_documents` row is confirmed still present. 11/11 pass, run 3× with no flakiness.
- Verified with real, populated browser journeys (desktop + mobile), not error-state screenshots: seeded a real local database (2 active businesses, 1 draft, 1 suspended — all 4 indexed), ran the real `next dev` process against a small purpose-built local REST shim (explicitly not PostgREST — no Docker daemon available here) backed by that database, drove it with real Playwright/Chromium. Screenshots in `docs/audits/evidence/kebu-search-oct23/` show populated, correctly-ranked results and correct exclusion of the draft/suspended businesses on both viewports. One real bug found and fixed in that process: the test-fixture `businesses` table was missing the `region` column the production route selects (test-harness gap, not product code).
- Full CI run individually to completion: typecheck 0 errors; lint 0 errors/346 warnings (unchanged from the prior checkpoint — zero new warnings); `npm test` 6,640 passed/338 skipped/3 failed (same pre-existing unreachable-QA-cluster DNS failures as every prior checkpoint this session, +34 over the prior 6,606/338/3 baseline — exactly this slice's new tests); `npm run build` exits 0 with both new routes present in `.next/server/app`; migration hygiene 100 canonical migrations (98 before, +2 new files here). Details and exact evidence: `docs/audits/KEBU_SEARCH_FIXES_2026-10-23.md`.
- No production migration applied, no DNS/promotion change, no hosted Supabase write. This is not a merge authorization — Search stays on `kebu-search-build-oct23` pending review. Other 9 Search modes remain unimplemented.
