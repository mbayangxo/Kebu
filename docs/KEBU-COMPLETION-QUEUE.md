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
