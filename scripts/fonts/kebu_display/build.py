"""
Kebu Display — build orchestrator.

Generates Light/Regular/Bold x Upright/Oblique static instances, a real
variable font (wght axis) interpolating Light<->Bold, and exports each as
.ttf, .otf (CFF) and .woff2. One coordinate skeleton (glyphs.py) drives
every output — weights come from varying stroke thickness, italic from an
algorithmic shear, not from separately hand-drawn letterforms.

Usage: python3 scripts/fonts/kebu_display/build.py [--out DIR]
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from glyphs import build_glyph_set, CHARACTER_MAP, UPM, CAP  # noqa: E402

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.qu2cuPen import Qu2CuPen
from fontTools.varLib import build as varlib_build
from fontTools.ttLib import TTFont
from kerning import apply_kerning

FAMILY = "Kebu Display"
ASCENT = round(CAP + 220)
DESCENT = -220

WEIGHTS = {
    "Light": 72,
    "Regular": 108,
    "Bold": 156,
}
OBLIQUE_SHEAR = 0.21  # ~12 degrees


def _setup_common(fb: FontBuilder, glyph_order, glyphs, widths, style_name, full_name, ps_name):
    fb.setupGlyphOrder(glyph_order)
    fb.setupCharacterMap(CHARACTER_MAP)
    fb.setupHorizontalMetrics({name: (round(widths.get(name, 0)), 0) for name in glyph_order})
    fb.setupHorizontalHeader(ascent=ASCENT, descent=DESCENT)
    fb.setupNameTable({
        "familyName": FAMILY,
        "styleName": style_name,
        "uniqueFontIdentifier": f"{FAMILY} {style_name} 1.0",
        "fullName": full_name,
        "psName": ps_name,
        "version": "Version 1.0",
    })
    fb.setupOS2(sTypoAscender=ASCENT, sTypoDescender=DESCENT, usWinAscent=ASCENT, usWinDescent=-DESCENT)
    fb.setupPost()


def build_ttf_instance(stem: float, shear: float, style_name: str, ps_name: str) -> TTFont:
    glyphs, widths = build_glyph_set(stem, shear)
    glyph_order = [".notdef"] + list(glyphs.keys())
    all_glyphs = {".notdef": TTGlyphPen(None).glyph()}
    all_glyphs.update(glyphs)

    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyf(all_glyphs)
    full_name = f"{FAMILY} {style_name}" if style_name != "Regular" else FAMILY
    _setup_common(fb, glyph_order, glyphs, widths, style_name, full_name, ps_name)
    return fb.font


def build_otf_instance(stem: float, shear: float, style_name: str, ps_name: str) -> TTFont:
    """Real CFF/OTF: quadratic contours converted to cubic via Qu2CuPen, same skeleton."""
    glyphs, widths = build_glyph_set(stem, shear)
    glyph_order = [".notdef"] + list(glyphs.keys())

    charstrings = {}
    for name in glyph_order:
        t2pen = T2CharStringPen(widths.get(name, 0), None)
        if name == ".notdef":
            charstrings[name] = t2pen.getCharString()
            continue
        ttglyph = glyphs[name]
        qu2cu = Qu2CuPen(t2pen, max_err=1.0, all_cubic=True)
        ttglyph.draw(qu2cu, glyfTable=None)
        charstrings[name] = t2pen.getCharString()

    fb = FontBuilder(UPM, isTTF=False)
    fb.setupGlyphOrder(glyph_order)
    fb.setupCFF(f"{FAMILY}-{ps_name}", {"FullName": f"{FAMILY} {style_name}"}, charstrings, {})
    full_name = f"{FAMILY} {style_name}" if style_name != "Regular" else FAMILY
    _setup_common(fb, glyph_order, glyphs, widths, style_name, full_name, ps_name)
    return fb.font


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "dist"))
    args = parser.parse_args()
    os.makedirs(args.out, exist_ok=True)

    instances = []
    for weight_name, stem in WEIGHTS.items():
        for style, shear in (("", 0.0), (" Italic", OBLIQUE_SHEAR)):
            style_name = f"{weight_name}{style}".strip()
            ps_name = style_name.replace(" ", "")
            is_regular = weight_name == "Regular" and style == ""
            display_style = style_name if not is_regular else "Regular"
            instances.append((weight_name, stem, shear, display_style, ps_name))

    for weight_name, stem, shear, style_name, ps_name in instances:
        ttf = build_ttf_instance(stem, shear, style_name, ps_name)
        kerned = apply_kerning(ttf, stem)
        if kerned:
            print(f"  {style_name}: {kerned} kern pairs")
        ttf_path = os.path.join(args.out, f"KebuDisplay-{ps_name}.ttf")
        ttf.save(ttf_path)

        woff2_path = os.path.join(args.out, f"KebuDisplay-{ps_name}.woff2")
        ttf.flavor = "woff2"
        ttf.save(woff2_path)
        ttf.flavor = None

        otf = build_otf_instance(stem, shear, style_name, ps_name)
        otf_path = os.path.join(args.out, f"KebuDisplay-{ps_name}.otf")
        otf.save(otf_path)

        print(f"built {style_name}: {ttf_path}, {otf_path}, {woff2_path}")

    build_variable_font(args.out)


def build_variable_font(out_dir: str):
    """A real variable font: wght axis interpolating Light(300) <-> Regular(400, default) <-> Bold(700)."""
    masters = {
        "Light": (WEIGHTS["Light"], 300),
        "Regular": (WEIGHTS["Regular"], 400),
        "Bold": (WEIGHTS["Bold"], 700),
    }
    paths = {}
    for name, (stem, axis_val) in masters.items():
        ttf = build_ttf_instance(stem, 0.0, name, name)
        path = os.path.join(out_dir, f"_master_{name.lower()}.ttf")
        ttf.save(path)
        paths[name] = (path, axis_val)

    designspace = _build_designspace(paths)
    vf, _, _ = varlib_build(designspace)

    vf_path = os.path.join(out_dir, "KebuDisplay-Variable.ttf")
    vf.save(vf_path)
    vf.flavor = "woff2"
    vf.save(os.path.join(out_dir, "KebuDisplay-Variable.woff2"))

    for path, _ in paths.values():
        os.remove(path)
    print(f"built variable font: {vf_path}")


def _build_designspace(paths: dict):
    from fontTools.designspaceLib import DesignSpaceDocument, AxisDescriptor, SourceDescriptor

    doc = DesignSpaceDocument()
    axis = AxisDescriptor()
    axis.tag, axis.name = "wght", "Weight"
    axis.minimum = min(v for _, v in paths.values())
    axis.maximum = max(v for _, v in paths.values())
    axis.default = paths["Regular"][1]
    doc.addAxis(axis)

    for name, (path, axis_val) in paths.items():
        src = SourceDescriptor()
        src.path, src.location, src.styleName = path, {"Weight": axis_val}, name
        doc.addSource(src)

    return doc


if __name__ == "__main__":
    main()
