# Kebu completion queue — October 11, 2026 UTC

Scope: all four groups authorized by the user. The 99 recovered requirement groups and evidence limits are preserved in `KEBU-RECOVERED-REQUEST-AUDIT.md`. Split those groups into acceptance cases before marking them complete. This queue is not a release certificate.

| Group | Work and completion gate | Current state |
| --- | --- | --- |
| 1. Usable core | Builder selection/layout/mobile, save/reload/history/publish, offline recovery, manual/automatic night mode. Inspect real authenticated hosted journeys, migration parity and production rollout. | Existing native development work; hosted verification and production release incomplete. |
| 2. Business flows | Identity, real Network, AI, stores, payments, delivery, analytics, teams, registration. Verify tenant isolation, real providers and failure/retry/refund paths. | Network repair in progress; new local tests pass. AI/payment/email provider configuration and live verification remain blocked. |
| 3. Everyday tools | Real Mail, Library/Spaces, Docs/Sheets/Slides, calendar/bookings, Rooms/meetings, Jobs. One account, persistence and permissions, not demonstration screens. | Major products not started or partial; no ecosystem completion claim. Mail also needs a provider/domain/DNS setup. |
| 4. Larger platforms | Search crawler/index/ranking with citations, installable Browser, Cloud operations, practical Maps later. | Major infrastructure not established. Do not substitute static results or a chat page for these products. |

## Current vertical slice: authenticated Network persistence

Root causes: the join screen swallowed insert errors, permitted ownerless writes, always displayed success; directory showed sample profiles and invented counts. Existing DB policies permitted anonymous ownerless inserts and exposed trust fields to authenticated writes.

Behavior: sign in to save or read the member directory; server binds owner identity and validates input. Success requires a confirmed row. A stable submission ID permits confirmation retries without duplicate rows. Draft fields remain on errors; cross-owner/mismatched retries are refused. Directory counts/search operate on actual visible database rows and disclose the 500-row bound. No pretend connection button.

Database: ownership/visibility policies and column grants preserve all existing rows, hide legacy ownerless profiles, prevent client trust/owner tampering. New migration is local, not yet applied to a hosted project.

Acceptance still open: running-app desktop/mobile visual and error checks; authenticated create → directory → refresh; two-owner hosted permissions; hosted migration and matching preview configuration; production deployment. Keep IN PROGRESS until these pass.

External gate: production was restored and user login succeeded; separate QA was paused to stay within the free active-project limit. Do not pause the working production database or buy a hosting upgrade to manufacture a QA pass. Provider credentials cannot be invented. Inspect connected-account access before requesting anything from the user.

## October 13 continuation on the completion branch

See `audits/KEBU_COMPLETION_RECONCILIATION_2026-10-13.md` for exact branch identities, compatible integrations, fresh tests and unresolved overlaps. The current working branch has substantial later Studio/platform work missing from the historical audit baseline; re-evaluate its product gaps individually.

Network persistence/session fixes and Builder write receipts are integrated. Studio conditional saves/deletion confirmation are repaired. Final local CI passes 1,011 tests and build. Network actual SQL: 18 checks; recovered QA 3J actual SQL: 7 checks. Full native Builder integration, real providers and authenticated hosted acceptance remain IN PROGRESS/BLOCKED. Completed 3C–3I remain preserved on the exact QA checkpoint; they were not restarted. All 99 requirement groups remain in scope.

## Native Builder integration continuation

The preserved native 3C–3I engine, operations, inspector, responsive/motion/media, Brand Brain, Experience and publication paths are now integrated with the newer Builder shell. This resolves the source-reconciliation item from the previous checkpoint. Final CI: 5,855 passes / 168 explicit environment skips, zero lint errors and build. Local SQL: 51 passes; browser: 20 passes, 9 explicit optional timing skips. Native parent-page editing and source asset/font artifacts remain open; full 3J/provider/hosted/performance gates are not closed. See `audits/KEBU_NATIVE_INTEGRATION_2026-10-13.md`. Next execution slice: Studio save serialization and media/export acceptance. All 99 groups remain in scope.

