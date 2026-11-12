# Studio direct-text continuation — October 20

Base: `b22d828fac20e79e65675bd455aad3433d695ba6`; isolated branch `work/codex-studio-text-oct20`. Continued implementation after the transform checkpoint. No Mail, production schema, DNS or existing artist content changes.

## Defects and repairs

The actual browser reproduced double-click creating an editable paragraph while keyboard focus remained elsewhere. A dedicated text component now focuses immediately and lets the browser own its editing DOM; local document echoes do not replace the text node or caret. Pointer/caret selection stays within the editor. Cmd/Ctrl+Enter or blur commits one history gesture. Escape restores only that text session's original text, cancels its pending gesture baseline, and does not delete the layer or add an undo step. A canceled text edit does not revert unrelated document properties.

Native composition input is kept local until composition ends. IME keys are not treated as app shortcuts; the real Chromium IME test holds a Japanese composition across the autosave interval, verifies no unfinished composition is written, commits it and reopens the saved text. Literal typing, mid-string insertion, Unicode, native undo boundaries and refreshed documents use the same canvas object as the inspector.

The text schema previously trimmed authored whitespace, and the PNG painter split/filtered whitespace. A real exported PNG reproduced the lost indentation (leftmost ink x=22 despite two leading spaces). Text now retains whitespace through schema parsing, and a shared creative-core layout helper retains repeated/leading/trailing spaces and blank lines while wrapping oversized words at Unicode grapheme boundaries. Native canvas letter spacing keeps shaping intact where supported; the fallback never splits emoji or combining marks. Actual decoded PNG pixels now verify indentation rather than only checking a download signature.

Visual inspection caught light-theme inspector colors inherited on a dark panel. Shared rail/section/empty-state components now accept an explicit appearance; existing light consumers retain their default. Studio uses dark controls, legible small labels and black text on its orange primary actions. Selection outlines use a deeper orange. Actual-browser checks measure text contrast >=4.5 and outline contrast >=3 against rendered backgrounds. The color reader resolves modern CSS color syntax through canvas pixels; the initial RGB-only parser incorrectly treated normalized sRGB values as 8-bit channels and was corrected without lowering thresholds.

## Verification

Full actual-editor browser gate: **33 passed, zero skipped/failing/flaky**. An additional focused contrast rerun passes the stronger outline check. Includes all preceding save/export/offline/history/sharing/viewer regressions plus direct text, caret insertion, Escape cancellation, IME, whitespace/reopen/export and dark-control contrast. Screenshots of focused text and dark inspector were inspected. Nine pure layout/schema tests pass. Restored isolated PGlite 0.5.10 runtime; the unchanged Studio/Rooms SQL gate passes **23 assertions**, including ownership escalation and forged storage-pointer reproduction before the guards, and refusal after them. It is not a production database test.

Final `npm run ci` after the contrast refinements exited 0: TypeScript passed; lint zero errors/344 warnings; **6,069 tests passed/168 explicit skips**, 368 files passed/22 skipped; production build generated all 221 pages and finalized build ID/prerender manifest. Receipt: `evidence/studio-text-oct20/ci.json`. Earlier full CI before the visual refinement passed 6,069 tests/168 explicit skips, zero lint errors/344 warnings and all 221 generated build pages. The later gate caught two stale source-string expectations for deliberate appearance/outline changes; normal component prop ordering was retained and the shade smoke check updated, with actual contrast supplied by browser acceptance.

## Previous checkpoint hosted follow-through

`b22d828` remote CI **39440015648 SUCCESS** and hosted E2E **39440323487 SUCCESS**, job 118688125249: **533 passed, 35 explicit skips**, zero failures. Exact preview `dpl_F4reCh4NXbNhMBX4AQprg4H9hAdD` READY at https://kebu-g3m36sib2-mbayangxos-projects.vercel.app. Hosted fetches: login 200; public musician-artist preview 200 with its actual marker; private May slug 404; private editor redirects to sign-in. That is the transform checkpoint, not hosted proof of the newer text changes or signed-in account persistence.

## Remaining scope and recovery

COS05 is still open for complete rich inline formatting and cross-format parity; this checkpoint certifies the tested direct-text subset. Full COS01–COS25, Builder/May, 3J and K001–K099 remain open. Next work continues into actual Builder frame/crop manipulation and the remaining May capabilities; a checkpoint is not task completion.

Fresh prior-conversation retrieval reconfirmed the Behance Legally Blonde reference, scrolling/rotating cutouts and cross-page scope. Searches did not recover the reported newer May commits or a newer May source archive. Saved-file title searches returned older phase bundles through October 10 and reference/mockup assets; those file names do not establish a recovered newer composition. Do not replace actual artist photos with generated mockup imagery or infer a finished scene inventory from it. Preserve existing 3C–3I source and all older bundles.
