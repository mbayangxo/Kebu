# Builder selected-object responsive reset

October 20, 2026, America/New_York. This is a tested development slice, not full Builder/May/Studio/3J/99-group or production acceptance.

## Verified reconciliation

Authoritative checkpoint `c7a0e38617973ed019d30262d34f818a3ab8f88c` preserves Claude's paid creative-asset checkout and security migrations plus the verified visible-frame work. Expected-head fast-forward from `c763995` succeeded and the remote ref was reread. Exact combined local CI exited 0: 6,328 passed / 292 explicit skips, 349 warnings / zero lint errors and finalized production build. Exact remote gates all succeeded:

- CI: 39532772577
- Builder SQL/browser: 39532772658
- Platform SQL/browser (19 SQL suites): 39532772593
- Hosted Preview E2E: 39532938336

Vercel's ready authoritative preview `dpl_Fw8EKPZDtkzRMLU1FUquvEi2L5u5` identifies the exact c7a0e38 SHA: https://kebu-ac0e3kzxu-mbayangxos-projects.vercel.app. A fresh production listing still identified `71815f99c50022482e545e22e1f6e040ee1cafe4` / `dpl_8XQYFY2rAkDvmUZ1pmdZq8uJHFj2`. No production promotion or migration occurred.

## Root cause and repair

On c7a0e38, actual tablet width/crop-only edits failed the browser assertion that the Reset responsive changes button exists. The parent detector omitted width/height/crop while the child reset list included them. Both lists also treated section-wide maps as one object's settings: a reset could erase neighboring objects' responsive changes.

Runtime checkpoint `d81899dfce703f0cf9529baeed9e4e31d246fcf9`, tree `2cdfb61008e82edccb5cdea921bc93bd39a4c36d`, shares one object scope for detection/reset. It restores only the selected entry in width, height, crop, scale, position, rotation, opacity and depth maps. Hidden/locked memberships and extra cutouts are restored by the selected ID, retaining other objects, other devices, section settings and metadata. Source replacements and title/background/canvas/footer scalar fields are scoped to their object. Fully inherited bags are removed. No saved schema, renderer merge semantics, canonical operations or database migrations changed.

Existing device maps replace whole base maps. When another object still needs an override, reset retains the selected object's current desktop entry in that map to preserve its current desktop presentation; future desktop changes retain the existing responsive review semantics. This does not introduce independent per-entry cascading inheritance.

## Actual verification

- Full local `npm run ci`: exit 0; 6,348 passed / 292 explicit skips, 396 files passed / 42 skipped, TypeScript/lint and finalized production build passed. Zero lint errors / 349 existing repository warnings.
- Five actual ordinary Builder SQL/browser cases passed, zero skips/failures/flaky: existing three-device crop/resize/touch/cancel/history/publish plus new tablet/phone selected reset → one transaction → undo/redo → reload → SQL row → publish. Neighbour width/crop and section height survived; desktop base remained unchanged. No legacy section writes or page errors.
- New focused helper coverage includes all eight maps, implicit defaults, omitted base entries, cutout replacement/removal/restoration, hidden/locked membership, metadata, other devices, scalar scopes and idempotence. These are included in full CI.
- Before-fix regression: the actual tablet editor failed because the Reset button was absent. Phone was not run after the runner's first-failure cutoff. The first new-worktree attempt failed separately because Turbopack rejected a dependency symlink; a real dependency directory fixed that environment error before the passing run.
- Migration hygiene: 92 unique canonical migrations. This slice adds none.
- Actual phone screenshot inspected; browser evidence and complete cleanup checks are retained in `evidence/builder-object-reset-oct20/browser.json`.

Remote CI, the full now-60-case Builder gate, platform gates and hosted preview for d81899d remain pending at this audit's creation. Reread exact conclusions before integrating. Local five-case verification does not certify production Auth, independent native PostgreSQL sessions, external providers or the complete fourteen-page May site.

## Remaining work

Independent eight-handle image frames, visible W/H and frame fitting remain open. The next reproduced May defect is the unconfigured/broken-stock social rail and per-pointer-move writes. Full May choreography/art direction, Studio COS acceptance, remaining 3J/99 groups and hosted schema/provider acceptance remain open. No artist pixels were changed, no external email/payment/payout executed, and no production migration/DNS/promotion performed.