- Local native UI harness shutdown: automatic fixture cleanup did not take effect in this session. Fixtures/configuration were independently cleaned and checked; harden shutdown and add explicit cleanup completion evidence before treating cleanup as automated. Functional browser gate: 20 passed, 9 timing probes skipped.

## Studio reliability checkpoint — October 13, 2026

Local save/export acceptance passed for K004/K047/K048/K049/K096: serialized design/video saves, independently serialized newest-draft caching, explicit recovery conflicts, honest storage errors, missing-media refusal, actual PNG/PDF/ZIP and playable WebM/audio, plus CSP media repair. Full CI: 5,865 passes / 168 environment skips; browser: 12 passes / zero skips. See `audits/KEBU_STUDIO_RELIABILITY_2026-10-13.md`.

Studio remains IN PROGRESS. Next: isolated authenticated ownership/collaborator/version-history/source-refresh/upload acceptance; advanced K048/K049 capabilities and legacy page-timeline soundtrack mixing. Then proceed through the other original modules. No 99-group item is closed wholesale by this local gate. No production or remote branch changes.

### Studio/platform continuation — October 14 UTC

See `audits/KEBU_STUDIO_PLATFORM_CONTINUATION_2026-10-14.md`: 18 local browser journeys and 23 isolated SQL assertions verify history ordering/restoration, sharing failure handling, upload receipts/container detection and ownership protection. Linked-design refresh is now conditional on its final write. Rooms unauthorized deletion no longer reaches privileged storage; Library revocation receipts and Mail origin checks repaired. Full CI passed (5,898 tests / 168 explicit skips, zero lint errors and build). New identity-guard migration remains source-only.

Preserve existing Mail/Browser/Library/Calendar/Rooms implementations: their older “not found” recovered-audit notes were corrected to source-present/acceptance-open, without closing full requirements. Next gates remain independent hosted users/storage/providers and broader original workflow completion. No release approval implied.

### Everyday tools and soundtrack continuation — October 14 UTC

Verified Library document creation/edit/save/reload, delayed saves, explicit conflicts, device recovery and failure handling through real local API/SQL boundaries. Calendar/Tasks retries, receipt confirmation, failure retention and keyboard completion also pass. Fresh gate: 10 browser journeys, 54 SQL queries and 8 additional policy assertions. Studio gate: 20 browser cases, now including audible legacy page-timeline soundtrack export and missing-audio refusal. Full CI: 5,917 passes / 168 environment skips, zero lint errors, build. See `audits/KEBU_EVERYDAY_AUDIO_2026-10-14.md`.

The queued local legacy soundtrack omission is repaired. Work-item identity guard remains source-only. Full Docs/Sheets/Slides, bookings/connected calendars, advanced Studio and all other original scope remain open; preserve current implementations. Hosted QA organization/cost selection is needed before resource creation; the concrete plan is `audits/KEBU_HOSTED_QA_PLAN_2026-10-14.md`. No production change or release approval implied.

### Builder and preserved-stage acceptance — October 15 UTC

Page mutation receipts, navigation-sync failure reporting, phone/keyboard page actions and native QA source isolation repaired. The combined native gate passes 27 browser cases; an additional opt-in run passes 19 with all nine 100/500/2,000-node desktop/tablet/phone timing probes enabled. Network SQL ownership/visibility/trust gate rerun: 18 passed. Final local CI on Node 20.20.2 and Node 24.19.0 passed 5,929 tests / 168 skips, zero lint errors and a 221-page build. The final combined native suite passes 148 cases with zero skips/unexpected/flaky, including all 18 timing probes. Exact source/runtime/evidence are recorded in `audits/KEBU_BUILDER_ACCEPTANCE_2026-10-15.md`.

Extended testing found the preserved 3H authoring components/APIs were not connected to `/studio/brand` after reconciliation. Restored the completed Brand Brain page wrapper and preserved the newer original DNA editor byte-for-byte at `/studio/brand/legacy`; this repairs integration without restarting 3C–3I. The extended suite verifies the original native editing/Brand Brain/Experience cases, actual Publish-button/local-SQL receipts and the repaired appearance scope. Full hosted/provider/release acceptance is still open.

