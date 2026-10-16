// Read-only route inventory and internal-link checks against a running build.
import {readdir, readFile, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
const base=process.env.CHECK_BASE_URL||'http://127.0.0.1:3000';
const out='docs/audit/evidence';
await mkdir(out,{recursive:true});
const definitions=[];
async function walk(dir) {
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);
  if(entry.isDirectory())await walk(file);
  else if(/^(page\.jsx|route\.js|robots\.js|sitemap\.js)$/.test(entry.name)){
   const relative=path.relative('app',file).replaceAll('\\','/');
   const route=relative==='robots.js'?'/robots.txt':relative==='sitemap.js'?'/sitemap.xml':'/'+relative.replace(/(?:^|\/)(?:page\.jsx|route\.js)$/,'');
   const source=await readFile(file,'utf8');
   definitions.push({route:route.replace(/\/$/,'')||'/',file:relative,kind:entry.name==='page.jsx'?'page':'endpoint',methods:[...source.matchAll(/export\s+async\s+function\s+(GET|POST|PATCH|DELETE|PUT)\b/g)].map(x=>x[1])});
  }
 }
}
await walk('app');
const fetchPage=async(route,method='GET')=>{const response=await fetch(base+route,{method,headers:{'User-Agent':'967-readonly-audit'},signal:AbortSignal.timeout(60000)});return {response,text:method==='HEAD'?'':await response.text()};};
const sitemap=await fetchPage('/sitemap.xml');
const published=[...sitemap.text.matchAll(/<loc>(.*?)<\/loc>/g)].map(x=>new URL(x[1]).pathname);
const routes=[...new Set([...definitions.filter(d=>d.kind==='page'&&!d.route.includes('[')).map(d=>d.route),...published,'/magazine/demo','/yemen-map/figures/arwa-al-sulayhi'])];
const results=[], links=new Set(), files=new Set();
for(let i=0;i<routes.length;i+=3)await Promise.all(routes.slice(i,i+3).map(async route=>{
 try{
  const {response,text}=await fetchPage(route);
  const titles=[...text.matchAll(/<title>(.*?)<\/title>/g)].map(x=>x[1]);
  const row={route,status:response.status,h1:[...text.matchAll(/<h1(?:\s|>)/g)].length,title:titles[0],pass:response.status===200&&!text.includes('NEXT_HTTP_ERROR_FALLBACK;500')};results.push(row);
  for(const match of text.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/g)){
   const href=match[1].replaceAll('&amp;','&');
   if(href.startsWith('/')&&!href.startsWith('//')){
    const url=new URL(href,base);
    if(/\.(pdf|png|jpg|webp|svg)$/i.test(url.pathname))files.add(url.pathname);else links.add(url.pathname+url.search);
   }
  }
 }catch(error){results.push({route,pass:false,error:error.message});}
}));
const checked=new Set(routes);
const internalResults=[];
for(const route of [...links].filter(x=>!checked.has(x)&&!x.startsWith('/api/'))) {
 try{const {response}=await fetchPage(route);internalResults.push({route,status:response.status,pass:response.status===200});}
 catch(error){internalResults.push({route,pass:false,error:error.message});}
}
const missing=['/this-page-does-not-exist',...definitions.filter(d=>d.kind==='page'&&d.route.includes('[')).map(d=>d.route.replace(/\[[^\]]+\]/g,'missing-audit-record'))];
const notFound=[];
for(const route of missing){const {response}=await fetchPage(route);notFound.push({route,status:response.status,pass:response.status===404});}
const assets=[];
for(const route of files){const {response}=await fetchPage(route,'HEAD');assets.push({route,status:response.status,pass:response.ok});}
const report={checkedAt:new Date().toISOString(),base,definitions,publishedCount:published.length,routes:results.sort((a,b)=>a.route.localeCompare(b.route)),internalLinks:internalResults,notFound,assets};
report.failures=[...results,...internalResults,...notFound,...assets].filter(x=>!x.pass);
await writeFile(out+'/route-inventory.json',JSON.stringify(report,null,2));
const markdown=['# قائمة المسارات الفعلية','',`فحص للقراءة فقط بتاريخ ${report.checkedAt}. أصل الفحص: ${base}.`, '', '## تعريفات المشروع','', '| المسار | الملف | النوع/الطرق |','|---|---|---|',...definitions.map(x=>`| \`${x.route}\` | \`app/${x.file}\` | ${x.methods.join(', ')||x.kind} |`),'','## عناوين المحتوى المنشور والعينات','', '| المسار الفعلي | HTTP | H1 | النتيجة |','|---|---|---|---|',...report.routes.map(x=>`| \`${x.route}\` | ${x.status??'—'} | ${x.h1??'—'} | ${x.pass?'نجح':'فشل'} |`),'',`الروابط الداخلية الإضافية: ${internalResults.length}. مسارات 404 المختبرة: ${notFound.length}. الأصول المحلية: ${assets.length}. الإخفاقات: ${report.failures.length}.`,'','الصفحات الديناميكية تعتمد على السجلات المنشورة وقت الفحص؛ هذه لقطة فعلية وليست تعهداً بثبات عدد السجلات. مسارات error/loading/not-found مشتركة ومدرجة ضمن مصفوفة الوظائف. API تخضع لاختبارات أمن مستقلة؛ هذا الملف لا يرسل رسائل ولا يغيّر المحتوى.'];
await writeFile('docs/audit/route-inventory.md',markdown.join('\n'));
console.log(JSON.stringify({definitions:definitions.length,published:published.length,pages:results.length,additionalLinks:internalResults.length,notFound:notFound.length,assets:assets.length,failures:report.failures},null,2));
process.exitCode=report.failures.length?1:0;
