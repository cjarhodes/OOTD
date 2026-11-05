"""Generate original garment illustrations; no external images or licenses required."""
from pathlib import Path
import json
out=Path(__file__).parent/'dist/assets'
colors={'White':'#e3dfd4','Cream':'#cfc0a0','Black':'#353837','Navy':'#35485c','Blue':'#8ca4b7','Olive':'#76795b','Brown':'#72533c','Grey':'#868780','Burgundy':'#814b50','Green':'#577065'}
items=[('t1','White','tee'),('t2','Blue','shirt'),('t3','Black','tee'),('t4','Cream','polo'),('t5','Burgundy','tee'),('t6','Green','shirt'),('b1','Navy','jeans'),('b2','Grey','trousers'),('b3','Olive','trousers'),('b4','Cream','jeans'),('s1','White','sneakers'),('s2','Brown','loafers'),('s3','Black','boots'),('s4','Grey','sneakers'),('l1','Olive','overshirt'),('l2','Cream','sweater'),('l3','Navy','blazer'),('l4','Black','jacket')]
for id,color,kind in items:
 c=colors[color]
 defs=f'''<defs><linearGradient id="fabric" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="{c}"/><stop offset=".45" stop-color="{c}"/><stop offset="1" stop-color="{c}" stop-opacity=".85"/></linearGradient><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#24291c" flood-opacity=".14"/></filter><pattern id="weave" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 0h3M0 0v3" stroke="#fff" stroke-opacity=".08" stroke-width=".4"/></pattern></defs>'''
 detail=''; shape=''
 if kind in ['tee','polo','shirt']:
  shape='M106 53 70 67 30 117 69 146 88 123 83 276Q150 286 217 276L212 123 231 146 270 117 230 67 194 53Q150 78 106 53Z'
  detail='<path d="M108 54Q150 95 192 54M109 59Q150 104 191 59M88 123 96 98M212 123 204 98M86 265Q150 274 214 265" fill="none" stroke="#222" stroke-opacity=".16" stroke-width="2"/>'
  if kind in ['shirt','polo']:
   detail+='<path d="m111 52 39 22 39-22-12 39-27-17-27 17Z" fill="url(#fabric)" stroke="#222" stroke-opacity=".25"/><path d="M150 75v'+('198' if kind=='shirt' else '54')+'" stroke="#222" stroke-opacity=".2" stroke-width="3"/>'
   detail+=''.join(f'<circle cx="151" cy="{y}" r="1.8" fill="#e9e5da"/>' for y in range(94,270 if kind=='shirt' else 130,25))
  if id=='t6':detail+='<path d="M100 100v165m13-170v171m14-170v171m47-170v171m13-170v171m13-164v164" stroke="#e0dbca" stroke-opacity=".35" stroke-width="5"/>'
 elif kind in ['jeans','trousers']:
  shape='M82 28Q150 35 218 28L227 115 219 292 163 292 151 134 138 292 81 292 74 115Z'
  detail='<path d="M82 43Q150 50 219 43M150 44v72l-14 13M91 50l-5 38 27-5M209 50l5 38-27-5M82 280h56m25 0h57" fill="none" stroke="#222" stroke-opacity=".24" stroke-width="2"/><path d="m112 102-6 162m83-162 4 162" stroke="#fff" stroke-opacity=".12" stroke-width="2"/>'
  detail+='<circle cx="151" cy="40" r="3" fill="#b0a188"/>'
  if kind=='trousers': detail+='<path d="m111 48 5 73m72-73-5 73" stroke="#222" stroke-opacity=".23" stroke-width="3"/>'
 elif kind in ['sneakers','loafers','boots']:
  shape='M67 140 80 102Q106 100 132 128L167 143 232 151Q260 157 258 177L251 187 61 187Q49 178 55 158Z'
  if kind=='boots':shape='M70 139 73 64 132 64 138 134 181 151 235 157Q259 163 256 184H59Q48 173 55 156Z'
  detail='<path d="M57 174Q146 184 256 172L252 187H60Z" fill="#dedbd1" stroke="#aaa99e" stroke-width="1"/><path d="m75 141 39 18 48-15m-83-31 33 25-4 24" fill="none" stroke="#222" stroke-opacity=".24" stroke-width="2"/>'
  if kind=='sneakers':detail+='<path d="m112 128 31 6m-24 0 32 7m-24 0 32 7m-24 0 32 7" stroke="#e9e5db" stroke-width="4" stroke-linecap="round"/>'
  elif kind=='loafers':detail+='<path d="m150 144-12 19 50 7 16-20m-18-1 38 8" fill="none" stroke="#3d3024" stroke-opacity=".5" stroke-width="4"/>'
  detail='<g transform="translate(0 -20)">'+detail+'</g>' if False else detail
 else:
  shape='M111 38 69 56 34 140 29 257 68 266 88 140 82 286Q150 296 218 286L212 140 232 266 271 257 266 140 231 56 189 38Q150 62 111 38Z'
  detail='<path d="M88 140 97 72m115 68-9-68M81 274q69 11 138 0M33 247l35 8m164 0 35-8" fill="none" stroke="#222" stroke-opacity=".2" stroke-width="2"/>'
  if kind=='sweater':detail+='<path d="M110 39Q150 92 190 39M114 39Q150 81 186 39M84 277q66 9 132 0" fill="none" stroke="#ad9e80" stroke-width="7"/><path d="M100 104v150m8-156v159m8-160v161m8-160v161m8-160v162m8-161v161m20-160v161m8-160v160m8-160v159m8-157v155m8-152v150m8-146v144" stroke="#fff" stroke-opacity=".09" stroke-width="3"/>'
  elif kind=='blazer':detail+='<path d="m111 38 39 55 39-55-9 61-21 36 6 151m-54-246 9 59 21 36-13 151" fill="url(#fabric)" stroke="#192a3a" stroke-opacity=".6" stroke-width="2"/><circle cx="151" cy="186" r="4" fill="#1c2730"/>'
  else:
   detail+='<path d="m111 38 39 25 39-25-10 40-29-15-29 15Z" fill="url(#fabric)" stroke="#222" stroke-opacity=".35"/><path d="M150 64v222" stroke="#222" stroke-opacity=".3" stroke-width="3"/><path d="M99 105h35v37H99Zm67 0h35v37h-35Z" fill="none" stroke="#222" stroke-opacity=".25"/>'
   detail+=''.join(f'<circle cx="153" cy="{y}" r="2.2" fill="#d2c8ad"/>' for y in range(90,270,30))
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 320" role="img" aria-label="{color} {kind}">{defs}<g filter="url(#shadow)"><path d="{shape}" fill="url(#fabric)" stroke="#222" stroke-opacity=".12"/><path d="{shape}" fill="url(#weave)"/>{detail}</g></svg>'
 (out/f'{id}.svg').write_text(svg)
(out/'icon.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="110" fill="#28392e"/><path d="M155 143h208v45H207v65h130v45H207v91h-52Z" fill="#f5f3ee"/><circle cx="365" cy="366" r="19" fill="#c5d19d"/></svg>')
try:
 import cairosvg
 for size,name in [(192,'icon-192.png'),(512,'icon-512.png'),(180,'apple-touch-icon.png')]:
  cairosvg.svg2png(url=str(out/'icon.svg'),write_to=str(out/name),output_width=size,output_height=size)
except ImportError:
 from PIL import Image,ImageDraw
 for size,name in [(192,'icon-192.png'),(512,'icon-512.png'),(180,'apple-touch-icon.png')]:
  im=Image.new('RGB',(size,size),'#28392e');d=ImageDraw.Draw(im);s=size/512
  d.polygon([(int(x*s),int(y*s)) for x,y in [(155,143),(363,143),(363,188),(207,188),(207,253),(337,253),(337,298),(207,298),(207,389),(155,389)]],fill='#f5f3ee');im.save(out/name)
