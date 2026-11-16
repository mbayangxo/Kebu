# QA foundation repair and native race acceptance — November 16

Base: `00ae1c526084487204875edd0838f2ed5c72d838`. User authorized the audit closure plan, including the reviewed QA repair. Production hosting, artist content and real-money transfers remain paused.

**Current status: exact batch prepared and tested; HOSTED APPLICATION BLOCKED BY EXPIRED SUPABASE CONFIRMATIONS.** The provider returned `status: expired` twice. Those attempts used digest `56ccc223a7ecd0c7de3570cffe80f88718ff766d4b8780f50f0563f44a93e69c`; final trailing-whitespace normalization and regenerated source-checksum comments produced the reviewed digest below, with unchanged SQL statements. Native 3-run and exact PGlite-batch acceptance passed again against the final bytes. After the first expiry, readback confirmed no workspace/company tables, no private schema and no convergence migration entry. The second attempt also returned expired; final readback again showed no workspace/company tables or private schema, zero convergence entries and the unchanged 141-entry ledger. No hosted write succeeded. This is not a lack of user authorization and is not a request to restore production or pay for an upgrade. Do not bypass the provider confirmation with another SQL channel or keep retrying unattended.

## Concrete repair package

- CLI-created migration: `supabase/migrations/20261116060247_qa_company_foundations.sql`.
- Reviewed digest: `99ee2f63c9c487a0498a495a802913a51c464b642e12720ef15ef3eea1302800` (SHA-256).
- Explicit source/table manifest: `supabase/rollouts/qa-company-foundations.json` — 37 inputs, 47 missing public tables, including all four November 12 repairs and the ordered company workflow.
- Reproduction: `node scripts/qa-company-foundations.mjs --write`; verification: `node scripts/qa-company-foundations.mjs --check`. Migration hygiene in local/remote CI now verifies the generated bundle matches its source. Do not regenerate and apply an unreviewed changed bundle under this receipt.

The bundle supports exactly two states: all of its new tables absent (the inspected legacy QA path), or all present (preserving completed data while reapplying explicit permissions/forward fixes). Mixed installations fail closed. Existing Cloud buckets without matching foundation metadata also stop the repair, so a legacy bucket is not repurposed silently. This is a targeted convergence migration, not permission to blindly replay archived bundles or run `db push` against an unreconciled history.

The old two-person-call/table DROP is omitted only on the guarded all-new path. Existing call history is never dropped. The shared `set_updated_at` helper is preserved instead of replacing its protected search path with an older definition. Library, workspace/Docs, Rooms/chat/files/calls, worker profiles/hiring/reviews, optional app installs, Sheets/Slides, private Cloud storage, company operations and durable notifications are backed by their actual source schemas. The notification slice avoids overwriting the QA platform_jobs schema that already exists.

Anonymous grants and authenticated TRUNCATE/REFERENCES/TRIGGER privileges are removed from the new tables. Existing column-level profile/listing restrictions are retained; only the required workspace/room/chat/file DML grants are added. Service-role grants are explicit for backend operations. Private HR/pay and verification writes retain their narrower RLS/RPC boundaries. All of this requires managed acceptance after application; source policy presence is not a certification.

## Repairs found while rehearsing

1. **Company roster referenced a nonexistent personal public ID.** The original test fixture invented `user_profiles.public_kebu_id`, hiding the error. Removing that column reproduced the failure. The roster now returns no fabricated personal ID and uses the actual profile name; fixture and source are corrected. A forward replacement is included in the convergence migration for databases where the older company function already exists.
2. **First-call creation was not serialized.** Joining now locks the parent room before looking for an active call. A partial unique index enforces one active call per room. Last-leave logic uses the same parent-first lock order. Existing duplicate active history would fail the index creation instead of being silently deleted. The native race test proves simultaneous first callers receive the same call ID.
3. **Missing foundations had hidden privilege hazards.** Rehearsal starts with broad managed-style default table privileges and verifies anonymous denial, denial of authenticated TRUNCATE, working restricted roster/project/call operations, repeatability and preservation of existing profile/helper definitions.

