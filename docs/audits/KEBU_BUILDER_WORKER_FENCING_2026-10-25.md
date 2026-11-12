# Builder generation prerequisite: worker claim fencing

Status: local runtime checks passed; hosted runtime/deployment acceptance pending.

## Problem and behavior

The existing claim SQL recovers locks after ten minutes and increments attempts. The TypeScript worker previously completed/retried by job ID alone. An earlier execution could therefore mark a newer claim succeeded, reset its retry schedule, clear its locks, or change an already successful job back to failed. Completion and failure writes now atomically match id, status=running, locked_by and attempts. A zero-row update is superseded, not success/failure. The attempt protects reused worker IDs.

No schema change is needed for this repair; existing claim/recovery columns are reused. The current notification idempotency and raw digital-fulfillment calls are unchanged. Acknowledgment database errors continue to surface.

## Verification

- Baseline:4/4 actual-SQL regressions failed with visible row overwrites. An earlier fixture setup failure lacked auth.uid and is not counted as an application regression.
- Repaired:7/7 actual-SQL cases execute the canonical platform durability and recovery migrations, actual claim/recovery functions and filtered updates. Four cover old success/failure while a newer attempt is running/completed, reusing the worker name. Three cover current success, retry and final-attempt dead-letter.
- Focused:14/14 across worker, SQL race and durability suites; zero failures/skips.
- Local full npm run ci exit0,6144MB heap: TypeScript, lint0errors/346existing warnings,6651tests/345explicit skips, production build. Seven new SQL cases are among the default environment skips but were run explicitly above.
- The strict platform SQL workflow now includes the new suite and rejects skips. Its remote run is pending. Workflow/documentation follow-up does not alter the tested runtime.
- No browser UI changed; no new hosted Auth/RLS/session or production deployment claim.

## Limits and next work

This fences job finalization, not arbitrary external side effects. Long generation stages still need renewal/expiry handling, provider idempotency/timeout reconciliation, immutable artifacts, cost settlement, permission rechecks and stale-document revision guards before use. The native editable candidate and automatic quality/repair loop remain separate work under the approved pipeline contract. No paid provider/model calls were made.
