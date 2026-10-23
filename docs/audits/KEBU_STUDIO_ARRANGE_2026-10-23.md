# Studio rigid-group and rotated-frame arrangement — October23,2026

Runtime367d82d1e483d6308a04aa16695dd2fd532d2217, based on shareda588e46d. Isolated development verification; full Kebu and hosted release certification remain open.

## Reproduced behavior and repair

The original helper collapsed members of one group onto the same edge (x100/250 became100/100), aligned a90-degree frame80px away from the visible left edge, and distributed rotated frames with visibly unequal gaps. All3 original regressions failed. Arrangement now constructs one target per unlocked selected group, measures rotated frame bounds and translates members rigidly. Single targets align to the artboard; multiple targets align to their combined bounds. Distribution uses visible widths/heights and equal gaps, preserving the selection's outer bounds. Toolbar distribution eligibility counts targets rather than flattened group members. Locked/unrelated layers remain unchanged, and no-op operations do not add history.

Translations outside the existing supported coordinate range are rejected atomically with a named dismissible error. They neither partially move members nor create a history/save write. Saved formats, assets, geometry dimensions/rotations, permissions and migrations are unchanged. This does not implement nested groups, animated-frame arrangement or group resize/rotation.

## Evidence

- Original unit baseline:3failed. Final geometry12 plus existing canvas10:22passed. Independent corner rotation checks all six alignment modes, both distribution axes, group membership, locked/unrelated objects and invalid/no-op operations.
- Actual editor focused3/3passes: rotated-group offsets through align/undo/redo/save/reopen; browser-measured equal gaps and retained outer edges with save/reopen; out-of-range move error without artwork/history/writes changing. Final rendered screenshots inspected.
- First browser attempt could not launch because the old temporary Chromium executable had been removed. Recreated a scratch-owned runtime. Next run2passed/1failed because a generic alert selector also matched Next's route announcer. The arrange error now has an accessible name; the named-alert test and all3focused cases pass. No failing run is counted as acceptance.
- Preliminary full local CI passed TypeScript, lint0errors/346 existing warnings,6618 tests/338 explicit skips and finalized230-page build. The subsequent accessible-name change is covered by exact-source focused browser and pending final remote gates.
- Frozen-source full52 local browser passes with zero skips/unexpected/flaky and normal teardown. Exact-source CI40010858925 passes TypeScript, lint0errors/346 existing warnings,6618 tests/338 explicit skips and finalized230-page build. Public smoke40011165162 passes. Remote Studio40010858749 passes52 full cases plus6 mandatory touch cases, zero skips/flaky/unexpected, preserved original marquee failure and normal teardown. Loopback Auth/API are explicit fixtures; this does not certify real hosted JWT/RLS or database persistence. Existing actual route guards and save queue remain unchanged.

## QA provisioning boundary

The user renewed permission to retry `kebu-hosted-qa-oct23`. Supabase returned PaymentRequiredException: Branching is supported only on the Pro plan or above. This replaces cancellation as the current native-branch blocker. No plan upgrade, branch creation, production schema/data write or promotion performed by this work. Enabling Pro for the owning organization or supplying an authorized separate QA environment is still needed before managed hosted acceptance can proceed. Do not silently buy a recurring plan or test destructive fixture flows on production users.

Claude's Search/Mail/Foundry implementations remain untouched. Prior branch reconciliations and handoff are preserved. COS06/07/18 gain bounded arrange evidence only; all25 Creative OS groups and the complete Builder/Studio/May requirements remain partial/open.

Runtime preview was independently verified READY at https://kebu-1njz338cu-mbayangxos-projects.vercel.app / dpl_EXpzBq5kWi33ycLQKLJNdY9nocmB. PR https://github.com/mbayangxo/Kebu/pull/14 targets the shared development checkpoint only.