## Local and native evidence

`docs/audits/evidence/company-native-races-2026-11-16.json` records three successful required iterations, five scenarios each, zero skips/failures. The server is a real PostgreSQL 17.11 native process with separate backend PIDs and observed `pg_blocking_pids` barriers, not PGlite concurrency simulation. It listens only on permitted loopback TCP using PostgreSQL's standard empty `unix_socket_directories` setting. No workspace security settings or hosted firewall rules were changed. Test-only binaries were obtained outside the repository; application dependencies were not changed. Each disposable test database was cleaned up and the server stopped.

Scenarios:

- Concurrent acceptance of one invite creates one membership and one audit event; the second acceptance is idempotent.
- Revocation holding the invitation lock defeats a waiting acceptance.
- Removing the inviter defeats a waiting stale grant.
- Two simultaneous first callers share one active call.
- An interview and shift cannot both reserve the same participant/time under concurrent requests.

The first native run passed four cases; the booking fixture tried to supply a listing ID that the intentionally narrow authenticated INSERT grant does not allow. The fixture was corrected to use the actual API's database-generated ID path; permissions were not broadened to make the test pass. The final five cases then passed in all three iterations. Native CI now requires those five cases in three runs with zero skips and includes their disposable namespace in cleanup checks.

Final focused PGlite company suite: 15 passed; five native cases intentionally skip in that separate WASM run and were executed in the native job above. The exact convergence batch is exercised, including preservation and repeat application; partial installation is rejected. Earlier rehearsal exposed a missing Builder-project FK stub in the notification fixture; the fixture now represents the projects table known to exist in QA. These fixtures are not managed Supabase Auth/Storage/Realtime services.

Full local CI passed with `NODE_OPTIONS=--max-old-space-size=6144 VITEST_MAX_WORKERS=4 npm run ci`: 150 canonical migration versions plus generated-bundle consistency, TypeScript, lint (zero errors / 374 warnings), 7,193 repository tests passed with 527 explicit environment skips, and optimized production build. Five native scenarios were executed separately in all three required runs, not represented by global-suite skips. The final workflow change mirrors those three already executed iterations; YAML syntax was verified separately. After full CI, trailing-whitespace/source-checksum-comment normalization was followed by another complete three-run native check, exact-batch PGlite check, generation-consistency check and diff check. This receipt does not extend native acceptance to money reservation, every media race, actual camera devices or a complete platform security review.

## Hosted boundary and next execution

Target verified: `skqnxyaeimvbyrmdfzvk`, Kebu-qa, ACTIVE_HEALTHY, PostgreSQL 17.11.0.003. Before change, all selected foundation roots were absent. Existing business, membership, invitation and project row counts were zero. Profile/asset/deployment/Storage object digests and the existing helper/invite-policy definitions are preserved in `evidence/qa-company-foundations-before-2026-11-16.json`; no account records or credentials are included. No existing production data was inspected or changed.

Supabase's required migration confirmation must be acknowledged before the exact batch can execute. Once that provider confirmation is available: apply the reviewed digest to QA only; verify all manifest objects, private helper access, column privileges, ownership constraints and Realtime policies; compare preservation digests and helper definition; inspect advisors and actual migration ledger. Record the version actually assigned by the provider and keep it traceable to this bundle rather than fabricating entries for historical scripts.

Then exercise authenticated QA API/browser journeys with separate accounts, installations, hiring/onboarding, shared docs and private HR/pay records. Actual managed Auth, Storage object operations, Realtime subscriptions and camera/microphone behavior are still outstanding. The earlier current workspace Chromium restriction is unchanged; native SQL success does not fix it.

JOKKO disbursement still requires the real outbound contract, atomic funding/entitlement reservation, an outbox and uncertain-result reconciliation. No payout engine or transfer has been introduced here. May's approved content and missing scene transitions remain open; Vercel remains deferred. Do not turn the QA-only product gates into production enablement as a side effect of this repair.