Read-only production migration/catalog parity confirms the checked native functions/tables and identity guards are absent, with older Network/Rooms policies still present. Do not treat local repairs as live. The QA cost tool is unavailable (`get_cost` not returned by Supabase `tools/list`); no resource/cost confirmation was possible and production was not changed.

Remaining queue includes independent hosted users/storage/provider acceptance, full 3J, native nesting/assets/fonts and original ecosystem products. Review the October 10 non-native checkout-expiry/digital-delivery changes against the newer platform worker before integrating those overlaps; do not wholesale replace scheduling or commerce logic. Pricing/audience conflicts remain explicit; targeted history recovery found no newer direct resolution and no separately approved Plus plan.

### Verified handoff import and Network recovery — October 15, 2026 UTC

The five continuation commits (`d8adb37`..`1771ce6`, previously local-only in a separate ChatGPT workspace) were imported via a verified git bundle onto `work/kebu-completion-audit-oct13` at the required baseline `e5cf037`. Bundle validity, prerequisite, head commit, and the four reference documents were independently re-verified byte-for-byte before import, not assumed from the handoff's own claims. The previously reported later checkpoint `d1de127` remains unavailable and is not relied upon.

Node 22.22.2 is the only runtime available in this environment; this is supplementary coverage, not a substitute for the previously documented and still-required Node 20.20.2 verification, which has not been re-run here and remains outstanding.

On Node 22.22.2: typecheck passed (0 errors) and lint passed (0 errors / 348 warnings — matches the historical count). The full `npm run ci` chain (`typecheck && lint && test && build`) is **BLOCKED**: it stops at the `test` step, which fails 3 of 379 test files — the hosted QA-harness suites `builder-qa-authz`, `builder-qa-isolation`, `builder-qa-rpc`. These correctly detect `SUPABASE_QA_DESIGNATED=true` and attempt a real Postgres connection to the QA project, which fails on DNS/connect because this container's outbound network policy blocks the QA Supabase host — the same gate established earlier in this session, not a code regression. The remaining 5,929 of 6,097 tests pass with 168 skipped, matching the historical count. Because the chained script cannot proceed past `test`, `build` was run as a **separate, independent command** (not as part of the `ci` chain) and passed (exit 0, 221-page build). The full CI gate therefore remains blocked pending hosted QA access; typecheck, lint, and the separately-run build are the only gates confirmed green.

The two untracked Network QA drafts (`scripts/verify-network-persistence-local-ui.mjs`, `tests/platform/network-persistence.local.spec.ts`) were not assumed verified. Running them for real (actual Next.js route handlers, actual SQL/RLS via PGlite 0.5.8 — added as a devDependency, it was referenced by this and other existing local-QA scripts via an environment-variable path but was never declared in `package.json`, a pre-existing gap now closed; real Chromium) found two genuine, previously unreported defects and fixed both:

1. `app/network/join/page.tsx` — form fields and need-toggle buttons stayed enabled while a submission was in flight; only the submit button was disabled. A user could edit or re-trigger fields mid-submission. Fixed: every field and toggle button now disables while `loading`.
2. `app/network/page.tsx` — the directory card rendered the member's name as a plain `<p>`, with the headline as the card's only heading, making names unreachable by heading-based navigation (including for screen-reader users). Fixed: the name is now the card's `<h3>`; the headline is a `<p>`.

One test-only issue was also fixed in the draft spec itself (not the app): its `getByRole('alert')` locator ambiguously matched Next.js's own `#__next-route-announcer__` (role=alert), a legitimate accessibility feature that was correctly left in place. Narrowed with `.filter({hasText: 'confirmed saved'})`.

Final result: four browser cases passed (0 unexpected, 0 skipped, 0 flaky), 18 SQL queries recorded by this harness. This is a distinct measurement from — not equivalent to, and not a re-confirmation of — the historical "Network SQL ownership/visibility/trust gate: 18 passed" figure in `KEBU_BUILDER_ACCEPTANCE_2026-10-15.md`, which was a separate 18-assertion ownership/RLS test run; the two figures are both 18 by coincidence, not because they test the same thing. Evidence: `audits/evidence/kebu-network-persistence-oct15.json`.

