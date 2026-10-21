# Kebu fonts pipeline

Real font-engineering infrastructure for Kebu's own, original typefaces —
built with [fontTools](https://github.com/fonttools/fonttools), not traced
or derived from any other font's outlines.

## Kebu Display

`kebu_display/` is the first family: an original geometric all-caps display
face. Uppercase A-Z, digits 0-9, essential punctuation, space, and the
French accented capitals most needed for Francophone West Africa (ÉÈÀÇ).
Lowercase is a deliberate later increment, not attempted here.

- `glyphs.py` — the coordinate skeleton. `build_glyph_set(stem, shear)`
  draws every glyph fresh from explicit geometry (arcs, polygons, straight
  strokes) at a given stroke thickness and optional oblique shear. One
  source of truth per letterform — weights and the italic are generated
  from this, not hand-drawn separately per style.
- `build.py` — orchestrator. Builds Light/Regular/Bold × Upright/Oblique
  (6 static instances), a real variable font (wght axis, Light↔Regular↔Bold),
  applies kerning, and exports each as `.ttf`, `.otf` (CFF, via
  `fontTools.pens.qu2cuPen` to convert the quadratic skeleton to cubic) and
  `.woff2`.
- `kerning.py` — real GPOS pair kerning, computed from each glyph's actual
  bounding-box geometry (not guessed), for pairs prone to looking loose in
  a geometric all-caps face (AV, AW, AY, TA, PA, …), with a safety clamp
  so the heuristic can never push a pair into visual collision.
- `qa.py` — automated structural QA: every file loads, every declared
  character maps to a real non-empty glyph, no degenerate/zero-area
  outlines, consistent units-per-em. Run after every build.
- `render-qa.mjs` — visual QA: renders each built `.woff2`'s full
  character set in a real headless Chromium and saves a screenshot per
  file for human review. `qa.py` cannot catch a glyph that has ink in the
  wrong place (e.g. the winding bug that broke every curved letter in the
  first version of this font had non-zero area and would have passed
  `qa.py`) — this is why both exist.

### Rebuilding

```bash
pip install -r scripts/fonts/requirements.txt
python3 scripts/fonts/kebu_display/build.py        # writes scripts/fonts/kebu_display/dist/
python3 scripts/fonts/kebu_display/qa.py            # structural QA, exits non-zero on failure
KEBU_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium \
  node scripts/fonts/kebu_display/render-qa.mjs      # visual QA screenshots, for review
```

After a successful rebuild, copy the files Kebu actually serves:

```bash
cp scripts/fonts/kebu_display/dist/*.{woff2,ttf,otf} public/fonts/kebu-display/
```

The app reads from `public/fonts/kebu-display/` — `public/fonts/kebu-display/kebu-display.css`
declares the real `@font-face` rules Studio and `/studio/fonts` load, and
`lib/studio/fonts-catalog.ts` lists "Kebu Display" alongside the other
catalog fonts so it shows up in every text layer's font picker automatically.

### Known limitations (honest, not hidden)

- Display/headline use only — no lowercase yet, so it is not suited to body text.
- Kerning is a bounding-box heuristic, not hand-tuned by eye; it is
  deliberately conservative (clamped) rather than aggressive.
- The OTF (CFF) export does not currently carry the kerning feature —
  only the TTF/woff2 path does (the primary Studio/web delivery format).
