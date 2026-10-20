# Kebu Studio save and export reliability — October 13, 2026

Status: **LOCAL SAVE/EXPORT ACCEPTANCE PASSED; STUDIO OVERALL REMAINS IN PROGRESS.**

Working branch: `work/kebu-completion-audit-oct13`. Requirements: K004 (mobile/offline), K047 (shared Studio context), K048 (design/media/export), K049 (audio/video) and K096 (completion sequence) in the recovered 99-group audit. No completed 3C–3I stage was restarted.

## Repairs

- Design and video mutations serialize through a per-resource queue. Each request uses the last confirmed revision, rather than a render closure's old timestamp. Stale queued snapshots are refused. Revision acknowledgements no longer rearm autosave indefinitely; initial unchanged server documents are not autosaved.
- Device draft writes have their own serialized queue, so a slow server request does not hold up caching newer edits. An older acknowledgement stores the newest document/title/type with `dirty: true`; only the acknowledged current snapshot becomes clean. Draft writes repeat if another edit arrives during IndexedDB persistence.
- Malformed or mismatched receipts stop further network saves. Conflicts preserve the local draft and require an explicit choice. Dirty recovery keeps its original base revision; a newer server version is shown for comparison rather than overwritten on load. Conflict choices and linked-design refresh use the same revision authority. Navigation/session cancellation prevents obsolete save acknowledgements from advancing the new editor.
- Save errors remain inline with the editor and recovery controls visible. Storage failure does not claim a device save. Offline events preserve conflict/error status, and reconnect cannot silently resume a blocked save queue.
- Visible missing image/video media stops PNG rendering instead of producing placeholder rectangles. PDF/ZIP inherit that refusal. Canvas encoding failures return a render failure.
- Video and page-timeline recording keep capture tracks alive until encoder flush completes and explicitly request canvas frames. Video export does not attach an empty audio destination when no audio is used. Audible clips get independent playback elements, including repeated source uses; media loading failure stops export rather than silently omitting audio.
- The platform CSP now permits media from same-origin, HTTPS and blob URLs. Previously `media-src` inherited `default-src 'self'`, blocking uploaded remote media and offline/export blob playback. Other security directives remain unchanged.

## Verified results

| Check | Result | Boundary |
| --- | --- | --- |
| Full `npm run ci` | Exit 0; 5,865 passed / 168 explicit environment skips; 349 passing / 22 skipped files | TypeScript, lint 0 errors / 348 warnings, production build |
| New queue/export lifecycle regressions | 10 passed | Serialization, revision chaining, cancellation/conflicts, encoder flush order, missing-media and encoding failures |
| Actual Studio browser gate | 12 passed; zero skips, failures or flaky results | Actual editors, actual IndexedDB and downloaded files; loopback-controlled API/Auth transport |
| Desktop design / mobile video save races | Passed | Newest draft cached before the first server reply; subsequent request uses the confirmed new revision |
| Receipt and recovery failures | Passed | Malformed acknowledgement stays dirty; recovered newer server requires a choice; explicit server choice preserves editor access |
| Offline / storage failure | Passed | Reconnect conditionally syncs; quota failure keeps the editor visible and never claims a local save |
| PNG / PDF / ZIP | Passed | PNG signature, 640×640 size and a supplied green image pixel; two actual PDF pages; two PNG entries in ZIP |
| Video and design timeline WebM | Passed | EBML signature and browser-decoded 320×320 frames |
| Audio in video WebM | Passed | Real supplied WAV tone decoded from the recorded file with nonzero sample energy; missing audio refuses download |

Locked runtime: Next 16.3.5, Vitest 4.1.11, Playwright 1.61.0. No dependency manifest/lockfile changes. CI's hosted/provider skips remain skips. A separately captured build completion receipt is saved in the session evidence; no deployment was performed.

Browser runner: `scripts/verify-studio-local-ui.mjs`; tests: `tests/studio/save-export.local.spec.ts`. It clears remote service/database/AI configuration, uses only loopback fixtures, stores temporary browser configuration outside application source and starts with a disposable development cache. Interrupted Turbopack caches produced panics during earlier attempts; those attempts were rejected. The final twelve-case run passed without retries. Initial test locator/setup errors and the actual editor/error/export/CSP defects were repaired before acceptance.

Durable summary: `evidence/kebu-studio-reliability-oct13.json`. Session logs: `studio-ui-verified/results.json`, `studio-ui-verified/server.log`, `studio-final-ci.log`, `studio-verified-build.json` and `studio-verified-build.log` in the parent workspace directory.

## Source recovery

The prior checkout pointed to an external worktree Git directory that was absent in this session. Its current working files remained intact. Full connected GitHub history was cloned without overwriting them; the preserved October 13 source was recorded in local recovery commit `d8adb37`. Earlier local commit objects `d775bc53` / `2f1abf7c` were not available in that missing directory. Their preserved source/evidence is carried by the recovery snapshot. Git metadata now resides inside this checkout. No remote branch was updated, reset or merged.

## Remaining acceptance

K047–K049 remain **Partial**, not DONE. The browser gate controls transport; it does not prove hosted Supabase authentication, RLS, two-owner/collaborator persistence, storage ownership or deployed API behavior. Prior conditional-write API regressions still pass in full CI, but they are not hosted database evidence.

Next: verify Studio ownership/collaboration/version-history/source-refresh persistence and media upload in isolated QA; finish missing advanced editing/export capabilities against K048/K049. The legacy design page-timeline export is visual WebM; soundtrack mixing there is not established by this gate. Multi-track video export audio is verified for the supplied case, not every codec, long composition, mobile browser or professional rendering workflow.

The recovered 99-group audit and completion queue remain authoritative. Full 3J real-provider/reference quality, hosted S8, independent PostgreSQL sessions, stable-host timing and release decisions remain open. Builder native nesting, original asset/font gaps and the earlier native fixture-shutdown issue remain queued. Existing evidence is historical where its source digest differs from this checkpoint.

No push, merge, PR, deployment, production operation, production migration, billing change or project pause occurred.