This closes the loopback/local-fixture gate for Network persistence; it does not establish hosted Supabase Auth/Data-API/RLS acceptance (still blocked by the same QA network-policy/cost-tool gates as `KEBU_HOSTED_QA_PLAN_2026-10-14.md`). No production or remote-branch changes; no push, merge, or deploy.

### Network multilingual slice (English/French/Wolof) — October 15, 2026 UTC

Inspected existing locale infrastructure before building anything new: `lib/locale.ts` + `app/components/locale-context.tsx` (`LocaleProvider`/`useLocale`) is already mounted app-wide via `app/layout.tsx`, with a generic `UI_STRINGS`/`t(lang,key)` dictionary (17 languages) and a per-feature micro-dictionary precedent in `lib/create/maylecor-site-i18n.ts` (already scoped to en/fr/wo). Reused both patterns rather than inventing a third: added `lib/network/network-i18n.ts` (a Network-specific EN/FR/WO dictionary plus `needLabel`/`stageLabel`/`sectorLabel` helpers that translate only the *displayed* label — the stored/transmitted enum value stays the canonical English string from `lib/network/types.ts` in every language, verified by intercepting the real POST body in French).

Found and fixed two real defects in the existing locale infrastructure itself while wiring this up, before any Network-specific translation:

1. `app/components/locale-context.tsx` — `LocaleProvider` rendered `<>{children}</>` before its localStorage-read effect ran, then switched to `<LocaleContext.Provider>{children}</LocaleContext.Provider>` once ready. That Fragment→Provider type change at the same tree position forces React to unmount and remount the entire subtree below it once per page load — exactly the "remounts children / discards drafts" risk flagged for this task. Fixed: the Provider is now always rendered; `ready` state removed entirely (nothing external depended on it). Also wrapped every localStorage read/write in try/catch so blocked storage (private browsing) degrades to in-memory English/USD defaults instead of throwing.
2. `app/components/language-bar.tsx` — `LanguageBar` (the actual language-switcher UI) had never been mounted anywhere in the running app before this slice. The moment it was mounted on `/network/join` and clicked for real in the browser harness, its dropdown options were unclickable: its root stacking context was `z-40`, lower than `Nav`'s sticky header at `z-50`, so the header visually and interactively covered the dropdown. Found by an actual Playwright click failing, not by inspection. Fixed: raised the root to `z-[60]`.

