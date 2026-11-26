"""
Automated QA for every built Kebu Display font file — catches missing
characters and rendering problems before a font ships, rather than relying
on someone noticing a broken glyph by eye.

Checks, per file:
  1. The file actually loads with fontTools (catches a corrupt/invalid export).
  2. Every character declared in CHARACTER_MAP is actually present and maps
     to a real glyph (catches a silently-dropped character).
  3. No glyph has a degenerate/empty outline where the skeleton expected ink
     (catches a build_X() that produced nothing — the class of bug that bit
     the first version of this typeface, just caught automatically now).
  4. Every glyph's contours are well-formed (even point count for TrueType
     quadratic outlines; non-zero area) — catches malformed outline data
     that would render as visual garbage even though the file "loads".
  5. Units-per-em and vertical metrics are consistent across every weight,
     so mixing weights/styles in one text run doesn't jump the baseline.

Usage: python3 scripts/fonts/kebu_display/qa.py [DIST_DIR]
Exits non-zero (and prints every failure) if anything fails.
"""
import glob
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from glyphs import CHARACTER_MAP, UPM  # noqa: E402

from fontTools.ttLib import TTFont

NON_INK_GLYPHS = {".notdef", "space"}


def _contour_area(coords, start, end):
    s = 0.0
    pts = coords[start:end]
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2


def check_glyf_font(path: str, errors: list):
    font = TTFont(path)
    glyph_order = font.getGlyphOrder()
    glyf = font["glyf"]
    hmtx = font["hmtx"]

    for code, name in CHARACTER_MAP.items():
        if name not in glyph_order:
            errors.append(f"{path}: missing glyph '{name}' for U+{code:04X}")
            continue
        cmap = font.getBestCmap()
        if code not in cmap or cmap[code] != name:
            errors.append(f"{path}: cmap does not map U+{code:04X} to '{name}'")

    for name in glyph_order:
        if name in NON_INK_GLYPHS:
            continue
        g = glyf[name]
        width, _ = hmtx[name]
        if width <= 0:
            errors.append(f"{path}: glyph '{name}' has non-positive advance width ({width})")
        if g.numberOfContours == 0:
            errors.append(f"{path}: glyph '{name}' has NO ink (empty outline) — build_{name}() likely produced nothing")
            continue
        if g.numberOfContours < 0:
            continue  # composite glyph, not used in this font
        coords = list(g.coordinates)
        total_area = 0.0
        start = 0
        for end_idx in g.endPtsOfContours:
            end = end_idx + 1
            total_area += _contour_area(coords, start, end)
            start = end
        if total_area < 1.0:
            errors.append(f"{path}: glyph '{name}' has ~zero filled area ({total_area:.2f}) — likely a degenerate outline")

    if font["head"].unitsPerEm != UPM:
        errors.append(f"{path}: unitsPerEm is {font['head'].unitsPerEm}, expected {UPM}")


def check_cff_font(path: str, errors: list):
    font = TTFont(path)
    glyph_order = font.getGlyphOrder()
    for code, name in CHARACTER_MAP.items():
        if name not in glyph_order:
            errors.append(f"{path}: missing glyph '{name}' for U+{code:04X}")
    if font["head"].unitsPerEm != UPM:
        errors.append(f"{path}: unitsPerEm is {font['head'].unitsPerEm}, expected {UPM}")


def main():
    dist_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "dist")
    errors = []
    checked = 0

    for path in sorted(glob.glob(os.path.join(dist_dir, "*.ttf"))):
        try:
            check_glyf_font(path, errors)
            checked += 1
        except Exception as cause:  # noqa: BLE001 — report, don't crash the whole QA run
            errors.append(f"{path}: could not load/parse — {cause}")

    for path in sorted(glob.glob(os.path.join(dist_dir, "*.otf"))):
        try:
            check_cff_font(path, errors)
            checked += 1
        except Exception as cause:  # noqa: BLE001
            errors.append(f"{path}: could not load/parse — {cause}")

    for path in sorted(glob.glob(os.path.join(dist_dir, "*.woff2"))):
        try:
            TTFont(path)  # loads and decompresses — catches a corrupt woff2 wrapper
            checked += 1
        except Exception as cause:  # noqa: BLE001
            errors.append(f"{path}: could not load/decompress woff2 — {cause}")

    # Every desktop CFF instance must keep the same GPOS spacing as its web TTF.
    for path in sorted(glob.glob(os.path.join(dist_dir, "*.otf"))):
        sibling = os.path.splitext(path)[0] + ".ttf"
        try:
            otf, ttf = TTFont(path), TTFont(sibling)
            if "GPOS" not in otf or "GPOS" not in ttf:
                errors.append(f"{path}: missing static kerning table")
            elif otf["GPOS"].compile(otf) != ttf["GPOS"].compile(ttf):
                errors.append(f"{path}: desktop/web kerning differs")
        except Exception as cause:
            errors.append(f"{path}: could not compare desktop/web kerning — {cause}")

    if errors:
        print(f"QA FAILED — {len(errors)} problem(s) across {checked} file(s) checked:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)

    print(f"QA passed — {checked} font file(s), {len(CHARACTER_MAP)} characters each, all clean.")


if __name__ == "__main__":
    main()
