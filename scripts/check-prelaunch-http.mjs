import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:3122',origin='https://967-initiative.vercel.app',checks=[];
const record=(name,passed)=>{checks.push({name,passed});assert.ok(passed,name);};
const read=async route=>{const r=await fetch(base+route,{headers:{'User-Agent':'OAI-SearchBot/1.4'},signal:AbortSignal.timeout(20000)});return {response:r,html:await r.text()};};
try{
 for(const route of ['/','/debates','/debates/local-prerecorded','/works','/works/inline-work','/magazine','/magazine/inline-issue','/yemen-map','/yemen-map/figures/inline-figure','/yemeni-products','/yemeni-products/inline-company','/professionals','/professionals/inline-professional','/search','/contribute','/account','/login','/register','/admin']){
  const {response,html}=await read(route);record(route+' HTTP200',response.status===200);
  const head=html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1]||'';
  const canonical=head.match(/<link\s+rel="canonical"\s+href="([^"]+)"/)?.[1];
  record(route+' canonical',Boolean(canonical)&&new URL(canonical).href===new URL(origin+route).href);
  for(const tag of ['description','og:title','og:description','og:url','twitter:card'])record(route+' '+tag,new RegExp('(?:name|property)="'+tag+'" content="[^"]+"').test(head));
  if(['/account','/login','/register','/admin','/search'].includes(route))record(route+' private noindex',/name="robots" content="[^"]*noindex/.test(head));
  const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));record(route+' valid site schema',schemas.some(s=>s['@graph']?.some(x=>x['@type']==='WebSite')));
 }
 const {html:robots}=await read('/robots.txt');record('robots excludes admin/API/account',robots.includes('Disallow: /admin')&&robots.includes('Disallow: /api/')&&robots.includes('Disallow: /account'));
 const {html:llms}=await read('/llms.txt');record('llms includes debates',llms.includes(origin+'/debates'));
 for(const route of ['/debates/does-not-exist','/works/does-not-exist','/magazine/does-not-exist','/yemen-map/figures/does-not-exist','/professionals/does-not-exist','/yemeni-products/does-not-exist'])record(route+' HTTP404',(await read(route)).response.status===404);
}finally{await writeFile('docs/audit/prelaunch-fixes-2026-10/evidence/seo-http.json',JSON.stringify({base,checks:checks.length,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length,results:checks},null,2));console.log(JSON.stringify({checks:checks.length,passed:checks.filter(c=>c.passed).length}));}
