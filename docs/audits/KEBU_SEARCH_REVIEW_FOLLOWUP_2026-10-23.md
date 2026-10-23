# Independent Search follow-up review — October 23, 2026

Reviewed Claude branch kebu-search-build-oct23 at 7b8ca47a0aba3149499300b2e78cc6045d9b7c09 in an isolated detached worktree. No Claude source changes or Search integration performed. Earlier95f8f111 findings are historical and must not be presented as unchanged current findings.

## Confirmed source improvements

The new service-only search_businesses SQL function joins each candidate to the live businesses row and requires active lifecycle status. Both query and browse use this RPC; stale cached rows cannot bypass that live lifecycle predicate. It ranks with ts_rank, weighted existing vectors, recency and ID ordering. Country filtering uses an exact structured column. Indexing now has ordered ID cursor pages and aborts before writes on a page error. A separate0233c8c3 revision also adds HTTP/HTTPS-only website validation at registration/update and defense in depth on public detail reads; the corresponding regression passes. The public detail still withholds contacts and distinguishes500 from404.

These are independent source observations, not an independently executed PostgreSQL proof. The review run of tests/search plus tests/kebu-id produced59 passes and11 explicitly skipped local-PostgreSQL tests across13 files. PostgreSQL was unavailable here. A separate npm-packaged native PostgreSQL setup was attempted: binaries resolve, but the sandbox maps only UID0 and rejects chown/runuser/setgroups, so PostgreSQL could not be initialized as an unprivileged user. No local database started and no SQL execution is claimed. Claude's recorded populated local PostgreSQL and browser evidence remains attributed to Claude, not independently reproduced or managed hosted evidence.

## Outstanding integration and robustness work

- Stale-row enumeration still uses one unpaginated search_documents select. PostgREST row caps therefore limit reconciliation; stale rows beyond that response need a subsequent complete cursor scan or an authoritative transactional cleanup. The live RPC predicate is the privacy boundary, so this hygiene issue does not reopen the original stale-lifecycle listing exposure.
- Active cursor scanning stops on rows.length < requested pageSize. Default500 is below a common1000 cap, but a lower configured server cap or a larger caller-supplied pageSize can prematurely terminate the scan. Continue until an empty page, bound/validate the configured size and test capped responses.
- All documents are buffered and upserted in one request, and all stale IDs are sent in one delete filter. Batch payloads/URL filters for directory scale, preserving fail-closed reads and safe failure behavior. Cleanup must not delete another concurrent refresh's newly indexed records.
- PostgreSQL tests currently skip when the local server is absent. Required CI should provision the database and require these tests to execute; a green skipped suite is insufficient evidence for the live SQL boundary. Claude's own latest full-suite report contains3 database failures, so an exact-source green combined CI is still required before readiness.
- Claude already merged a588e46d, preserving the Studio pages/review checkpoint. The current shared source also includes a5ce2321 arrangement and the active Codex snapping branch. Reconcile onto the latest authoritative checkpoint deliberately, preserving appended docs and both source histories; do not replace Studio files with older copies.

Other nine Search modes, populated managed hosted acceptance, production migrations and production rollout remain open. Continue Search ownership with Claude; Codex's Studio slice remains separate until its gates pass.
