"""Render the real control font, with no unsupported-character substitution."""
import argparse
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from fontTools.ttLib import TTFont
p=argparse.ArgumentParser();p.add_argument('--font',required=True);p.add_argument('--out',required=True);a=p.parse_args()
coverage=TTFont(a.font).getBestCmap()
im=Image.new('RGB',(1400,1250),'#f8f3ea');d=ImageDraw.Draw(im)
ui='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def label(x,y,s,n=23):d.text((x,y),s,font=ImageFont.truetype(ui,n),fill='#514438')
label(70,45,'19 — PETAL',35);label(70,100,'First editable-outline proof · rendered from the actual OTF')
for y,size,s in [(160,235,'Petal'),(450,120,'Petal Petal'),(660,112,'H O P R S'),(835,105,'a e l n o s t'),(1010,95,'0 1 2 8')]:
 assert all(ord(c) in coverage for c in s),'Unsupported proof text'
 d.text((70,y),s,font=ImageFont.truetype(a.font,size),fill='#17130f')
label(70,1190,'Control glyphs only — full alphabet, accents and further design refinement remain.',21)
Path(a.out).parent.mkdir(parents=True,exist_ok=True);im.save(a.out)
