# Kebu Type Foundry — original typography program

Status: DESIGN SPEC / NOT IMPLEMENTED. Owner: Kebu. Parallel development: Claude owns catalog infrastructure; this branch owns visual direction, original-font sources, QA and rights provenance.

## Non-negotiable constraints
- Do not rename third-party fonts and claim ownership. Maintain upstream license, copyright, reserved-name and redistribution records.
- AI-generated specimen posters are visual references only: their glyphs, weight labels, diacritics and purported completeness are not verified source outlines.
- No font is marked production-ready without working font files, glyph coverage, visual QA, licensing/provenance, and Builder/Studio/published-page acceptance.
- Avoid editing catalog, picker, Builder or Studio source files concurrently with Claude; integrate only through reviewed PRs.
- Follow AGENTS.md, PRODUCT_RULES.md and WORKSPACE_CONTINUITY.md; do not reset or force push.

## Product structure
1. **Kebu Type Foundry**: original Kebu-specific families, versioned source outlines, build recipes, tests and rights records.
2. **Kebu Font Library**: curated third-party open-license families, distinct attribution and licenses. Target 500+ distinct families, subject to license and quality audits; no padding with near duplicates.
3. **Font experience**: browse/search by classification, multilingual coverage, preview custom text, favorites, pairing, weight/axes, line height, tracking, recently used; persistence and exports validated by infrastructure owner.

## Original-family creative brief
- **Kebu Sans**: warm modern sans with restrained editorial details; coherent skeleton; usable body text, no arbitrary cutouts. Start control glyphs H O n o a e s R S and numerals 0 1 2 8.
- **Kebu Editorial**: distinctive high-contrast display serif; carefully balanced hairlines and optical sizes.
- **Kebu Display**: expressive geometric title family with repeatable motif; prioritize legibility.
- **Kebu Signature**: connected script with entry/exit strokes, contextual alternates, consistent rhythm and pressure logic.
- Expand to 12 original families only after the first production-quality family passes all gates.

## Design-to-font workflow
1. Produce original sketches/vector source and a design rationale for each family; check against reference fonts for accidental copying.
2. Draw a control glyph set; review at small and large sizes and in words, not just isolated letters.
3. Define metrics (UPM, baseline, cap/x heights, ascender, descender), stem/contrast logic, curve tension, terminals, spacing and kerning rules.
4. Extend to complete required Latin repertoire and specified language glyph coverage; validate Unicode mappings and diacritic placement.
5. Generate OTF/TTF/WOFF2 using appropriate font engineering tools; ensure builds are reproducible.
6. Run font validation (including OpenType layout, interpolation if variable, naming, contour direction, overlapping contours, clipping, missing glyphs).
7. Review actual specimens in browsers and exported documents across weights, scripts and viewport sizes. Correct defects and rerun tests.
8. Archive source, changelog, licenses, provenance and explicit approval record.

## Acceptance test strings
- HAMBURGEFONTSIV / hamburgefontsiv
- The quick brown fox jumps over the lazy dog.
- Kebu Studio — Create, design, build, express.
- Français : À É È Ê Ë Ç Œ œ æ « Bonjour ! »
- Wolof sample: Ñu ngi fi; dëgg, jàmm, kër, Sénégal.
- Digits: 0123456789 / 1,234.56 / $ € £
- Punctuation: “quotes” ‘apostrophes’ — – … @ # & ? ! ( )

These strings are QA probes, not proof of complete Wolof/French/English coverage.

## Provenance and ownership
- Keep per-family provenance: source creator(s), design contributions, source assets, third-party references, dates, assignments and license terms.
- Originality and exclusive copyright cannot be guaranteed merely because an AI or script produced outlines. Human authorship and legal review are required before exclusive ownership claims.
- Public download/embedding rights and sublicensing are separate business decisions. Do not grant rights by default.

## Integration contract with Claude
- Agree on a manifest schema containing stable family ID, family name, category, foundry/source, license ID + license file, version, styles/axes, Unicode coverage, asset paths, hashes, and provenance.
- Original-font build outputs plug into the same catalog ingestion path as open-license families, with a visible **Kebu Original** designation only after provenance review.
- Avoid competing changes to catalog UI while Claude is implementing it.
- Verify saved document typography, undo/redo, responsive layout, published website and export use the intended font, not silent fallback.

## Delivery gates
- Gate A: design approved (control glyphs, mixed-case words and numerical specimen).
- Gate B: complete real font binary generated, installed, and rendered with independent checks.
- Gate C: QA across browsers, language samples and export, no glyph substitution or clipping.
- Gate D: integrated in Builder/Studio and production publishing; CI and hosted QA pass.
- Gate E: rights/provenance signed off.

**Current state:** specification only. No completed font binaries, 500-family catalog, deployment, or QA certification is claimed by this document.
