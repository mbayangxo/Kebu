# Kebu creative operating system — Builder and Studio acceptance

User-confirmed scope, October 19, 2026 America/New_York. This supplements the 99-group recovered requirements audit; it does not replace it or reopen completed 3C–3I stages.

## Product and interaction contract

Studio is a creative operating system with an original Kebu identity. Home has a small Home / Projects / Templates / Brand / Assets / Shared rail. Entering a design replaces dashboard navigation with creative tools. Design, Quick Content, Video and Presentation change tools within the same product. A timeline appears when content needs time.

Editor composition: dark professional chrome; narrow tool rail; left asset/tool panel; generous quiet workspace around the artwork; contextual right inspector; page/scene strip below; timeline below that when relevant. No permanent giant edit/delete/reorder controls on every object. Canvas selection and Layers selection must be synchronized.

The editor-specific tools include Design, Elements, Text, Uploads, Photos, Video, Audio, Brand, AI, Extensions and Layers. Do not put the entire product map in one navigation rail. The full product includes Home, Create New, Design/Video/Presentation editors, Templates, Aesthetics, Elements, Photos, Video, Audio, Uploads, Brand DNA, Brand Kits, Projects, Campaigns, AI Create, Assets and Aesthetics marketplaces, Shared, Trash/Archive, Versions and Export Center.

Studio uses one creative document/object foundation, with adapters for existing formats and explicit migrations. Design, video, presentation, templates and editable AI output must not become separate incompatible editors. Preserve existing documents, version history, ownership, collaborators and 3C–3I work; do not replace persisted formats wholesale or silently flatten content. Builder must expose equivalent relevant object capabilities through its normal editor, including website scroll/hover/click behavior. A website does not acquire a video timeline unless its content requires one.

## Required inspector behavior

- Text: font, px size, weight, italic, underline, color, alignment, line/letter spacing, X/Y, actual W/H, rotation, shadow, outline, background, animation preset/trigger/duration/delay/easing, opacity, layer, lock and link. Double-click edits text on canvas, including rich inline styling.
- Image: replace, real frame/crop, fit/fill, W/H, ratio lock, X/Y, rotation, opacity, brightness/contrast/saturation/temperature/blur, shadow/border/radius, animation, layer, lock, link and background removal.
- Icon/shape: fill, stroke, actual size/W/H, rotation, X/Y, opacity, link, animation, layer and grouping. Social icons are regular Elements → Social objects. Arrange selected icons horizontally/vertically with numerical spacing and alignment.
- Nothing selected: Page/Canvas inspector. Selecting any object immediately changes the inspector to its type. Inspector changes, keyboard changes and direct manipulation must mutate the same object and share undo/autosave.
- Selection affordances: corner and side resize handles, rotation handle, drag movement, Delete/Backspace, Cmd/Ctrl+D, arrows, Shift ratio lock, Alt/Option center resize, visible focus and accessible alternatives.

## Twenty-five acceptance groups

An entry is complete only after its whole real-user journey passes, including persistence, reopening, errors, permissions and responsive behavior. Source files and historical test names are leads, not current proof.

