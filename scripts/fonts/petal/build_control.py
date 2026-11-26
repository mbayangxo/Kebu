"""Original Petal control outlines: a limited design proof, not a complete family.
No third-party font outlines are read. Cubic curves below are the editable source.
Build: python scripts/fonts/petal/build_control.py --out DIRECTORY
"""
import argparse,json
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.reverseContourPen import ReverseContourPen
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString

K=.55228475

def rect(p,x,y,w,h):
 p.moveTo((x,y));p.lineTo((x,y+h));p.lineTo((x+w,y+h));p.lineTo((x+w,y));p.closePath()
def oval(p,x,y,rx,ry,reverse=False):
 # Outer clockwise, counter counterclockwise.
 s=-1 if not reverse else 1
 p.moveTo((x+rx,y));p.curveTo((x+rx,y+s*K*ry),(x+K*rx,y+s*ry),(x,y+s*ry));p.curveTo((x-K*rx,y+s*ry),(x-rx,y+s*K*ry),(x-rx,y));p.curveTo((x-rx,y-s*K*ry),(x-K*rx,y-s*ry),(x,y-s*ry));p.curveTo((x+K*rx,y-s*ry),(x+rx,y-s*K*ry),(x+rx,y));p.closePath()
def stem(p,x,h,w=92):
 rect(p,x,0,w,h);rect(p,x-38,0,w+76,15);rect(p,x-30,h-15,w+60,15)
def round_letter(p,cap=False):
 if cap:oval(p,330,350,270,360);oval(p,330,350,163,340,True)
 else:oval(p,255,235,212,245);oval(p,255,235,119,225,True)
def bowl(p):
 p.moveTo((155,700));p.curveTo((460,715),(590,650),(590,526));p.curveTo((590,403),(450,349),(155,355));p.lineTo((155,378));p.curveTo((400,365),(481,421),(481,526));p.curveTo((481,631),(397,687),(155,677));p.closePath()
def draw(p,c):
 if c==' ':return
 if c in 'Oo0':round_letter(p,c!='o');return
 if c=='P':stem(p,85,700);bowl(p);return
 if c=='H':stem(p,85,700);stem(p,485,700);rect(p,177,334,308,22);return
 if c=='R':
  stem(p,85,700);bowl(p)
  p.moveTo((270,366));p.curveTo((491,390),(470,40),(608,16));p.lineTo((644,16));p.lineTo((644,0));p.curveTo((380,-21),(421,276),(270,343));p.closePath();return
 if c=='l':stem(p,72,710,78);return
 if c=='t':
  rect(p,128,105,76,500);rect(p,35,460,279,21)
  p=ReverseContourPen(p)
  p.moveTo((128,111));p.curveTo((128,-50),(303,-25),(337,80));p.lineTo((321,88));p.curveTo((278,9),(204,19),(204,112));p.closePath();return
 if c=='a':round_letter(p);stem(p,400,480,77);return
 if c=='n':
  stem(p,65,480,77)
  p.moveTo((142,321));p.curveTo((143,500),(426,588),(426,333));p.lineTo((426,0));p.lineTo((344,0));p.lineTo((344,340));p.curveTo((344,541),(163,464),(142,321));p.closePath();rect(p,310,0,150,15);return
 if c=='e':
  p.moveTo((449,110));p.curveTo((368,-89),(43,-27),(43,228));p.curveTo((43,541),(470,584),(471,245));p.lineTo((136,245));p.curveTo((136,-8),(358,-18),(433,119));p.closePath()
  p.moveTo((138,267));p.lineTo((386,267));p.curveTo((387,556),(143,533),(138,267));p.closePath();return
 if c in 'Ss':
  scale=1 if c=='S' else .7
  from fontTools.pens.transformPen import TransformPen
  q=TransformPen(p,(scale,0,0,scale,0,0))
  q.moveTo((508,516));q.curveTo((531,748),(70,787),(58,526));q.curveTo((47,333),(481,377),(474,166));q.curveTo((470,-54),(58,-4),(77,208));q.lineTo((58,208));q.lineTo((58,40));q.lineTo((78,40));q.lineTo((92,67));q.curveTo((291,-99),(595,4),(581,219));q.curveTo((570,408),(155,395),(160,582));q.curveTo((164,750),(486,711),(489,516));q.closePath();return
 if c=='1':stem(p,160,700,90);rect(p,81,674,79,22);return
 if c=='2':
  p.moveTo((64,502));p.curveTo((48,781),(581,795),(566,520));p.curveTo((552,342),(207,193),(101,77));p.lineTo((498,77));p.lineTo((542,138));p.lineTo((562,138));p.lineTo((538,0));p.lineTo((47,0));p.lineTo((47,24));p.curveTo((159,210),(466,378),(465,563));p.curveTo((465,756),(83,727),(84,502));p.closePath();return
 if c=='8':
  oval(p,290,521,218,190);oval(p,290,521,125,171,True);oval(p,290,170,244,183);oval(p,290,170,148,165,True);return
 raise ValueError(c)

WIDTHS={' ':280,'H':665,'O':660,'P':640,'R':680,'S':640,'n':510,'o':510,'a':535,'e':510,'s':455,'t':365,'l':245,'0':660,'1':400,'2':630,'8':580}
def build(out):
 out.mkdir(parents=True,exist_ok=True);order=['.notdef']+list(WIDTHS);charstrings={}
 for name in order:
  pen=T2CharStringPen(WIDTHS.get(name,600),None)
  if name=='.notdef':rect(pen,40,0,490,700);rect(pen,65,25,440,650)
  else:draw(pen,name)
  charstrings[name]=pen.getCharString()
 fb=FontBuilder(1000,isTTF=False);fb.setupGlyphOrder(order);fb.setupCharacterMap({ord(c):c for c in WIDTHS});fb.setupCFF('KebuPetalProof-Regular',{'FullName':'Kebu Petal Proof Regular'},charstrings,{})
 fb.setupHorizontalMetrics({g:(WIDTHS.get(g,600),0) for g in order});fb.setupHorizontalHeader(ascent=850,descent=-250)
 fb.setupNameTable({'familyName':'Kebu Petal Proof','styleName':'Regular','fullName':'Kebu Petal Proof Regular','psName':'KebuPetalProof-Regular','version':'Version 0.001; CONTROL PROOF ONLY'})
 fb.setupOS2(sTypoAscender=850,sTypoDescender=-250,usWinAscent=850,usWinDescent=250);fb.setupPost()
 addOpenTypeFeaturesFromString(fb.font,'feature kern {pos P e -35; pos P a -30; pos t a -12; pos e t -10;} kern;')
 fb.font['head'].created=fb.font['head'].modified=3786912000;fb.font.recalcTimestamp=False
 fb.save(out/'KebuPetalProof-Regular.otf')
 (out/'coverage.json').write_text(json.dumps({'family':'Kebu Petal Proof','stage':'control-outlines-not-full-family','characters':list(WIDTHS),'selection':'19 Petal; user also selected 20 Amour, 21 Pearl, 23 Chérie','sources':'Original cubic paths in build_control.py. No third-party outlines imported. Reference is the approved visual concept; final design approval and rights review remain open.'},indent=2)+'\n')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--out',required=True);build(Path(parser.parse_args().out))
