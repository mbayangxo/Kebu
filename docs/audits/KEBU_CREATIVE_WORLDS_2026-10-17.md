# K↑, DKLNS and May — normal-editor acceptance, October 17, 2026

**Status: reusable creative layouts implemented locally; complete creative and hosted acceptance OPEN.** Nothing in this record declares May's site complete, the Russian reference exactly reproduced, or all 99 requirement groups finished. Existing 3C–3I work and existing owner sites are preserved.

## Agreed designs

- K-Direction: K↑, “WHAT’S MOVING”, ↑ ARTISTS / → RELEASES / ↓ K WORLD / ← VIDEOS, directional movement, a release Drop mode, music affecting the environment.
- DKLNS: “WE MAKE PEOPLE HARD TO IGNORE”, WALL / FILM / PEOPLE / CAMPAIGNS / CHAOS, editorial work, scattered draggable cards, kinetic type and cinematic media. Management/content/marketing, separate from the music label.
- May Lècor: retain her existing identity, photos and tab navigation. Layered cutouts, oversized typography, parallax, pinned storytelling, masks/reveals and interactive imagery; compare against the Ksendr “Legally Blonde” reference. No invented releases, concerts, campaigns, statistics or contact channels.

These briefs were recovered from prior conversations. No TV-shaped website brief was recovered. Exact May reference acceptance remains blocked by the reference's previously observed “402 Please renew your subscription” response; historical repository layer data cannot establish a current exact match.

## Ordinary-user route

1. In the Builder, choose **Add section → Photo grid**.
2. In **Photo layout**, select **Editorial campaign wall** or **Directional world**.
3. Set brand, headline, introduction, colors, motion and Drop mode using the Content panel.
4. Add work/artist cards, upload photos, edit descriptions and links, select their direction/view, and change position/rotation/order. Invalid links remain editable with an explicit unsaved-link error.
5. Edit the four directional panels under **Directional panels**. Upload real campaign video/music under **Film and music**. Audio never autoplays.
6. Save/reload; inspect the visitor layout. Keyboard navigation and reduced motion are supported. CHAOS dragging is visitor-local interaction, not an unauthorized change to the owner's saved composition; initial positions are saved in the inspector.

For May, **Add section → Cutout collage** creates neutral editable content without exposing her photos or brand to other users. Her existing draft is not replaced by these new agency/label drafts.

Both new layouts are ordinary `gallery` props validated by the existing website schema and persisted by the existing Builder operation path. They require no new section type or database migration. New owner-only seeds `agency-kdirection-directional` and `agency-dklns-editorial` are explicit new drafts; existing K-Direction and DKLNS seeds/upgraders are preserved. These are one-page creative foundations, not finished multipage agency/label sites; services/work archives, release details and final contact/content acceptance remain open. The new drafts use May's existing clean portrait, not the skyline composite. No release video/audio has been fabricated.

## Acceptance matrix

| Requested capability | Implementation / available controls | Evidence and remaining limits |
| --- | --- | --- |
| Normal creation without code or JSON | Gallery layout selector; neutral defaults; Content inspector | Real `/create/{id}` browser gate with controlled operation authority; not hosted authentication/SQL |
| Headline/cards/save/reload | Existing operation persistence with gallery props | Real editor tests for both layouts; user changes survive a page reload |
| K↑ directional navigation | Accessible direction buttons, whole-panel directional animation, swipe handler | Button/panel browser checks; real touch swipe still requires acceptance |
| Drop mode | Saved toggle, drop headline/accent; audio playback changes accent | Editable implementation; real release/audio playback not yet accepted |
| Editorial wall / People / Campaigns / Film | Data-driven filters, uploaded video player, honest empty states | Browser tests verify filtering and empty Film state; no invented campaign/film |
| Draggable scattered work | Saved offsets/rotation; pointer movement; keyboard arrow movement | Keyboard movement browser-tested; pointer/touch drag acceptance still open |
| Project popups | Native modal, actual saved photo/body/link, Escape and focus return | Editor and visitor browser gates |
| Layered May collage | Shared editor/visitor canvas, uploaded layers, positioning/scaling/stacking/links | Existing collage parity unit/browser gates rerun |
| May parallax / pinned scene | Shared scroll track, background/foreground roles, motion toggle | Local browser scroll changes layer transform; motion-off/reduced-motion cases |
| Responsive navigation / composition | Container-based layout; phone cards leave rotation clearance | Desktop/phone browser gates; not a physical-device QA claim |
| Masks, chained scroll reveals and Ksendr timing | Some existing section motion controls; not all recovered choreography implemented | Exact comparison and additional implementation OPEN |
| K↑ spatial 3D world and release-specific transformation | Directional foundation exists | Full spatial art direction, audio-reactivity beyond accent and release acceptance OPEN |
| DKLNS video behind typography, custom cursor and hover physics | Current film player and hover lift are simpler | Requested full choreography OPEN; a player is not proof of cinematic background composition |
| “Any ordinary user can reproduce every effect” | Generic controls, no brand-name switch in renderer | Creation/edit tests are necessary evidence, not universal usability proof; full hosted ordinary-account journey OPEN |
| Maylecor.com final site / publishing | Existing site preserved, no production edits | Hosted draft, reference comparison, final content/assets, domain/release checks and approval still required |

## Verification

**Verified:** TypeScript 0 errors; lint 0 errors / 345 warnings; Vitest 6,006 passed / 168 skipped. Combined real-browser gate: 20 passed / 9 optional performance skips; separate public-chrome desktop/phone gate: 2 passed. **Build BLOCKED:** `npm run ci` exits 1 at build. Initial Turbopack persistence-cache failure was followed, after clearing only generated `.next`, by unavailable Google font downloads (`fonts.gstatic.com`) and generated-font resolution errors. This is not a passing production-build claim.

Final run details are recorded in `evidence/creative-worlds-oct17/verification.json`. Screenshots show local drafts/test screens, not deployed sites. Initial failures are retained there rather than represented as passes.

No push, merge, deployment, publication, production configuration, DNS change, migration or paid resource creation was performed.
