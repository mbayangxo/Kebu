# Kebu Display continuation — October 30

Continued the existing original glyph sources and font binaries, not a replacement family. Fixed missing GPOS kerning in all six static CFF/OTF downloads. Structural QA now compares the desktop GPOS table byte-for-byte with its corresponding TTF. Rebuilt and checked the 20 served font binaries; all pass structural checks for the declared 52-character repertoire. Seven WOFF2 variants rendered in Chromium for visual inspection. Six focused catalog/coverage tests pass.

The font preview has an explicit accessible label, selected-style state and Unicode-normalized unsupported-character reporting. Uppercase conversion remains the existing display-preview behavior; the original family has no lowercase glyphs.

This is a limited headline face, not completion of the full Type Foundry program. Lowercase, full French/Wolof repertoire, optical design review, variable kerning, font-rights approval and hosted Studio/export acceptance remain open. No new font-family design approval is inferred. Full repository CI was started separately; no full-CI pass is claimed by this note. No deployment or hosted change.
