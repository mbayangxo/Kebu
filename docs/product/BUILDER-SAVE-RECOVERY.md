# Builder save and recovery — October 13, 2026

Status: IN PROGRESS for genuine authenticated hosted acceptance and production rollout. Source checkpoint is QA-only. A synthetic callback or denied write is not a successful project save, AI generation or publish.

## Repaired boundaries

Preview, Apply and Publish share a synchronous action gate. It awaits Save draft, then reads current pending keys, history rejection, project-scoped terminal items and durable queued writes. A resolved save promise is not a save receipt. Failed/queued saves cannot be bypassed through stale React state. The mutex covers the request/refresh and releases in finally, including a thrown pre-request flush. Section proposals with no accepted sections cannot apply.

Save draft includes pending site settings and theme. Settings and header/footer writes are ordered with section/history writes through the existing coordinator. Old settings/chrome generations cannot update newer local edits; a header response updates only the confirmed header, preserving a pending footer. Both pending chrome parts are saved after the shared debounce. Settings remain pending until the current generation is confirmed. Publish stops after a failed settings write.

Successful HTTP status alone no longer clears pending state: sections require the matching row and props; settings require the matching project; chrome requires a valid confirmed part; publish requires the live receipt for the requested subdomain/path. Apply requires applied=true. A failed refreshed draft does not clear history or pending save state. Confirmed apply followed by a failed reload, or an incomplete apply/publish receipt, requires Reload updated draft before editing again. Draft-dependent actions and editing are blocked until that reload succeeds.

Leaving checkpoints latest pending section props and both chrome parts. Undo/Redo is preserved as one atomic batch, including restoration/deletion metadata, rather than individual partial writes. Queue failure no longer retires the only history retry facts. The editor is keyed by project ID so another route cannot inherit the previous project's save state, document or history.

Project recovery displays and dismisses only that project's terminal items. It does not erase another project's or a checkout/event mutation's failed work. Storage write failure retains the latest queue in memory; reads cannot resurrect the older persisted queue. Durability is exposed to Builder consumers; storage-unavailable guidance tells the user to keep the tab open and retry. Memory-only edits cannot survive reload or browser closure; do not call them durably saved.

## Validation boundary

Full CI: 5,640 passing tests / 268 explicit skips, TypeScript, zero lint errors / 277 warnings, production build. Forty-two focused cases cover readiness/mutex behavior, checkpoint payloads, storage failures/recovery, and write/refresh receipts. The prior function-exists assertion was removed in favor of executable gate regressions.

The preview-only appearance route includes the actual autosave hook and gate with a nonexistent synthetic project. Edits attempt a real section PATCH expected to be denied. All AI/publish callbacks are explicitly synthetic; the project is never created. Reset/unmount clears only that fixture's local queued items. Deployed actual-hook desktop and 390px phone-frame inspection passed: real signed-out save denial keeps local text pending; Preview/Apply/Publish callbacks remain at zero; a checkpoint preserves the newest text in the local queue; a simulated flush throw releases the lock; retry with a clean fixture reaches one explicitly synthetic callback. Phone document/client widths are both 382px and controls measure 44px. The synthetic queues were cleared through fixture Reset. These are denial/local-state checks, not hosted persistence proof.

Still open: genuine signed-in save → reload → publish, two-owner permissions, provider generation/confirmation, independent-session races, storage-denied device behavior, and production release. Unit storage tests and a denied API path cannot certify these journeys. All four completion groups remain open.
