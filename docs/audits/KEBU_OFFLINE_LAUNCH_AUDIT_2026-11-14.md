# Offline launch audit — November 14, 2026

This is a bounded continuation of the existing closeout register, not certification of all KEBU products. Authoritative source checked: `8a026538d70b3d1c47ca61e237dd900fc86fe4a1`. Claude's integration, original authors, Cloud verification and the November 12 repairs are preserved. Existing uncommitted closeout and meetings work was left intact.

## New repairs

1. **Migration version collision.** `npm run migration:check` failed on two `20261109010000` versions. The Calls created-flag migration is now `20261109010001_room_call_join_created_flag.sql`, with identical SQL. It still runs after mesh creation and before the call-cap migration that replaces its overload. Updated the SQL acceptance loader. No historical database ledger was changed. Before any hosted rollout, compare that environment's actual ledger, especially if someone applied either colliding file manually.
2. **Missing local CI gate.** GitHub CI checked migration hygiene, but `npm run ci` did not. Local CI now includes it, so an otherwise green typecheck/test/build cannot conceal duplicate versions.
3. **Invitation HTML injection.** Business names were inserted as raw HTML in invitation emails. Dynamic text and the generated link are escaped; the plain-text alternative retains readable original content. The regression uses an injected link and verifies it cannot become an email HTML link. No email was sent.

## Verification

- Migration hygiene: **144 unique versions**, passing. Renamed SQL compared byte-for-byte with its original Git blob.
- Focused invitation, Calls SQL/access and Cloud SQL/RLS checks: **15 passed**, zero skipped, four files. SQL runs against disposable PGlite with minimal prerequisite schemas, not managed Supabase.
- Full local CI: TypeScript passes; lint has **0 errors / 368 warnings**; unit tests have **7,183 passed / 507 explicit environment skips / 0 failures**. Production build also passes; the complete `npm run ci` exits zero.
- Browser acceptance **not established in this pass**. The packaged Chromium produced zero-height text even for a standalone plain paragraph; the contact confirmation failure therefore cannot establish an application defect. System Chromium could not start because its singleton socket was denied by this environment. Do not turn the failed attempts or five unrun contact cases into passes. Temporary diagnostics were removed and fixture cleanup completed.
- Receipts: [execution summary](evidence/offline-launch-nov14/summary.json), [focused checks](evidence/offline-launch-nov14/focused-checks.txt), [browser limitation](evidence/offline-launch-nov14/browser-attempt.txt). These results are local and do not verify live payment/mail delivery, managed Auth/Realtime or production configuration.

## What still needs finishing

| Existing workstream | Status | Next closing evidence |
| --- | --- | --- |
| Source integration / REL01 | Verified at the source base above | Preserve this history and sync reviewed repairs to the shared branch; source integration alone is not launch approval. |
| Database rollout / DAT01 | Local checks only; hosted pending | Reconcile the full pending migration inventory with the target ledger, preserve a recovery snapshot, then run approved QA fresh/upgrade and wrong-user checks. The four November 12 migrations are not the entire backlog. |
| Team invitations / ACC01 | Injection repaired; acceptance race still open | Serialize invitation revocation/expiry, membership changes and acceptance in a transaction; prove concurrent cases and real two-account journeys. The prior duplicate-membership fix remains preserved. |
| May website / MAY01 | Source candidate; visual/content acceptance open | Restore the actual saved-project snapshot without reseeding; verify desktop/phone, real approved media, navigation and contact. Incoming copy, biography wipe and remaining Behance scenes are explicitly unfinished in the motion audit. A template test is not the artist's live project. |
| Calls, Docs, Sheets, Slides and Cloud | Prior local evidence preserved | Verify private Realtime policies, two-account permissions, save conflicts, actual storage serving and browser/media behavior against an authorized hosted QA environment. |
| Commerce, marketplace and providers | Partial local evidence; live acceptance open | Real provider sandbox checkout, duplicate notification, refund/payout reconciliation, paid asset delivery and mail delivery. No invented provider success or money movement. |
| Vercel publication | Deferred at the user's direction | Wait for the usage reset, then recheck the actual account restriction, deploy the schema-compatible reviewed source and verify every intended public domain. No reset date is inferred from old messages. |

The [full closeout register](../KEBU_CLOSEOUT_REGISTER.md), 99 recovered groups and 25 Studio acceptance groups remain authoritative for broader scope. This pass does not remove them or introduce another feature batch. Developer marketplace sequencing still follows dependable first-party products; separate ecosystem companies remain separate.

## Hosting decision

Shared-project restoration was explicitly approved on November 14. The unpause API accepted the request, but subsequent public checks still returned `402 DEPLOYMENT_DISABLED`. Dashboard authentication did not complete. The latest user direction is to work offline until Vercel resets. Restoration approval is no longer missing; do not repeat that old blocker or start another sign-in/payment loop. No deployment, plan upgrade, hosted migration, DNS change or paid provider call occurred during this audit.
