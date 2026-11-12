# 3H completion design freeze

The user authorizes finishing all remaining local 3H work. Hosted signed-in S8 testing remains deferred. No production migration or deployment is included.

Brand Brain stays in Studio and the native Builder inspector. Approved imagery supports safe image addresses, labels, ordering, removal of approval, real uploads through the existing Studio storage endpoint, and selection of existing Studio uploads. At most 24 images are retained. Removing approval does not delete files used elsewhere. Uploading adds to the unsaved profile; Save is still required. Errors retain the draft. Uploads are public assets. No automatic reference analysis or image generation is implied.

The owner explicitly attaches a saved profile to a site. Selection previews direction until Attach is pressed. Attachment persists across browsers/devices, with its own revision and canonical acknowledgement. Detach removes direction, not site edits. Reopening reads the latest compatible profile; application rechecks its revision and changes the selected native subtree through one undoable transaction. Updates never silently rewrite a site. Team/support access does not disclose another owner's private profiles.

A separate owner-scoped binding row avoids changing KCD document semantics. Composite foreign keys require ownership of both project and profile. Profile deletion clears the pointer and advances revision. A security-invoker RPC locks the project and binding, compares expected revision, and returns the authoritative binding. Conflicts/uncertain responses require reload before another write. GET also returns detached compiled direction for later 3I consumers; notes remain untrusted data.

Use existing Kebu tokens, compact utility text and accessible labels. Inspector attachment status/Attach/Detach/Reload have explicit busy/error/conflict states. Existing colors/motion application remains separate. Phone layouts use the existing inspector. Asset controls belong inside Brand DNA.

Completion requires actual SQL ownership/anonymous/stale/replay/deletion checks, API validation/acknowledgement checks, desktop/phone authoring → curate/upload → save → attach → fresh URL reload → apply → Undo/detach journeys, failures and recovery, prior Builder/public/performance regressions, manual screenshots and full Node 20 CI. Evidence distinguishes controlled browsers/disposable SQL from hosted signed-in QA.

## Final feature result — 2026-10-09 UTC

Approved imagery and durable attachment are implemented. Actual SQL/API/planner checks passed 55 focused tests. All 165 combined browser cases passed without skips, including 78 public-rendering cases and desktop/phone completion journeys. Final screenshots were manually inspected. Node 20.20.2 CI passed typecheck, lint (zero errors / 289 existing warnings), 5,431 tests (110 environment skips) and a clean 202-page build. See `evidence/3h/complete/README.md` and its retained logs for limitations.

Feature implementation and local functional verification are complete; the full gate is not claimed closed. Absolute development timing misses unchanged budgets on this host, including a same-host pre-attachment inspector control. A stable-host recheck remains required. No benchmark/budget was weakened. Hosted signed-in S8 remains deferred. Proceed to the 3I architect phase while carrying timing and real persistence verification into the internal-readiness gate; no production operation is implied.
