"""
Kebu Display — glyph skeleton.

An original geometric all-caps display typeface, built from scratch with
fontTools. No existing font's outlines, hinting, or glyph data are used or
referenced anywhere in this module; every contour is authored here as
explicit coordinate/arc arithmetic, not traced or derived from any other
font file.

Scope (v1): uppercase A-Z, digits 0-9, essential punctuation, space, and
the French accented capitals most needed for Francophone West Africa
(ÉÈÀÇ). A display/headline face, not a body-text face — lowercase is a
deliberately separate, later increment.

`build_glyph_set(stem)` returns a fresh (glyphs, widths) pair for a given
stroke thickness — the same coordinate skeleton at different `stem` values
is how Light/Regular/Bold are generated (see weights.py), so there is one
source of truth per letterform, not one hand-tuned copy per weight.
"""
import math
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen

UPM = 1000
CAP = 680
BASE = 0

# Letter widths (independent of weight — only stroke thickness varies per weight)
W_NARROW, W_MED, W_WIDE, W_XWIDE = 420, 560, 680, 820


def build_glyph_set(stem: float, shear: float = 0.0):
    """Build the full glyph set at a given stroke thickness (`stem`, in font
    units). `shear` (e.g. 0.21 ~= 12deg) applies an algorithmic oblique —
    every contour sheared around the baseline — which is how Italic is
    generated here rather than hand-drawn cursive letterforms."""

    def arc_quad(cx, cy, rx, ry, a0, a1, n=3):
        """Quadratic-bezier (control, end) pairs approximating an elliptical arc a0->a1 (radians)."""
        pts = []
        step = (a1 - a0) / n
        for i in range(n):
            s0 = a0 + i * step
            s1 = s0 + step
            mid = s0 + step / 2
            k = 1.0 / math.cos(step / 2)
            cxp = cx + rx * math.cos(mid) * k
            cyp = cy + ry * math.sin(mid) * k
            ex = cx + rx * math.cos(s1)
            ey = cy + ry * math.sin(s1)
            pts.append(((cxp, cyp), (ex, ey)))
        return pts

    def _signed_area(points):
        s = 0.0
        n = len(points)
        for i in range(n):
            x1, y1 = points[i]
            x2, y2 = points[(i + 1) % n]
            s += x1 * y2 - x2 * y1
        return s

    def poly(pen, points):
        # Force clockwise winding (negative signed area) on every solid
        # contour. Two solid shapes with opposite winding cancel under
        # nonzero-fill wherever they overlap — the bug class that broke
        # every curved letter in the first version of this typeface.
        if _signed_area(points) > 0:
            points = list(reversed(points))
        pen.moveTo((round(points[0][0]), round(points[0][1])))
        for p in points[1:]:
            pen.lineTo((round(p[0]), round(p[1])))
        pen.closePath()

    def stroke_arc(pen, cx, cy, rx, ry, thickness, a0, a1, segments=16):
        """A thick circular/elliptical arc stroke, drawn as overlapping solid
        trapezoid quads. Always additive under nonzero-fill (every quad goes
        through poly()'s forced winding), so overlapping segments can never
        cancel — this is why round letters are reliable here."""
        n = max(segments, 2)
        step = (a1 - a0) / n
        overlap = abs(step) * 0.12
        for i in range(n):
            s0 = a0 + i * step - overlap
            s1 = a0 + (i + 1) * step + overlap
            pts = [
                (cx + rx * math.cos(s0), cy + ry * math.sin(s0)),
                (cx + rx * math.cos(s1), cy + ry * math.sin(s1)),
                (cx + (rx - thickness) * math.cos(s1), cy + (ry - thickness) * math.sin(s1)),
                (cx + (rx - thickness) * math.cos(s0), cy + (ry - thickness) * math.sin(s0)),
            ]
            poly(pen, pts)

    def open_ring(pen, cx, cy, rx, ry, thickness, opening_center, opening_half, segments=24):
        """Ring with a gap centered at `opening_center` (radians) — C/G/S/digit bowls."""
        a0 = opening_center + opening_half
        a1 = opening_center - opening_half + 2 * math.pi
        stroke_arc(pen, cx, cy, rx, ry, thickness, a0, a1, segments)

    def half_bowl(pen, cx, cy, rx, ry, thickness, segments=16):
        """Right-half bowl (angle -90..+90 through 0), tapering to a point at
        x=cx top/bottom — merges flush against a stem whose right edge is at x=cx."""
        stroke_arc(pen, cx, cy, rx, ry, thickness, -math.pi / 2, math.pi / 2, segments)

    def vbar(x, w=None, y0=BASE, y1=CAP):
        w = stem if w is None else w
        return [(x, y0), (x + w, y0), (x + w, y1), (x, y1)]

    def hbar(x0, x1, y, h=None):
        h = stem if h is None else h
        return [(x0, y), (x1, y), (x1, y + h), (x0, y + h)]

    def diag(p0, p1, w):
        """Quad strip of width w along the vector p0->p1 (perpendicular offset)."""
        dx, dy = p1[0] - p0[0], p1[1] - p0[1]
        length = math.hypot(dx, dy)
        nx, ny = -dy / length * w / 2, dx / length * w / 2
        return [
            (p0[0] + nx, p0[1] + ny), (p1[0] + nx, p1[1] + ny),
            (p1[0] - nx, p1[1] - ny), (p0[0] - nx, p0[1] - ny),
        ]

    glyphs, widths = {}, {}

    def glyph(name, width, build):
        base_pen = TTGlyphPen(None)
        pen = TransformPen(base_pen, (1, 0, shear, 1, 0, 0)) if shear else base_pen
        build(pen)
        glyphs[name] = base_pen.glyph()
        widths[name] = width

    glyph("space", W_MED, lambda p: None)

    glyph("A", W_WIDE, lambda p: (
        poly(p, [(0, 0), (stem, 0), (W_WIDE/2, CAP), (W_WIDE/2 - stem*0.9, CAP), (W_WIDE*0.18, stem*1.1)]),
        poly(p, [(W_WIDE, 0), (W_WIDE - stem, 0), (W_WIDE*0.82, stem*1.1), (W_WIDE/2 + stem*0.9, CAP), (W_WIDE/2, CAP)]),
        poly(p, [(W_WIDE*0.28, CAP*0.36), (W_WIDE*0.72, CAP*0.36), (W_WIDE*0.72, CAP*0.36+stem*0.85), (W_WIDE*0.28, CAP*0.36+stem*0.85)]),
    ))

    def build_B(p):
        poly(p, vbar(0))
        half_bowl(p, stem, CAP*0.75, W_MED*0.52 - stem, CAP*0.25, stem*0.95)
        half_bowl(p, stem, CAP*0.25, W_MED*0.58 - stem, CAP*0.25, stem*0.95)
        poly(p, hbar(0, stem, CAP/2 - stem/2))
    glyph("B", W_MED, build_B)

    def build_C(p):
        open_ring(p, W_MED/2, CAP/2, W_MED/2, CAP/2, stem, opening_center=0, opening_half=0.62)
    glyph("C", W_MED, build_C)

    def build_D(p):
        poly(p, vbar(0))
        half_bowl(p, stem, CAP/2, W_MED*0.62 - stem, CAP/2, stem, segments=22)
    glyph("D", W_MED, build_D)

    def build_E(p):
        poly(p, vbar(0))
        poly(p, hbar(0, W_MED*0.9, CAP-stem))
        poly(p, hbar(0, W_MED*0.78, CAP/2-stem/2))
        poly(p, hbar(0, W_MED*0.9, 0))
    glyph("E", W_MED, build_E)

    def build_F(p):
        poly(p, vbar(0))
        poly(p, hbar(0, W_MED*0.9, CAP-stem))
        poly(p, hbar(0, W_MED*0.78, CAP/2-stem/2))
    glyph("F", W_MED, build_F)

    def build_G(p):
        open_ring(p, W_WIDE*0.46, CAP/2, W_WIDE*0.46, CAP/2, stem, opening_center=0, opening_half=0.5)
        poly(p, hbar(W_WIDE*0.46, W_WIDE*0.84, CAP*0.46, stem*0.9))
        poly(p, vbar(W_WIDE*0.84-stem, stem, CAP*0.18, CAP*0.5))
    glyph("G", W_WIDE, build_G)

    def build_H(p):
        poly(p, vbar(0))
        poly(p, vbar(W_WIDE-stem))
        poly(p, hbar(stem, W_WIDE-stem, CAP/2-stem/2))
    glyph("H", W_WIDE, build_H)

    glyph("I", W_NARROW*0.55, lambda p: poly(p, vbar(W_NARROW*0.55/2 - stem/2)))

    def build_J(p):
        sx = W_MED*0.56
        poly(p, vbar(sx, stem, CAP*0.26, CAP))
        poly(p, diag((sx+stem*0.5, CAP*0.26), (W_MED*0.06, CAP*0.02), stem*1.05))
    glyph("J", W_MED, build_J)

    def build_K(p):
        poly(p, vbar(0))
        poly(p, diag((stem, CAP*0.52), (W_WIDE*0.92, CAP), stem))
        poly(p, diag((stem, CAP*0.48), (W_WIDE*0.92, 0), stem))
    glyph("K", W_WIDE, build_K)

    def build_L(p):
        poly(p, vbar(0))
        poly(p, hbar(0, W_MED*0.82, 0))
    glyph("L", W_MED, build_L)

    def build_M(p):
        poly(p, vbar(0))
        poly(p, vbar(W_XWIDE-stem))
        poly(p, diag((stem*0.5, CAP), (W_XWIDE/2, CAP*0.22), stem*1.05))
        poly(p, diag((W_XWIDE/2, CAP*0.22), (W_XWIDE-stem*0.5, CAP), stem*1.05))
    glyph("M", W_XWIDE, build_M)

    def build_N(p):
        poly(p, vbar(0))
        poly(p, vbar(W_WIDE-stem))
        poly(p, diag((stem*0.5, CAP), (W_WIDE-stem*0.5, 0), stem*1.05))
    glyph("N", W_WIDE, build_N)

    def build_O(p):
        stroke_arc(p, W_WIDE/2, CAP/2, W_WIDE/2, CAP/2, stem, 0, 2*math.pi, segments=28)
    glyph("O", W_WIDE, build_O)

    def build_P(p):
        poly(p, vbar(0))
        half_bowl(p, stem, CAP*0.73, W_MED*0.62 - stem, CAP*0.27, stem, segments=18)
    glyph("P", W_MED, build_P)

    def build_Q(p):
        build_O(p)
        poly(p, diag((W_WIDE*0.58, CAP*0.3), (W_WIDE*0.85, -CAP*0.05), stem*1.1))
    glyph("Q", W_WIDE, build_Q)

    def build_R(p):
        poly(p, vbar(0))
        half_bowl(p, stem, CAP*0.73, W_MED*0.62 - stem, CAP*0.27, stem, segments=18)
        poly(p, diag((W_MED*0.42, CAP*0.47), (W_MED*0.95, 0), stem))
    glyph("R", W_MED, build_R)

    def build_S(p):
        open_ring(p, W_MED/2, CAP*0.735, W_MED/2, CAP*0.265, stem*0.95, opening_center=math.radians(235), opening_half=0.55)
        open_ring(p, W_MED/2, CAP*0.265, W_MED/2, CAP*0.265, stem*0.95, opening_center=math.radians(55), opening_half=0.55)
    glyph("S", W_MED, build_S)

    def build_T(p):
        poly(p, hbar(0, W_MED, CAP-stem))
        poly(p, vbar(W_MED/2-stem/2))
    glyph("T", W_MED, build_T)

    def build_U(p):
        poly(p, vbar(0, stem, CAP*0.42, CAP))
        poly(p, vbar(W_WIDE-stem, stem, CAP*0.42, CAP))
        stroke_arc(p, W_WIDE/2, CAP*0.42, W_WIDE/2, CAP*0.42, stem, math.pi, 2*math.pi, segments=20)
    glyph("U", W_WIDE, build_U)

    def build_V(p):
        poly(p, diag((stem*0.3, CAP), (W_WIDE/2, 0), stem*1.1))
        poly(p, diag((W_WIDE/2, 0), (W_WIDE-stem*0.3, CAP), stem*1.1))
    glyph("V", W_WIDE, build_V)

    def build_W(p):
        poly(p, diag((stem*0.2, CAP), (W_XWIDE*0.28, 0), stem))
        poly(p, diag((W_XWIDE*0.28, 0), (W_XWIDE/2, CAP*0.7), stem))
        poly(p, diag((W_XWIDE/2, CAP*0.7), (W_XWIDE*0.72, 0), stem))
        poly(p, diag((W_XWIDE*0.72, 0), (W_XWIDE-stem*0.2, CAP), stem))
    glyph("W", W_XWIDE, build_W)

    def build_X(p):
        poly(p, diag((stem*0.3, 0), (W_WIDE-stem*0.3, CAP), stem))
        poly(p, diag((stem*0.3, CAP), (W_WIDE-stem*0.3, 0), stem))
    glyph("X", W_WIDE, build_X)

    def build_Y(p):
        poly(p, diag((stem*0.3, CAP), (W_WIDE/2, CAP*0.5), stem*1.05))
        poly(p, diag((W_WIDE-stem*0.3, CAP), (W_WIDE/2, CAP*0.5), stem*1.05))
        poly(p, vbar(W_WIDE/2-stem/2, stem, 0, CAP*0.55))
    glyph("Y", W_WIDE, build_Y)

    def build_Z(p):
        poly(p, hbar(0, W_MED, CAP-stem))
        poly(p, hbar(0, W_MED, 0))
        poly(p, diag((stem*0.4, stem*0.5), (W_MED-stem*0.4, CAP-stem*0.5), stem*1.05))
    glyph("Z", W_MED, build_Z)

    # ---- Digits ----
    DCAP = CAP

    def build_0(p):
        stroke_arc(p, W_WIDE*0.46, DCAP/2, W_WIDE*0.46, DCAP/2, stem, 0, 2*math.pi, segments=26)
    glyph("zero", W_WIDE*0.92, build_0)
    glyph("one", W_NARROW*0.5, lambda p: poly(p, vbar(W_NARROW*0.5/2-stem/2)))

    def build_2(p):
        open_ring(p, W_MED*0.5, DCAP*0.75, W_MED*0.42, DCAP*0.25, stem*0.95, opening_center=math.radians(235), opening_half=0.5)
        poly(p, diag((W_MED*0.85, DCAP*0.55), (stem*0.4, stem*0.5), stem*1.05))
        poly(p, hbar(0, W_MED*0.92, 0))
    glyph("two", W_MED, build_2)

    def build_3(p):
        open_ring(p, W_MED*0.44, DCAP*0.735, W_MED*0.44, DCAP*0.265, stem*0.9, opening_center=math.radians(200), opening_half=0.65)
        open_ring(p, W_MED*0.44, DCAP*0.265, W_MED*0.44, DCAP*0.265, stem*0.9, opening_center=math.radians(160), opening_half=0.65)
    glyph("three", W_MED, build_3)

    def build_4(p):
        poly(p, vbar(W_MED*0.62-stem/2))
        poly(p, diag((W_MED*0.62, DCAP), (stem*0.3, DCAP*0.32), stem))
        poly(p, hbar(0, W_MED*0.9, DCAP*0.32-stem/2))
    glyph("four", W_MED, build_4)

    def build_5(p):
        poly(p, hbar(0, W_MED*0.9, DCAP-stem))
        poly(p, vbar(0, stem, DCAP*0.5, DCAP))
        poly(p, hbar(0, stem*1.4, DCAP*0.5-stem*0.3))
        half_bowl(p, stem, DCAP*0.27, W_MED*0.56 - stem, DCAP*0.27, stem*0.95)
    glyph("five", W_MED, build_5)

    def build_6(p):
        # Full closed bowl (same proven technique as 0/8) instead of an
        # open ring with a precisely-aimed gap — the tail just overlaps
        # generously through the top of the circle, so there is no
        # opening-angle alignment to get wrong.
        bcx, bcy, brx, bry = W_MED*0.48, DCAP*0.27, W_MED*0.44, DCAP*0.27
        stroke_arc(p, bcx, bcy, brx, bry, stem*0.95, 0, 2*math.pi, segments=22)
        poly(p, diag((bcx, bcy + bry*0.4), (W_MED*0.86, DCAP*0.98), stem*1.05))
    glyph("six", W_MED, build_6)

    def build_7(p):
        poly(p, hbar(0, W_MED*0.92, DCAP-stem))
        poly(p, diag((W_MED*0.92, DCAP-stem*0.5), (stem*0.6, 0), stem*1.05))
    glyph("seven", W_MED, build_7)

    def build_8(p):
        stroke_arc(p, W_MED*0.48, DCAP*0.735, W_MED*0.40, DCAP*0.265, stem*0.9, 0, 2*math.pi, segments=20)
        stroke_arc(p, W_MED*0.48, DCAP*0.265, W_MED*0.40, DCAP*0.265, stem*0.9, 0, 2*math.pi, segments=20)
    glyph("eight", W_MED, build_8)

    def build_9(p):
        # Same full-closed-bowl technique as six() — robust, no opening-angle alignment needed.
        bcx, bcy, brx, bry = W_MED*0.5, DCAP*0.73, W_MED*0.44, DCAP*0.27
        stroke_arc(p, bcx, bcy, brx, bry, stem*0.95, 0, 2*math.pi, segments=22)
        poly(p, diag((bcx, bcy - bry*0.4), (stem*0.5, 0), stem*1.05))
    glyph("nine", W_MED, build_9)

    # ---- Punctuation ----
    def build_period(p):
        poly(p, [(0, 0), (stem, 0), (stem, stem), (0, stem)])
    glyph("period", W_NARROW*0.55, build_period)

    def build_comma(p):
        poly(p, diag((stem*0.4, stem*0.2), (0, -CAP*0.14), stem*0.9))
    glyph("comma", W_NARROW*0.55, build_comma)

    def build_hyphen(p):
        poly(p, hbar(0, W_MED*0.62, CAP*0.42, stem*0.8))
    glyph("hyphen", W_MED*0.7, build_hyphen)

    def build_colon(p):
        poly(p, [(0, 0), (stem, 0), (stem, stem), (0, stem)])
        poly(p, [(0, CAP*0.5), (stem, CAP*0.5), (stem, CAP*0.5+stem), (0, CAP*0.5+stem)])
    glyph("colon", W_NARROW*0.55, build_colon)

    def build_semicolon(p):
        poly(p, diag((stem*0.4, stem*0.2), (0, -CAP*0.14), stem*0.9))
        poly(p, [(0, CAP*0.5), (stem, CAP*0.5), (stem, CAP*0.5+stem), (0, CAP*0.5+stem)])
    glyph("semicolon", W_NARROW*0.55, build_semicolon)

    def build_excl(p):
        poly(p, vbar(W_NARROW*0.55/2-stem/2, stem, CAP*0.3, CAP))
        poly(p, [(W_NARROW*0.55/2-stem/2, 0), (W_NARROW*0.55/2+stem/2, 0), (W_NARROW*0.55/2+stem/2, stem), (W_NARROW*0.55/2-stem/2, stem)])
    glyph("exclam", W_NARROW*0.55, build_excl)

    def build_quest(p):
        open_ring(p, W_MED*0.42, CAP*0.78, W_MED*0.36, CAP*0.2, stem*0.95, opening_center=math.radians(235), opening_half=0.6)
        poly(p, diag((W_MED*0.42, CAP*0.5), (W_MED*0.42, CAP*0.3), stem))
        poly(p, [(W_MED*0.42-stem/2, 0), (W_MED*0.42+stem/2, 0), (W_MED*0.42+stem/2, stem), (W_MED*0.42-stem/2, stem)])
    glyph("question", W_MED, build_quest)

    def build_quote(p):
        poly(p, vbar(W_NARROW*0.3, stem*0.8, CAP*0.72, CAP))
    glyph("quotesingle", W_NARROW*0.6, build_quote)

    glyph("parenleft", W_NARROW*0.75, lambda p: (
        poly(p, diag((W_NARROW*0.7, -CAP*0.05), (W_NARROW*0.1, CAP*0.5), stem*0.75)),
        poly(p, diag((W_NARROW*0.1, CAP*0.5), (W_NARROW*0.7, CAP*1.02), stem*0.75)),
    ))
    glyph("parenright", W_NARROW*0.75, lambda p: (
        poly(p, diag((W_NARROW*0.05, -CAP*0.05), (W_NARROW*0.65, CAP*0.5), stem*0.75)),
        poly(p, diag((W_NARROW*0.65, CAP*0.5), (W_NARROW*0.05, CAP*1.02), stem*0.75)),
    ))

    def build_slash(p):
        poly(p, diag((stem*0.3, -CAP*0.05), (W_MED-stem*0.3, CAP*1.02), stem*0.95))
    glyph("slash", W_MED*0.9, build_slash)

    # ---- French accented capitals (minimum viable diacritics) ----
    ACCENT_H = CAP + 110

    def build_accent_acute(base_builder, width):
        def b(p):
            base_builder(p)
            poly(p, diag((width*0.42, CAP+40), (width*0.68, ACCENT_H), stem*0.8))
        return b

    def build_accent_grave(base_builder, width):
        def b(p):
            base_builder(p)
            poly(p, diag((width*0.68, CAP+40), (width*0.42, ACCENT_H), stem*0.8))
        return b

    def build_cedilla(base_builder, width):
        def b(p):
            base_builder(p)
            poly(p, diag((width*0.42, -stem*0.2), (width*0.58, -CAP*0.16), stem*0.75))
        return b

    def build_A(p):
        poly(p, [(0, 0), (stem, 0), (W_WIDE/2, CAP), (W_WIDE/2 - stem*0.9, CAP), (W_WIDE*0.18, stem*1.1)])
        poly(p, [(W_WIDE, 0), (W_WIDE - stem, 0), (W_WIDE*0.82, stem*1.1), (W_WIDE/2 + stem*0.9, CAP), (W_WIDE/2, CAP)])
        poly(p, [(W_WIDE*0.28, CAP*0.36), (W_WIDE*0.72, CAP*0.36), (W_WIDE*0.72, CAP*0.36+stem*0.85), (W_WIDE*0.28, CAP*0.36+stem*0.85)])

    glyph("Eacute", W_MED, build_accent_acute(build_E, W_MED))
    glyph("Egrave", W_MED, build_accent_grave(build_E, W_MED))
    glyph("Agrave", W_WIDE, build_accent_grave(build_A, W_WIDE))
    glyph("Ccedilla", W_MED, build_cedilla(build_C, W_MED))

    return glyphs, widths


CHARACTER_MAP = {
    ord(" "): "space", ord("."): "period", ord(","): "comma", ord("-"): "hyphen",
    ord(":"): "colon", ord(";"): "semicolon", ord("!"): "exclam", ord("?"): "question",
    ord("'"): "quotesingle", ord("("): "parenleft", ord(")"): "parenright", ord("/"): "slash",
    ord("0"): "zero", ord("1"): "one", ord("2"): "two", ord("3"): "three", ord("4"): "four",
    ord("5"): "five", ord("6"): "six", ord("7"): "seven", ord("8"): "eight", ord("9"): "nine",
    **{ord(chr(c)): chr(c) for c in range(ord("A"), ord("Z") + 1)},
    0xC9: "Eacute", 0xC8: "Egrave", 0xC0: "Agrave", 0xC7: "Ccedilla",
}
