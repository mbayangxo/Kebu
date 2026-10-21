# Hosted release verification — October 21, 2026

**Release blocked; production unchanged.** This is an evidence record and migration review handoff, not a completion or promotion certificate.

## Source and reconciliation

Candidate `7bab1a5de7a53330e48e6bf7e1c7027239330694` preserves authoritative Claude font work through `68b62904f3ef20e759c5d36d5d045bbc133e6434`, social/ownership reconciliation `bd82bf3e0d7af4d9c6536351442997e68da37079`, and payment adapter repair `45b27a24f3b2e356cbb7aab37b95666783fb2a6e`. Both sides of the completion-queue append conflict were retained. No author history was rewritten. Phases 3C–3I remain preserved. All five exact combined gates passed. Authoritative `work/kebu-completion-audit-oct13` was fast-forwarded from `68b62904` to exact `7bab1a5` with expected-head checking and `force=false`, then independently reread. The isolated feature branch retains the same checkpoint.

Before this reconciliation, bd82 passed CI39537851967, Builder39537851999, platform39537851894 and hosted Preview39538862495. The actual hosted job119021750286 records **533 passed, 35 explicit skips**. Its Vercel preview is READY. Adapter45b27a separately passed CI39538653828 and hosted39539112909. Those results do not certify the subsequently combined source or authenticated Supabase acceptance.

## Executed checks on the combined candidate

