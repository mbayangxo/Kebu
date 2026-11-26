# Kebu completion reconciliation — October 13, 2026

Status: **IN PROGRESS. Local repairs verified; not a release approval.**

## Preserved baselines

- Working branch: `work/kebu-completion-audit-oct13`, starting at `e5cf0377335c8f898c9ec2d498c5a47915b7b7c9`.
- Connected October 10 QA branch: `qa/kebu-ready-oct10`, independently read head `6267a80d6cd3ed4d253adc95a1b0fe2458d52462`. The preserved local branch `qa-save-recovery-verified-oct13` has that exact head.
- Common ancestor: `71815f99c50022482e545e22e1f6e040ee1cafe4`.
- QA has 20 commits after the common ancestor, including the imported native Builder checkpoint, payment/security repairs, Network persistence, appearance and save recovery. The current working branch has extensive parallel Studio, Mail, Browser, Search, Rooms and platform work. Presence of these products in source is not completion evidence.
- Full source comparison spans 1,074 paths. Applying QA wholesale produced overlapping conflicts in Builder, Studio, payments, shared authorization and scheduling. That attempted patch was fully discarded in the new worktree before selecting compatible changes. The original checkout and its existing modified portrait asset were untouched.
- Completed native stages **3C–3I are preserved, not restarted**. Their source is retained in QA's history. The working branch does **not** yet contain their complete native implementation. Reconciliation remains open; a passing working-branch CI does not prove native integration.
- Authoritative master register: `../KEBU-RECOVERED-REQUEST-AUDIT.md` (99 groups), plus `../KEBU-COMPLETION-QUEUE.md`. The recovered audit is historical: its missing-product findings must be rechecked against the newer platform branch, not silently repeated as current facts.

## Integration completed in this continuation

Adapted the Network repairs from `2219f5f6`, `425d36ad` and `d7be9aae`. The directory now reads authenticated visible rows, uses actual counts, clears old responses on session changes, and handles configuration failure without an unhandled client exception. Join success requires a matching confirmed profile ID. Server errors remain sanitized. Owner identity and trust flags cannot be supplied by the client.

Imported Network ownership migration `20261011005205_network_profile_ownership.sql` unchanged; **not applied remotely**. Adapted its disposable verification script to the current branch's archived baseline migration path. Existing migration archival layout was preserved.

Ported Builder write-receipt validation from the QA checkpoint into the existing autosave hook. Missing or unrelated section receipts and malformed chrome receipts cannot clear pending saves. This is a compatible safety repair, not the full QA history/offline recovery integration.

Studio design saves now compare the observed `updated_at` in the UPDATE itself. Video saves with version tokens also put the observed timestamp on the scoped UPDATE. An intervening write returns a recoverable 409 rather than silently overwriting. Failed/unconfirmed design deletion cannot claim success. The design editor requires explicit edit permission and a matching ID/valid server timestamp before acknowledging save; it no longer invents a timestamp. Its save-only button is labelled **Save draft**.

## Fresh verification

| Check | Result | Boundary |
| --- | --- | --- |
| Final `npm run ci` | PASS, exit 0 | Working branch; no real provider credentials |
| TypeScript | PASS | Current combined source |
| Lint | 0 errors, 296 warnings | Existing warnings retained; no suppression changes |
| Full tests | 1,011 passed; 250 files | Current branch inventory differs from native QA inventory |
| Production build | PASS; 219 generated pages | Local build only |
| Focused Network / Studio concurrency / Builder receipts | 60 passed | Handler responses, version predicates, authorization and save receipts |
| Network migration, disposable PGlite 0.5.8 | 18 passed | Actual SQL roles/visibility/trust/retention; not hosted gateway auth |
| Recovered 3J content + gate tests | 28 passed | Exact QA source; no stages restarted |
| Recovered 3J migrated database suite | 7 passed, zero skipped | Actual local SQL persistence, ownership, journal and publication |
| 3J real-provider test | SKIPPED / BLOCKED | No real AI call or generated-quality sign-off |

The first local build failed because its dependency directory was a symlink outside the worktree's build root. Dependencies were copied into the isolated checkout; final full CI passes. No dependency manifest or lockfile was changed. Separate QA runtime dependencies were installed outside the repository for disposable SQL/browser checks.

Desktop (1440px) and phone (390px) running-app error/retry/form checks passed against actual unavailable-auth API responses: drafts retained, no false success, no horizontal overflow and no uncaught page errors. Builder/Studio APIs return 503 rather than granting access when unconfigured. Screenshots were inspected locally, not stored as deliverables. Reusable runner: `scripts/verify-network-local-ui.mjs`; it clears child Supabase configuration so it cannot create real profiles. This is failure-path verification, not authenticated hosted success.

Browser inspection exposed global auth-client creation failures in Nav, sidebar and session keeper. Those shared boundaries now handle unavailable auth and failed sign-out; the profile loader rejects late pre-sign-out/account-switch responses. Four new behavioral regressions cover those states.

Local logs are retained in the parent session directory: `ci-final-verified.log`, `focused-final.log`, `network-sql.log`, `3j-check.log`, `3j-sql.log`. They contain no credentials. The QA 3J test run initially skipped seven local database checks; installing the disposable runtime and supplying its local path allowed all seven to execute and pass. The provider skip remains a skip.

## 3J decision

**Local implementation present; full 3J NOT COMPLETE.** The blueprint and QA status are preserved under `qa-oct10/` with the exact source identity above. Real generated reference fidelity/manual quality review, independent native database sessions, stable-host performance, authenticated hosted S8 and release/default decisions remain open. PGlite cannot certify multi-session native PostgreSQL races or hosted Supabase authentication.

## Next execution queue

1. Reconcile the native Builder into the newer Builder shell without discarding Studio/platform work. Review central create page, autosave, renderer, page/section/settings routes, shared authorization and migration paths individually. Retain QA production render guards and current production scheduler configuration. Do not replace `vercel.json` with QA's empty scheduler.
2. Re-run native save/history/publish, responsive/motion/media/Brand Brain/Experience and 3J browser suites on the integrated source. Do not rebuild 3C–3I or call absent native features complete from the current branch's 1,011 tests.
3. Close Studio autosave serialization/newest-draft preservation and real export/media editing journeys; the current CAS repair prevents loss but concurrent local requests may still surface a recoverable conflict.
4. Authenticate and verify Network create → discover → reload with two owners on an isolated QA database after approved setup. Keep the new ownership migration unapplied remotely until authorized.
5. Re-evaluate every recovered requirement against newer Mail/Library/Spaces/Rooms/Search/Browser/Work source; split broad groups into acceptance cases and run each complete user journey. Keep unsupported products and external-provider gates explicit.

No push, PR, merge, deployment, production query/write, production migration, billing change, project pause, or scheduler change occurred. Production remains untouched.

## Subsequent native integration checkpoint

The native engine and Builder integration queued above is now locally implemented and exercised. Preserve the earlier table as evidence for `d775bc53`; current integration results and remaining gates are in `KEBU_NATIVE_INTEGRATION_2026-10-13.md`. This updates source reconciliation; it does not change the blocked 3J release decision.
