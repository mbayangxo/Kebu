# Studio visible-bound snapping — October 23, 2026

Runtime4fe75aa4e5e3ad9b8203b692ed4a2af0e53d080f / PR15, based on authoritative a5ce2321bae13405b8cf8e85a58f6dc8fb116b81. This is a bounded COS06/07/18 repair; full Kebu and hosted release acceptance remain open.

## Reproduced defects and implementation

Four of six new geometry tests fail on the original source: rotated moving edges miss artboard guides; grouped selection snapping depends on the clicked member; left-edge priority overrides a closer right-edge match; rotated stationary targets and invisible objects produce incorrect guides. The repair reuses the rotated frame bounds already verified for arrangement, builds the visible union of the moving selection, and chooses the smallest correction across edges and center. All moving members receive one translation. Invisible objects do not attract snaps; locked stationary artwork remains a valid reference. The magnet distance is eight screen pixels at every supported zoom.

The actual browser uncovered a fifth defect: Escape during a drag committed its intermediate position. Keyboard cancellation now shares pointer-cancel restoration for move/resize/rotation and pan; it clears guides and restores the gesture baseline without a history or save entry. Existing native text Escape behavior is retained and covered by the full browser suite.

## Verification

- Original new geometry baseline: 4 failed, 2 passed. Final focused snapping/craft/arrange: 25 passed.
- Focused lint: zero errors; five existing editor warnings.
- First actual browser run: two zoom/group cases passed, one Escape restoration case failed. That failure is not acceptance. The corrected frozen source passes all three cases with zero skips/flaky/unexpected and normal cleanup.
- New browser journeys measure visible frame edges, guides and relative group offsets at 50% and 100%, perform undo/redo/save/reopen, target a rotated locked object, and test Escape with zero writes/history.
- Frozen-source full55 actual local browser cases pass with zero skips/flaky/unexpected and normal teardown; both50%/100% rendered screenshots inspected. Exact-source remote CI40025909080 passes6624 tests/338 explicit skips, TypeScript, lint0errors/346 existing warnings and finalized230-page build. Remote Studio40025909069 passes55 full plus6 required phone/tablet cases across3 rounds, zero skips/flaky/unexpected, normal teardown and preserved original marquee regression. Public preview smoke40026600568 passes. Final normal-checkout npm run ci exits0 with the same6624/338,0errors/346warnings and finalized230-page build. Loopback Auth/API are explicit fixtures, not managed hosted Supabase acceptance.

## Remaining boundaries

Saved document formats, authored content, migrations and permissions are unchanged. Animated transform snapping, equal-distance smart guides, nested groups and group resize/rotation remain open. Native isolated Supabase branching is blocked by the provider's Pro-plan requirement; no plan upgrade, production migration or promotion occurred. Claude retains Search/Mail/Foundry ownership.

An auxiliary local full CI passed TypeScript/lint/tests but its build failed because Turbopack forbids a node_modules symlink outside the project root. That is recorded as a failed environment run, not a successful build; the normal checkout subsequently passed the full CI chain. Initial previewdpl_C8VJuA8bctMuT9fHQSqFSRYHkXAL failed Google-font module resolution. Exact-commit retrydpl_bk9nGr8dvKWa3V3ESXvKem5vwFz8 is independently READY at https://kebu-b574i64g5-mbayangxos-projects.vercel.app. Production remains71815f99; no promotion.
