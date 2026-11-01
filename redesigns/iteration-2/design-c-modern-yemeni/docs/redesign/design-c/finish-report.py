import json
from pathlib import Path
p=Path(__file__).parent
b=json.loads((p/'before-performance.json').read_text());a=json.loads((p/'after-performance.json').read_text())
names=['Home','Numbers','Indicator detail','Works','Work detail']
t='| Page | Median TTFB, before → after | Initial bytes, before → after | Change |\n| --- | ---: | ---: | ---: |\n'
for name,x,y in zip(names,b,a):t+=f"| {name} | {x['ttfb']:.3f}s → {y['ttfb']:.3f}s | {x['total']/1024:,.1f} → {y['total']/1024:,.1f} KiB | {(y['total']/x['total']-1)*100:.1f}% |\n"
c='| Page / state | HTML KiB | JS KiB | CSS KiB | Preloaded fonts KiB | Image src KiB |\n| --- | ---: | ---: | ---: | ---: | ---: |\n'
for name,x,y in zip(names,b,a):
 for state,r in [('Before',x),('After',y)]:c+=f"| {name} / {state} | "+' | '.join(f"{r[k]/1024:,.1f}" for k in ['html','js','css','fonts','images'])+' |\n'
f=p/'README.md';f.write_text(f.read_text().replace('PERFORMANCE_TABLE',t).replace('TRANSFER_TABLE',c));(p/'performance-table.txt').write_text(t)