Mounted `<LanguageBar variant="builder" />` (language-only, no country/currency — those aren't relevant to Network) on both `/network` and `/network/join`, translated every label/placeholder/button/error/success/empty-state string on both pages, and changed `lib/network/directory-loader.ts`'s error field from a hardcoded English sentence to a stable reason code (`"signed_out" | "load_failed"`) so the component — not the loader — owns localization (one existing unit test updated to assert the new code instead of the old sentence).

Verified for real, not assumed: extended the recovered Network browser/SQL harness with 4 new cases — French end-to-end submission with enum-value preservation, language-switch-mid-draft (the direct regression test for the remount fix), Wolof rendering plus the existing "AI translations are approximate" + Wolof-correction-callout banner (`HIGH_QUALITY_LANGS` already excludes `wo` — reused, not reinvented), and blocked-storage resilience. All 8 cases (4 original + 4 new) pass: 0 unexpected, 0 skipped, 0 flaky, 16 SQL queries. Full CI re-confirmed unchanged after these edits: typecheck 0 errors, lint 0 errors/348 warnings, vitest 5,929 passed/168 skipped (same 3 pre-existing hosted-QA-only failures, not new), build exit 0. Evidence: `audits/evidence/kebu-network-i18n-oct15.json`.

**Wolof is explicitly not linguistically accepted.** The `wo` strings in `lib/network/network-i18n.ts` are a best-effort assistant translation, not reviewed by a fluent native speaker — this is stated in the file itself and the test only verifies the strings render and that the existing unreviewed-translation notice correctly appears, never that the wording is correct. Do not treat this passing test suite as Wolof sign-off.

Scope still open: this slice covers only `/network` and `/network/join`. The rest of the app's EN/FR/WO coverage, the pre-existing global `UI_STRINGS` dictionary's broader key set, and the unrelated `maylecor-site-i18n.ts` page were not touched. Hosted Supabase acceptance for any of this remains blocked as above. Required Node 20.20.2 verification remains outstanding (only Node 22.22.2 is available in this environment).

### Checkout-expiry / digital-delivery reconciliation — October 15, 2026 UTC

Investigating "reconcile October 10 checkout-expiry/digital-delivery work with the current worker" found the real question was an architecture choice, not a merge: an unmerged branch (`origin/claude/alkebulan-files-migration-aty6p0` / `origin/work/kebu-ecosystem-ux`) independently built a job-queued commerce-hardening design (its own `platform_jobs` table/RPC, multi-line checkout reservations, a `shop_refunds` table, worker handlers for `digital.fulfill` and `order.cancel_gift_card_failed`) that duplicates and would conflict with this branch's own already-live `platform_jobs` infrastructure (`20260920040000_platform_durability.sql`, `lib/platform/jobs.ts`, `lib/platform/worker.ts`). Put the choice to the user — job-queued vs. keep synchronous-inline — rather than deciding unilaterally on money-handling code; they chose job-queued.

Implemented the part of that choice that is concretely applicable to what already exists: durable retry for digital-product fulfillment, riding the existing (not duplicated) `platform_jobs` worker.

- `lib/shop/digital-downloads.ts` — split into `fulfillPaidDigitalOrder` (raw core; now throws on a genuine failure instead of the original code's silent swallow-and-drop) and `fulfillPaidDigitalOrderDurable` (webhook-facing: tries the core, and on failure enqueues a `digital.fulfill` platform job instead of throwing, so a delivery hiccup never turns an already-successful payment webhook into a 500).
- `lib/platform/worker.ts` — `executeJob` now handles `digital.fulfill` by calling the **raw** core directly, so a real failure flows into the existing `failPlatformJob` attempt-count/backoff/dead-letter path rather than being swallowed.
- All 6 call sites across `app/api/webhooks/{paystack,wave,paypal,joko}/route.ts` switched to the durable wrapper.

Caught a real bug before it shipped: an intermediate version had the raw core itself catch-and-self-enqueue on failure, which would have made the worker's own retry of a `digital.fulfill` job silently re-enqueue a fresh job (same idempotency key, no-op on conflict) while the *original* job got marked "succeeded" even though delivery never completed — a silent permanent-failure-reported-as-success defect. Fixed by cleanly separating the throwing core (used by the worker) from the non-throwing wrapper (used by webhooks) before any test ran.

Added `tests/shop/digital-downloads.test.ts` (6 cases: core success/idempotent-reuse/throws-on-db-failure/throws-on-email-rejection, wrapper never-throws-on-success/enqueues-on-failure) and 3 new cases in `tests/platform/worker.test.ts` (digital.fulfill success, failure goes through `failPlatformJob` not a re-enqueue, invalid payload rejected). Updated the two existing webhook tests that mocked the old call target. Full suite: typecheck 0 errors, lint 0/348 warnings, vitest 5,938 passed/168 skipped (+9 vs. prior checkpoint, same 3 pre-existing hosted-only failures), build exit 0. Evidence: `audits/evidence/kebu-digital-fulfillment-durability-oct15.json`.

**Deliberately not ported**, with reasons recorded in the evidence file rather than silently dropped: multi-line checkout reservations, `cancel_shop_order()`, `shop_refunds`, and gift-card-cancel compensation. These depend on deciding whether/how the existing cart-based multi-item order path (`lib/shop/cart-order.ts`, pre-dates the Sep 19 reservation work, does not use the TTL-reservation system at all) should unify with the TTL-reservation checkout, and on defining what "cancelling an already-paid order" means operationally — product questions, not mechanical migration ports. Recommend treating that as its own vertical slice with an explicit product decision first.
