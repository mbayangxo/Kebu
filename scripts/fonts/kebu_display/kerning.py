"""
Kerning — real GPOS pair adjustments, computed from each glyph's actual
bounding box at both edges rather than guessed values. There's no visual
kerning tool in this pipeline to drag pairs together by eye, so this uses a
bounding-box proximity heuristic: for a curated set of pairs prone to
looking too loose in a geometric all-caps face (diagonals next to
diagonals/verticals — AV, AW, AY, AT, LT, TA, VA, WA, YA, PA, FA...),
measure the real horizontal gap each pair's glyphs leave at the height
where they're closest, and tighten proportionally. Pairs that are already
tight are left alone (clamped to 0, never pushed into overlap).
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from glyphs import build_glyph_set, CAP  # noqa: E402

from fontTools.feaLib.builder import addOpenTypeFeatures
import tempfile

# Pairs where the two triangular/round shapes leave a visually loose gap.
CANDIDATE_PAIRS = [
    "AV", "AW", "AY", "AT", "LT", "TA", "VA", "WA", "YA", "PA", "FA",
    "AC", "AG", "AO", "AQ", "TC", "TO", "TU", "VO", "WO", "YO",
]


def _glyph_edge_profile(ttglyph, side: str, samples=12):
    """Sample the glyph's left or right edge x-coordinate at `samples` evenly spaced heights."""
    if ttglyph.numberOfContours <= 0:
        return None
    coords = list(ttglyph.coordinates)
    if not coords:
        return None
    ys = [y for _, y in coords]
    y0, y1 = min(ys), max(ys)
    if y1 <= y0:
        return None
    profile = []
    for i in range(samples):
        y = y0 + (y1 - y0) * i / (samples - 1)
        xs_at_y = [x for x, yy in coords if abs(yy - y) < (y1 - y0) * 0.08]
        if not xs_at_y:
            continue
        profile.append(min(xs_at_y) if side == "left" else max(xs_at_y))
    return profile if profile else None


def compute_kern_pairs(stem: float) -> dict:
    glyphs, widths = build_glyph_set(stem)
    pairs = {}
    for pair in CANDIDATE_PAIRS:
        left_name, right_name = pair[0], pair[1]
        if left_name not in glyphs or right_name not in glyphs:
            continue
        left_right_edge = _glyph_edge_profile(glyphs[left_name], "right")
        right_left_edge = _glyph_edge_profile(glyphs[right_name], "left")
        if not left_right_edge or not right_left_edge:
            continue
        left_width = widths[left_name]
        # Minimum gap between left glyph's right edge and right glyph's left
        # edge (right glyph's x is relative to its own origin, so add left_width).
        n = min(len(left_right_edge), len(right_left_edge))
        min_gap = min(
            (left_width - left_right_edge[i]) + right_left_edge[i]
            for i in range(n)
        )
        target_gap = stem * 0.9  # the gap a vertical-vertical pair like "HH" would leave
        if min_gap > target_gap:
            kern = -round(min_gap - target_gap)
            # Safety clamp: never kern tighter than half the smaller glyph's
            # width. The bounding-box heuristic can overestimate (e.g. a
            # bowl's widest point isn't where it actually sits near its
            # neighbor), and an uncapped value risks visual collision,
            # which is worse than the loose spacing this is fixing.
            max_tighten = -round(min(widths[left_name], widths[right_name]) * 0.35)
            kern = max(kern, max_tighten)
            if kern < -1:
                pairs[pair] = kern
    return pairs


def fea_source(pairs: dict) -> str:
    glyph_name = {
        **{c: c for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"},
    }
    lines = ["feature kern {"]
    for pair, value in pairs.items():
        left, right = glyph_name[pair[0]], glyph_name[pair[1]]
        lines.append(f"    pos {left} {right} {value};")
    lines.append("} kern;")
    return "\n".join(lines)


def apply_kerning(font, stem: float):
    """Compile and attach a real GPOS kern feature onto `font` (a fontTools TTFont)."""
    pairs = compute_kern_pairs(stem)
    if not pairs:
        return 0
    fea = fea_source(pairs)
    with tempfile.NamedTemporaryFile("w", suffix=".fea", delete=False) as f:
        f.write(fea)
        fea_path = f.name
    try:
        addOpenTypeFeatures(font, fea_path)
    finally:
        os.remove(fea_path)
    return len(pairs)


if __name__ == "__main__":
    for name, stem in [("Light", 72), ("Regular", 108), ("Bold", 156)]:
        pairs = compute_kern_pairs(stem)
        print(f"{name} (stem={stem}): {len(pairs)} kern pairs")
        for p, v in sorted(pairs.items()):
            print(f"  {p}: {v}")
