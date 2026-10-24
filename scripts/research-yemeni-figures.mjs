// Read-only research. Cached responses are local, ignored QA material.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
const out='.audit-tools/figures-expansion';await mkdir(out,{recursive:true});
const current=JSON.parse(await readFile('data/yemeni-figures/profiles.json','utf8'));
const additions=JSON.parse(await readFile('data/yemeni-figures/expansion-2026-10.json','utf8'));
const fetchJson=async url=>{for(let attempt=0;attempt<6;attempt++){await delay(650);const r=await fetch(url,{headers:{'User-Agent':'967InitiativeEditorial/1.0 (biography reference research)'},signal:AbortSignal.timeout(45000)});if(r.status===429||r.status===503){await delay(Math.min(30000,3000*2**attempt));continue;}if(!r.ok)throw Error('Research HTTP '+r.status);return r.json();}throw Error('Research rate limit; rerun to resume the cache.');};
const items=[...current.map(x=>({slug:x.record.slug,title:decodeURIComponent(new URL(x.profile.sources.find(s=>s.id==='wikipedia').url).pathname.split('/wiki/')[1]).replaceAll('_',' ')})),...additions.map(([slug,title])=>({slug,title}))];
const pending=[];for(const item of items){try{const r=JSON.parse(await readFile(out+'/'+item.slug+'.json','utf8'));if(!r.page?.extract)pending.push(item);}catch{pending.push(item);}}
for(let i=0;i<pending.length;i+=15){
 const batch=pending.slice(i,i+15),query=new URLSearchParams({action:'query',prop:'extracts|pageprops|revisions',titles:batch.map(x=>x.title).join('|'),explaintext:'1',exlimit:'max',rvprop:'ids',redirects:'1',format:'json',formatversion:'2'});
 const response=await fetchJson('https://ar.wikipedia.org/w/api.php?'+query);
 if(response.error)throw Error(JSON.stringify(response.error));
 const redirects=new Map([...(response.query.normalized||[]),...(response.query.redirects||[])].map(r=>[r.from,r.to]));
 for(const item of batch){let title=item.title;for(let n=0;n<5&&redirects.has(title);n++)title=redirects.get(title);const page=response.query?.pages?.find(x=>x.title===title);
  if(!page||page.missing||page.pageprops?.disambiguation!==undefined){console.log('MISSING '+item.slug+' '+item.title);continue;}
  await writeFile(out+'/'+item.slug+'.json',JSON.stringify({slug:item.slug,page,entity:null},null,2)+'\n');console.log('PAGE '+item.slug+' '+page.title+' '+(page.extract?.length||0));
 }
}
const missingEntities=[];for(const item of items){try{const r=JSON.parse(await readFile(out+'/'+item.slug+'.json','utf8'));if(!r.entity&&r.page.pageprops?.wikibase_item)missingEntities.push(r);}catch{}}
for(let i=0;i<missingEntities.length;i+=40){const batch=missingEntities.slice(i,i+40),r=await fetchJson('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:batch.map(x=>x.page.pageprops.wikibase_item).join('|'),props:'claims|labels|descriptions',languages:'ar|en',format:'json'}));if(r.error)throw Error(JSON.stringify(r.error));for(const x of batch){x.entity=r.entities[x.page.pageprops.wikibase_item];await writeFile(out+'/'+x.slug+'.json',JSON.stringify(x,null,2)+'\n');}console.log('ENTITIES '+(i+batch.length));}
// Fetch labels for educational institutions, awards, works, places and languages.
const ids=new Set();
for(const item of [...current.map(x=>x.record.slug),...additions.map(x=>x[0])]){try{const r=JSON.parse(await readFile(out+'/'+item+'.json','utf8'));for(const pid of ['P19','P20','P69','P106','P166','P800','P27','P1412','P641','P54','P108','P39'])for(const c of r.entity?.claims?.[pid]||[]){if(c.rank!=='deprecated'&&c.mainsnak?.datavalue?.value?.id)ids.add(c.mainsnak.datavalue.value.id);}}catch{}}
const labels={};const all=[...ids];
for(let i=0;i<all.length;i+=45){const r=await fetchJson('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:all.slice(i,i+45).join('|'),props:'labels',languages:'ar|en',format:'json'}));for(const [id,e] of Object.entries(r.entities||{}))labels[id]={ar:e.labels?.ar?.value,en:e.labels?.en?.value};}
await writeFile(out+'/labels.json',JSON.stringify(labels,null,2)+'\n');
console.log('LABELS '+Object.keys(labels).length);
