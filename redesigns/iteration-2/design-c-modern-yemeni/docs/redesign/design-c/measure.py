import subprocess,re,json,statistics,sys,concurrent.futures
from pathlib import Path
base='http://localhost:3103'; out=Path(__file__).parent

def fetch(url):
 p=subprocess.run(['curl','--compressed','-sS','--max-time','40','-o','/tmp/c-measure-'+str(abs(hash(url))),'-w','%{time_starttransfer} %{size_download} %{http_code}',url],capture_output=True,text=True)
 t,b,s=(p.stdout.split() or ['0','0','0'])[-3:]; f=Path('/tmp/c-measure-'+str(abs(hash(url))))
 return float(t),int(b),s,f.read_text(errors='ignore') if f.exists() else ''
rows=[]
for route in json.loads((out/'routes.json').read_text()):
 samples=[fetch(base+route) for _ in range(3)];
 if any(x[2]!='200' for x in samples):raise RuntimeError('HTML measurement requires three HTTP 200 samples: '+route)
 html=samples[-1][3]
 groups={'js':set(re.findall(r'<script[^>]+src="([^"]+)',html)),'css':set(re.findall(r'<link[^>]+href="([^"]+\.css[^\"]*)',html)),'fonts':set(re.findall(r'href="([^"]+\.woff2)',html)),'images':set(re.findall(r'<img[^>]+src="([^"]+)',html))}
 sizes={}
 for kind,urls in groups.items():
  with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
   sizes[kind]=sum(x[1] for x in pool.map(fetch,[(base+u if u.startswith('/') else u).replace('&amp;','&') for u in urls]))
 row={'route':route,'ttfb':round(statistics.median(x[0] for x in samples),3),'html':int(statistics.median(x[1] for x in samples)),**sizes};row['total']=sum(row[k] for k in ['html','js','css','fonts','images']);rows.append(row);print(row,flush=True)
(out/(sys.argv[1]+'-performance.json')).write_text(json.dumps(rows,indent=2))
