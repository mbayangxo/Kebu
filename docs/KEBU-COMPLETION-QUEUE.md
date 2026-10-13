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

Desktop signed-out directory and join rendering checked on QA Preview. Acceptance still open: mobile visual and error checks; authenticated create → directory → refresh; two-owner hosted permissions; hosted migration and matching preview configuration; production deployment. Keep IN PROGRESS until these pass.

External gate: production was restored and user login succeeded; separate QA was paused to stay within the free active-project limit. Do not pause the working production database or buy a hosting upgrade to manufacture a QA pass. Provider credentials cannot be invented. Inspect connected-account access before requesting anything from the user.

## Session-boundary follow-up

The prior directory only loaded on mount/retry and did not listen for auth changes. A cross-tab sign-out or account switch could leave its member list on screen, while an older response could refill it. The directory now clears its state on session changes, cancels old requests, rejects late responses by request generation, and reloads on a new identity. Repeated events for the same identity do not reload. Unit regressions cover these boundaries; genuine two-session hosted verification is still pending.

QA restore was attempted again through the connected account. Supabase rejected it because owner/admin `mbayangxo` has reached the two-active-free-project limit. No other project was paused, deleted or upgraded. This is a concrete hosted gate, not a code/test failure.

## Core follow-up: Builder appearance (October 13)

Auto / Light / Dark is implemented for the top bar and tool rail using a device-local store; 29 focused tests and full CI pass. The fixture required by a pre-existing publishing test was recovered and tracked. Preview-only actual-component desktop/phone visual and interaction QA passed, including color isolation, reload and cross-tab persistence; running production fixture gate returned 404. This is fixture QA, not a signed-in real-project pass. K033 remains IN PROGRESS: inspector/portal/workspace/app-wide migration, real authenticated desktop/mobile flows and production rollout still open. All four requested groups above remain in scope.

## Core follow-up: native inspector and portals

Scoped native inspector colors and an explicit mobile Add section sheet opt-in are implemented; Drawer/FullscreenPanel support the opt-in without changing existing Light defaults. Stable dialog heading IDs and 44px close controls replace the previous random IDs/small targets. Full CI passes with 5,591 tests / 268 explicit skips. Actual-component browser edit/focus/close/scroll-lock/theme-update QA is next. Legacy inspector/Yande/workspace/app-wide appearance and genuine authenticated acceptance remain IN PROGRESS; all four groups remain open.

Native/portal actual-component QA passed on `7d434db9`, including synthetic text/motion edits, phone picker callback and focus/scroll cleanup. It exposed a media-control foreground inheritance bug; the repair adds explicit scoped colors without changing uploads or API logic. Full CI now passes 5,593 tests / 268 explicit skips (34 focused cases). Final media-control deployment inspection remains next; real account/project/provider acceptance remains open.

## Native/portal appearance verification result

Actual-component desktop/phone fixture checks passed through source `d794921a`, including native text/motion operations, section callback, focus/close/scroll cleanup, live theme changes, media-label repair and expected signed-out feedback. Upload label contrast improved from 1.04:1 to 13.21:1 Dark / 18.33:1 Light; top native actions wrap with an 8px gap. Final full CI remains 5,593 passing / 268 explicit skips. No real account/profile/project save, upload or provider transaction is claimed. K033 still needs Yande, legacy inspector, workspace/app-wide coverage and authenticated rollout acceptance. All four groups remain open.

## Core follow-up: Yande controls verified in QA (October 13)

Desktop and phone Yande input/proposal panels now use scoped appearance tokens. One authoritative Apply path, selection and busy locks, prompt retention, readable themes, 44px targets and phone focus/scroll/dismissal behavior passed actual-component QA. Full CI: 5,599 pass / 268 explicit skips. Evidence: `evidence/builder-appearance/yande-verification.json`. This closes the isolated Yande appearance/approval-control slice; real AI generation and authenticated persistence are still open. K033 remains IN PROGRESS for legacy inspector/workspace/app-wide migration and real-account rollout. All four groups remain open.

## Core follow-up: confirmed saves and recovery (October 13)

Save safety now reads current pending/queued facts after flushing. Preview/Apply/Publish share a synchronous action lock; settings/theme join Save draft; failed settings prevent publish; matching write receipts are required; an unconfirmed refreshed draft cannot clear history or re-enable editing. Leaving checkpoints pending drafts and atomic history. Terminal recovery is project-scoped and failed storage retains the newest session queue with explicit durability limits.

Full CI: 5,640 pass / 268 explicit skips, TypeScript, zero lint errors / 277 warnings, build. Actual-hook desktop/phone QA passes real signed-out denial, draft retention, zero blocked action callbacks, local checkpoint, thrown-flush recovery, and 44px/no-overflow checks. These do not certify authenticated save/reload/publish or provider success. See `evidence/builder-appearance/save-recovery-verification.json`. All four groups remain IN PROGRESS.

Account blockers were freshly read: production Supabase healthy; QA paused; provider credential names still missing from deployment metadata. No unrelated project pause, billing change, production schema/main deployment, or invented credentials. The existing QA scheduler isolation remains unchanged. Genuine hosted acceptance and provider setup remain release gates.
