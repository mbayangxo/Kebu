# Petal — control-outline proof

Selected directions: 19 Petal, 20 Amour, 21 Pearl, 23 Chérie. These four visual directions were selected by the user; selection does not approve the eventual font outlines or grant public redistribution rights. Petal is the first control-set implementation. Other three families remain visual concepts.

Run `python scripts/fonts/petal/build_control.py --out DIRECTORY` with fontTools installed. Run `python scripts/fonts/petal/test_control.py` for reproducibility, exact declared coverage, outline bounds and kerning-table checks. No existing font file or third-party outline is read by the build. Editable cubic paths are in build_control.py. The proof name is deliberately distinct from production font names.

The real CFF OTF in proof/ has 17 mapped characters, including space. Full alphabet, numerals, punctuation, accents, multiple styles, spacing/kerning refinement, browser/Studio/export acceptance and provenance/rights review are unfinished. Unsupported characters are not substituted inside the proof. This is design Gate A work, not production-ready catalog integration. Do not list this as a complete font family or quietly replace Kebu Display.
