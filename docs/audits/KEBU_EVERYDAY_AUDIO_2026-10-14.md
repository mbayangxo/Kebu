# Kebu everyday tools and soundtrack continuation — October 14 UTC

Branch: `work/kebu-completion-audit-oct13`. Parent checkpoint: `1332132`. Preserve completed 3C–3I. Full Kebu/3J and the recovered 99-group scope remain open.

## Workflows repaired

Library documents now have controlled text, debounced/manual saves, per-document revision queues, honest save states and account-scoped device drafts. Typing during a delayed save remains dirty until its own acknowledgement. Offline recovery compares the original base revision; newer server text requires an explicit choice. Storage failure keeps the editor/text visible without claiming a device save. Lists do not silently switch to Personal Kebu when workspace discovery fails. Account changes clear in-memory queues/drafts before loading the next identity.

The shared work API validates list filters, requires same-origin mutations, confirms rows for creation/deletion, and applies the exact observed/client revision to updates. Its revision advances even when the wall clock does not. Optional client-generated creation IDs permit confirmation retries for identical owner-bound payloads without duplicates. Reused IDs with different payloads produce a conflict; form details stay intact. SQL/ORM errors no longer tell ordinary users to apply a migration.

Calendar and Tasks now retain form/item state on failed requests, release busy controls in `finally`, use idempotent creation IDs and confirm receipts. Tasks use a native keyboard-accessible checkbox. Failed deletion no longer optimistically removes an item. Calendar inputs remain disabled until initialized; a browser test reproduced first-field loss when typing before hydration.

Work-item collaborators could replace ownership through direct SQL under the previous business-member policy. The CLI-generated, source-only `20261014043916_workspace_item_identity_guard.sql` prevents changing identity/owner and limits workspace/room moves to the owner, without bypassing existing RLS. Verified in an isolated database; not applied to hosted projects.

Studio conditional-write schemas now accept database timestamps with UTC offsets and preserve exact sub-millisecond revision strings. This includes design save/history and video save/captions/source-refresh. The legacy design page timeline now records its saved soundtrack through an actual audio destination track. A missing soundtrack refuses download; no blank audio track is added when there is no soundtrack. First-frame rendering occurs before recording, pacing follows the export clock, and audio/capture resources are released after finalization. Encoder-constructor failures also release capture tracks.

## Verified results

- **10 browser journeys**, zero skips/unexpected/flaky: actual Library, Calendar and Tasks → real Next API handlers → actual `supabase-js` REST calls → **54 isolated SQL queries** with existing work-item RLS loaded verbatim. No work-item API success responses are mocked. Tests substitute a loopback Auth/REST transport and supply minimal prerequisite tables/helpers. Controlled network failure/delay is injected for failure cases.
- **8 additional SQL assertions**: ownership escalation was reproduced before the guard and rejected after it; collaborator content edits work, collaborator scope changes fail, owner reassignment fails, revoked membership loses read/write access, current owner access remains.
- **20 Studio browser cases**, zero skips/unexpected/flaky: existing save/history/share/media journeys remain passing; added decoded audible soundtrack export and unavailable-soundtrack refusal. Studio HTTP/Auth fixtures remain controlled loopback fixtures; this gate does not prove hosted storage ownership.
- Full `npm run ci`: **5,917 tests passed / 168 explicit environment skips**, 356 passed test files / 22 skipped. TypeScript passed; lint zero errors / 348 warnings; production build passed with 220 generated pages. Exit 0, build ID `cnYp45v7VAM7B4FlK7RAs`.
- Migration hygiene: 72 unique canonical timestamp versions, no executable legacy bundles.
- Visual inspection: mobile Library/Calendar and desktop Tasks screenshots inspected. Labels, visible saved/error states, mobile width and native checkbox keyboard interaction checked. Screenshot fixtures are not real customer data; no broad design/reference sign-off is implied.

Earlier rejected browser attempts caught an ambiguous error expectation, pre-hydration Calendar input loss and a local Next dev route failure. The local harnesses now await test/server shutdown before disposing fixtures. The final work gate passed after those repairs. Generated Turbopack caches were cleared before CI; application configuration and production were not changed for that cleanup.

## Hosted evidence and limits

Read-only connected-account inventory lists the Kebu organization and only the active Kebu project. Read-only `information_schema.columns` confirms expected `workspace_items`, `library_nodes`, `mailboxes`, `rooms` and `studio_design_versions` tables/columns. No customer rows were read, no hosted data was changed, and this schema observation is not a hosted auth/RLS/provider acceptance test.

Real Supabase Auth/Storage/PostgREST acceptance, independent native Postgres session races, real provider generation/reference inspection and full S8/performance/release gates remain open. The local SQL fixture is PGlite with minimal prerequisites, not a complete Supabase installation. Creation/offline/conflict repairs do not turn Library notes into a full rich collaborative word processor. Sheets/Slides, full booking/calendar integration, advanced Studio editing, Search/Browser/Cloud and the other recovered requirements remain in scope. No whole recovered group is marked DONE.

Hosted QA creation requires an organization choice and cost confirmation through the Supabase tools. See `KEBU_HOSTED_QA_PLAN_2026-10-14.md`. No project/branch was created, no upgrade purchased, no real messages sent, no push/merge/deployment performed, and no production migration applied.
