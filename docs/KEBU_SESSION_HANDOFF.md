# Kebu — Session Handoff and Recovery

Updated: 2026-10-23
Status: active shared-rotation checkpoint; managed QA blocked by access/Free-project quota and Pro branching requirements. Full Kebu and production acceptance OPEN.

## Resume here — current operational state

- Follow `origin/work/kebu-completion-audit-oct13`; do not restart from main or replay checkout/frames/Yande/pages work. Run workspace:check and reconcile a clean behind checkout before editing. The handoff branch mirrors the shared checkpoint.
- Integrated through b9acdc02: PR12 group-copy isolation, PR13 page lifecycle, PR14 rigid-group/rotated arrangement and PR15 visible-bound snapping/cancellation. Current shared-rotation runtime626a5d40833a7cbd54c7e443e909c3bdd9d1b693 / PR16 passes full local/remote CI6638/338, local61 and remote61+6 browser cases, public smoke and READY preview. Verify its authoritative integration state before further work; do not replay earlier slices.
- Browser verification protocol: freeze the entire checkout, including documentation, while the dev harness runs; serialize local memory-heavy CI/build and browser work under the8GB cap. Preserve failed-run provenance and never suppress page errors to obtain a pass.
- Current QA blockers independently retried: Kebu organization is Free; native branching requires Pro. A safer separate-project option quoted0/month but creation was rejected because the account already has2 active Free projects across organizations (only production is visible through this connection). Old QA skqnxyaeimvbyrmdfzvk still returns permission denied. No project/branch was created, no plan upgraded and no other project paused/deleted. Earlier cancellation is historical. Do not use production customer content for destructive fixtures.
- Keep Claude's Search/Mail/Foundry work separate. Latest Search7b8ca47a addresses the earlier95f8f111 live-lifecycle/ranking/filter findings. Independent review59 pass/11 SQL skips; source-scale cleanup and strict SQL/CI verification still need follow-up. Read audits/KEBU_SEARCH_REVIEW_FOLLOWUP_2026-10-23.md before discussing Search readiness.
- Remaining work is tracked in the25-group Creative OS register. Shared rotation now has bounded desktop/phone/tablet acceptance. Nested groups, group resize, animated transform frames, all smart guides, rich text/media, hosted collaboration and May reference acceptance remain open.

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

## Current next actions
1. Resume from the authoritative checkpoint containing PR16 shared rotation; verify remote state before editing. Continue the remaining Studio/Builder slices. Keep Claude Search separate and follow its review follow-up; do not reimplement completed rotation/snapping/pages work.
2. Unblock managed hosted QA with an authorized isolated environment; native branching currently requires Supabase Pro. Recheck live schema drift before any migration, then run signed-in Auth/RLS, save/publish and multi-user acceptance.
3. Continue the remaining Creative OS requirements through isolated end-to-end slices, preserving formats, authored content and Claude-owned work.
4. Verify deployment state with the actual provider. Production promotion remains separate from local/fixture acceptance.

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

## October23 — renewed QA authorization and Studio arrange continuation
- User explicitly renewed authorization to retry the paid QA branch. The retry reached Supabase and returned PaymentRequiredException: branching is supported only on Pro or above. This is now an account-plan prerequisite, not a cancellation refusal. No QA branch, plan upgrade or production mutation performed by this attempt.
- Continued from clean shareda588e46d. Reproduced3 arrange regressions: grouped objects collapsed, rotated edges misaligned, and rotated visual gaps unequal. Repair treats each unlocked group as one rigid target, measures rotated frame bounds, distributes visible gaps, counts targets correctly and rejects unsupported coordinate translations atomically with a visible dismissible error.
- Original regressions3/3failed; final12 arrange geometry tests plus10 existing canvas tests pass. New actual browser3/3 passes through undo/redo/save/reopen and unchanged-artwork error handling. Initial browser attempt could not launch because a temporary Chromium binary had been removed; restored a scratch-owned runtime. A subsequent test selector matched Next's route announcer too; the arrange error now has an accessible name and the exact named-alert case passes.
- Preliminary local full CI passes6618 tests/338 explicit skips, TypeScript, lint0errors/346 existing warnings and finalized build. Final application differs only by the named alert added during verification; exact-source full browser/remote gates remain pending at this checkpoint. No test failure counted as acceptance.
- Full Kebu, hosted real-session acceptance, nested group transforms and all25 Creative OS groups remain open. No Search/Mail/Foundry implementation edits; preserve Claude's work. Native Supabase branching remains blocked until the owning organization has Pro or higher.