| ID | Requirement and required acceptance |
|---|---|
| COS01 | Universal transforms: every supported text/image/video/icon/shape/frame uses X/Y, actual W/H, scale, rotation, opacity, stacking, lock/hide, duplicate/delete, grouping, alignment and animation. Verify equivalent mutations through inspector, handles and keyboard, plus save/reload/export. |
| COS02 | Replace template-specific behavior incrementally with general objects. Reproduce May's layers/effects through normal tools; preserve old templates and authored edits. No private-only renderer counts as ordinary-user proof. |
| COS03 | Real image frames: frame bounds are selection, resize, hit-test, crop and export bounds. Source media outside a crop must not leave a giant invisible interactive box. Non-destructive source preservation and editable background removal required. |
| COS04 | Resize: all four corners and four sides; independent W/H; Shift ratio; Alt/Option center; exact px fields; snapping; transformed/grouped objects; phone/touch alternatives. |
| COS05 | Direct text: double-click and type on canvas; selection/caret survive updates; rich inline styling; font/px/weight/color/spacing; cancel/commit/undo; keyboard and IME; save/reload/export parity. |
| COS06 | Smart guides for canvas/object edges and centers; horizontal/vertical distribution, equal spacing, center-on-page, configurable snapping. Verify transformed objects and multiple selection. |
| COS07 | Shift and marquee multi-select; Group/Ungroup; nested layers; group transforms; ordered hierarchy; exact bidirectional selection; rename/lock/hide/duplicate/delete; accessible reorder. |
| COS08 | Real animation preview and presets; Enter/Scroll/Hover/Click/Loop triggers, duration, delay, easing and per-object parameters. Timeline animations for video. Reduced motion and exported behavior must be deliberate. |
| COS09 | Video timeline: trim/split, multiple tracks, drag/reorder, transitions, text, audio, volume/fades, captions, beat markers, snapping, zoom, scrubber. Verify playback and decoded output; no inert buttons. |
| COS10 | Audio: upload/library, trim/loop/volume/fade, detach from video, beat analysis, waveform, soundtrack across scenes. Verify saved source and audible exported samples, plus missing-media errors. |
| COS11 | Pages/scenes: add/duplicate/reorder/rename, video duration and transitions, copy styles, apply background, delete/restore. Verify undo, save/reopen and output order. |
| COS12 | Searchable Elements: shapes, lines/arrows, frames, tables/charts, social icons, symbols/stickers, African patterns/assets, decorative type, UI/device mockups. Inserted results are ordinary editable objects. |
| COS13 | Reusable assets: folders, tags, favorites, recent/uploaded/generated, brand-owned/team-shared. Search, upload retries, ownership, reuse and sharing isolation must work. |
| COS14 | Brand DNA actions: apply typography/colors, replace logo and restyle selected design. Real edits, preview/undo, owner/team permissions, save/reopen; not merely a display of brand tokens. |
| COS15 | AI creates structured editable text/image/shape layers. Real provider failure is visible. Never save a generated JPEG as an editable design substitute. Verify subsequent editing and exports. |
| COS16 | Offline: create/edit/reopen drafts, queued uploads/changes, reconnection and conflicts, user isolation and storage failures. Never claim Saved when data is only unsynced or storage failed. |
| COS17 | Autosave: Saving → Saved only after a valid receipt; optimistic local persistence, serialization, retries, conflict recovery and visible errors. Slow/failed requests cannot overwrite newer edits. Loading/publishing cannot reseed owner content. |
| COS18 | Undo/redo covers text/transforms/groups/crop/animation/add/delete/reorder/pages/styles. One gesture is one undo step; transient pointer frames are not individual history entries. |
| COS19 | Versions: named and automatic immutable snapshots, compare and restore. Save current edits before capture; a delayed restore cannot erase newer edits; permission/version conflicts remain visible. |
| COS20 | Object/point anchored comments and live cursors/selections. Collaboration cannot overwrite concurrent edits or leak private content. Test two real sessions, permissions and recovery. |
| COS21 | Keyboard/tab order, shortcuts, labels, focus, keyboard movement/zoom, reduced motion and contrast. Test desktop/tablet/phone, touch and assistive-technology semantics. |
| COS22 | Performance: targeted updates during manipulation, heavy tools lazy loaded, long asset/layer lists virtualized, thumbnail caching and appropriate workers. Record large-document interaction measurements and device limits. |
| COS23 | Export: PNG/JPEG/WebP/PDF/GIF/video as supported, transparent background, quality/resolution, durable job progress/failure/retry/history. Verify actual decoded files, media/fonts/effects and permission boundaries. Unsupported formats must be honest, not fake success. |
| COS24 | Templates use the same editable document model with protected/default metadata. Author, validate, publish, purchase/use and edit through Aesthetics/Assets marketplaces; retain provenance and licensing. |
| COS25 | Ordinary-user certification: create a post; insert media/text; font/resize/rotate/group/animate; add audio; undo; close/reopen; duplicate page; resize format; export; repeat on tablet/phone. Repair each broken interaction before declaring the group complete. |

## Evidence and ownership

The completion queue must retain a row per group with current commit, environment, acceptance case, output evidence and remaining limitations. Source inventory is explicitly distinguished from local browser proof, real SQL/RLS proof and hosted proof. Exact-reference certification also needs captured observable reference states and a written list of anything unavailable for comparison.

Claude owns Kebu Mail. No Mail implementation changes are authorized by this Studio slice. May's Contact inbox can be tested independently; do not claim outbound business-email delivery or replies until that connection is verified.
