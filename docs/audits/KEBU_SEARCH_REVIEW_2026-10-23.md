# Review of Claude Search slice95f8f111 — October23,2026

Reviewed the actual `kebu-search-build-oct23` source in a separate detached worktree; no Claude branch/runtime changes. Existing business-index, migration, public-detail and full KebuID suites:41 tests pass. These are unit/contract tests, not migrated SQL or populated hosted browser acceptance. The supplied report's nine-new-tests count was not independently reproduced: the three new test files contain7 tests, with34 existing KebuID tests.

## Release blocker: stale inactive listings remain public

`refreshBusinessSearchIndex` only upserts currently active rows. It never removes rows for businesses that become inactive or are deleted. Both query and browse paths in `/api/search/businesses` read only mode/access_scope-filtered search_documents; they do not recheck current business lifecycle. Therefore a previously indexed business can remain publicly discoverable after suspension, archival, deletion or return to draft. The detail route's correct lifecycle404 does not prevent the listing name, summary, website and trust label being exposed.

An additional isolated actual-route regression returned200 with the synthetic Now-private business and Withdrawn description, reading only search_documents; the expected-empty assertion failed. The test provides a cached listing with no corresponding currently active source. This is a deterministic fixture reproduction of the missing read boundary, not a production customer-data observation. Require authoritative active-status enforcement at read time (join/RPC or equivalent fail-closed check) plus stale-row cleanup; an index cleanup cron alone leaves an exposure window. Test both browse and query through active→suspended/archived/draft/deleted transitions.

## Other source findings

- `.textSearch(..., {type:websearch})` filters matches; the query has no rank expression, rank RPC or rank order. The report's websearch-ranked claim is not established. Implement explicit relevance ranking and a deterministic tie-break; test result ordering against actual migrated PostgreSQL.
- Indexing stops at `.limit(5000)`, without pagination or stable cursor ordering, and a server row cap may be lower. Paginate deterministically and reconcile only after a complete successful scan. Prove partial failure does not delete valid records, while stale rows are eventually removed.
- countryCode/category are inferred by splitting a display summary; country filtering uses an ILIKE substring against that summary. Use structured fields and validated exact country filtering, with malformed and misleading-description cases.
- Existing detail handling correctly distinguishes database error500 from404 and withholds email/phone. Source filtering, real verification_level and honest error states are useful foundations, but the existing mocks do not certify actual SQL or populated hosted results.

Claude should retain ownership of Search, fix these before expanding modes or requesting integration, run full CI plus migrated SQL and populated browser journeys, and push exact evidence/handoff. No Search migration, production rollout or other mode completion was authorized by this review. Codex continues Studio separately.