## Final arrange verification
- Runtime367d82d1e483d6308a04aa16695dd2fd532d2217 on work/codex-studio-arrange-oct23: remote CI40010858925 passes TypeScript/lint0errors,6618 tests/338 skips and finalized230-page build. Remote Studio40010858749 passes52 full plus6 mandatory touch cases, zero skips/flaky/unexpected with normal cleanup. Public smoke40011165162 passes. Local frozen-source52/52, focused3/3, helpers22/22 and screenshot inspection pass.
- Preview independently verified READY: https://kebu-1njz338cu-mbayangxos-projects.vercel.app / dpl_EXpzBq5kWi33ycLQKLJNdY9nocmB. PR14 targets the shared checkpoint only. Evidence: docs/audits/KEBU_STUDIO_ARRANGE_2026-10-23.md and docs/audits/evidence/studio-arrange-oct23/verification.json.
- User renewed QA branch authorization. Actual retry result is PaymentRequiredException: Branching is supported only on Pro or above. No branch or plan change occurred. Native branching can be retried after the owning organization supports it; an authorized isolated QA environment is required for the managed hosted acceptance suite. Earlier cancellation is not the current blocker.
- No production schema/data/DNS/ownership change or promotion in this slice. No Search/Mail/Foundry code edits. Full Kebu and all25 Creative OS groups remain incomplete; continue bounded user journeys and hosted certification rather than claiming a global release.

## October 23 continuation — visible-bound snapping (verification in progress)

- Clean authoritative base a5ce2321; isolated branch work/codex-studio-snapping-oct23. Four original snapping regressions reproduced, then repaired using rotated selection bounds and nearest correction. Eight-screen-pixel tolerance is consistent across zoom; invisible targets excluded.
- Actual browser also reproduced Escape committing an intermediate drag. Gesture cancellation now restores the baseline and clears guides/history writes. New frozen-source 3-case browser rerun passes with zero skips/flaky/unexpected; full 55-case gate pending; focused geometry/craft/arrange25 pass, lint zero errors/five existing warnings.
- Claude Search advanced to7b8ca47a. Source now has a live active-status join and explicit SQL rank. Independent review suite59 pass/11 local-PG skips; no SQL pass claimed in this environment. Remaining review: capped stale-row cleanup, server row-cap pagination behavior, batched writes, strict non-skipping SQL/CI gate and reconciliation onto the latest shared Studio base. No Search integration or migration.

### Snapping runtime and fresh hosted readback

Runtime4fe75aa4 / PR15, shared basea5ce2321. Local focused3/3 and full55/55 actual browser passes, zero skips/flaky/unexpected, normal teardown; both zoom screenshots inspected. Exact-source remote CI40025909080 passes6624 tests/338 explicit skips, TypeScript, lint0errors/346 existing warnings and finalized230-page build. Remote Studio40025909069 and public smoke40026600568 remain pending at this record. An auxiliary local CI worktree passed TypeScript/lint/tests but Turbopack refused its external node_modules symlink; a normal-checkout full CI rerun is in progress. Initial Vercel preview failed Google-font module resolution; exact-commit retry is READY at https://kebu-b574i64g5-mbayangxos-projects.vercel.app / dpl_bk9nGr8dvKWa3V3ESXvKem5vwFz8. No compiler/font changes were needed.

Fresh read-only hosted catalogs at2026-10-23T21:21Z still fail2/7 Yande and10/37 broad release checks. MissingYande interactions, worker/job listings, Mail forwarding and marketplace asset/library tables remain real prerequisites. Supabase still lists only main; historical MIGRATIONS_FAILED branch metadata coexists with ACTIVE_HEALTHY project status and does not establish current application readiness. Production provider still reports71815f99 / dpl_8XQYFY2rAkDvmUZ1pmdZq8uJHFj2 READY. No production writes/migration/promotion or paid subscription upgrade.

### Final snapping verification — October23

Runtime4fe75aa4e5e3ad9b8203b692ed4a2af0e53d080f / PR https://github.com/mbayangxo/Kebu/pull/15. All final gates pass: normal-checkout npm run ci exit0 (TypeScript, lint0errors/346 existing warnings,6624 tests/338 explicit skips, finalized230-page build); exact-source remote CI40025909080 SUCCESS; Studio40025909069 SUCCESS with55 full plus6 required phone/tablet cases across3 rounds, zero skips/flaky/unexpected and original marquee regression reproduced; public preview smoke40026600568 SUCCESS. Local55/55 and focused3/3 pass with normal teardown and inspected50%/100% screenshots. The earlier failed Escape run, auxiliary symlink-root build and first font-resolution deployment are explicitly nonaccepted runs; the final source/gates and READY exact-commit retry supersede them.

