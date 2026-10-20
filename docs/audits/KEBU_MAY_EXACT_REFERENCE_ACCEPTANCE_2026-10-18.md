# May Lècor — exact-reference acceptance and scrolling video

**Full requested outcome: OPEN.** This checkpoint adds an independently verified video capability. It does not certify an exact recreation of the Behance site, a completed May design across all pages, or hosted ordinary-user acceptance.

## User acceptance contract

The user wants the Legally Blonde reference recreated using May's own content, with the same detailed scroll choreography, video integrated into layered scenes, clickable cutouts, professional artist navigation/contact and a coherent experience on every page. A similar pink homepage is insufficient. An ordinary user must create/edit the result through Kebu's normal controls; source-only customization is not acceptance. Preserve the original face/photos, existing development and stages 3C–3I. Publication, deployment, production changes/migrations and DNS require approval.

## Source reconciliation — do not hide this blocker

At the start of this continuation, the branch was `work/kebu-completion-audit-oct13`, HEAD `96e24b7`, with inherited uncommitted contact/inbox/scroll-control work. The newer reported May checkpoints `814fa63` and `9f46081`, their May animated-world factory, masks, typography/reveal controls, review packet and screenshots are absent from this available checkout and Git object database. Earlier reported 6,043-pass results are not reused as evidence for this state. Local recovery checks and a focused saved-file/context search found no recoverable copy of those exact checkpoints.

All inherited files were preserved. A binary tracked diff and untracked-file archive were saved before changes. Network draft files and unrelated reference-photo edits remain outside this checkpoint. The new work extends the available generic collage editor; it does not silently replace the missing May composition or certify it from memory. The exact newer source/bundle is needed to reconcile that completed draft without guessing or losing its details.

## Reference inspection

The supplied Behance page was opened and scrolled: https://www.behance.net/gallery/189327258/longrid-blondinka-v-zakone . The embedded Vimeo walkthrough is `904209593?h=74ec164c80` (duration approximately 20.77 seconds); it was observed playing and paused for inspection. Visible material includes the skyline/cutout opening, bold pink textured collage scenes, oversized condensed/script typography, outlined floating objects, film imagery in irregular split framing and the closing author scene.

The walkthrough demonstrates visible appearance and motion. It does not establish every original site's destination page, hidden interaction, responsive layout or precise scroll-to-frame timing. No designer film, proprietary photos or source code were copied into May's content.

## Requirement matrix

| Requirement | Current evidence | Acceptance |
| --- | --- | --- |
| Place video inside the collage and set geometry/stacking | Normal Content → Video layers; source/upload, poster/captions, x/y position, width/aspect, radius, z-index | Implemented; local editor/visitor gates |
| Move video with the scene | Independent horizontal/vertical travel, rotation, end scale and start/end progress | Implemented; actual wheel/transform checks |
| Play video or use scrolling to select frames | Explicit controls, silent loop or scroll scrub; finite seekable media, latest-request seek coalescing | Implemented; actual decoded media time checks |
| Pause/retry/reduced-motion behavior | Pause/resume; loop stops offscreen; real load error/retry; still manual controls for reduced motion; explicit non-seekable-host fallback | Implemented; local browser gates |
| Click video/cutout to enter another page | Video story link uses shared page resolution; existing cutout link controls retained | Local route navigation verified; full May link inventory OPEN |
| Save and reload without code | Actual `/create/{id}` upload response → canonical transaction authority → reload; schema/adapter responsive roundtrip | Local proof; hosted SQL/auth/storage acceptance OPEN |
| Exact cutout masks, outlines, typography and reveals | Reported newer implementation absent from available source | Recovery/reconciliation OPEN |
| Every reference motion beat, pivot, delay, frame shape and transition | Reference inventory only; no complete numerical scene comparison | OPEN |
| Same complete art direction on every May page | Available older page source does not contain the reported newer 14-page animated-world composition | OPEN |
| Real May content and release | Original photos/media must be used; no QA clip may become artist content | Approved media/catalogue, hosted acceptance and release OPEN |

The May page inventory to verify remains: Home, Music, Video, Photos, May's World, Shop, Updates, About May, Press, Audio, Maygazine, May by May, Mayjor Good and Contact. Each needs desktop/phone, keyboard navigation, real destinations, saved editor changes/reload and still reduced-motion output. Passing a generic video scene on Home/Music does not close all these pages.

## Normal user workflow

Add section → Cutout collage → Content → Video layers → Add video layer. Upload a real file using the existing project asset uploader, or enter a direct HTTPS media address. Edit label, poster/captions/language, page destination/link label, playback mode, geometry, stacking and scroll travel. Save/reload uses the existing canonical operation boundary. Tablet/mobile edits use the standard responsive override bucket. YouTube/Vimeo provider embeds continue to use the ordinary Video section.

Looping/scrubbing is muted. Native manual controls remain available for reduced motion and unsupported seeking. The visitor never sees a QA clip or invented May release. Tests use a newly generated three-second synthetic WebM, stored only under tests, not public artist assets.

## Defects and verification details

- Prevented repeated seeks to the same requested time when a decoder rounds to a frame; deferred seeking uses the newest requested progress.
- A local media fixture initially served non-range responses, producing a zero-length seekable interval despite buffered media. The successful scrub gate serves real HTTP 206/Accept-Ranges and asserts real video time/geometry. Non-seekable hosting has its own honest fallback test.
- The initial file-input locator matched ancestor inspectors; it now scopes to the Video layers panel. The local route fixture now exposes hydration readiness before interaction. Neither change bypasses product behavior.
- This older checkout reproduced Next 16.3.5's persisted build-cache `invalid digit found in string` failure. Following its installed documentation, build filesystem caching is disabled. One build worker is configured, consistent with the previously observed worker-finalization issue. Development caching remains unchanged. The new build is checked for full 221-page generation and finalized artifacts; an exit code alone is insufficient.
- The inherited contact work was rerun independently: **6 browser cases passed, 35 real SQL queries and 3 permission assertions**, with private inbox/reload/retry/other-owner refusal and reviewable reply links. No external email was sent.

Final browser/CI counts, logs and cleanup receipts are under `evidence/may-reference-video-oct18/`. These controlled local operation/SQL fixtures are not hosted account sign-off. No push, merge, deployment, publication, production configuration, DNS or migration change occurred. Full Kebu, 3J and the 99-group audit remain OPEN.
