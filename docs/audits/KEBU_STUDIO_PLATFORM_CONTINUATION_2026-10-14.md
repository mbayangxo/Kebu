# Kebu Studio and platform continuation — October 14, 2026 UTC

Working branch: `work/kebu-completion-audit-oct13`. Preserved development and completed 3C–3I remain intact. This checkpoint continues the 99-group recovered audit; it does not certify full 3J or Kebu completion.

## Repairs

- Design history now saves the latest editor draft before naming/restoring a version and serializes history mutations with ordinary saves. Restoration uses an exact conditional database revision and refuses to proceed if the “Before restore” safety checkpoint fails. Edits made during restoration remain in the editor with an explicit version choice.
- Linked-design video refresh now puts the observed revision on the final database write. A race returns a recoverable conflict instead of overwriting another save.
- Upload success requires storage and an asset-library acknowledgement. An unregistered object is removed on library failure; cleanup failure is logged. Invalid supplied design IDs are rejected. Binary WebM detection, RIFF form discrimination and canonical audio extensions/content types repaired. Signatures identify containers; they do not certify complete media decoding.
- Sharing handles failed requests and malformed receipts visibly; revocation requires a confirmed database row. Named saves, invitations and comments have origin checks.
- A source-only, CLI-generated migration prevents authenticated collaborators from changing a design's identity/owner or workspace/folder. The function is an invoker trigger in a private schema with a fixed search path and no PUBLIC execute grant. It leaves existing RLS in force. No hosted application occurred. A second source-only migration binds newly inserted room-file metadata to the authenticated uploader and room storage prefix; forged private-file pointers were reproduced before the policy and rejected afterward.
- Rooms file deletion reaches privileged storage only after an authorized metadata deletion returns the matching row. A readable file with a delete denied by RLS stays intact. Room upload requires a metadata receipt; Rooms mutations and Mail sending have origin checks. Library share removal no longer claims success for a missing/invisible share.

## Verified evidence

- Actual Studio editor browser gate: **18 passed, zero skipped, zero unexpected, zero flaky**. Real component interactions, IndexedDB drafts and downloaded/decoded exports; controlled loopback authentication and HTTP fixtures. Added cases cover named-save ordering, delayed restoration with concurrent editing, failed restoration, failed/malformed sharing and viewer controls. Earlier 12 save/export journeys remain passing.
- Isolated local PostgreSQL-compatible SQL: **23 assertions passed** using PGlite. The previous collaborator ownership escalation was reproduced before applying the new guard locally, then rejected afterward. Tests load existing collaboration/history policy SQL verbatim. Owner/editor/viewer/stranger isolation, revocation, history permissions and exact timestamp conflicts verified. Rooms policies allow a member to read while refusing that member's unauthorized delete; owner deletion works.
- Runtime API regressions cover checkpoint failure, restore/refresh races, origin rejection, upload registration/cleanup, collaboration receipts, and the Rooms storage authorization boundary. Fixtures intentionally substitute authentication/database/provider clients; no email or invitation was sent to a real person.
- Full CI: **5,898 tests passed / 168 explicitly skipped**, TypeScript passed, lint zero errors / 348 warnings, production build passed with 220 generated pages. Fresh-cache CI exit code 0; build ID `J5kuNLaiE6fM3r-WdtLRr`.
- Migration hygiene: 71 unique timestamped canonical migrations, no executable legacy bundles.

The local SQL fixture supplies minimal prerequisite schemas/helpers. It is not a hosted Supabase Auth/Storage/PostgREST test, a full fresh-install migration test, or an independent native Postgres multi-session race test. The browser transport fixtures do not replace those release gates. Earlier failed browser runs were rejected (ambiguous test locators); final locators are scoped to the relevant UI. TypeScript caught an overly narrow fixture union; its explicit data type was repaired before rerunning CI. A cached Turbopack task-state panic failed the first build; only generated Turbopack caches were removed. The complete CI chain then passed.

## Reconciliation and remaining queue

The recovered audit's original “not found/not started” descriptions were stale for existing Mail, Browser, Library documents, Calendar and Rooms paths. Updated K051–K054, K057–K059, K062–K063 to describe source present and acceptance open. No existing module was restarted and no whole requirement group was marked DONE. Spreadsheet/presentation products and the full browser/search/collaboration scope remain distinct requirements.

Connected Supabase project inventory exposes only the active Kebu project. No isolated hosted QA project was available in that inventory; production was not paused or modified to manufacture a pass.

Remaining: hosted identity, independent owners/collaborators, storage and version/source-refresh acceptance; full Studio editing/media requirements including legacy page-timeline soundtrack mixing; full 3J provider/reference/S8/native-session/performance gates; the remaining original business and everyday products; provider/DNS and operational dependencies. Continue with current implementations as the baseline, repair dependencies and verify one complete workflow at a time. Keep the 99 recovered groups and completion queue authoritative.

No push, merge, deployment, production change, or production migration was performed.
