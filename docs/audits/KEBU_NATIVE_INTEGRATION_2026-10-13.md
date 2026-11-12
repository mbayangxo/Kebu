# Kebu native Builder integration — October 13, 2026

Status: **LOCAL INTEGRATION VERIFIED; RELEASE AND FULL 3J SIGN-OFF REMAIN OPEN.**

Working branch: `work/kebu-completion-audit-oct13`. Starting repair checkpoint: `d775bc53`. Preserved native QA source: `6267a80d6cd3ed4d253adc95a1b0fe2458d52462`. Source integration uses the differences from common ancestor `71815f99`; neither branch was merged, reset or deployed.

## What was integrated

The preserved Creative Core, adapter, native operations/coordinator, responsive composition, spatial constraints, transforms, nested element order, motion, rich text/video, Brand Brain, Experience DNA, Experience engine and native publication paths now exist on the working branch. Existing stages 3C–3I were restored and reconciled, not restarted or replaced with another model.

The newer Builder shell retains element inspection, section layout/animation fields, layers, version history, app blocks, connections and SEO. Native operations, appearance and save recovery are connected to it. Newer Studio, Mail, Browser, Search, Rooms, platform and account work outside the reviewed integration scope remains intact. Studio's generation route shares the recovered atomic AI metering repair; its editor was not replaced.

Canonical QA migration files were imported as source only. No hosted migration was applied. Legacy migrations remain archived in their existing directory; disposable test initializers read them there. The production KCD rendering/operation guards and current `vercel.json` are retained. No default/native rollout switch was changed.

## Integration defects repaired

- **Section metadata loss:** the recovered save boundary now preserves the newer height, width, margins, overflow and animation fields, while rejecting invalid presentation values. New regressions cover this compatibility boundary.
- **Selection callback loss:** the optimized renderer now retains element selection, selected-element state and navigation editing while dispatching through current callbacks. Native and newer legacy editing paths coexist.
- **Click interception:** the newer Add section caption overflowed a tiny circular control and intercepted a native heading click. It is now a 44px icon control with an accessible label. The previously failing actual editor→database selection/edit/history journeys pass.
- **Legacy/new page contracts:** legacy page ordering/nesting and responsive layout metadata remain supported. Native add/rename/reorder/delete use canonical operations. Native parent-page changes are not yet canonical operations: the control is disabled and unexpected changes are refused rather than silently claiming to save them. Native hierarchy editing remains a queued capability.
- **Upload fixture mismatch:** recovered tests now use real PNG bytes and the current Personal workspace scope. The newer file-signature and workspace checks were preserved, not weakened.
- **Cross-origin variants:** the recovered origin protection is retained on variant mutation routes, before authentication or database access.
- **Font loading:** supported Google families use Next's self-hosted font variables, including the newer DM Sans, Space Grotesk, Manrope, Cormorant Garamond and Libre Baskerville choices. Runtime Google stylesheet injection and obsolete preconnects are removed. Satoshi had no bundled font; it is no longer offered as a new choice. Previously saved values remain valid and retain CSS fallback. This does not certify missing legacy font/asset artifacts.

## Final clean CI

The original verification runtime inherited October 10 QA dependencies. A fresh `npm ci` installed the working branch lockfile (Next 16.3.5, Vitest 4.1.11, Playwright 1.61.0 and eslint-config-next 16.3.5); checks were rerun on these exact versions. Five recovered type imports and the older browser runner now use the declared `playwright` package instead of an undeclared `@playwright/test` package.

`npm run ci` passed, exit 0: TypeScript, lint **0 errors / 348 warnings**, **5,855 tests passed / 168 explicit environment skips** across 347 passing and 22 skipped test files, and a production build with **220/220** generated pages. Source manifests/lockfiles and production scheduler configuration were unchanged. Skipped hosted/provider/database cases are not counted as passes; the separately enabled disposable SQL suite is recorded below.

## Browser and database evidence

| Gate | Result | Evidence boundary |
| --- | --- | --- |
| Local migrated publishing / Brand Brain / Experience / 3J SQL suites | 51 passed, zero skipped | Six suites using disposable PGlite 0.5.8; roles, persistence, revisions and transactions |
| Native browser gate | 20 passed, zero failures/flaky; 9 optional timing probes skipped | Actual components and controlled transport; 3J uses the migrated local SQL authority |
| Native inspector journeys | Desktop, tablet and phone passed | Edit → migrated SQL → Undo/Redo → reload → immutable publication |
| Truncated committed reply | Passed | Exact transaction retry without another version increment |
| Public five-page portfolio | Six width/JavaScript combinations passed | 1440/768/390px, JS on/off, actual supplied assets, navigation and content |
| Canonical page operations / failure recovery | Passed | Add/rename/reorder/delete, conflicts, missing protocol, navigation reconciliation |

Screenshots of the current mobile editor and desktop/public composition were inspected. The specimen remains a **manual native reference**, not generated output. Existing checkered/magenta source-asset artifacts remain visible; assets were not retouched or replaced. These images do not establish generated visual quality or full brand-reference parity.

Durable browser summary: `evidence/kebu-native-browser-oct13.json`. Detailed local logs/reports are in the parent session directory: `native-locked-sql.log`, `native-ui-locked-final/results.json`, `native-ui-locked-final/server.log`, and `native-locked-ci.log`.

The browser runner `scripts/verify-native-builder-local-ui.mjs` clears remote Supabase/database/AI configuration, creates only guarded temporary local fixtures, refuses to overwrite existing routes, and attempts to restore configuration/remove generated fixture types afterward. The fixture routes are absent from the final source. A stale Next validator from an earlier local build referenced removed fixtures; its generated types were cleared before the clean gate. The first locked-runtime browser attempt aborted in Turbopack while reading an older development cache. That interrupted run was rejected, generated development cache/fixtures were cleared, and the complete browser gate was rerun cleanly. An explicit post-run check caught fixture cleanup not taking effect in this session, including after reordering cleanup before child shutdown. Functional results remained 20 passed; the temporary routes, generated fixture types and configuration were then cleaned independently and their absence verified. Automatic shutdown cleanup remains an open harness defect; it is not claimed verified.

## Remaining gates and queue

Full 3J remains blocked by real-provider reference generation and exact-output visual review, authenticated hosted S8, independent native PostgreSQL sessions, stable-host performance and release/default decisions. The nine optional timing probes were skipped; no performance budget was relaxed or claimed passed. PGlite does not prove multi-session native PostgreSQL concurrency or hosted Supabase gateway authentication.

Next: Studio serialized autosave/newest-draft preservation and real media/export journeys; hosted Network two-owner persistence when isolated QA is available; re-evaluation of the newer everyday/platform products against all 99 recovered requirement groups. Native nesting and original asset/font gaps stay explicit. The master audit and completion queue remain authoritative; Kebu as a whole is not complete.

No push, merge, PR, deployment, production operation, production migration, billing change or project pause occurred.
