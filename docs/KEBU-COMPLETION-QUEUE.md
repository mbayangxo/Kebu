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