The attempted independent Search PostgreSQL setup downloaded native binaries but could not initialize: this sandbox maps only UID0, cannot chown to another UID and rejects runuser/setgroups. No database was started; the11 SQL skips remain unverified independently. No Claude runtime changes or merge. Follow audits/KEBU_SEARCH_REVIEW_FOLLOWUP_2026-10-23.md for reconciliation/SQL gate/indexing follow-ups. Full Kebu, all25 Creative OS groups, hosted JWT/RLS/publish/integrations and production rollout remain OPEN.

## October23 — shared rotation in progress

Clean authoritative baseb9acdc02; isolated branch work/codex-studio-group-rotation-oct23. Reproduced the absent shared rotation control in the actual editor. Implemented visible selection pivot/outline/handle, exact relative angle, keyboard and native touch rotation, one-step history/cancellation and atomic error.14 new geometry cases/32 combined cases pass; TypeScript passes; focused actual browser6/6 with zero skips/flaky/unexpected, normal teardown and inspected desktop/390/834px screenshots, decoded PNG geometry and viewer/error paths. Full61/CI gates pending. No group resize/nesting/animated-frame or hosted completion claim. Claude remains separate. See audits/KEBU_STUDIO_GROUP_ROTATION_2026-10-23.md.

### Current QA provisioning attempts and verification progress

Organizationzdoqqcrxrbxkbxobjrsp is verified Free. get_cost(project) quoted0/month; create_project(kebu-hosted-qa-oct23, existing Kebu org, us-east-1) was rejected by the account-wide2-active-Free-project limit. Only production is listed through this connection, so no other project can safely be selected for pausing/deletion. Old QA skqnxyaeimvbyrmdfzvk was explicitly retried and remains permission-denied. These are provider/access blockers, not the historical canceled approval. No infrastructure created or billing changed.

Runtime626a5d40 / PR16: full local CI(source tree79d4a8d5)/remote CI40029905798 pass6638 tests/338 explicit skips, TypeScript, lint0errors/346 existing warnings and finalized230-page build. Public smoke40030271969 passes; previewdpl_HmGjbiKGSHeArQGMiG2EAgCUa1uo READY at https://kebu-ps5vyyoo5-mbayangxos-projects.vercel.app. Initial local full browser53passed/1unexpected/7unrun was not accepted: workerSIGKILL while CI/build overlapped, cgroup8GB peak and oneOOMkill. CI finished; frozen source61-case browser rerun is now isolated from CI. Remote Studio40029905848 is still running.

Fresh22:00Z read-only hosted catalog checks remain2/7 Yande and10/37 broader failures, with missingYande interactions, Mail forwarding and marketplace/worker/job tables. No schema/data writes or production promotion. Current exact-source verification status is tracked in audits/evidence/studio-group-rotation-oct23/verification.json.

### Final shared-rotation verification and recovery checkpoint

Runtime626a5d40833a7cbd54c7e443e909c3bdd9d1b693 / PR https://github.com/mbayangxo/Kebu/pull/16. Final frozen-source local61/61 browser cases pass with zero skips/flaky/unexpected and normal teardown. Remote Studio40029905848 passes61 full plus6 required phone/tablet cases across3 rounds, zero skips/flaky/unexpected; both the original marquee and missing shared-rotation control regressions are reproduced independently. Exact-source remote CI40029905798 and local full CI(tree79d4a8d5) pass6638 tests/338 explicit skips, TypeScript, lint0errors/346 existing warnings and finalized230-page build. Public preview smoke40030271969 passes; exact previewdpl_HmGjbiKGSHeArQGMiG2EAgCUa1uo is READY.

Nonaccepted runs remain recorded: first full local run53passed/1unexpected/7unrun, workerSIGKILL at the8GB cgroup limit during concurrent local CI; second25passed/1unexpected/35unrun, Next dev hot-reloader dispatched before router initialization while handoff files were being edited. After CI finished, the entire checkout was frozen and all61 passed without suppression/retries. Do not run memory-heavy CI and browser together locally or edit docs during the harness.

No production migration/promotion, subscription upgrade, project/branch creation or pausing/deletion of another project. Production remains71815f99; managed hosted acceptance remains blocked by old QA access, account-wide free-project capacity and Pro-only branching. Free0/month project creation was actually attempted and rejected by the provider, replacing speculation about that alternative. Full Kebu/all25 groups remain open. Detailed evidence: audits/KEBU_STUDIO_GROUP_ROTATION_2026-10-23.md and its verification.json.
