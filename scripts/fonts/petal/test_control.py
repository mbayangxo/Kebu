import tempfile,unittest
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
from build_control import build,WIDTHS
class ControlProofTests(unittest.TestCase):
 def test_font_is_reproducible_and_declares_only_drawn_characters(self):
  with tempfile.TemporaryDirectory() as a,tempfile.TemporaryDirectory() as b:
   build(Path(a));build(Path(b));name='KebuPetalProof-Regular.otf'
   self.assertEqual((Path(a)/name).read_bytes(),(Path(b)/name).read_bytes())
   f=TTFont(Path(a)/name);self.assertEqual(set(f.getBestCmap()),{ord(c) for c in WIDTHS});self.assertIn('GPOS',f)
   gs=f.getGlyphSet()
   for code,glyph in f.getBestCmap().items():
    if code==32:continue
    pen=BoundsPen(gs);gs[glyph].draw(pen);self.assertIsNotNone(pen.bounds)
    self.assertGreaterEqual(pen.bounds[1],-250);self.assertLessEqual(pen.bounds[3],850)
if __name__=='__main__':unittest.main()