- Full local `npm run ci`: **exit0**, TypeScript/lint/test/finalized production build passed; **6,390 passed /298 explicit skips**, 400 files passed/43 skipped, zero lint errors/349 existing warnings. The default test run does not execute environment-gated database suites.
- Focused adapter/social/database-destination safety checks: **35/35**. No real provider requests.
- Migration hygiene: **95** unique canonical timestamps, no executable archived legacy bundles.
- Native PostgreSQL17.6 CI: **9/9 passed, zero skips**, [run39562571925](https://github.com/mbayangxo/Kebu/actions/runs/39562571925), job119097061892. Independent backend PIDs and actual blocking chains are observed for publication serialization, competing subdomain publication, stale draft detection, detached snapshots, duplicate reservations, shared/native/legacy allowance contention, owner isolation and rollback recovery. Both disposable databases were removed; the job independently checks cleanup and exactly nine passing tests.
- The first native run39562281127 passed five and failed four **before their lock barrier**, because the harness sent parameterized `BEGIN; SELECT` as one prepared statement. Splitting these on the same connection fixed the harness; all assertions and required cases remain. This was not a production test or a reason to weaken concurrency requirements.
- Exact combined remote CI39562571908, platform39562571894 and hosted Preview39563041972 succeeded. Builder39562571905 also succeeded: 63/63 browser cases, zero skips/failures/flaky, including the unchanged performance budgets. All five exact combined gates are SUCCESS. Latest hosted job119098581653 records 533 passes/35 explicit skips: 21 authenticated Builder journeys, five authenticated viewport cases, one draft-business flow and eight private May-fixture cases. No authenticated product acceptance is claimed from that green public preview suite. Preview deployment `dpl_BsV8tN7F8aUkNebyUa5UybqvPANF` is READY at https://kebu-rlrc3kihr-mbayangxos-projects.vercel.app for exact7bab1a5.

Native PostgreSQL uses actual migration SQL and independent connections, but its auth schema is a test fixture. It does **not** establish Supabase JWT gateway/session behavior. The nine cases close this bounded native publish/quota concurrency gap, not all 3J acceptance.

## Actual hosted findings

Supabase project `tnygqgcqlnlsmjpygrca` is ACTIVE_HEALTHY on PostgreSQL17.6.1.155. Connected project inventory exposes only this production project; an isolated hosted QA target is unavailable through the current connection. No paid branch was created, and production was not paused to free a slot.

The exact reusable `scripts/hosted-release-preflight.sql` was executed against production **read-only**. It reads catalogs, not user messages, does not execute application RPCs and makes no writes. Result: **22 failed prerequisites /37 checks**. Missing capabilities include:

- Native columns on projects/pages/sections, `kcd_node_types`, `creative_op_journal`, operation protocol, apply-node/apply-experience and native publish functions.
- Creative Assets marketplace/library, paid receipt provider/reference columns, worker profiles/job listings and Mail forwarding rules.

The production migration ledger has **63 entries**, latest `20260922012040_fix_studio_design_owner_returning_rls`. Comparing 95 canonical files finds four exact recorded versions, **37 same-name/different-version identities**, and **54 unmatched identities**. These are identity classifications, **not semantic equivalence or proof that all unmatched SQL is unapplied**. Actual schema/grants must decide. The checksum manifest is `evidence/hosted-release-oct21/migration-review.json`; blindly pushing the full chain or repairing history by names alone is unsafe.

Mail is **IN PROGRESS**, not absent. Current source has real provider delivery, inbound/event webhooks, personal/business mail, threading, attachments and forwarding. Production `mailboxes`, `mail_messages`, `mail_threads` and `mail_attachments` exist with RLS enabled. The platform-owned `kebu.africa` domain is **pending**, with `sending_enabled=false`, provider Resend, reputation warming. No email was sent. Shared mailbox/alias management and real external delivery acceptance remain open.

Search has `lib/search/indexer.ts`, `/api/cron/search-index`, `/api/me/search`, and a production `search_documents` table with RLS. This is an internal published-site/opportunity index; it does not complete the requested full crawler/index/ranking engine. Source inspection also confirms Network now queries visible database rows; the old static-directory finding is historical.

Production remains READY on `71815f99c50022482e545e22e1f6e040ee1cafe4`, deployment `dpl_8XQYFY2rAkDvmUZ1pmdZq8uJHFj2`. A cloud-browser visit reached Vercel protection with no authenticated session. The authorized Vercel connector fetch reached the real production login page, HTTP200; this verifies reachability, **not a signed-in Kebu journey**. Protection was not disabled.

## Concrete release sequence and remaining blocks

1. Finish exact candidate gates, preserve any newer authoritative commits, integrate without force, and reread the remote SHA.
2. Make an approved isolated hosted staging project available. Obtain its schema/history through supported authenticated tooling, reconcile the manifest with actual objects, and rehearse the ordered migrations there. Do not use production as a disposable test database or create paid infrastructure without cost authorization.
3. Verify ordinary ownerA/ownerB sessions through the actual browser/API/JWT gateway: create/edit/reload/history/publish, collaborator/revocation and stranger denial, Network, Mail internal round-trip/forwarding, Rooms/Library and failed-write recovery. Confirm persisted rows and cleanup of explicitly disposable staging fixtures. Skipped tests remain open.
4. Review the exact staged migration SQL, privilege differences, backfills, duplicate-reference preconditions and preservation of current scheduled workers before requesting any production migration approval. No destructive migration or DNS action is approved by this report. Never execute a guessed all-migrations bundle.
5. Configure merchant/provider credentials securely in the hosting/provider dashboards and verify documented sandbox flows. **Credentials alone do not close checkout**: provider-confirmed amount/currency/payment binding, atomic/idempotent completion/counters, paid source protection and the Orange callback/partner contract remain engineering blockers. No real payment or payout was attempted.
6. Complete Mail provider/domain verification and inbound/event registration with reviewed provider-supplied records. DNS needs explicit approval; do not invent record values. Then test actual external send/reply and worker recovery.
7. After staging and schema compatibility pass, stage the exact production build without assigning domains, run production-configured acceptance, promote only that verified build, and inspect post-deploy errors. Preserve scheduler and native release guards until full 3J release decisions are approved.

Builder eight independent frame handles/dimensions, full May fourteen-page art direction/choreography, Studio COS scope, Search engine, Calls, SAFA specification and the remaining 99-group acceptance remain open. No whole product/group is marked complete here.

No production migration, DNS, scheduler/protection change, paid infrastructure, external mail/payment/payout or production promotion was performed.
